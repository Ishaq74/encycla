import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../server/game/events';
import { createGameState, reduce, tick, toPublicState } from '../../server/game/engine';
import type { EngineDeps, GameState } from '../../server/game/types';
import { makeProvider, TEST_QUESTIONS } from '../fixtures/questions';

interface Harness {
  deps: EngineDeps;
  now: () => number;
  advance: (ms: number) => void;
}

function harness(): Harness {
  let current = 1000;
  let nextId = 0;
  return {
    deps: {
      now: () => current,
      random: () => 0.5,
      idFactory: () => `id-${(nextId += 1)}`,
      questions: makeProvider(TEST_QUESTIONS),
    },
    now: () => current,
    advance: (ms) => {
      current += ms;
    },
  };
}

const host = { id: 'p1', pseudo: 'Alice', displayName: 'Alice', avatar: 'A' };
const guest = { id: 'p2', pseudo: 'Bob', displayName: 'Bob', avatar: 'B' };

function lobby(
  h: Harness,
  options: {
    mode?: GameState['mode'];
    isPublic?: boolean;
    isTikTok?: boolean;
    isSolo?: boolean;
    category?: string | null;
    difficulty?: GameState['difficulty'];
  } = {},
): GameState {
  return createGameState({
    roomCode: 'ABC123',
    mode: options.mode ?? 'CLASSIC',
    difficulty: options.difficulty ?? null,
    category: options.category ?? null,
    isPublic: options.isPublic ?? false,
    isTikTok: options.isTikTok ?? false,
    isSolo: options.isSolo ?? false,
    host: options.isTikTok ? null : host,
    now: h.now(),
  });
}

function event(h: Harness, state: GameState, input: GameEvent): GameState {
  const result = reduce(state, input, h.deps);
  expect(result.error).toBeUndefined();
  return result.state;
}

function join(h: Harness, state: GameState, player = guest): GameState {
  return event(h, state, { type: 'PLAYER_JOIN', player });
}

function ready(h: Harness, state: GameState, playerId: string): GameState {
  return event(h, state, { type: 'LOBBY_READY', playerId, ready: true });
}

function startPrivate(h: Harness, mode: GameState['mode'] = 'CLASSIC'): GameState {
  let state = lobby(h, { mode });
  state = join(h, state);
  state = ready(h, state, 'p1');
  state = ready(h, state, 'p2');
  return event(h, state, { type: 'GAME_START', actorId: 'p1' });
}

function startPublic(h: Harness): GameState {
  let state = lobby(h, { isPublic: true });
  state = join(h, state);
  return event(h, state, { type: 'GAME_START', actorId: null, system: true });
}

function startTikTok(h: Harness): GameState {
  let state = lobby(h, { isTikTok: true });
  state = event(h, state, { type: 'TIKTOK_CONNECTION_CHANGED', connected: true });
  return event(h, state, { type: 'GAME_START', actorId: null, isControl: true });
}

function startSolo(h: Harness): GameState {
  const state = lobby(h, { isSolo: true });
  return event(h, state, { type: 'GAME_START', actorId: 'p1' });
}

function toQuestion(h: Harness, state: GameState): GameState {
  h.advance(3000);
  return tick(state, h.now(), h.deps).state;
}

function answer(h: Harness, state: GameState, playerId: string, choiceIndex: number): GameState {
  return event(h, state, {
    type: 'ANSWER',
    playerId,
    questionId: state.question?.question.id ?? '',
    choiceIndex,
  });
}

function correctIndex(state: GameState): number {
  return state.question?.correctIndex ?? 0;
}

function wrongIndex(state: GameState): number {
  return (correctIndex(state) + 1) % 4;
}

