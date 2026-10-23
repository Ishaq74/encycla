import { describe, expect, it } from 'vitest';
import {
  MAX_LIVES,
  buildFinalRanking,
  compareRanking,
  computeClassicPoints,
  computeContestBonuses,
  difficultyForClassicLevel,
  isClassable,
  timerMsForDifficulty,
  toFinalResult,
  toScoreRecord,
  winnerFromRanking,
} from '../../server/game/scoring';
import { createPlayer } from '../../server/game/state-machine';
import type { PlayerState } from '../../server/game/types';

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    ...createPlayer({ id: 'p1', pseudo: 'Alice' }, 1000, MAX_LIVES),
    ...overrides,
  };
}

describe('classic scoring', () => {
  it.each([
    ['Novice', 1, 0, 0, 150],
    ['Novice', 1, 3000, 0, 150],
    ['Novice', 1, 3001, 0, 150],
    ['Novice', 1, 8000, 0, 125],
    ['Novice', 1, 13000, 0, 100],
    ['Novice', 1, 25000, 0, 100],
    ['Adventurer', 5, 8000, 3, 710],
    ['Wizard', 10, 14000, 12, 1700],
  ] as const)('%s level %i at %i ms with streak %i gives %i', (difficulty, level, time, streak, expected) => {
    expect(
      computeClassicPoints({
        correct: true,
        difficulty,
        level,
        responseTimeMs: time,
        streakBefore: streak,
      }),
    ).toBe(expected);
  });

  it('never awards points for an incorrect answer', () => {
    expect(
      computeClassicPoints({
        correct: false,
        difficulty: 'Wizard',
        level: 10,
        responseTimeMs: 0,
        streakBefore: 20,
      }),
    ).toBe(0);
  });

  it('maps CLASSIC levels to difficulty profiles', () => {
    expect([1, 3, 4, 7, 8, 10].map(difficultyForClassicLevel)).toEqual([
      'Novice',
      'Novice',
      'Adventurer',
      'Adventurer',
      'Wizard',
      'Wizard',
    ]);
    expect(timerMsForDifficulty('Novice')).toBe(25000);
    expect(timerMsForDifficulty('Adventurer')).toBe(20000);
    expect(timerMsForDifficulty('Wizard')).toBe(15000);
  });
});

describe('contest scoring', () => {
  it('awards 200 only to the fastest correct players when at least two are correct', () => {
    const bonuses = computeContestBonuses([
      { playerId: 'p1', correct: true, responseTimeMs: 1200 },
      { playerId: 'p2', correct: true, responseTimeMs: 2400 },
      { playerId: 'p3', correct: false, responseTimeMs: 500 },
    ]);
    expect([...bonuses]).toEqual([['p1', 200]]);
  });

  it('awards the bonus to every exact tie', () => {
    const bonuses = computeContestBonuses([
      { playerId: 'p1', correct: true, responseTimeMs: 1500 },
      { playerId: 'p2', correct: true, responseTimeMs: 1500 },
      { playerId: 'p3', correct: false, responseTimeMs: 1000 },
    ]);
    expect([...bonuses]).toEqual([
      ['p1', 200],
      ['p2', 200],
    ]);
  });

  it('does not award a speed bonus to a single correct player', () => {
    expect(
      computeContestBonuses([{ playerId: 'p1', correct: true, responseTimeMs: 1000 }]),
    ).toEqual(new Map());
  });
});

describe('final ranking', () => {
  it('sorts survivors, eliminated players and forfeits with the documented tie-breakers', () => {
    const players = [
      player({ id: 'survivor-low', score: 10, joinedAt: 1 }),
      player({ id: 'survivor-high', score: 30, joinedAt: 2 }),
      player({ id: 'eliminated', status: 'ELIMINATED', score: 100, joinedAt: 3 }),
      player({ id: 'forfeit', status: 'FORFEITED', score: 200, joinedAt: 4 }),
    ];

    expect(buildFinalRanking(players).map((entry) => [entry.playerId, entry.rank])).toEqual([
      ['survivor-high', 1],
      ['survivor-low', 2],
      ['eliminated', 3],
      ['forfeit', 4],
    ]);
  });

  it('uses correct answers, mistakes, response time and arrival order', () => {
    const players = [
      player({ id: 'a', score: 100, correctCount: 1, wrongCount: 1, joinedAt: 2 }),
      player({ id: 'b', score: 100, correctCount: 2, wrongCount: 1, joinedAt: 3 }),
      player({ id: 'c', score: 100, correctCount: 1, wrongCount: 0, joinedAt: 4 }),
      player({ id: 'd', score: 100, correctCount: 1, wrongCount: 0, totalResponseMs: 500, joinedAt: 5 }),
      player({ id: 'e', score: 100, correctCount: 1, wrongCount: 0, totalResponseMs: 500, joinedAt: 1 }),
    ];

    expect(
      buildFinalRanking(players).map((entry) => [entry.playerId, entry.rank, entry.tied]),
    ).toEqual([
      ['b', 1, false],
      ['c', 2, false],
      ['e', 3, false],
      ['d', 4, false],
      ['a', 5, false],
    ]);
  });

  it('shares a rank and returns no unique winner for a perfect tie', () => {
    const ranking = buildFinalRanking([
      player({ id: 'a', joinedAt: 1 }),
      player({ id: 'b', joinedAt: 1 }),
    ]);
    expect(ranking).toEqual([
      { playerId: 'a', rank: 1, tied: true },
      { playerId: 'b', rank: 1, tied: true },
    ]);
    expect(winnerFromRanking(ranking)).toBeNull();
    expect(winnerFromRanking([{ playerId: 'a', rank: 1, tied: false }])).toBe('a');
    expect(winnerFromRanking([])).toBeNull();
  });

  it('excludes LEFT players and identifies classable players', () => {
    const left = player({ id: 'left', status: 'LEFT' });
    expect(buildFinalRanking([left])).toEqual([]);
    expect(isClassable(left)).toBe(false);
    expect(isClassable(player({ status: 'FORFEITED' }))).toBe(false);
    expect(isClassable(player({ status: 'ELIMINATED' }))).toBe(true);
  });

  it('compares equal players as tied and exports score/final records', () => {
    const first = player({ id: 'a', joinedAt: 1 });
    const second = player({ id: 'b', joinedAt: 1 });
    expect(compareRanking(first, second)).toBe(0);
    expect(toScoreRecord(first)).toMatchObject({ playerId: 'a', score: 0, lives: MAX_LIVES });
    expect(toFinalResult(first, { playerId: 'a', rank: 1, tied: false })).toMatchObject({
      playerId: 'a',
      rank: 1,
      tied: false,
    });
  });
});
