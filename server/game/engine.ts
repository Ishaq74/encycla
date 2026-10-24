import type { GameEvent } from './events';
import { selectQuestion } from './questions';
import {
  CONTEST_BASE_POINTS,
  MAX_LIVES,
  buildFinalRanking,
  computeClassicPoints,
  computeContestBonuses,
  isClassable,
  toFinalResult,
  toScoreRecord,
  winnerFromRanking,
} from './scoring';
import {
  ARTICLE_MS,
  DISCONNECT_GRACE_MS,
  LEVEL_COMPLETE_MS,
  MATCH_OVER_TTL_MS,
  PAUSE_AUTO_RESUME_MS,
  REVEAL_MS,
  ROOM_INACTIVITY_MS,
  TIKTOK_ARTICLE_MS,
  activeCount,
  activePlayers,
  connectedActivePlayers,
  connectedCount,
  createGameState,
  createPlayer,
  difficultyForState,
  isActive,
  isConnectedActive,
  isFinalQuestion,
  phaseDurationMs,
  questionTimerMs,
  sortedPlayers,
  toPublicState,
} from './state-machine';
import type {
  EngineDeps,
  EngineEffect,
  EngineError,
  EngineErrorCode,
  FinalResult,
  GameState,
  MatchRecord,
  PlayerState,
  QuestionRuntime,
  ReduceResult,
} from './types';

interface InternalResult {
  state: GameState;
  effects: EngineEffect[];
  changed: boolean;
}

function ok(state: GameState, effects: EngineEffect[] = []): InternalResult {
  return { state, effects, changed: true };
}

function unchanged(state: GameState, effects: EngineEffect[] = []): InternalResult {
  return { state, effects, changed: false };
}

function reject(state: GameState, code: EngineErrorCode, message: string): ReduceResult {
  const error: EngineError = { code, message };
  return {
    state,
    effects: [
      {
        type: 'LOG',
        level: 'warn',
        event: 'EVENT_REJECTED',
        data: { code, roomCode: state.roomCode },
      },
    ],
    error,
  };
}

function finalize(previous: GameState, result: InternalResult, _touch: boolean): ReduceResult {
  if (!result.changed) {
    return { state: previous, effects: result.effects };
  }

  const state: GameState = {
    ...result.state,
    stateVersion: previous.stateVersion + 1,
  };

  return {
    state,
    effects: [...result.effects, { type: 'BROADCAST_STATE', roomCode: state.roomCode }],
  };
}

function schedule(state: GameState, effects: EngineEffect[]): void {
  effects.push({ type: 'CANCEL_SCHEDULE', roomCode: state.roomCode });
  if (state.phaseEndsAt !== null) {
    effects.push({ type: 'SCHEDULE_PHASE', roomCode: state.roomCode, at: state.phaseEndsAt });
  }
}

function withPlayers(state: GameState, players: Record<string, PlayerState>): GameState {
  return { ...state, players };
}

function withPlayer(state: GameState, player: PlayerState): GameState {
  return withPlayers(state, { ...state.players, [player.id]: player });
}

function removePlayer(state: GameState, playerId: string): GameState {
  const players = { ...state.players };
  delete players[playerId];
  return withPlayers(state, players);
}

function transferHost(state: GameState): GameState {
  if (state.isTikTok) {
    return state;
  }

  if (state.hostId !== null && state.players[state.hostId]) {
    const current = state.players[state.hostId] as PlayerState;
    if (isConnectedActive(current)) {
      return state;
    }
  }

  const nextHost =
    connectedActivePlayers(state)[0] ?? sortedPlayers(state).find(isConnectedActive) ?? null;

  return { ...state, hostId: nextHost?.id ?? null };
}

function scoreEffects(state: GameState, effects: EngineEffect[]): void {
  effects.push({
    type: 'PERSIST_SCORES',
    roomCode: state.roomCode,
    scores: sortedPlayers(state).map(toScoreRecord),
  });
}

function enterPhase(
  state: GameState,
  phase: GameState['phase'],
  now: number,
  durationMs: number | null,
  phaseToken: string | null,
): GameState {
  return {
    ...state,
    phase,
    pausedFrom: null,
    phaseStartedAt: now,
    phaseEndsAt: durationMs === null ? null : now + durationMs,
    pausedAt: null,
    remainingMsWhenPaused: null,
    phaseToken,
  };
}

function buildMatchRecord(state: GameState, matchId: string, startedAt: number): MatchRecord {
  return {
    id: matchId,
    roomCode: state.roomCode,
    mode: state.mode,
    source: state.isTikTok ? 'tiktok' : 'web',
    category: state.category,
    difficulty: state.difficulty,
    startedAt,
    playerCount: state.joinedPlayerCount,
    settings: { ...state.settings },
  };
}

function startCountdown(
  state: GameState,
  now: number,
  deps: EngineDeps,
  preloadedQuestion: QuestionRuntime,
): InternalResult {
  const matchId = deps.idFactory();
  const next: GameState = {
    ...enterPhase(state, 'COUNTDOWN', now, phaseDurationMs(state, 'COUNTDOWN'), deps.idFactory()),
    preloadedQuestion,
    matchId,
    matchStartedAt: now,
    matchStatus: 'in_progress',
    joinedPlayerCount: Math.max(state.joinedPlayerCount, Object.keys(state.players).length),
    closedReason: null,
  };
  const effects: EngineEffect[] = [
    {
      type: 'PERSIST_MATCH_STARTED',
      match: buildMatchRecord(next, matchId, now),
      players: sortedPlayers(next).map(toScoreRecord),
    },
  ];
  schedule(next, effects);
  return ok(next, effects);
}