describe('private room lifecycle', () => {
  it('runs countdown, question, reveal, article and the next question without leaking answers', () => {
    const h = harness();
    let state = startPrivate(h);

    expect(state.phase).toBe('COUNTDOWN');
    expect(state.matchId).not.toBeNull();
    expect(toPublicState(state, h.now()).question).toBeNull();
    expect(toPublicState(state, h.now()).reveal).toBeNull();

    state = toQuestion(h, state);
    expect(state.phase).toBe('QUESTION');
    expect(state.questionIndex).toBe(0);

    const snapshot = toPublicState(state, h.now());
    expect(snapshot.question).not.toBeNull();
    expect(snapshot.reveal).toBeNull();
    expect(snapshot.results).toBeNull();
    expect(JSON.stringify(snapshot)).not.toContain('correctIndex');

    state = answer(h, state, 'p1', correctIndex(state));
    expect(state.phase).toBe('QUESTION');
    expect(state.players.p1?.answer?.choiceIndex).toBe(correctIndex(state));

    state = answer(h, state, 'p2', correctIndex(state));
    expect(state.phase).toBe('REVEAL');

    const revealSnapshot = toPublicState(state, h.now());
    expect(revealSnapshot.question).toBeNull();
    expect(revealSnapshot.reveal?.correctIndex).toBeDefined();
    expect(revealSnapshot.results).toHaveLength(2);
    expect(revealSnapshot.players.map((player) => player.score)).toEqual([150, 150]);

    h.advance(2500);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('ARTICLE');
    expect(toPublicState(state, h.now()).reveal).not.toBeNull();

    const token = state.phaseToken;
    expect(token).not.toBeNull();
    state = event(h, state, { type: 'CONTINUE', playerId: 'p1', phaseToken: token ?? '' });
    expect(state.phase).toBe('ARTICLE');
    state = event(h, state, { type: 'CONTINUE', playerId: 'p2', phaseToken: token ?? '' });

    expect(state.phase).toBe('QUESTION');
    expect(state.questionIndex).toBe(1);
    expect(state.totalQuestionsAnswered).toBe(1);
    expect(state.players.p1?.answer).toBeNull();
  });

  it('shows the final article then MATCH_OVER for a natural CONTEST finish', () => {
    const h = harness();
    let state = startPrivate(h, 'CONTEST');
    state = toQuestion(h, state);

    for (let question = 0; question < 10; question += 1) {
      state = answer(h, state, 'p1', correctIndex(state));
      state = answer(h, state, 'p2', correctIndex(state));
      expect(state.phase).toBe('REVEAL');

      h.advance(2500);
      state = tick(state, h.now(), h.deps).state;
      expect(state.phase).toBe('ARTICLE');

      h.advance(30000);
      state = tick(state, h.now(), h.deps).state;

      if (question < 9) {
        expect(state.phase).toBe('QUESTION');
      }
    }

    expect(state.phase).toBe('MATCH_OVER');
    expect(state.matchStatus).toBe('completed');
    expect(state.totalQuestionsAnswered).toBe(10);
    expect(state.players.p1?.score).toBe(12000);
    expect(state.players.p2?.score).toBe(12000);

    const snapshot = toPublicState(state, h.now());
    expect(snapshot.reveal).not.toBeNull();
    expect(snapshot.finalRanking).toEqual([
      { playerId: 'p1', rank: 1, tied: true },
      { playerId: 'p2', rank: 1, tied: true },
    ]);
    expect(snapshot.winnerId).toBeNull();
  });

  it('ends early after the third mistake and skips the final article', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);

    for (let mistake = 0; mistake < 3; mistake += 1) {
      state = answer(h, state, 'p1', wrongIndex(state));
      state = answer(h, state, 'p2', correctIndex(state));
      expect(state.phase).toBe('REVEAL');

      h.advance(2500);
      state = tick(state, h.now(), h.deps).state;

      if (mistake < 2) {
        expect(state.phase).toBe('ARTICLE');
        h.advance(30000);
        state = tick(state, h.now(), h.deps).state;
        expect(state.phase).toBe('QUESTION');
      }
    }

    expect(state.phase).toBe('MATCH_OVER');
    expect(state.players.p1?.status).toBe('ELIMINATED');
    expect(state.players.p1?.lives).toBe(0);
    expect(state.finalRanking).toEqual([
      { playerId: 'p2', rank: 1, tied: false },
      { playerId: 'p1', rank: 2, tied: false },
    ]);
    expect(state.winnerId).toBe('p2');
  });
});

