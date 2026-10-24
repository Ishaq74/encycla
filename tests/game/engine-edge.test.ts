import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../server/game/events';
import { createGameState, reduce, tick, toPublicState } from '../../server/game/engine';
import {
  difficultyForState,
  modeShape,
  phaseDurationMs,
  questionTimerMs,
} from '../../server/game/state-machine';
import type { EngineDeps, GameState } from '../../server/game/types';
import { makeProvider, TEST_QUESTIONS } from '../fixtures/questions';

interface Harness {
  deps: EngineDeps;
  now: () => number;
  advance: (ms: number) => void;
}

const host = { id: 'p1', pseudo: 'Alice', displayName: 'Alice', avatar: 'A' };
const guest = { id: 'p2', pseudo: 'Bob', displayName: 'Bob', avatar: 'B' };

function harness(questions = TEST_QUESTIONS): Harness {
  let current = 1000;
  let nextId = 0;
  return {
    deps: {
      now: () => current,
      random: () => 0.5,
      idFactory: () => `edge-${(nextId += 1)}`,
      questions: makeProvider(questions),
    },
    now: () => current,
    advance: (ms) => {
      current += ms;
    },
  };
}

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
    roomCode: 'EDGE01',
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

function startPrivate(h: Harness): GameState {
  let state = lobby(h);
  state = event(h, state, { type: 'PLAYER_JOIN', player: guest });
  state = event(h, state, { type: 'LOBBY_READY', playerId: 'p1', ready: true });
  state = event(h, state, { type: 'LOBBY_READY', playerId: 'p2', ready: true });
  return event(h, state, { type: 'GAME_START', actorId: 'p1' });
}