function startQuestion(state: GameState, now: number, deps: EngineDeps): InternalResult {
  const selection = state.preloadedQuestion
    ? {
        runtime: state.preloadedQuestion,
        recycled: state.usedQuestionIds.includes(state.preloadedQuestion.question.id),
      }
    : selectQuestion(
        deps.questions.getQuestions(),
        state.category,
        state.usedQuestionIds,
        deps.random,
      );

  if (!selection) {
    const effects: EngineEffect[] = [
      {
        type: 'LOG',
        level: 'error',
        event: 'NO_QUESTIONS_AVAILABLE',
        data: { roomCode: state.roomCode, category: state.category },
      },
    ];
    const closed = closeRoom(state, now, 'NO_QUESTIONS_AVAILABLE', false);
    return { ...closed, effects: [...effects, ...closed.effects] };
  }

  const questionId = selection.runtime.question.id;
  const usedQuestionIds = state.usedQuestionIds.filter((id) => id !== questionId);
  usedQuestionIds.push(questionId);

  const players: Record<string, PlayerState> = {};
  for (const player of Object.values(state.players)) {
    players[player.id] = { ...player, answer: null };
  }

  const timerMs = questionTimerMs(state);
  let next: GameState = {
    ...enterPhase(state, 'QUESTION', now, timerMs, deps.idFactory()),
    level: state.level,
    questionIndex: state.questionsResolvedThisLevel,
    players,
    question: selection.runtime,
    preloadedQuestion: null,
    usedQuestionIds,
    questionParticipantIds: sortedPlayers(state)
      .filter(isActive)
      .map((player) => player.id),
    continueReady: [],
    lastReveal: null,
    lastResults: null,
    shouldEndAfterReveal: false,
  };

  const effects: EngineEffect[] = [];
  if (selection.recycled) {
    effects.push({
      type: 'LOG',
      level: 'warn',
      event: 'QUESTION_RECYCLED',
      data: { roomCode: state.roomCode, questionId },
    });
  }

  if (state.isTikTok && (!state.tiktokConnected || state.tiktokPausePending)) {
    next = {
      ...next,
      phase: 'PAUSED',
      pausedFrom: 'QUESTION',
      pausedAt: now,
      phaseEndsAt: null,
      remainingMsWhenPaused: timerMs,
      tiktokPausePending: false,
    };
    effects.push({ type: 'CANCEL_SCHEDULE', roomCode: next.roomCode });
  } else {
    schedule(next, effects);
  }

  return ok(next, effects);
}

function revealFor(question: QuestionRuntime) {
  return {
    questionId: question.question.id,
    subject: question.question.subject,
    questionText: question.question.questionText,
    options: [...question.options],
    correctIndex: question.correctIndex,
    explanation: question.question.explanation,
    articleTitle: question.question.articleTitle,
    articleBody: question.question.articleBody,
    image: question.question.image ?? null,
  };
}

function resolveQuestion(state: GameState, now: number): InternalResult {
  const runtime = state.question;
  if (!runtime) {
    return unchanged(state);
  }

  const timerMs = questionTimerMs(state);
  const startedAt = state.phaseStartedAt ?? now;
  const participantIds = Array.from(
    new Set([...state.questionParticipantIds, ...activePlayers(state).map((player) => player.id)]),
  );
  const results = [];
  const updatedPlayers = { ...state.players };

  for (const playerId of participantIds) {
    const player = state.players[playerId];
    if (!player || player.status === 'FORFEITED' || player.status === 'LEFT') {
      continue;
    }

    const answer = player.answer?.questionId === runtime.question.id ? player.answer : null;
    const correct = answer !== null && answer.choiceIndex === runtime.correctIndex;
    const timedOut = answer === null;
    const responseTimeMs =
      answer === null ? null : Math.min(timerMs, Math.max(0, answer.receivedAt - startedAt));

    let points = 0;
    let lives = player.lives;
    let streak = player.streak;
    let bestStreak = player.bestStreak;
    let correctCount = player.correctCount;
    let wrongCount = player.wrongCount;
    let timeoutCount = player.timeoutCount;
    let totalResponseMs = player.totalResponseMs;
    let status = player.status;

    if (state.mode === 'CONTEST') {
      points = correct ? CONTEST_BASE_POINTS : 0;
      if (correct) {
        correctCount += 1;
      } else if (timedOut) {
        timeoutCount += 1;
      } else {
        wrongCount += 1;
      }
      totalResponseMs += responseTimeMs ?? timerMs;
    } else {
      points = computeClassicPoints({
        correct,
        difficulty: difficultyForState(state),
        level: state.level,
        responseTimeMs,
        streakBefore: player.streak,
      });

      if (correct) {
        correctCount += 1;
        streak += 1;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
        if (timedOut) {
          timeoutCount += 1;
        } else {
          wrongCount += 1;
        }
        lives -= 1;
        if (lives <= 0) {
          lives = 0;
          status = 'ELIMINATED';
        }
      }
      totalResponseMs += responseTimeMs ?? timerMs;
    }

    updatedPlayers[playerId] = {
      ...player,
      score: player.score + points,
      lives,
      streak,
      bestStreak,
      correctCount,
      wrongCount,
      timeoutCount,
      totalResponseMs,
      status,
    };

    results.push({
      playerId,
      choiceIndex: answer?.choiceIndex ?? null,
      correct,
      timedOut,
      responseTimeMs,
      pointsAwarded: points,
    });
  }

  if (state.mode === 'CONTEST') {
    const bonuses = computeContestBonuses(results);
    for (const result of results) {
      const bonus = bonuses.get(result.playerId) ?? 0;
      if (bonus === 0) {
        continue;
      }
      result.pointsAwarded += bonus;
      const player = updatedPlayers[result.playerId] as PlayerState;
      updatedPlayers[result.playerId] = {
        ...player,
        score: player.score + bonus,
      };
    }
  }

  const nextQuestionsResolved = state.questionsResolvedThisLevel + 1;
  const isFinal =
    state.level >= state.totalLevels && nextQuestionsResolved >= state.questionsPerLevel;
  const remainingActive = Object.values(updatedPlayers).filter(isActive).length;
  const minimumActive = state.isSolo ? 1 : 2;
  const earlyFinish = !state.isTikTok && !isFinal && remainingActive < minimumActive;

  const next: GameState = {
    ...enterPhase(state, 'REVEAL', now, REVEAL_MS, null),
    players: updatedPlayers,
    question: null,
    preloadedQuestion: null,
    questionsResolvedThisLevel: nextQuestionsResolved,
    totalQuestionsAnswered: state.totalQuestionsAnswered + 1,
    questionParticipantIds: [],
    continueReady: [],
    lastReveal: revealFor(runtime),
    lastResults: results,
    shouldEndAfterReveal: earlyFinish,
  };

  const effects: EngineEffect[] = [];
  scoreEffects(next, effects);
  schedule(next, effects);
  return ok(next, effects);
}