describe('timers and controls', () => {
  it('pauses, preserves the remaining time and excludes the pause from response time', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    const endsAt = state.phaseEndsAt;
    expect(endsAt).not.toBeNull();

    h.advance(1000);
    state = event(h, state, { type: 'HOST_PAUSE', actorId: 'p1' });
    expect(state.phase).toBe('PAUSED');
    expect(state.pausedFrom).toBe('QUESTION');
    expect(state.phaseEndsAt).toBeNull();
    expect(state.remainingMsWhenPaused).toBe((endsAt ?? 0) - h.now());
    expect(JSON.stringify(toPublicState(state, h.now()))).not.toContain('correctIndex');

    h.advance(60000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('PAUSED');

    state = event(h, state, { type: 'HOST_RESUME', actorId: 'p1' });
    expect(state.phase).toBe('QUESTION');
    expect(state.phaseEndsAt).toBe(h.now() + (endsAt ?? 0) - 5000);

    h.advance(2000);
    state = answer(h, state, 'p1', correctIndex(state));
    state = answer(h, state, 'p2', correctIndex(state));
    expect(state.phase).toBe('REVEAL');
    expect(state.players.p1?.score).toBe(150);
  });

  it('auto-resumes a web pause after 120 seconds', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    h.advance(1000);
    state = event(h, state, { type: 'HOST_PAUSE', actorId: 'p1' });

    h.advance(120000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('QUESTION');
    expect(state.pausedAt).toBeNull();
  });

  it('enforces host skip permissions', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);

    const refused = reduce(state, { type: 'HOST_SKIP', actorId: 'p1' }, h.deps);
    expect(refused.error?.code).toBe('INVALID_PHASE');

    state = answer(h, state, 'p1', correctIndex(state));
    state = answer(h, state, 'p2', correctIndex(state));
    h.advance(2500);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('ARTICLE');

    state = event(h, state, { type: 'HOST_SKIP', actorId: 'p1' });
    expect(state.phase).toBe('QUESTION');
  });

  it('rejects public host controls', () => {
    const h = harness();
    let state = startPublic(h);
    state = toQuestion(h, state);

    const paused = reduce(state, { type: 'HOST_PAUSE', actorId: 'p1' }, h.deps);
    expect(paused.error?.code).toBe('NOT_HOST');
    const closed = reduce(state, { type: 'HOST_CLOSE', actorId: 'p1' }, h.deps);
    expect(closed.error?.code).toBe('NOT_HOST');
  });

  it('cancels a public countdown when a required player disconnects and requeues the rest', () => {
    const h = harness();
    let state = startPublic(h);
    expect(state.phase).toBe('COUNTDOWN');

    const result = reduce(state, { type: 'PLAYER_DISCONNECT', playerId: 'p2' }, h.deps);
    state = result.state;
    expect(state.phase).toBe('CLOSED');
    expect(state.closedReason).toBe('MATCH_CANCELLED');
    expect(state.matchStatus).toBe('abandoned');
    expect(result.effects).toContainEqual({
      type: 'REQUEUE_PUBLIC_PLAYERS',
      roomCode: 'ABC123',
      playerIds: ['p1'],
    });
  });

  it('transfers the host when the lobby host leaves', () => {
    const h = harness();
    let state = lobby(h);
    state = join(h, state);
    state = event(h, state, { type: 'PLAYER_LEAVE', playerId: 'p1' });

    expect(state.phase).toBe('LOBBY');
    expect(state.hostId).toBe('p2');
    expect(state.players.p1).toBeUndefined();
  });
});