function startPublic(h: Harness): GameState {
  let state = lobby(h, { isPublic: true });
  state = event(h, state, { type: 'PLAYER_JOIN', player: guest });
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

function startContest(h: Harness): GameState {
  let state = lobby(h, { mode: 'CONTEST' });
  state = event(h, state, { type: 'PLAYER_JOIN', player: guest });
  state = event(h, state, { type: 'LOBBY_READY', playerId: 'p1', ready: true });
  state = event(h, state, { type: 'LOBBY_READY', playerId: 'p2', ready: true });
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

function correct(state: GameState): number {
  return state.question?.correctIndex ?? 0;
}

function toArticle(h: Harness, state: GameState): GameState {
  state = answer(h, state, 'p1', correct(state));
  state = answer(h, state, 'p2', correct(state));
  h.advance(2500);
  return tick(state, h.now(), h.deps).state;
}

function code(state: GameState): string {
  return state.phase;
}

describe('game start guards', () => {
  it('rejects a private start without enough players, ready players or the right host', () => {
    const h = harness();
    let state = lobby(h);
    expect(reduce(state, { type: 'GAME_START', actorId: 'p1' }, h.deps).error?.code).toBe(
      'NOT_ENOUGH_PLAYERS',
    );

    state = event(h, state, { type: 'PLAYER_JOIN', player: guest });
    state = event(h, state, { type: 'LOBBY_READY', playerId: 'p1', ready: true });
    expect(reduce(state, { type: 'GAME_START', actorId: 'p1' }, h.deps).error?.code).toBe(
      'PLAYERS_NOT_READY',
    );

    state = event(h, state, { type: 'LOBBY_READY', playerId: 'p2', ready: true });
    expect(reduce(state, { type: 'GAME_START', actorId: 'p2' }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );
  });

  it('rejects public and TikTok starts that bypass their rules', () => {
    const h = harness();
    let publicState = lobby(h, { isPublic: true });
    publicState = event(h, publicState, { type: 'PLAYER_JOIN', player: guest });
    expect(reduce(publicState, { type: 'GAME_START', actorId: 'p1' }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );

    const tiktok = lobby(h, { isTikTok: true });
    expect(
      reduce(tiktok, { type: 'GAME_START', actorId: null, isControl: true }, h.deps).error?.code,
    ).toBe('TIKTOK_NOT_CONNECTED');
    expect(reduce(tiktok, { type: 'GAME_START', actorId: null }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );
  });

  it('rejects a disconnected host and a start outside the lobby', () => {
    const h = harness();
    let state = lobby(h);
    state = event(h, state, { type: 'PLAYER_JOIN', player: guest });
    state = event(h, state, { type: 'LOBBY_READY', playerId: 'p1', ready: true });
    state = event(h, state, { type: 'LOBBY_READY', playerId: 'p2', ready: true });
    state = event(h, state, { type: 'PLAYER_DISCONNECT', playerId: 'p1' });
    expect(reduce(state, { type: 'GAME_START', actorId: 'p1' }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );

    const started = startPrivate(h);
    expect(reduce(started, { type: 'GAME_START', actorId: 'p1' }, h.deps).error?.code).toBe(
      'INVALID_PHASE',
    );
  });

  it('rejects a start when no question is available', () => {
    const h = harness([]);
    let state = lobby(h);
    state = event(h, state, { type: 'PLAYER_JOIN', player: guest });
    state = event(h, state, { type: 'LOBBY_READY', playerId: 'p1', ready: true });
    state = event(h, state, { type: 'LOBBY_READY', playerId: 'p2', ready: true });
    expect(reduce(state, { type: 'GAME_START', actorId: 'p1' }, h.deps).error?.code).toBe(
      'NO_QUESTIONS_AVAILABLE',
    );
  });
});

describe('answer guards', () => {
  it('rejects invalid answers without mutating the question', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    const questionId = state.question?.question.id ?? '';

    expect(
      reduce(state, { type: 'ANSWER', playerId: 'p1', questionId: 'other', choiceIndex: 0 }, h.deps)
        .error?.code,
    ).toBe('QUESTION_MISMATCH');
    expect(
      reduce(state, { type: 'ANSWER', playerId: 'p1', questionId, choiceIndex: 4 }, h.deps).error
        ?.code,
    ).toBe('INVALID_OPTION');
    expect(
      reduce(state, { type: 'ANSWER', playerId: 'p3', questionId, choiceIndex: 0 }, h.deps).error
        ?.code,
    ).toBe('NOT_IN_ROOM');
    expect(
      reduce(state, { type: 'ANSWER', playerId: 'p1', questionId, choiceIndex: 0 }, h.deps).state
        .phase,
    ).toBe('QUESTION');
  });

  it('rejects duplicate, disconnected, eliminated, forfeited and late answers', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    const questionId = state.question?.question.id ?? '';

    state = answer(h, state, 'p1', correct(state));
    expect(
      reduce(state, { type: 'ANSWER', playerId: 'p1', questionId, choiceIndex: 0 }, h.deps).error
        ?.code,
    ).toBe('ANSWER_ALREADY_SUBMITTED');

    const disconnected = event(h, state, { type: 'PLAYER_DISCONNECT', playerId: 'p2' });
    expect(
      reduce(disconnected, { type: 'ANSWER', playerId: 'p2', questionId, choiceIndex: 0 }, h.deps)
        .error?.code,
    ).toBe('PLAYER_NOT_CONNECTED');

    const eliminated = {
      ...state,
      players: {
        ...state.players,
        p2: {
          ...(state.players.p2 as NonNullable<typeof state.players.p2>),
          status: 'ELIMINATED' as const,
        },
      },
    };
    expect(
      reduce(eliminated, { type: 'ANSWER', playerId: 'p2', questionId, choiceIndex: 0 }, h.deps)
        .error?.code,
    ).toBe('PLAYER_ELIMINATED');

    const forfeited = {
      ...state,
      players: {
        ...state.players,
        p2: {
          ...(state.players.p2 as NonNullable<typeof state.players.p2>),
          status: 'FORFEITED' as const,
        },
      },
    };
    expect(
      reduce(forfeited, { type: 'ANSWER', playerId: 'p2', questionId, choiceIndex: 0 }, h.deps)
        .error?.code,
    ).toBe('PLAYER_FORFEITED');

    const late = startPrivate(h);
    const lateQuestion = toQuestion(h, late);
    h.advance(25001);
    expect(
      reduce(
        lateQuestion,
        {
          type: 'ANSWER',
          playerId: 'p1',
          questionId: lateQuestion.question?.question.id ?? '',
          choiceIndex: 0,
        },
        h.deps,
      ).error?.code,
    ).toBe('ANSWER_TOO_LATE');
  });

  it('rejects an answer outside a question', () => {
    const h = harness();
    const state = lobby(h);
    expect(
      reduce(state, { type: 'ANSWER', playerId: 'p1', questionId: 'x', choiceIndex: 0 }, h.deps)
        .error?.code,
    ).toBe('INVALID_PHASE');
  });
});

describe('continue and control guards', () => {
  it('rejects continue errors and accepts an idempotent second continue', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    expect(
      reduce(state, { type: 'CONTINUE', playerId: 'p1', phaseToken: 'x' }, h.deps).error?.code,
    ).toBe('INVALID_PHASE');

    state = toArticle(h, state);
    const token = state.phaseToken ?? '';
    expect(
      reduce(state, { type: 'CONTINUE', playerId: 'p3', phaseToken: token }, h.deps).error?.code,
    ).toBe('NOT_IN_ROOM');
    expect(
      reduce(state, { type: 'CONTINUE', playerId: 'p1', phaseToken: 'stale' }, h.deps).error?.code,
    ).toBe('STALE_PHASE_TOKEN');

    const disconnected = {
      ...state,
      players: {
        ...state.players,
        p2: {
          ...(state.players.p2 as NonNullable<typeof state.players.p2>),
          status: 'DISCONNECTED' as const,
        },
      },
    };
    expect(
      reduce(disconnected, { type: 'CONTINUE', playerId: 'p2', phaseToken: token }, h.deps).error
        ?.code,
    ).toBe('PLAYER_NOT_CONNECTED');

    const eliminated = {
      ...state,
      players: {
        ...state.players,
        p2: {
          ...(state.players.p2 as NonNullable<typeof state.players.p2>),
          status: 'ELIMINATED' as const,
        },
      },
    };
    expect(
      reduce(eliminated, { type: 'CONTINUE', playerId: 'p2', phaseToken: token }, h.deps).error
        ?.code,
    ).toBe('PLAYER_ELIMINATED');

    const forfeited = {
      ...state,
      players: {
        ...state.players,
        p2: {
          ...(state.players.p2 as NonNullable<typeof state.players.p2>),
          status: 'FORFEITED' as const,
        },
      },
    };
    expect(
      reduce(forfeited, { type: 'CONTINUE', playerId: 'p2', phaseToken: token }, h.deps).error
        ?.code,
    ).toBe('PLAYER_FORFEITED');

    const first = reduce(state, { type: 'CONTINUE', playerId: 'p1', phaseToken: token }, h.deps);
    expect(first.error).toBeUndefined();
    const second = reduce(
      first.state,
      { type: 'CONTINUE', playerId: 'p1', phaseToken: token },
      h.deps,
    );
    expect(second.error).toBeUndefined();
    expect(second.state).toBe(first.state);
  });

  it('enforces pause, resume, skip and close permissions', () => {
    const h = harness();
    let state = lobby(h);
    expect(reduce(state, { type: 'HOST_PAUSE', actorId: 'p1' }, h.deps).error?.code).toBe(
      'INVALID_PHASE',
    );
    expect(reduce(state, { type: 'HOST_RESUME', actorId: 'p1' }, h.deps).error?.code).toBe(
      'INVALID_PHASE',
    );

    state = startPrivate(h);
    state = toQuestion(h, state);
    expect(reduce(state, { type: 'HOST_PAUSE', actorId: 'p2' }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );
    state = event(h, state, { type: 'HOST_PAUSE', actorId: 'p1' });
    expect(reduce(state, { type: 'HOST_RESUME', actorId: 'p2' }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );
    state = event(h, state, { type: 'HOST_RESUME', actorId: 'p1' });

    expect(reduce(state, { type: 'HOST_SKIP', actorId: 'p2' }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );
    expect(reduce(state, { type: 'HOST_CLOSE', actorId: 'p2' }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );

    const closed = event(h, state, { type: 'HOST_CLOSE', actorId: 'p1' });
    expect(closed.phase).toBe('CLOSED');
    expect(closed.matchStatus).toBe('abandoned');
    expect(closed.finalRanking).toEqual([]);
    expect(closed.winnerId).toBeNull();
    expect(reduce(closed, { type: 'HOST_CLOSE', actorId: 'p1' }, h.deps).error?.code).toBe(
      'INVALID_PHASE',
    );
  });

  it('allows solo pause/resume but not skip or close', () => {
    const h = harness();
    let state = startSolo(h);
    state = toQuestion(h, state);
    state = event(h, state, { type: 'HOST_PAUSE', actorId: 'p1' });
    state = event(h, state, { type: 'HOST_RESUME', actorId: 'p1' });

    expect(reduce(state, { type: 'HOST_SKIP', actorId: 'p1' }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );
    expect(reduce(state, { type: 'HOST_CLOSE', actorId: 'p1' }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );
  });

  it('rejects a private skip in REVEAL and supports the TikTok article skip', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    state = answer(h, state, 'p1', correct(state));
    state = answer(h, state, 'p2', correct(state));
    expect(reduce(state, { type: 'HOST_SKIP', actorId: 'p1' }, h.deps).error?.code).toBe(
      'INVALID_PHASE',
    );

    let tiktok = startTikTok(h);
    tiktok = toQuestion(h, tiktok);
    expect(reduce(tiktok, { type: 'HOST_SKIP', actorId: null }, h.deps).error?.code).toBe(
      'NOT_HOST',
    );
    tiktok = event(h, tiktok, { type: 'HOST_SKIP', actorId: null, isControl: true });
    h.advance(2500);
    tiktok = tick(tiktok, h.now(), h.deps).state;
    tiktok = event(h, tiktok, { type: 'HOST_SKIP', actorId: null, isControl: true });
    expect(tiktok.phase).toBe('QUESTION');
  });

  it('skips a level summary and starts the next level', () => {
    const h = harness();
    let state = startPrivate(h);
    state = {
      ...state,
      phase: 'LEVEL_COMPLETE',
      phaseStartedAt: h.now(),
      phaseEndsAt: h.now() + 15000,
      phaseToken: 'level-token',
      level: 1,
      questionsResolvedThisLevel: 20,
      continueReady: [],
    };

    state = event(h, state, { type: 'HOST_SKIP', actorId: 'p1' });
    expect(state.phase).toBe('QUESTION');
    expect(state.level).toBe(2);
    expect(state.questionsResolvedThisLevel).toBe(0);
  });
});

describe('manual answers, joins and reconnect guards', () => {
  it('accepts a manual TikTok answer and rejects duplicate, late and invalid manual answers', () => {
    const h = harness();
    let state = startTikTok(h);
    state = toQuestion(h, state);
    state = event(h, state, { type: 'PLAYER_JOIN', player: { id: 'p3', pseudo: 'Cara' } });
    state = event(h, state, { type: 'PLAYER_JOIN', player: { id: 'p4', pseudo: 'Dan' } });

    expect(
      reduce(
        state,
        { type: 'HOST_MANUAL_ANSWER', actorId: 'p1', playerId: 'p3', choiceIndex: 0 },
        h.deps,
      ).error?.code,
    ).toBe('NOT_HOST');
    expect(
      reduce(
        state,
        {
          type: 'HOST_MANUAL_ANSWER',
          actorId: null,
          isControl: true,
          playerId: 'missing',
          choiceIndex: 0,
        },
        h.deps,
      ).error?.code,
    ).toBe('NOT_IN_ROOM');

    const accepted = reduce(
      state,
      {
        type: 'HOST_MANUAL_ANSWER',
        actorId: null,
        isControl: true,
        playerId: 'p3',
        choiceIndex: state.question?.correctIndex ?? 0,
      },
      h.deps,
    );
    expect(accepted.error).toBeUndefined();
    expect(accepted.state.phase).toBe('QUESTION');

    expect(
      reduce(
        accepted.state,
        {
          type: 'HOST_MANUAL_ANSWER',
          actorId: null,
          isControl: true,
          playerId: 'p3',
          choiceIndex: 0,
        },
        h.deps,
      ).error?.code,
    ).toBe('ANSWER_ALREADY_SUBMITTED');

    expect(
      reduce(
        accepted.state,
        {
          type: 'HOST_MANUAL_ANSWER',
          actorId: null,
          isControl: true,
          playerId: 'p4',
          choiceIndex: 9,
        },
        h.deps,
      ).error?.code,
    ).toBe('INVALID_OPTION');

    h.advance(15001);
    expect(
      reduce(
        accepted.state,
        {
          type: 'HOST_MANUAL_ANSWER',
          actorId: null,
          isControl: true,
          playerId: 'p4',
          choiceIndex: 0,
        },
        h.deps,
      ).error?.code,
    ).toBe('ANSWER_TOO_LATE');

    const eliminated = {
      ...state,
      players: {
        ...state.players,
        p3: {
          ...(state.players.p3 as NonNullable<typeof state.players.p3>),
          status: 'ELIMINATED' as const,
        },
      },
    };
    expect(
      reduce(
        eliminated,
        {
          type: 'HOST_MANUAL_ANSWER',
          actorId: null,
          isControl: true,
          playerId: 'p3',
          choiceIndex: 0,
        },
        h.deps,
      ).error?.code,
    ).toBe('PLAYER_ELIMINATED');

    const forfeited = {
      ...state,
      players: {
        ...state.players,
        p3: {
          ...(state.players.p3 as NonNullable<typeof state.players.p3>),
          status: 'FORFEITED' as const,
        },
      },
    };
    expect(
      reduce(
        forfeited,
        {
          type: 'HOST_MANUAL_ANSWER',
          actorId: null,
          isControl: true,
          playerId: 'p3',
          choiceIndex: 0,
        },
        h.deps,
      ).error?.code,
    ).toBe('PLAYER_FORFEITED');
  });

  it('rejects manual answers outside TikTok or outside a question', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    expect(
      reduce(
        state,
        {
          type: 'HOST_MANUAL_ANSWER',
          actorId: null,
          isControl: true,
          playerId: 'p1',
          choiceIndex: 0,
        },
        h.deps,
      ).error?.code,
    ).toBe('NOT_HOST');

    const tiktok = lobby(h, { isTikTok: true });
    expect(
      reduce(
        tiktok,
        {
          type: 'HOST_MANUAL_ANSWER',
          actorId: null,
          isControl: true,
          playerId: 'p1',
          choiceIndex: 0,
        },
        h.deps,
      ).error?.code,
    ).toBe('INVALID_PHASE');
  });

  it('ignores duplicate, late and full joins, and reports TikTok connection misuse', () => {
    const h = harness();
    let state = lobby(h);
    state = event(h, state, { type: 'PLAYER_JOIN', player: guest });
    const duplicate = event(h, state, { type: 'PLAYER_JOIN', player: guest });
    expect(duplicate).toBe(state);

    let contest = lobby(h, { mode: 'CONTEST' });
    contest = event(h, contest, { type: 'PLAYER_JOIN', player: guest });
    expect(event(h, contest, { type: 'PLAYER_JOIN', player: { id: 'p3', pseudo: 'Cara' } })).toBe(
      contest,
    );

    const started = startPrivate(h);
    expect(event(h, started, { type: 'PLAYER_JOIN', player: { id: 'p3', pseudo: 'Cara' } })).toBe(
      started,
    );

    expect(
      reduce(state, { type: 'TIKTOK_CONNECTION_CHANGED', connected: true }, h.deps).error?.code,
    ).toBe('INVALID_EVENT');
  });

  it('ignores ready, reconnect and leave calls that do not apply', () => {
    const h = harness();
    let state = lobby(h);
    expect(event(h, state, { type: 'LOBBY_READY', playerId: 'p2', ready: true })).toBe(state);

    state = event(h, state, { type: 'PLAYER_JOIN', player: guest });
    expect(event(h, state, { type: 'PLAYER_RECONNECT', playerId: 'p2' })).toBe(state);
    expect(event(h, state, { type: 'PLAYER_RECONNECT', playerId: 'p3' })).toBe(state);
    expect(event(h, state, { type: 'PLAYER_LEAVE', playerId: 'p3' })).toBe(state);

    const started = startPrivate(h);
    expect(event(h, started, { type: 'LOBBY_READY', playerId: 'p1', ready: true })).toBe(started);
  });
});

describe('timeouts, abandonment and room cleanup', () => {
  it('closes an empty lobby, an inactive room and a match-over room', () => {
    const h = harness();
    let empty = lobby(h);
    empty = event(h, empty, { type: 'PLAYER_LEAVE', playerId: 'p1' });
    expect(empty.phase).toBe('CLOSED');
    expect(empty.closedReason).toBe('EMPTY_ROOM');

    let inactive = lobby(h);
    inactive = {
      ...inactive,
      lastActivityAt: h.now() - 600001,
      players: {
        p1: {
          ...(inactive.players.p1 as NonNullable<typeof inactive.players.p1>),
          status: 'FORFEITED',
        },
      },
    };
    inactive = tick(inactive, h.now(), h.deps).state;
    expect(inactive.phase).toBe('CLOSED');
    expect(inactive.closedReason).toBe('INACTIVE');

    let over = startPrivate(h);
    over = {
      ...over,
      phase: 'MATCH_OVER',
      phaseEndsAt: h.now(),
      matchStatus: 'completed',
      finalRanking: [],
    };
    over = tick(over, h.now(), h.deps).state;
    expect(over.phase).toBe('CLOSED');
    expect(over.closedReason).toBe('MATCH_OVER_TTL');
    expect(tick(over, h.now(), h.deps).state).toBe(over);
  });

  it('closes a solo match when the player leaves or expires', () => {
    const h = harness();
    let state = startSolo(h);
    state = toQuestion(h, state);
    state = event(h, state, { type: 'PLAYER_LEAVE', playerId: 'p1' });
    expect(state.phase).toBe('CLOSED');
    expect(state.closedReason).toBe('PLAYER_LEFT');
    expect(state.matchStatus).toBe('abandoned');

    let expired = startSolo(h);
    expired = toQuestion(h, expired);
    expired = answer(h, expired, 'p1', correct(expired));
    h.advance(2500);
    expired = tick(expired, h.now(), h.deps).state;
    expired = event(h, expired, { type: 'PLAYER_DISCONNECT', playerId: 'p1' });
    h.advance(30001);
    expired = tick(expired, h.now(), h.deps).state;
    expect(expired.phase).toBe('CLOSED');
    expect(expired.closedReason).toBe('PLAYER_DISCONNECTED');
  });

  it('closes a lobby when its last disconnected host expires', () => {
    const h = harness();
    let state = lobby(h);
    state = event(h, state, { type: 'PLAYER_DISCONNECT', playerId: 'p1' });
    h.advance(30001);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('CLOSED');
    expect(state.closedReason).toBe('EMPTY_ROOM');
  });

  it('cancels a private countdown when a player leaves', () => {
    const h = harness();
    let state = startPrivate(h);
    state = event(h, state, { type: 'PLAYER_LEAVE', playerId: 'p2' });
    expect(state.phase).toBe('CLOSED');
    expect(state.closedReason).toBe('MATCH_CANCELLED');
  });

  it('finishes a match when only one active player remains in an article', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    state = toArticle(h, state);
    state = event(h, state, { type: 'PLAYER_DISCONNECT', playerId: 'p2' });
    h.advance(30001);
    state = tick(state, h.now(), h.deps).state;

    expect(state.phase).toBe('MATCH_OVER');
    expect(state.finalRanking).toHaveLength(2);
    expect(state.players.p2?.status).toBe('FORFEITED');
  });

  it('abandons a match when all players leave', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    state = event(h, state, { type: 'PLAYER_LEAVE', playerId: 'p1' });
    state = event(h, state, { type: 'PLAYER_LEAVE', playerId: 'p2' });
    expect(state.phase).toBe('REVEAL');
    h.advance(2500);
    state = tick(state, h.now(), h.deps).state;

    expect(state.phase).toBe('MATCH_OVER');
    expect(state.matchStatus).toBe('abandoned');
    expect(state.finalRanking).toEqual([]);
    expect(state.winnerId).toBeNull();
  });

  it('abandons a zero-viewer TikTok natural finish and shows the final article', () => {
    const h = harness();
    let state = startTikTok(h);
    state = {
      ...state,
      phase: 'ARTICLE',
      phaseStartedAt: h.now(),
      phaseEndsAt: h.now(),
      phaseToken: 'final',
      level: 10,
      questionsResolvedThisLevel: 20,
      matchId: 'match',
      matchStatus: 'in_progress',
    };
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('MATCH_OVER');
    expect(state.matchStatus).toBe('abandoned');
    expect(state.finalRanking).toEqual([]);
  });

  it('advances a level-complete timeout and closes a stale public countdown', () => {
    const h = harness();
    let state = startPrivate(h);
    state = {
      ...state,
      phase: 'LEVEL_COMPLETE',
      phaseStartedAt: h.now(),
      phaseEndsAt: h.now(),
      phaseToken: 'level',
      level: 1,
      questionsResolvedThisLevel: 20,
    };
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('QUESTION');
    expect(state.level).toBe(2);

    let publicState = startPublic(h);
    publicState = {
      ...publicState,
      players: {
        ...publicState.players,
        p2: {
          ...(publicState.players.p2 as NonNullable<typeof publicState.players.p2>),
          status: 'DISCONNECTED',
        },
      },
    };
    h.advance(3000);
    publicState = tick(publicState, h.now(), h.deps).state;
    expect(publicState.phase).toBe('CLOSED');
    expect(publicState.closedReason).toBe('MATCH_CANCELLED');
  });

  it('leaves a match-over room and ignores a leave after it is closed', () => {
    const h = harness();
    let state = startPrivate(h);
    state = {
      ...state,
      phase: 'MATCH_OVER',
      matchStatus: 'completed',
      finalRanking: [{ playerId: 'p1', rank: 1, tied: false }],
    };
    expect(event(h, state, { type: 'PLAYER_LEAVE', playerId: 'p1' })).toBe(state);

    state = { ...state, phase: 'CLOSED' };
    expect(event(h, state, { type: 'PLAYER_LEAVE', playerId: 'p1' })).toBe(state);
  });

  it('covers phase durations and public snapshot branches', () => {
    const h = harness();
    const state = startPrivate(h);
    expect(phaseDurationMs(state, 'LOBBY')).toBeNull();
    expect(phaseDurationMs(state, 'PAUSED')).toBeNull();
    expect(phaseDurationMs(state, 'CLOSED')).toBeNull();
    expect(phaseDurationMs(state, 'MATCH_OVER')).toBe(600000);

    const levelState = {
      ...state,
      phase: 'LEVEL_COMPLETE' as const,
      lastReveal: state.lastReveal ?? {
        questionId: 'q',
        subject: 's',
        questionText: 'q?',
        options: ['a', 'b', 'c', 'd'],
        correctIndex: 0,
        explanation: 'e',
        articleTitle: 't',
        articleBody: 'body',
        image: null,
      },
      lastResults: [],
    };
    expect(toPublicState(levelState, h.now()).reveal).not.toBeNull();
    expect(toPublicState({ ...levelState, phase: 'CLOSED' }, h.now()).finalRanking).toBeNull();
  });

  it('keeps an unchanged tick stable', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    expect(tick(state, h.now(), h.deps).state).toBe(state);
    expect(code(state)).toBe('QUESTION');
  });
});

describe('additional reachable branches', () => {
  it('covers TikTok connector pending, active disconnect and countdown leave', () => {
    const h = harness();
    let state = startTikTok(h);
    state = event(h, state, { type: 'TIKTOK_CONNECTION_CHANGED', connected: false });
    expect(state.tiktokPausePending).toBe(true);
    h.advance(3000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('PAUSED');
    expect(state.pausedFrom).toBe('QUESTION');

    state = event(h, state, { type: 'HOST_RESUME', actorId: null, isControl: true });
    state = event(h, state, { type: 'TIKTOK_CONNECTION_CHANGED', connected: true });
    state = event(h, state, { type: 'PLAYER_JOIN', player: { id: 'p3', pseudo: 'Cara' } });
    state = event(h, state, { type: 'TIKTOK_CONNECTION_CHANGED', connected: false });
    expect(state.phase).toBe('PAUSED');
    state = event(h, state, { type: 'PLAYER_LEAVE', playerId: 'p3' });
    expect(state.phase).toBe('PAUSED');

    let countdown = startTikTok(h);
    countdown = event(h, countdown, { type: 'PLAYER_JOIN', player: { id: 'p4', pseudo: 'Dan' } });
    countdown = event(h, countdown, { type: 'PLAYER_LEAVE', playerId: 'p4' });
    expect(countdown.phase).toBe('COUNTDOWN');
  });

  it('closes when the countdown cannot find a question and recycles an exhausted bank', () => {
    const h = harness();
    let state = lobby(h);
    state = event(h, state, { type: 'PLAYER_JOIN', player: guest });
    state = event(h, state, { type: 'LOBBY_READY', playerId: 'p1', ready: true });
    state = event(h, state, { type: 'LOBBY_READY', playerId: 'p2', ready: true });
    state = {
      ...state,
      phase: 'COUNTDOWN',
      phaseStartedAt: h.now(),
      phaseEndsAt: h.now(),
      phaseToken: 'countdown',
      matchId: 'match',
      matchStatus: 'in_progress',
      category: 'Unknown',
    };
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('CLOSED');
    expect(state.closedReason).toBe('NO_QUESTIONS_AVAILABLE');

    const recycledHarness = harness([TEST_QUESTIONS[0] as (typeof TEST_QUESTIONS)[number]]);
    let recycled = startSolo(recycledHarness);
    recycled = toQuestion(recycledHarness, recycled);
    recycled = answer(recycledHarness, recycled, 'p1', correct(recycled));
    recycledHarness.advance(2500);
    recycled = tick(recycled, recycledHarness.now(), recycledHarness.deps).state;
    recycledHarness.advance(30000);
    const next = tick(recycled, recycledHarness.now(), recycledHarness.deps);
    expect(next.state.phase).toBe('QUESTION');
    expect(
      next.effects.some((effect) => effect.type === 'LOG' && effect.event === 'QUESTION_RECYCLED'),
    ).toBe(true);
  });

  it('covers contest timeout, wrong answer and no-bonus branches', () => {
    const h = harness();
    let state = startContest(h);
    state = toQuestion(h, state);
    state = answer(h, state, 'p1', correct(state));
    h.advance(20000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.phase).toBe('REVEAL');
    expect(state.players.p2?.timeoutCount).toBe(1);

    h.advance(2500);
    state = tick(state, h.now(), h.deps).state;
    h.advance(30000);
    state = tick(state, h.now(), h.deps).state;
    state = answer(h, state, 'p1', (correct(state) + 1) % 4);
    state = answer(h, state, 'p2', (correct(state) + 1) % 4);
    expect(state.phase).toBe('REVEAL');
    expect(state.players.p2?.wrongCount).toBe(1);
  });

  it('covers classic timeouts and article/level shortcuts', () => {
    const h = harness();
    let state = startPrivate(h);
    state = toQuestion(h, state);
    state = answer(h, state, 'p1', correct(state));
    h.advance(25000);
    state = tick(state, h.now(), h.deps).state;
    expect(state.players.p2?.timeoutCount).toBe(1);

    let article = startPrivate(h);
    article = toQuestion(h, article);
    article = toArticle(h, article);
    article = {
      ...article,
      phaseEndsAt: h.now(),
      players: {
        ...article.players,
        p2: {
          ...(article.players.p2 as NonNullable<typeof article.players.p2>),
          status: 'FORFEITED',
        },
      },
    };
    article = tick(article, h.now(), h.deps).state;
    expect(article.phase).toBe('MATCH_OVER');

    let level = startPrivate(h);
    level = {
      ...level,
      phase: 'LEVEL_COMPLETE',
      phaseStartedAt: h.now(),
      phaseEndsAt: h.now(),
      level: 1,
      questionsResolvedThisLevel: 20,
      players: {
        ...level.players,
        p2: { ...(level.players.p2 as NonNullable<typeof level.players.p2>), status: 'FORFEITED' },
      },
    };
    level = tick(level, h.now(), h.deps).state;
    expect(level.phase).toBe('MATCH_OVER');

    let finalLevel = startPrivate(h);
    finalLevel = {
      ...finalLevel,
      phase: 'LEVEL_COMPLETE',
      phaseStartedAt: h.now(),
      phaseEndsAt: h.now(),
      level: 10,
      questionsResolvedThisLevel: 20,
    };
    finalLevel = tick(finalLevel, h.now(), h.deps).state;
    expect(finalLevel.phase).toBe('MATCH_OVER');
  });

  it('covers paused article and reveal consequences and a null resume source', () => {
    const h = harness();
    let article = startPrivate(h);
    article = toQuestion(h, article);
    article = toArticle(h, article);
    article = event(h, article, { type: 'HOST_PAUSE', actorId: 'p1' });
    article = event(h, article, { type: 'PLAYER_LEAVE', playerId: 'p2' });
    expect(article.phase).toBe('MATCH_OVER');

    let reveal = startPrivate(h);
    reveal = toQuestion(h, reveal);
    reveal = answer(h, reveal, 'p1', correct(reveal));
    reveal = answer(h, reveal, 'p2', correct(reveal));
    reveal = event(h, reveal, { type: 'HOST_PAUSE', actorId: 'p1' });
    reveal = event(h, reveal, { type: 'PLAYER_LEAVE', playerId: 'p2' });
    expect(reveal.shouldEndAfterReveal).toBe(true);
    reveal = event(h, reveal, { type: 'HOST_RESUME', actorId: 'p1' });
    h.advance(2500);
    reveal = tick(reveal, h.now(), h.deps).state;
    expect(reveal.phase).toBe('MATCH_OVER');

    let paused = startPrivate(h);
    paused = { ...paused, phase: 'PAUSED', pausedFrom: null, pausedAt: h.now() };
    const resumed = reduce(paused, { type: 'HOST_RESUME', actorId: 'p1' }, h.deps);
    expect(resumed.error).toBeUndefined();
  });

  it('covers disconnect, reconnect and start guard branches', () => {
    const h = harness();
    let state = startPrivate(h);
    state = event(h, state, { type: 'PLAYER_DISCONNECT', playerId: 'p2' });
    expect(state.phase).toBe('COUNTDOWN');

    const shortBase = startPrivate(h);
    const shortCountdown = {
      ...shortBase,
      players: { p1: shortBase.players.p1 as NonNullable<GameState['players'][string]> },
    };
    const closed = reduce(shortCountdown, { type: 'PLAYER_DISCONNECT', playerId: 'p1' }, h.deps);
    expect(closed.state.phase).toBe('CLOSED');
    expect(closed.state.closedReason).toBe('MATCH_CANCELLED');

    let room = startPrivate(h);
    expect(event(h, room, { type: 'PLAYER_DISCONNECT', playerId: 'p3' })).toBe(room);
    room = event(h, room, { type: 'PLAYER_DISCONNECT', playerId: 'p1' });
    expect(event(h, room, { type: 'PLAYER_DISCONNECT', playerId: 'p1' })).toBe(room);

    const forfeited = {
      ...room,
      players: {
        ...room.players,
        p1: {
          ...(room.players.p1 as NonNullable<typeof room.players.p1>),
          status: 'FORFEITED' as const,
        },
      },
    };
    expect(event(h, forfeited, { type: 'PLAYER_RECONNECT', playerId: 'p1' })).toBe(forfeited);

    const publicOnlyHost = lobby(h, { isPublic: true });
    expect(
      reduce(publicOnlyHost, { type: 'GAME_START', actorId: null, system: true }, h.deps).error
        ?.code,
    ).toBe('NOT_ENOUGH_PLAYERS');

    let publicNotAll = lobby(h, { isPublic: true });
    publicNotAll = event(h, publicNotAll, { type: 'PLAYER_JOIN', player: guest });
    publicNotAll = event(h, publicNotAll, {
      type: 'PLAYER_JOIN',
      player: { id: 'p3', pseudo: 'Cara' },
    });
    publicNotAll = event(h, publicNotAll, { type: 'PLAYER_DISCONNECT', playerId: 'p2' });
    expect(
      reduce(publicNotAll, { type: 'GAME_START', actorId: null, system: true }, h.deps).error?.code,
    ).toBe('NOT_ENOUGH_PLAYERS');

    const noQuestion = {
      ...startPrivate(h),
      phase: 'QUESTION' as const,
      question: null,
    };
    expect(
      reduce(
        noQuestion,
        { type: 'ANSWER', playerId: 'p1', questionId: 'q', choiceIndex: 0 },
        h.deps,
      ).error?.code,
    ).toBe('QUESTION_MISMATCH');

    let manual = startTikTok(h);
    manual = event(h, manual, { type: 'PLAYER_JOIN', player: { id: 'p3', pseudo: 'Cara' } });
    manual = { ...manual, phase: 'QUESTION', question: null };
    expect(
      reduce(
        manual,
        {
          type: 'HOST_MANUAL_ANSWER',
          actorId: null,
          isControl: true,
          playerId: 'p3',
          choiceIndex: 0,
        },
        h.deps,
      ).error?.code,
    ).toBe('INVALID_PHASE');
  });

  it('keeps a live match-over room stable before its TTL', () => {
    const h = harness();
    let state = startPrivate(h);
    state = {
      ...state,
      phase: 'MATCH_OVER',
      phaseEndsAt: h.now() + 1000,
      matchStatus: 'completed',
    };
    expect(tick(state, h.now(), h.deps).state).toBe(state);
  });

  it('covers skip-driven article and level shortcuts with too few active players', () => {
    const h = harness();
    let article = startPrivate(h);
    article = toQuestion(h, article);
    article = toArticle(h, article);
    article = {
      ...article,
      players: {
        ...article.players,
        p2: {
          ...(article.players.p2 as NonNullable<typeof article.players.p2>),
          status: 'FORFEITED',
        },
      },
    };
    article = event(h, article, { type: 'HOST_SKIP', actorId: 'p1' });
    expect(article.phase).toBe('MATCH_OVER');

    let level = startPrivate(h);
    level = {
      ...level,
      phase: 'LEVEL_COMPLETE',
      phaseStartedAt: h.now(),
      phaseEndsAt: h.now() + 15000,
      phaseToken: 'level',
      level: 1,
      questionsResolvedThisLevel: 20,
      players: {
        ...level.players,
        p2: { ...(level.players.p2 as NonNullable<typeof level.players.p2>), status: 'FORFEITED' },
      },
    };
    level = event(h, level, { type: 'HOST_SKIP', actorId: 'p1' });
    expect(level.phase).toBe('MATCH_OVER');
  });

  it('covers a solo answer resolving immediately and paused reveal snapshots', () => {
    const h = harness();
    let solo = startSolo(h);
    solo = toQuestion(h, solo);
    solo = answer(h, solo, 'p1', correct(solo));
    expect(solo.phase).toBe('REVEAL');

    let article = startPrivate(h);
    article = toQuestion(h, article);
    article = toArticle(h, article);
    article = event(h, article, { type: 'HOST_PAUSE', actorId: 'p1' });
    expect(toPublicState(article, h.now()).reveal).not.toBeNull();

    let reveal = startPrivate(h);
    reveal = toQuestion(h, reveal);
    reveal = answer(h, reveal, 'p1', correct(reveal));
    reveal = answer(h, reveal, 'p2', correct(reveal));
    reveal = event(h, reveal, { type: 'HOST_PAUSE', actorId: 'p1' });
    expect(toPublicState(reveal, h.now()).reveal).not.toBeNull();
  });

  it('covers mode shapes, difficulty and timer helpers', () => {
    const h = harness();
    expect(modeShape('SUBJECT')).toEqual({ totalLevels: 1, questionsPerLevel: 20 });
    expect(modeShape('CLASSIC')).toEqual({ totalLevels: 10, questionsPerLevel: 20 });
    expect(modeShape('CONTEST')).toEqual({ totalLevels: 1, questionsPerLevel: 10 });

    const noHost = createGameState({
      roomCode: 'NOHOST',
      mode: 'CLASSIC',
      difficulty: null,
      category: null,
      isPublic: false,
      isTikTok: false,
      isSolo: false,
      host: null,
      now: h.now(),
    });
    expect(noHost.hostId).toBeNull();

    let state = startContest(h);
    expect(difficultyForState(state)).toBe('Adventurer');
    expect(questionTimerMs(state)).toBe(20000);

    state = { ...state, mode: 'SUBJECT', difficulty: 'Adventurer' };
    expect(difficultyForState(state)).toBe('Adventurer');
    state = { ...state, difficulty: null };
    expect(difficultyForState(state)).toBe('Novice');

    const privateState = startPrivate(h);
    expect(phaseDurationMs(privateState, 'QUESTION')).toBe(25000);
    expect(phaseDurationMs(privateState, 'REVEAL')).toBe(2500);
    expect(phaseDurationMs(privateState, 'ARTICLE')).toBe(30000);
    expect(phaseDurationMs(privateState, 'LEVEL_COMPLETE')).toBe(15000);

    const tiktok = startTikTok(h);
    expect(phaseDurationMs(tiktok, 'ARTICLE')).toBe(8000);
  });
});