function enterArticle(state: GameState, now: number, deps: EngineDeps): InternalResult {
  const next = {
    ...enterPhase(
      state,
      'ARTICLE',
      now,
      state.isTikTok ? TIKTOK_ARTICLE_MS : ARTICLE_MS,
      deps.idFactory(),
    ),
    continueReady: [],
    shouldEndAfterReveal: false,
  };
  const effects: EngineEffect[] = [];
  schedule(next, effects);
  return ok(next, effects);
}

function enterLevelComplete(state: GameState, now: number, deps: EngineDeps): InternalResult {
  let players = state.players;
  if (state.isSolo) {
    const refilled: Record<string, PlayerState> = {};
    for (const player of Object.values(state.players)) {
      refilled[player.id] = isActive(player) ? { ...player, lives: MAX_LIVES } : player;
    }
    players = refilled;
  }

  const next = {
    ...enterPhase(state, 'LEVEL_COMPLETE', now, LEVEL_COMPLETE_MS, deps.idFactory()),
    players,
    continueReady: [],
    shouldEndAfterReveal: false,
  };
  const effects: EngineEffect[] = [];
  schedule(next, effects);
  return ok(next, effects);
}

function advanceFromArticle(state: GameState, now: number, deps: EngineDeps): InternalResult {
  const minimumActive = state.isSolo ? 1 : 2;
  if (!state.isTikTok && activeCount(state) < minimumActive) {
    return finishMatch(state, now, false);
  }

  if (isFinalQuestion(state)) {
    return finishMatch(state, now, false);
  }

  if (state.questionsResolvedThisLevel >= state.questionsPerLevel) {
    return enterLevelComplete(state, now, deps);
  }

  return startQuestion(state, now, deps);
}

function advanceFromLevelComplete(state: GameState, now: number, deps: EngineDeps): InternalResult {
  const minimumActive = state.isSolo ? 1 : 2;
  if (!state.isTikTok && activeCount(state) < minimumActive) {
    return finishMatch(state, now, false);
  }

  if (state.level >= state.totalLevels) {
    return finishMatch(state, now, false);
  }

  const next: GameState = {
    ...state,
    level: state.level + 1,
    questionIndex: 0,
    questionsResolvedThisLevel: 0,
  };
  return startQuestion(next, now, deps);
}

function finishMatch(state: GameState, now: number, forceAbandoned: boolean): InternalResult {
  const players = sortedPlayers(state);
  const classable = players.filter(isClassable);
  const completed = !forceAbandoned && classable.length > 0;
  const ranking = completed ? buildFinalRanking(players) : [];
  const winnerId = completed ? winnerFromRanking(ranking) : null;
  const effects: EngineEffect[] = [];

  if (state.matchId !== null && state.matchStatus === 'in_progress') {
    if (completed) {
      const results: FinalResult[] = ranking
        .map((entry) => {
          const player = state.players[entry.playerId];
          return player ? toFinalResult(player, entry) : null;
        })
        .filter((result): result is FinalResult => result !== null);
      effects.push({
        type: 'PERSIST_MATCH_COMPLETED',
        matchId: state.matchId,
        results,
      });
    } else {
      effects.push({ type: 'PERSIST_MATCH_ABANDONED', matchId: state.matchId });
    }
  }

  const next: GameState = {
    ...enterPhase(state, 'MATCH_OVER', now, MATCH_OVER_TTL_MS, null),
    question: null,
    preloadedQuestion: null,
    continueReady: [],
    shouldEndAfterReveal: false,
    finalRanking: ranking,
    winnerId,
    matchStatus: completed ? 'completed' : 'abandoned',
    closedReason: null,
  };
  schedule(next, effects);
  return ok(next, effects);
}

function closeRoom(
  state: GameState,
  now: number,
  reason: string,
  requeuePublicPlayers: boolean,
): InternalResult {
  const effects: EngineEffect[] = [];
  if (state.matchId !== null && state.matchStatus === 'in_progress') {
    effects.push({ type: 'PERSIST_MATCH_ABANDONED', matchId: state.matchId });
  }

  if (requeuePublicPlayers && state.isPublic) {
    effects.push({
      type: 'REQUEUE_PUBLIC_PLAYERS',
      roomCode: state.roomCode,
      playerIds: sortedPlayers(state)
        .filter((player) => player.status === 'CONNECTED')
        .map((player) => player.id),
    });
  }

  effects.push({ type: 'EMIT_ROOM_CLOSED', roomCode: state.roomCode, reason });
  effects.push({ type: 'CANCEL_SCHEDULE', roomCode: state.roomCode });

  const next: GameState = {
    ...state,
    phase: 'CLOSED',
    pausedFrom: null,
    phaseStartedAt: now,
    phaseEndsAt: null,
    pausedAt: null,
    remainingMsWhenPaused: null,
    phaseToken: null,
    question: null,
    preloadedQuestion: null,
    continueReady: [],
    shouldEndAfterReveal: false,
    finalRanking: state.matchStatus === 'completed' ? state.finalRanking : [],
    winnerId: state.matchStatus === 'completed' ? state.winnerId : null,
    matchStatus: state.matchStatus === 'in_progress' ? 'abandoned' : state.matchStatus,
    closedReason: reason,
  };

  return ok(next, effects);
}