describe('TikTok rooms', () => {
  it('starts with zero viewers and never ends early', () => {
    const h = harness();
    let state = startTikTok(h);
    expect(state.phase).toBe('COUNTDOWN');

    state = toQuestion(h, state);
    expect(state.phase).toBe('QUESTION');
    expect(toPublicState(state, h.now()).players).toEqual([]);

    h.advance(15000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('REVEAL');
    expect(state.lastResults).toEqual([]);

    h.advance(2500);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('ARTICLE');

    h.advance(8000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('QUESTION');
  });

  it('pauses after a countdown disconnect and resumes only on control command', () => {
    const h = harness();
    let state = startTikTok(h);
    state = event(h, state, { type: 'TIKTOK_CONNECTION_CHANGED', connected: false });
    expect(state.tiktokPausePending).toBe(true);

    h.advance(3000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('PAUSED');
    expect(state.pausedFrom).toBe('QUESTION');
    expect(state.tiktokConnected).toBe(false);
    expect(state.remainingMsWhenPaused).toBe(15000);
    expect(toPublicState(state, h.now()).question).not.toBeNull();

    h.advance(600000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('PAUSED');

    state = event(h, state, { type: 'HOST_RESUME', actorId: null, isControl: true });
    expect(state.phase).toBe('QUESTION');
  });

  it('lets the control skip a question but not a reveal', () => {
    const h = harness();
    let state = startTikTok(h);
    state = toQuestion(h, state);

    state = event(h, state, { type: 'HOST_SKIP', actorId: null, isControl: true });
    expect(state.phase).toBe('REVEAL');

    const skipped = reduce(state, { type: 'HOST_SKIP', actorId: null, isControl: true }, h.deps);
    expect(skipped.error?.code).toBe('INVALID_PHASE');
  });
});

describe('disconnects, forfeits and ranking', () => {
  it('keeps a short disconnect and restores the player on reconnect', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);

    state = event(h, state, { type: 'PLAYER_DISCONNECT', playerId: 'p2' });
    h.advance(10000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('QUESTION');
    expect(state.players.p2?.status).toBe('DISCONNECTED');

    state = event(h, state, { type: 'PLAYER_RECONNECT', playerId: 'p2' });
    expect(state.players.p2?.status).toBe('CONNECTED');
    expect(state.players.p2?.disconnectedAt).toBeNull();

    state = answer(h, state, 'p1', correctIndex(state));
    state = answer(h, state, 'p2', correctIndex(state));
    expect(state.phase).toBe('REVEAL');
  });

  it('forfeits an expired disconnect and keeps it in the final ranking', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    state = answer(h, state, 'p1', correctIndex(state));
    state = answer(h, state, 'p2', correctIndex(state));
    h.advance(2500);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('ARTICLE');

    state = event(h, state, { type: 'PLAYER_DISCONNECT', playerId: 'p2' });
    h.advance(30001);
    state = tick(state, h.now(), h.deps).state;

    expect(state.phase).toBe('MATCH_OVER');
    expect(state.players.p2?.status).toBe('FORFEITED');
    expect(state.finalRanking).toEqual([
      { playerId: 'p1', rank: 1, tied: false },
      { playerId: 'p2', rank: 2, tied: false },
    ]);
    expect(state.winnerId).toBe('p1');
  });

  it('removes a voluntary forfeit from the room and from the final ranking', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);

    state = event(h, state, { type: 'PLAYER_LEAVE', playerId: 'p2' });
    expect(state.players.p2).toBeUndefined();

    state = answer(h, state, 'p1', correctIndex(state));
    expect(state.phase).toBe('REVEAL');
    h.advance(2500);
    state = tick(state, h.now(), h.deps).state;

    expect(state.phase).toBe('MATCH_OVER');
    expect(state.finalRanking).toEqual([{ playerId: 'p1', rank: 1, tied: false }]);
    expect(state.winnerId).toBe('p1');
  });

  it('removes a disconnected lobby player after the grace period', () => {
    const h = harness();
    let state = lobby(h);
    state = join(h, state);
    state = event(h, state, { type: 'PLAYER_DISCONNECT', playerId: 'p2' });
    h.advance(30001);
    state = tick(state, h.now(), h.deps).state;

    expect(state.phase).toBe('LOBBY');
    expect(state.players.p2).toBeUndefined();
  });
});

describe('solo progression', () => {
  it('refills lives at LEVEL_COMPLETE and starts the next level', () => {
    const h = harness();
    let state = startSolo(h);
    state = {
      ...state,
      phase: 'ARTICLE',
      phaseStartedAt: h.now(),
      phaseEndsAt: h.now(),
      phaseToken: 'token',
      matchId: 'match',
      matchStatus: 'in_progress',
      level: 1,
      questionsResolvedThisLevel: 20,
    };
    state = {
      ...state,
      players: {
        p1: { ...(state.players.p1 as NonNullable<typeof state.players.p1>), lives: 1 },
      },
    };

    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('LEVEL_COMPLETE');
    expect(state.players.p1?.lives).toBe(3);

    h.advance(15000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('QUESTION');
    expect(state.level).toBe(2);
    expect(state.players.p1?.lives).toBe(3);
  });
});
