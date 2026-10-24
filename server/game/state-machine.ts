import type {
  Difficulty,
  GameMode,
  PublicPlayer,
  PublicRoomState,
  RoomPhase,
} from '../../shared/types';
import type { PlayerIdentity } from './events';
import {
  DIFFICULTY_TIMERS,
  MAX_LIVES,
  difficultyForClassicLevel,
  timerMsForDifficulty,
} from './scoring';
import type { GameState, PlayerState, QuestionRuntime } from './types';

export const COUNTDOWN_MS = 3000;
export const REVEAL_MS = 2500;
export const ARTICLE_MS = 30_000;
export const TIKTOK_ARTICLE_MS = 8000;
export const LEVEL_COMPLETE_MS = 15_000;
export const MATCH_OVER_TTL_MS = 10 * 60_000;
export const PAUSE_AUTO_RESUME_MS = 2 * 60_000;
export const DISCONNECT_GRACE_MS = 30_000;
export const ROOM_INACTIVITY_MS = 10 * 60_000;

export interface CreateRoomOptions {
  roomCode: string;
  mode: GameMode;
  difficulty: Difficulty | null;
  category: string | null;
  isPublic: boolean;
  isTikTok: boolean;
  isSolo: boolean;
  host: PlayerIdentity | null;
  maxPlayers?: number;
  timerMs?: number;
  now: number;
}

export function modeShape(mode: GameMode): { totalLevels: number; questionsPerLevel: number } {
  switch (mode) {
    case 'CLASSIC':
      return { totalLevels: 10, questionsPerLevel: 20 };
    case 'SUBJECT':
      return { totalLevels: 1, questionsPerLevel: 20 };
    case 'CONTEST':
      return { totalLevels: 1, questionsPerLevel: 10 };
  }
}

export function createPlayer(
  identity: PlayerIdentity,
  joinedAt: number,
  lives: number,
): PlayerState {
  return {
    id: identity.id,
    pseudo: identity.pseudo,
    displayName: identity.displayName ?? identity.pseudo,
    avatar: identity.avatar ?? '?',
    score: 0,
    lives,
    streak: 0,
    bestStreak: 0,
    correctCount: 0,
    wrongCount: 0,
    timeoutCount: 0,
    totalResponseMs: 0,
    isReady: false,
    status: 'CONNECTED',
    joinedAt,
    disconnectedAt: null,
    answer: null,
  };
}

export function createGameState(options: CreateRoomOptions): GameState {
  const shape = modeShape(options.mode);
  const isTikTok = options.isTikTok;
  const maxPlayers = options.maxPlayers ?? (isTikTok ? 100 : options.mode === 'CONTEST' ? 2 : 8);
  const timerMs =
    options.timerMs ??
    (isTikTok
      ? 15_000
      : options.mode === 'CONTEST'
        ? DIFFICULTY_TIMERS.Adventurer
        : timerMsForDifficulty(options.difficulty ?? 'Novice'));
  const players: Record<string, PlayerState> = {};

  if (options.host) {
    players[options.host.id] = createPlayer(
      options.host,
      options.now,
      options.mode === 'CONTEST' ? 0 : MAX_LIVES,
    );
  }

  return {
    roomCode: options.roomCode,
    mode: options.mode,
    difficulty: options.difficulty,
    category: options.category,
    isPublic: options.isPublic,
    isTikTok,
    isSolo: options.isSolo,
    tiktokConnected: false,
    hostId: isTikTok ? null : (options.host?.id ?? null),
    settings: {
      maxPlayers,
      timerMs,
      lifePolicy: options.isSolo ? 'refill_on_level' : 'persist',
      articlePolicy: isTikTok ? 'auto' : 'manual',
      autoAdvanceMs: isTikTok ? TIKTOK_ARTICLE_MS : null,
      isTikTok,
      isPublic: options.isPublic,
    },
    phase: 'LOBBY',
    pausedFrom: null,
    phaseStartedAt: null,
    phaseEndsAt: null,
    pausedAt: null,
    remainingMsWhenPaused: null,
    phaseToken: null,
    stateVersion: 1,
    level: 1,
    totalLevels: shape.totalLevels,
    questionIndex: 0,
    questionsPerLevel: shape.questionsPerLevel,
    questionsResolvedThisLevel: 0,
    totalQuestionsAnswered: 0,
    players,
    question: null,
    preloadedQuestion: null,
    usedQuestionIds: [],
    questionParticipantIds: [],
    continueReady: [],
    lastReveal: null,
    lastResults: null,
    matchId: null,
    matchStartedAt: null,
    matchStatus: null,
    joinedPlayerCount: options.host ? 1 : 0,
    finalRanking: null,
    winnerId: null,
    shouldEndAfterReveal: false,
    tiktokPausePending: false,
    lastActivityAt: options.now,
    closedReason: null,
  };
}

export function isActive(player: PlayerState): boolean {
  return player.status === 'CONNECTED' || player.status === 'DISCONNECTED';
}

export function isConnectedActive(player: PlayerState): boolean {
  return player.status === 'CONNECTED';
}

export function activePlayers(state: GameState): PlayerState[] {
  return sortedPlayers(state).filter(isActive);
}

