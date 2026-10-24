import type Database from 'better-sqlite3';
import type { QuestionRecord } from '../../shared/schemas';
import type { GameMode } from '../../shared/types';
import type { FinalResult, MatchRecord, ScoreRecord } from '../game/types';

export type Provider = 'web' | 'tiktok';
export type PersistedScoreStatus =
  'playing' | 'completed' | 'eliminated' | 'forfeited' | 'abandoned';

export interface NewPlayer {
  id: string;
  provider: Provider;
  externalId: string | null;
  pseudo: string;
  pseudoNormalized: string;
  avatar: string;
  createdAt: number;
  updatedAt: number;
}

export type PlayerRecord = NewPlayer;

export interface NewSession {
  id: string;
  playerId: string;
  tokenHash: string;
  createdAt: number;
  expiresAt: number;
  lastSeenAt: number;
}

export type SessionRecord = NewSession;

export interface LeaderboardFilter {
  mode?: GameMode | null;
  source?: Provider | null;
  limit?: number;
  offset?: number;
}

export interface LeaderboardEntry {
  playerId: string;
  pseudo: string;
  avatar: string;
  totalPoints: number;
  matches: number;
  bestMatchPoints: number;
  correctCount: number;
  firstMatchAt: number;
}

export interface PlayerRepository {
  create(player: NewPlayer): PlayerRecord;
  findById(id: string): PlayerRecord | null;
  findByProviderExternal(provider: Provider, externalId: string): PlayerRecord | null;
  updatePseudo(id: string, pseudo: string, normalized: string, now?: number): void;
}

export interface SessionRepository {
  create(session: NewSession): void;
  findById(id: string): SessionRecord | null;
  findByTokenHash(hash: string): SessionRecord | null;
  delete(id: string): void;
  deleteExpired(now: number): number;
  touch(id: string, now: number): void;
}

export interface MatchRepository {
  create(match: MatchRecord, scores: readonly ScoreRecord[], now?: number): void;
  start(matchId: string, now: number): void;
  updateScores(matchId: string, scores: readonly ScoreRecord[], now?: number): void;
  complete(matchId: string, results: readonly FinalResult[], endedAt: number): void;
  abandon(matchId: string, endedAt: number): void;
  abandonInProgress(now: number): number;
  leaderboard(filter?: LeaderboardFilter): LeaderboardEntry[];
}

export interface QuestionRepository {
  listApproved(): QuestionRecord[];
  replaceAll(questions: readonly QuestionRecord[], now?: number): number;
}

export interface Persistence {
  kind: 'sqlite' | 'memory';
  db: Database.Database | null;
  players: PlayerRepository;
  sessions: SessionRepository;
  matches: MatchRepository;
  questions: QuestionRepository;
  close(): void;
}
