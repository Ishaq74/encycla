import type { Difficulty, FinalRankingEntry, PlayerStatus } from '../../shared/types';
import type { FinalResult, PlayerState, ScoreRecord } from './types';

export const MAX_LIVES = 3;
export const CONTEST_BASE_POINTS = 1000;
export const CONTEST_SPEED_BONUS = 200;

export const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  Novice: 1,
  Adventurer: 1.25,
  Wizard: 1.5,
};

export const DIFFICULTY_TIMERS: Record<Difficulty, number> = {
  Novice: 25_000,
  Adventurer: 20_000,
  Wizard: 15_000,
};

export function difficultyForClassicLevel(level: number): Difficulty {
  if (level <= 3) {
    return 'Novice';
  }
  if (level <= 7) {
    return 'Adventurer';
  }
  return 'Wizard';
}

export function timerMsForDifficulty(difficulty: Difficulty): number {
  return DIFFICULTY_TIMERS[difficulty];
}

export interface ClassicScoreInput {
  correct: boolean;
  difficulty: Difficulty;
  level: number;
  responseTimeMs: number | null;
  streakBefore: number;
}

export function computeClassicPoints(input: ClassicScoreInput): number {
  if (!input.correct) {
    return 0;
  }

  const basePoints = Math.round(
    100 * DIFFICULTY_MULTIPLIERS[input.difficulty] * Math.max(1, input.level),
  );
  const responseTimeMs = Math.max(0, input.responseTimeMs ?? 0);
  const speedBonus = Math.max(
    0,
    Math.round(50 * (1 - Math.max(0, responseTimeMs - 3000) / 10_000)),
  );
  const streakBonus = Math.min(Math.max(0, input.streakBefore), 10) * 20;

  return basePoints + speedBonus + streakBonus;
}

export interface ContestCandidate {
  playerId: string;
  correct: boolean;
  responseTimeMs: number | null;
}

export function computeContestBonuses(
  candidates: readonly ContestCandidate[],
): Map<string, number> {
  const correct = candidates.filter(
    (candidate) => candidate.correct && candidate.responseTimeMs !== null,
  );

  if (correct.length < 2) {
    return new Map();
  }

  const fastest = Math.min(...correct.map((candidate) => candidate.responseTimeMs as number));
  return new Map(
    correct
      .filter((candidate) => candidate.responseTimeMs === fastest)
      .map((candidate) => [candidate.playerId, CONTEST_SPEED_BONUS]),
  );
}

export function statusGroup(status: PlayerStatus): number {
  switch (status) {
    case 'CONNECTED':
    case 'DISCONNECTED':
      return 0;
    case 'ELIMINATED':
      return 1;
    case 'FORFEITED':
      return 2;
    case 'LEFT':
      return 3;
  }
}

export function compareRanking(a: PlayerState, b: PlayerState): number {
  return (
    statusGroup(a.status) - statusGroup(b.status) ||
    b.score - a.score ||
    b.correctCount - a.correctCount ||
    a.wrongCount + a.timeoutCount - (b.wrongCount + b.timeoutCount) ||
    a.totalResponseMs - b.totalResponseMs ||
    a.joinedAt - b.joinedAt
  );
}

export function buildFinalRanking(players: readonly PlayerState[]): FinalRankingEntry[] {
  const sorted = players.filter((player) => player.status !== 'LEFT').sort(compareRanking);
  const ranking: FinalRankingEntry[] = [];

  let index = 0;
  while (index < sorted.length) {
    const groupStart = index;
    const first = sorted[index] as PlayerState;
    index += 1;

    while (index < sorted.length && compareRanking(first, sorted[index] as PlayerState) === 0) {
      index += 1;
    }

    const tied = index - groupStart > 1;
    for (let member = groupStart; member < index; member += 1) {
      ranking.push({
        playerId: (sorted[member] as PlayerState).id,
        rank: groupStart + 1,
        tied,
      });
    }
  }

  return ranking;
}

export function winnerFromRanking(ranking: readonly FinalRankingEntry[]): string | null {
  const first = ranking[0];
  if (!first || first.tied) {
    return null;
  }
  return first.playerId;
}

export function isClassable(player: PlayerState): boolean {
  return player.status !== 'LEFT' && player.status !== 'FORFEITED';
}

export function toScoreRecord(player: PlayerState): ScoreRecord {
  return {
    playerId: player.id,
    score: player.score,
    lives: player.lives,
    correctCount: player.correctCount,
    wrongCount: player.wrongCount,
    timeoutCount: player.timeoutCount,
    totalResponseMs: player.totalResponseMs,
    bestStreak: player.bestStreak,
    status: player.status,
  };
}

export function toFinalResult(
  player: PlayerState,
  entry: FinalRankingEntry,
): FinalResult {
  return {
    playerId: player.id,
    rank: entry.rank,
    tied: entry.tied,
    score: player.score,
    status: player.status,
  };
}
