import type { FinalResult, MatchRecord, ScoreRecord } from '../../server/game/types';
import type { NewPlayer, NewSession } from '../../server/persistence/repositories';

export function makePlayer(id: string, pseudo: string, createdAt = 1_000): NewPlayer {
  return {
    id,
    provider: 'web',
    externalId: null,
    pseudo,
    pseudoNormalized: pseudo.toLowerCase(),
    avatar: pseudo.slice(0, 1),
    createdAt,
    updatedAt: createdAt,
  };
}

export function makeSession(
  id: string,
  playerId: string,
  overrides: Partial<NewSession> = {},
): NewSession {
  return {
    id,
    playerId,
    tokenHash: `hash-${id}`,
    createdAt: 1_000,
    expiresAt: 10_000,
    lastSeenAt: 1_000,
    ...overrides,
  };
}

export function makeMatch(id: string, overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id,
    roomCode: 'ROOM01',
    mode: 'CLASSIC',
    source: 'web',
    category: null,
    difficulty: null,
    startedAt: 1_000,
    playerCount: 2,
    settings: {
      maxPlayers: 8,
      timerMs: 25_000,
      lifePolicy: 'persist',
      articlePolicy: 'manual',
      autoAdvanceMs: null,
      isTikTok: false,
      isPublic: false,
    },
    ...overrides,
  };
}

export function makeScore(playerId: string, overrides: Partial<ScoreRecord> = {}): ScoreRecord {
  return {
    playerId,
    score: 100,
    lives: 3,
    correctCount: 1,
    wrongCount: 0,
    timeoutCount: 0,
    totalResponseMs: 1_500,
    bestStreak: 1,
    status: 'CONNECTED',
    ...overrides,
  };
}

export function makeResult(playerId: string, overrides: Partial<FinalResult> = {}): FinalResult {
  return {
    playerId,
    rank: 1,
    tied: false,
    score: 100,
    status: 'CONNECTED',
    ...overrides,
  };
}