function pauseState(state: GameState, now: number): InternalResult {
  const remainingMs = Math.max(0, (state.phaseEndsAt ?? now) - now);
  const next: GameState = {
    ...state,
    phase: 'PAUSED',
    pausedFrom: state.phase,
    pausedAt: now,
    phaseEndsAt: null,
    remainingMsWhenPaused: remainingMs,
  };
  return ok(next, [{ type: 'CANCEL_SCHEDULE', roomCode: state.roomCode }]);
}

function resumeState(state: GameState, now: number): InternalResult {
  const resumePhase = state.pausedFrom;
  if (resumePhase === null) {
    return unchanged(state);
  }

  const remainingMs = state.remainingMsWhenPaused ?? 0;
  const pausedFor = state.pausedAt === null ? 0 : Math.max(0, now - state.pausedAt);
  const phaseStartedAt = state.phaseStartedAt === null ? now : state.phaseStartedAt + pausedFor;

  const next: GameState = {
    ...state,
    phase: resumePhase,
    pausedFrom: null,
    phaseStartedAt,
    phaseEndsAt: now + remainingMs,
    pausedAt: null,
    remainingMsWhenPaused: null,
  };
  const effects: EngineEffect[] = [];
  schedule(next, effects);
  return ok(next, effects);
}

function actorIsHost(
  state: GameState,
  event: { actorId: string | null; isControl?: boolean },
): boolean {
  if (state.isTikTok) {
    return event.isControl === true;
  }
  if (state.isPublic) {
    return false;
  }
  return event.actorId !== null && event.actorId === state.hostId;
}

function minimumActive(state: GameState): number {
  return state.isSolo ? 1 : 2;
}

function applyActiveConsequences(state: GameState, now: number): InternalResult {
  if (state.phase === 'CLOSED' || state.phase === 'MATCH_OVER') {
    return unchanged(state);
  }

  if (state.phase === 'COUNTDOWN') {
    if (state.isTikTok) {
      return unchanged(state);
    }
    const invalidPublic =
      state.isPublic && sortedPlayers(state).some((player) => player.status !== 'CONNECTED');
    if (invalidPublic || activeCount(state) < minimumActive(state)) {
      return closeRoom(state, now, 'MATCH_CANCELLED', state.isPublic);
    }
    return unchanged(state);
  }

  if (state.phase === 'QUESTION') {
    if (!state.isTikTok && activeCount(state) === 0) {
      return resolveQuestion(state, now);
    }
    return unchanged(state);
  }

  if (state.phase === 'REVEAL') {
    if (!state.isTikTok && activeCount(state) < minimumActive(state)) {
      return ok({ ...state, shouldEndAfterReveal: true });
    }
    return unchanged(state);
  }

  if (state.phase === 'ARTICLE' || state.phase === 'LEVEL_COMPLETE') {
    if (!state.isTikTok && activeCount(state) < minimumActive(state)) {
      return finishMatch(state, now, false);
    }
    return unchanged(state);
  }

  if (state.phase === 'PAUSED') {
    if (state.isTikTok || activeCount(state) >= minimumActive(state)) {
      return unchanged(state);
    }
    if (state.pausedFrom === 'ARTICLE' || state.pausedFrom === 'LEVEL_COMPLETE') {
      return finishMatch(state, now, false);
    }
    if (state.pausedFrom === 'REVEAL') {
      return ok({ ...state, shouldEndAfterReveal: true });
    }
  }

  return unchanged(state);
}

function expireDisconnects(state: GameState, now: number): InternalResult {
  let next = state;
  const effects: EngineEffect[] = [];
  let changed = false;

  for (const player of sortedPlayers(state)) {
    if (
      player.status !== 'DISCONNECTED' ||
      player.disconnectedAt === null ||
      now - player.disconnectedAt < DISCONNECT_GRACE_MS
    ) {
      continue;
    }

    if (next.phase === 'LOBBY') {
      next = removePlayer(next, player.id);
      next = transferHost(next);
      changed = true;
      if (Object.keys(next.players).length === 0) {
        return closeRoom(next, now, 'EMPTY_ROOM', false);
      }
      continue;
    }

    const forfeited: PlayerState = {
      ...player,
      status: 'FORFEITED',
      disconnectedAt: null,
      answer: null,
    };
    next = withPlayer(next, forfeited);
    next = transferHost(next);
    changed = true;
    effects.push({
      type: 'PERSIST_SCORES',
      roomCode: next.roomCode,
      scores: [toScoreRecord(forfeited)],
    });

    if (next.isSolo) {
      const closed = closeRoom(next, now, 'PLAYER_DISCONNECTED', false);
      return { ...closed, effects: [...effects, ...closed.effects] };
    }
  }

  if (!changed) {
    return unchanged(state);
  }

  return { state: next, effects, changed: true };
}