export function connectedActivePlayers(state: GameState): PlayerState[] {
  return sortedPlayers(state).filter(isConnectedActive);
}

export function activeCount(state: GameState): number {
  return activePlayers(state).length;
}

export function connectedCount(state: GameState): number {
  return connectedActivePlayers(state).length;
}

export function sortedPlayers(state: GameState): PlayerState[] {
  return Object.values(state.players).sort(
    (left, right) => left.joinedAt - right.joinedAt || left.id.localeCompare(right.id),
  );
}

export function difficultyForState(state: GameState): Difficulty {
  if (state.mode === 'CONTEST') {
    return 'Adventurer';
  }
  if (state.mode === 'SUBJECT') {
    return state.difficulty ?? 'Novice';
  }
  return difficultyForClassicLevel(state.level);
}

export function questionTimerMs(state: GameState): number {
  if (state.isTikTok) {
    return state.settings.timerMs;
  }
  if (state.mode === 'CONTEST') {
    return DIFFICULTY_TIMERS.Adventurer;
  }
  return timerMsForDifficulty(difficultyForState(state));
}

export function phaseDurationMs(state: GameState, phase: RoomPhase): number | null {
  switch (phase) {
    case 'COUNTDOWN':
      return COUNTDOWN_MS;
    case 'QUESTION':
      return questionTimerMs(state);
    case 'REVEAL':
      return REVEAL_MS;
    case 'ARTICLE':
      return state.isTikTok ? TIKTOK_ARTICLE_MS : ARTICLE_MS;
    case 'LEVEL_COMPLETE':
      return LEVEL_COMPLETE_MS;
    case 'MATCH_OVER':
      return MATCH_OVER_TTL_MS;
    case 'LOBBY':
    case 'PAUSED':
    case 'CLOSED':
      return null;
  }
}

export function isFinalQuestion(state: GameState): boolean {
  return (
    state.level >= state.totalLevels && state.questionsResolvedThisLevel >= state.questionsPerLevel
  );
}

export function phaseShowsReveal(phase: RoomPhase): boolean {
  return (
    phase === 'REVEAL' ||
    phase === 'ARTICLE' ||
    phase === 'LEVEL_COMPLETE' ||
    phase === 'MATCH_OVER'
  );
}

function publicQuestion(question: QuestionRuntime) {
  return {
    id: question.question.id,
    subject: question.question.subject,
    questionText: question.question.questionText,
    options: [...question.options],
    image: question.question.image ?? null,
  };
}

export function toPublicState(state: GameState, serverNow: number): PublicRoomState {
  const players: PublicPlayer[] = sortedPlayers(state).map((player) => ({
    id: player.id,
    pseudo: player.pseudo,
    displayName: player.displayName,
    avatar: player.avatar,
    score: player.score,
    lives: player.lives,
    streak: player.streak,
    correctCount: player.correctCount,
    wrongCount: player.wrongCount,
    timeoutCount: player.timeoutCount,
    totalResponseMs: player.totalResponseMs,
    isReady: player.isReady,
    status: player.status,
    isHost: player.id === state.hostId,
    joinedAt: player.joinedAt,
    hasAnsweredQuestionId: player.answer?.questionId ?? null,
  }));

  const questionVisible =
    state.question !== null &&
    (state.phase === 'QUESTION' || (state.phase === 'PAUSED' && state.pausedFrom === 'QUESTION'));
  const revealVisible =
    state.lastReveal !== null &&
    (phaseShowsReveal(state.phase) ||
      (state.phase === 'PAUSED' &&
        state.pausedFrom !== null &&
        phaseShowsReveal(state.pausedFrom)));

  return {
    stateVersion: state.stateVersion,
    serverNow,
    roomCode: state.roomCode,
    mode: state.mode,
    difficulty: state.difficulty,
    category: state.category,
    isPublic: state.isPublic,
    isTikTok: state.isTikTok,
    isSolo: state.isSolo,
    tiktokConnected: state.tiktokConnected,
    phase: state.phase,
    pausedFrom: state.pausedFrom,
    level: state.level,
    totalLevels: state.totalLevels,
    questionIndex: state.questionIndex,
    questionsPerLevel: state.questionsPerLevel,
    totalQuestionsAnswered: state.totalQuestionsAnswered,
    phaseStartedAt: state.phaseStartedAt,
    phaseEndsAt: state.phaseEndsAt,
    pausedAt: state.pausedAt,
    remainingMs: state.phase === 'PAUSED' ? state.remainingMsWhenPaused : null,
    phaseToken: state.phaseToken,
    hostId: state.hostId,
    matchId: state.matchId,
    settings: { ...state.settings },
    players,
    question: questionVisible && state.question ? publicQuestion(state.question) : null,
    reveal: revealVisible && state.lastReveal ? { ...state.lastReveal } : null,
    results:
      revealVisible && state.lastResults
        ? state.lastResults.map((result) => ({ ...result }))
        : null,
    finalRanking:
      state.phase === 'MATCH_OVER' && state.finalRanking
        ? state.finalRanking.map((entry) => ({ ...entry }))
        : null,
    winnerId: state.phase === 'MATCH_OVER' ? state.winnerId : null,
  };
}
