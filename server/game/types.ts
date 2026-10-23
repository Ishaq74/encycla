import type { QuestionRecord } from '../../shared/schemas';
import type {
  Difficulty,
  FinalRankingEntry,
  GameMode,
  PlayerResult,
  PlayerStatus,
  PublicRoomState,
  RevealView,
  RoomPhase,
  RoomSettings,
} from '../../shared/types';

export interface QuestionProvider {
  getQuestions(): readonly QuestionRecord[];
}

export interface EngineDeps {
  now: () => number;
  random: () => number;
  idFactory: () => string;
  questions: QuestionProvider;
}

export interface AnswerState {
  questionId: string;
  choiceIndex: number;
  receivedAt: number;
}

export interface PlayerState {
  id: string;
  pseudo: string;
  displayName: string;
  avatar: string;
  score: number;
  lives: number;
  streak: number;
  bestStreak: number;
  correctCount: number;
  wrongCount: number;
  timeoutCount: number;
  totalResponseMs: number;
  isReady: boolean;
  status: PlayerStatus;
  joinedAt: number;
  disconnectedAt: number | null;
  answer: AnswerState | null;
}

export interface QuestionRuntime {
  question: QuestionRecord;
  options: string[];
  correctIndex: number;
  optionOrder: number[];
}

export type MatchStatus = 'in_progress' | 'completed' | 'abandoned';

export interface GameState {
  roomCode: string;
  mode: GameMode;
  difficulty: Difficulty | null;
  category: string | null;
  isPublic: boolean;
  isTikTok: boolean;
  isSolo: boolean;
  tiktokConnected: boolean;
  hostId: string | null;
  settings: RoomSettings;
  phase: RoomPhase;
  pausedFrom: RoomPhase | null;
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  pausedAt: number | null;
  remainingMsWhenPaused: number | null;
  phaseToken: string | null;
  stateVersion: number;
  level: number;
  totalLevels: number;
  questionIndex: number;
  questionsPerLevel: number;
  questionsResolvedThisLevel: number;
  totalQuestionsAnswered: number;
  players: Record<string, PlayerState>;
  question: QuestionRuntime | null;
  preloadedQuestion: QuestionRuntime | null;
  usedQuestionIds: string[];
  questionParticipantIds: string[];
  continueReady: string[];
  lastReveal: RevealView | null;
  lastResults: PlayerResult[] | null;
  matchId: string | null;
  matchStartedAt: number | null;
  matchStatus: MatchStatus | null;
  joinedPlayerCount: number;
  finalRanking: FinalRankingEntry[] | null;
  winnerId: string | null;
  shouldEndAfterReveal: boolean;
  tiktokPausePending: boolean;
  lastActivityAt: number;
  closedReason: string | null;
}

export interface ScoreRecord {
  playerId: string;
  score: number;
  lives: number;
  correctCount: number;
  wrongCount: number;
  timeoutCount: number;
  totalResponseMs: number;
  bestStreak: number;
  status: PlayerStatus;
}

export interface FinalResult {
  playerId: string;
  rank: number;
  tied: boolean;
  score: number;
  status: PlayerStatus;
}

export interface MatchRecord {
  id: string;
  roomCode: string;
  mode: GameMode;
  source: 'web' | 'tiktok';
  category: string | null;
  difficulty: Difficulty | null;
  startedAt: number;
  playerCount: number;
  settings: RoomSettings;
}

export type EngineEffect =
  | { type: 'BROADCAST_STATE'; roomCode: string }
  | { type: 'EMIT_PLAYER_LOCKED'; roomCode: string; playerId: string; questionId: string }
  | { type: 'SCHEDULE_PHASE'; roomCode: string; at: number }
  | { type: 'CANCEL_SCHEDULE'; roomCode: string }
  | {
      type: 'PERSIST_MATCH_STARTED';
      match: MatchRecord;
      players: ScoreRecord[];
    }
  | { type: 'PERSIST_SCORES'; roomCode: string; scores: ScoreRecord[] }
  | { type: 'PERSIST_MATCH_COMPLETED'; matchId: string; results: FinalResult[] }
  | { type: 'PERSIST_MATCH_ABANDONED'; matchId: string }
  | { type: 'EMIT_ROOM_CLOSED'; roomCode: string; reason: string }
  | { type: 'REQUEUE_PUBLIC_PLAYERS'; roomCode: string; playerIds: string[] }
  | {
      type: 'LOG';
      level: 'info' | 'warn' | 'error';
      event: string;
      data?: Record<string, unknown>;
    };

export type EngineErrorCode =
  | 'INVALID_PHASE'
  | 'INVALID_EVENT'
  | 'INVALID_OPTION'
  | 'NOT_HOST'
  | 'NOT_IN_ROOM'
  | 'NOT_ENOUGH_PLAYERS'
  | 'PLAYERS_NOT_READY'
  | 'TIKTOK_NOT_CONNECTED'
  | 'ANSWER_TOO_LATE'
  | 'ANSWER_ALREADY_SUBMITTED'
  | 'QUESTION_MISMATCH'
  | 'STALE_PHASE_TOKEN'
  | 'PLAYER_ELIMINATED'
  | 'PLAYER_FORFEITED'
  | 'PLAYER_NOT_CONNECTED'
  | 'ROOM_FULL'
  | 'ROOM_IN_PROGRESS'
  | 'ALREADY_IN_ROOM'
  | 'NO_QUESTIONS_AVAILABLE'
  | 'INVALID_ROOM_SETTINGS';

export interface EngineError {
  code: EngineErrorCode;
  message: string;
}

export interface ReduceResult {
  state: GameState;
  effects: EngineEffect[];
  error?: EngineError;
}

export type PublicState = PublicRoomState;