function handleJoin(
  state: GameState,
  event: Extract<GameEvent, { type: 'PLAYER_JOIN' }>,
  now: number,
): InternalResult {
  if (state.players[event.player.id]) {
    return unchanged(state);
  }

  const allowed =
    state.phase === 'LOBBY' ||
    (state.isTikTok && state.phase !== 'CLOSED' && state.phase !== 'MATCH_OVER');
  if (!allowed) {
    return unchanged(state);
  }

  if (state.joinedPlayerCount >= state.settings.maxPlayers) {
    return unchanged(state);
  }

  const player = createPlayer(event.player, now, state.mode === 'CONTEST' ? 0 : MAX_LIVES);
  let next = withPlayer(state, player);
  next = {
    ...next,
    hostId: next.hostId ?? (next.isTikTok ? null : player.id),
    joinedPlayerCount: next.joinedPlayerCount + 1,
  };

  if (next.phase === 'QUESTION' || (next.phase === 'PAUSED' && next.pausedFrom === 'QUESTION')) {
    next = {
      ...next,
      questionParticipantIds: [...next.questionParticipantIds, player.id],
    };
  }

  return ok(next);
}

function handleLeave(state: GameState, playerId: string, now: number): InternalResult {
  const player = state.players[playerId];
  if (!player) {
    return unchanged(state);
  }

  if (state.phase === 'CLOSED' || state.phase === 'MATCH_OVER') {
    return unchanged(state);
  }

  if (state.phase === 'LOBBY') {
    let next = removePlayer(state, playerId);
    next = transferHost(next);
    if (Object.keys(next.players).length === 0) {
      return closeRoom(next, now, 'EMPTY_ROOM', false);
    }
    return ok(next);
  }

  if (state.phase === 'COUNTDOWN') {
    let next = removePlayer(state, playerId);
    next = transferHost(next);
    if (state.isTikTok) {
      return ok(next);
    }
    return closeRoom(next, now, 'MATCH_CANCELLED', state.isPublic);
  }

  if (state.isSolo) {
    return closeRoom(state, now, 'PLAYER_LEFT', false);
  }

  const forfeited: PlayerState = {
    ...player,
    status: 'FORFEITED',
    disconnectedAt: null,
    answer: null,
  };
  let next = removePlayer(state, playerId);
  next = transferHost(next);
  const effects: EngineEffect[] = [
    {
      type: 'PERSIST_SCORES',
      roomCode: next.roomCode,
      scores: [toScoreRecord(forfeited)],
    },
  ];

  const consequences = applyActiveConsequences(next, now);
  if (consequences.changed) {
    return {
      state: consequences.state,
      effects: [...effects, ...consequences.effects],
      changed: true,
    };
  }

  return { state: next, effects, changed: true };
}

function handleDisconnect(state: GameState, playerId: string, now: number): InternalResult {
  const player = state.players[playerId];
  if (!player || player.status !== 'CONNECTED') {
    return unchanged(state);
  }

  const next = withPlayer(state, {
    ...player,
    status: 'DISCONNECTED',
    disconnectedAt: now,
  });

  if (next.phase === 'COUNTDOWN' && !next.isTikTok) {
    if (next.isPublic) {
      return closeRoom(next, now, 'MATCH_CANCELLED', true);
    }
    if (activeCount(next) < minimumActive(next)) {
      return closeRoom(next, now, 'MATCH_CANCELLED', false);
    }
  }

  return ok(next);
}

function handleReconnect(state: GameState, playerId: string): InternalResult {
  const player = state.players[playerId];
  if (!player) {
    return unchanged(state);
  }
  if (player.status === 'CONNECTED') {
    return unchanged(state);
  }
  if (player.status !== 'DISCONNECTED') {
    return unchanged(state);
  }

  return ok(withPlayer(state, { ...player, status: 'CONNECTED', disconnectedAt: null }));
}

function handleReady(state: GameState, playerId: string, ready: boolean): InternalResult {
  if (state.phase !== 'LOBBY') {
    return unchanged(state);
  }
  const player = state.players[playerId];
  if (!player || player.status !== 'CONNECTED') {
    return unchanged(state);
  }
  return ok(withPlayer(state, { ...player, isReady: ready }));
}

function handleGameStart(
  state: GameState,
  event: Extract<GameEvent, { type: 'GAME_START' }>,
  now: number,
  deps: EngineDeps,
): ReduceResult {
  if (state.phase !== 'LOBBY') {
    return reject(state, 'INVALID_PHASE', 'The room is not in the lobby.');
  }

  if (state.isPublic) {
    if (event.system !== true) {
      return reject(state, 'NOT_HOST', 'Public rooms start automatically.');
    }
  } else if (state.isTikTok) {
    if (event.isControl !== true) {
      return reject(state, 'NOT_HOST', 'Only the TikTok control can start the match.');
    }
    if (!state.tiktokConnected) {
      return reject(state, 'TIKTOK_NOT_CONNECTED', 'The TikTok chat connector is offline.');
    }
  } else if (event.actorId === null || event.actorId !== state.hostId) {
    return reject(state, 'NOT_HOST', 'Only the host can start the match.');
  } else if (state.players[event.actorId]?.status !== 'CONNECTED') {
    return reject(state, 'NOT_HOST', 'The host is not connected.');
  }

  if (state.isSolo) {
    if (connectedCount(state) < 1) {
      return reject(state, 'NOT_ENOUGH_PLAYERS', 'The solo player is not connected.');
    }
  } else if (state.isPublic) {
    if (connectedCount(state) < 2) {
      return reject(state, 'NOT_ENOUGH_PLAYERS', 'At least two connected players are required.');
    }
    if (connectedCount(state) !== Object.keys(state.players).length) {
      return reject(state, 'NOT_ENOUGH_PLAYERS', 'Every public player must be connected.');
    }
  } else if (state.isTikTok) {
    if (!state.tiktokConnected) {
      return reject(state, 'TIKTOK_NOT_CONNECTED', 'The TikTok chat connector is offline.');
    }
  } else {
    const connected = connectedActivePlayers(state);
    if (connected.length < 2) {
      return reject(state, 'NOT_ENOUGH_PLAYERS', 'At least two connected players are required.');
    }
    if (connected.some((player) => !player.isReady)) {
      return reject(state, 'PLAYERS_NOT_READY', 'Every connected player must be ready.');
    }
  }

  const preloaded = selectQuestion(
    deps.questions.getQuestions(),
    state.category,
    state.usedQuestionIds,
    deps.random,
  );
  if (!preloaded) {
    return reject(state, 'NO_QUESTIONS_AVAILABLE', 'No question is available for this room.');
  }

  return finalize(state, startCountdown(state, now, deps, preloaded.runtime), true);
}

function handleAnswer(
  state: GameState,
  playerId: string,
  questionId: string,
  choiceIndex: number,
  now: number,
): ReduceResult {
  if (state.phase !== 'QUESTION') {
    return reject(state, 'INVALID_PHASE', 'Answers are only accepted during a question.');
  }
  const player = state.players[playerId];
  if (!player) {
    return reject(state, 'NOT_IN_ROOM', 'The player is not in this room.');
  }
  if (player.status === 'ELIMINATED') {
    return reject(state, 'PLAYER_ELIMINATED', 'The player is eliminated.');
  }
  if (player.status === 'FORFEITED' || player.status === 'LEFT') {
    return reject(state, 'PLAYER_FORFEITED', 'The player has forfeited.');
  }
  if (player.status === 'DISCONNECTED') {
    return reject(state, 'PLAYER_NOT_CONNECTED', 'The player is disconnected.');
  }
  if (!state.question || state.question.question.id !== questionId) {
    return reject(state, 'QUESTION_MISMATCH', 'The question does not match the current one.');
  }
  if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 3) {
    return reject(state, 'INVALID_OPTION', 'The choice must be an integer between 0 and 3.');
  }
  if (player.answer !== null) {
    return reject(state, 'ANSWER_ALREADY_SUBMITTED', 'The player already answered this question.');
  }
  if (state.phaseEndsAt !== null && now > state.phaseEndsAt) {
    return reject(state, 'ANSWER_TOO_LATE', 'The question timer has expired.');
  }

  const next = withPlayer(state, {
    ...player,
    answer: { questionId, choiceIndex, receivedAt: now },
  });
  const effects: EngineEffect[] = [
    {
      type: 'EMIT_PLAYER_LOCKED',
      roomCode: state.roomCode,
      playerId,
      questionId,
    },
  ];

  const connected = connectedActivePlayers(next);
  const allAnswered =
    connected.length > 0 &&
    connected.every((candidate) => candidate.answer?.questionId === questionId);

  if (allAnswered) {
    const resolved = resolveQuestion(next, now);
    return finalize(state, { ...resolved, effects: [...effects, ...resolved.effects] }, true);
  }

  return finalize(state, ok(next, effects), true);
}

function handleManualAnswer(
  state: GameState,
  event: Extract<GameEvent, { type: 'HOST_MANUAL_ANSWER' }>,
  now: number,
): ReduceResult {
  if (!state.isTikTok || event.isControl !== true) {
    return reject(state, 'NOT_HOST', 'Only the TikTok control can submit manual answers.');
  }
  if (state.phase !== 'QUESTION') {
    return reject(state, 'INVALID_PHASE', 'Answers are only accepted during a question.');
  }
  const player = state.players[event.playerId];
  if (!player) {
    return reject(state, 'NOT_IN_ROOM', 'The player is not in this room.');
  }
  if (player.status === 'ELIMINATED') {
    return reject(state, 'PLAYER_ELIMINATED', 'The player is eliminated.');
  }
  if (player.status === 'FORFEITED' || player.status === 'LEFT') {
    return reject(state, 'PLAYER_FORFEITED', 'The player has forfeited.');
  }
  if (!state.question) {
    return reject(state, 'INVALID_PHASE', 'No question is active.');
  }
  if (!Number.isInteger(event.choiceIndex) || event.choiceIndex < 0 || event.choiceIndex > 3) {
    return reject(state, 'INVALID_OPTION', 'The choice must be an integer between 0 and 3.');
  }
  if (player.answer !== null) {
    return reject(state, 'ANSWER_ALREADY_SUBMITTED', 'The player already answered this question.');
  }
  if (state.phaseEndsAt !== null && now > state.phaseEndsAt) {
    return reject(state, 'ANSWER_TOO_LATE', 'The question timer has expired.');
  }

  const questionId = state.question.question.id;
  const next = withPlayer(state, {
    ...player,
    answer: { questionId, choiceIndex: event.choiceIndex, receivedAt: now },
  });
  const effects: EngineEffect[] = [
    {
      type: 'EMIT_PLAYER_LOCKED',
      roomCode: state.roomCode,
      playerId: player.id,
      questionId,
    },
  ];

  const connected = connectedActivePlayers(next);
  const allAnswered =
    connected.length > 0 &&
    connected.every((candidate) => candidate.answer?.questionId === questionId);

  if (allAnswered) {
    const resolved = resolveQuestion(next, now);
    return finalize(state, { ...resolved, effects: [...effects, ...resolved.effects] }, true);
  }

  return finalize(state, ok(next, effects), true);
}

function handleContinue(
  state: GameState,
  playerId: string,
  phaseToken: string,
  now: number,
  deps: EngineDeps,
): ReduceResult {
  if (state.phase !== 'ARTICLE' && state.phase !== 'LEVEL_COMPLETE') {
    return reject(state, 'INVALID_PHASE', 'Continue is not accepted in this phase.');
  }
  const player = state.players[playerId];
  if (!player) {
    return reject(state, 'NOT_IN_ROOM', 'The player is not in this room.');
  }
  if (player.status === 'ELIMINATED') {
    return reject(state, 'PLAYER_ELIMINATED', 'The player is eliminated.');
  }
  if (player.status === 'FORFEITED' || player.status === 'LEFT') {
    return reject(state, 'PLAYER_FORFEITED', 'The player has forfeited.');
  }
  if (player.status !== 'CONNECTED') {
    return reject(state, 'PLAYER_NOT_CONNECTED', 'The player is disconnected.');
  }
  if (state.phaseToken === null || phaseToken !== state.phaseToken) {
    return reject(state, 'STALE_PHASE_TOKEN', 'The phase token is stale.');
  }
  if (state.continueReady.includes(playerId)) {
    return { state, effects: [] };
  }

  const ready = [...state.continueReady, playerId];
  const next = { ...state, continueReady: ready };
  const connected = connectedActivePlayers(next);
  const allReady =
    connected.length > 0 && connected.every((candidate) => ready.includes(candidate.id));

  if (allReady) {
    const advanced =
      state.phase === 'ARTICLE'
        ? advanceFromArticle(next, now, deps)
        : advanceFromLevelComplete(next, now, deps);
    return finalize(state, advanced, true);
  }

  return finalize(state, ok(next), true);
}

function handleHostPause(
  state: GameState,
  event: Extract<GameEvent, { type: 'HOST_PAUSE' }>,
  now: number,
): ReduceResult {
  if (!actorIsHost(state, event)) {
    return reject(state, 'NOT_HOST', 'Only the host can pause the room.');
  }
  if (
    state.phase !== 'QUESTION' &&
    state.phase !== 'REVEAL' &&
    state.phase !== 'ARTICLE' &&
    state.phase !== 'LEVEL_COMPLETE'
  ) {
    return reject(state, 'INVALID_PHASE', 'The room cannot be paused in this phase.');
  }
  return finalize(state, pauseState(state, now), true);
}

function handleHostResume(
  state: GameState,
  event: Extract<GameEvent, { type: 'HOST_RESUME' }>,
  now: number,
): ReduceResult {
  if (!actorIsHost(state, event)) {
    return reject(state, 'NOT_HOST', 'Only the host can resume the room.');
  }
  if (state.phase !== 'PAUSED') {
    return reject(state, 'INVALID_PHASE', 'The room is not paused.');
  }
  return finalize(state, resumeState(state, now), true);
}

function handleHostSkip(
  state: GameState,
  event: Extract<GameEvent, { type: 'HOST_SKIP' }>,
  now: number,
  deps: EngineDeps,
): ReduceResult {
  if (state.isTikTok) {
    if (event.isControl !== true) {
      return reject(state, 'NOT_HOST', 'Only the TikTok control can skip.');
    }
    if (
      state.phase !== 'QUESTION' &&
      state.phase !== 'ARTICLE' &&
      state.phase !== 'LEVEL_COMPLETE'
    ) {
      return reject(state, 'INVALID_PHASE', 'The room cannot be skipped in this phase.');
    }
  } else {
    if (state.isPublic || state.isSolo || !actorIsHost(state, event)) {
      return reject(state, 'NOT_HOST', 'This room does not allow host skips.');
    }
    if (state.phase !== 'ARTICLE' && state.phase !== 'LEVEL_COMPLETE') {
      return reject(state, 'INVALID_PHASE', 'Only an article or level summary can be skipped.');
    }
  }

  if (state.phase === 'QUESTION') {
    return finalize(state, resolveQuestion(state, now), true);
  }
  if (state.phase === 'ARTICLE') {
    return finalize(state, advanceFromArticle(state, now, deps), true);
  }
  return finalize(state, advanceFromLevelComplete(state, now, deps), true);
}

function handleHostClose(
  state: GameState,
  event: Extract<GameEvent, { type: 'HOST_CLOSE' }>,
  now: number,
): ReduceResult {
  if (!actorIsHost(state, event) || state.isSolo) {
    return reject(state, 'NOT_HOST', 'Only the host can close the room.');
  }
  if (state.phase === 'CLOSED' || state.phase === 'MATCH_OVER') {
    return reject(state, 'INVALID_PHASE', 'The room is already terminal.');
  }
  return finalize(state, closeRoom(state, now, 'HOST_CLOSE', false), true);
}

function handleTikTokConnection(state: GameState, connected: boolean, now: number): ReduceResult {
  if (!state.isTikTok) {
    return reject(state, 'INVALID_EVENT', 'Only TikTok rooms track a chat connector.');
  }

  let next = { ...state, tiktokConnected: connected };

  if (!connected) {
    if (next.phase === 'COUNTDOWN') {
      next = { ...next, tiktokPausePending: true };
    } else if (
      next.phase === 'QUESTION' ||
      next.phase === 'REVEAL' ||
      next.phase === 'ARTICLE' ||
      next.phase === 'LEVEL_COMPLETE'
    ) {
      const paused = pauseState(next, now);
      return finalize(state, paused, true);
    }
  } else {
    next = { ...next, tiktokPausePending: false };
  }

  return finalize(state, ok(next), true);
}

function reduceInternal(
  state: GameState,
  event: GameEvent,
  deps: EngineDeps,
  now: number,
): ReduceResult {
  switch (event.type) {
    case 'PLAYER_JOIN': {
      const joined = handleJoin(state, event, now);
      return finalize(state, joined, true);
    }
    case 'PLAYER_LEAVE': {
      const left = handleLeave(state, event.playerId, now);
      return finalize(state, left, true);
    }
    case 'PLAYER_DISCONNECT': {
      const disconnected = handleDisconnect(state, event.playerId, now);
      return finalize(state, disconnected, true);
    }
    case 'PLAYER_RECONNECT': {
      const reconnected = handleReconnect(state, event.playerId);
      return finalize(state, reconnected, true);
    }
    case 'LOBBY_READY': {
      const ready = handleReady(state, event.playerId, event.ready);
      return finalize(state, ready, true);
    }
    case 'GAME_START':
      return handleGameStart(state, event, now, deps);
    case 'ANSWER':
      return handleAnswer(state, event.playerId, event.questionId, event.choiceIndex, now);
    case 'CONTINUE':
      return handleContinue(state, event.playerId, event.phaseToken, now, deps);
    case 'HOST_PAUSE':
      return handleHostPause(state, event, now);
    case 'HOST_RESUME':
      return handleHostResume(state, event, now);
    case 'HOST_SKIP':
      return handleHostSkip(state, event, now, deps);
    case 'HOST_MANUAL_ANSWER':
      return handleManualAnswer(state, event, now);
    case 'HOST_CLOSE':
      return handleHostClose(state, event, now);
    case 'TIKTOK_CONNECTION_CHANGED':
      return handleTikTokConnection(state, event.connected, now);
  }
}

export function reduce(state: GameState, event: GameEvent, deps: EngineDeps): ReduceResult {
  const now = deps.now();
  const result = reduceInternal(state, event, deps, now);
  if (result.state === state || result.error !== undefined) {
    return result;
  }
  return { ...result, state: { ...result.state, lastActivityAt: now } };
}

export function tick(state: GameState, now: number, deps: EngineDeps): ReduceResult {
  if (state.phase === 'CLOSED') {
    return { state, effects: [] };
  }

  if (state.phase === 'MATCH_OVER') {
    if (state.phaseEndsAt !== null && now >= state.phaseEndsAt) {
      return finalize(state, closeRoom(state, now, 'MATCH_OVER_TTL', false), false);
    }
    return { state, effects: [] };
  }

  if (state.phase === 'PAUSED') {
    if (
      !state.isTikTok &&
      state.pausedAt !== null &&
      now - state.pausedAt >= PAUSE_AUTO_RESUME_MS
    ) {
      return finalize(state, resumeState(state, now), false);
    }
    return { state, effects: [] };
  }

  const expired = expireDisconnects(state, now);
  let working = expired.state;
  const effects: EngineEffect[] = [...expired.effects];
  let changed = expired.changed;

  if (working.phase === 'CLOSED') {
    return changed
      ? finalize(state, { state: working, effects, changed }, false)
      : { state, effects };
  }

  if (working.phase === 'COUNTDOWN' && working.isPublic) {
    if (sortedPlayers(working).some((player) => player.status !== 'CONNECTED')) {
      const cancelled = closeRoom(working, now, 'MATCH_CANCELLED', true);
      return finalize(
        state,
        {
          state: cancelled.state,
          effects: [...effects, ...cancelled.effects],
          changed: true,
        },
        false,
      );
    }
  }

  const consequences = applyActiveConsequences(working, now);
  if (consequences.changed) {
    working = consequences.state;
    effects.push(...consequences.effects);
    changed = true;
  }

  if (working.phase === 'MATCH_OVER' || working.phase === 'CLOSED') {
    return changed
      ? finalize(state, { state: working, effects, changed }, false)
      : { state, effects };
  }

  if (connectedCount(working) === 0 && now - working.lastActivityAt >= ROOM_INACTIVITY_MS) {
    const closed = closeRoom(working, now, 'INACTIVE', false);
    return finalize(
      state,
      {
        state: closed.state,
        effects: [...effects, ...closed.effects],
        changed: true,
      },
      false,
    );
  }

  if (working.phaseEndsAt === null || now < working.phaseEndsAt) {
    return changed
      ? finalize(state, { state: working, effects, changed }, false)
      : { state, effects };
  }

  if (working.phase === 'COUNTDOWN') {
    if (
      working.isPublic &&
      sortedPlayers(working).some((player) => player.status !== 'CONNECTED')
    ) {
      const cancelled = closeRoom(working, now, 'MATCH_CANCELLED', true);
      return finalize(
        state,
        {
          state: cancelled.state,
          effects: [...effects, ...cancelled.effects],
          changed: true,
        },
        false,
      );
    }
    const started = startQuestion(working, now, deps);
    return finalize(
      state,
      {
        state: started.state,
        effects: [...effects, ...started.effects],
        changed: true,
      },
      false,
    );
  }

  if (working.phase === 'QUESTION') {
    const resolved = resolveQuestion(working, now);
    return finalize(
      state,
      {
        state: resolved.state,
        effects: [...effects, ...resolved.effects],
        changed: true,
      },
      false,
    );
  }

  if (working.phase === 'REVEAL') {
    const advanced = working.shouldEndAfterReveal
      ? finishMatch(working, now, false)
      : enterArticle(working, now, deps);
    return finalize(
      state,
      {
        state: advanced.state,
        effects: [...effects, ...advanced.effects],
        changed: true,
      },
      false,
    );
  }

  if (working.phase === 'ARTICLE') {
    const advanced = advanceFromArticle(working, now, deps);
    return finalize(
      state,
      {
        state: advanced.state,
        effects: [...effects, ...advanced.effects],
        changed: true,
      },
      false,
    );
  }

  if (working.phase === 'LEVEL_COMPLETE') {
    const advanced = advanceFromLevelComplete(working, now, deps);
    return finalize(
      state,
      {
        state: advanced.state,
        effects: [...effects, ...advanced.effects],
        changed: true,
      },
      false,
    );
  }

  return changed
    ? finalize(state, { state: working, effects, changed }, false)
    : { state, effects };
}

export { createGameState, toPublicState };
export type { GameEvent };
