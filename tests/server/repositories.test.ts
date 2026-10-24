import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { migrate } from '../../server/db/migrate';
import { createMemoryPersistence, createSqlitePersistence } from '../../server/persistence/db';
import type { Persistence } from '../../server/persistence/repositories';
import { TEST_QUESTIONS } from '../fixtures/questions';
import { makeMatch, makePlayer, makeResult, makeScore, makeSession } from '../fixtures/persistence';

const openPersistences: Persistence[] = [];

function makePersistence(kind: 'memory' | 'sqlite'): Persistence {
  if (kind === 'memory') {
    const persistence = createMemoryPersistence();
    openPersistences.push(persistence);
    return persistence;
  }

  const db = new Database(':memory:');
  migrate(db);
  const persistence = createSqlitePersistence(db);
  openPersistences.push(persistence);
  return persistence;
}

afterEach(() => {
  while (openPersistences.length > 0) {
    openPersistences.pop()?.close();
  }
});

describe.each(['memory', 'sqlite'] as const)('%s repositories', (kind) => {
  it('stores players and sessions, updates pseudonyms and purges expiry', () => {
    const persistence = makePersistence(kind);
    const webPlayer = makePlayer('p1', 'Ada');
    const tiktokPlayer = {
      ...makePlayer('p2', 'TikToker'),
      provider: 'tiktok' as const,
      externalId: 'tt-1',
    };

    persistence.players.create(webPlayer);
    persistence.players.create(tiktokPlayer);

    expect(persistence.players.findById('p1')).toEqual(webPlayer);
    expect(persistence.players.findByProviderExternal('tiktok', 'tt-1')).toEqual(tiktokPlayer);
    expect(persistence.players.findByProviderExternal('web', 'tt-1')).toBeNull();

    persistence.players.updatePseudo('p1', 'Ada Lovelace', 'ada lovelace', 2_000);
    expect(persistence.players.findById('p1')).toMatchObject({
      pseudo: 'Ada Lovelace',
      pseudoNormalized: 'ada lovelace',
      updatedAt: 2_000,
    });

    const session = makeSession('s1', 'p1', { expiresAt: 10_000 });
    persistence.sessions.create(session);
    expect(persistence.sessions.findByTokenHash('hash-s1')).toEqual(session);
    expect(persistence.sessions.findById('s1')).toEqual(session);

    persistence.sessions.touch('s1', 5_000);
    expect(persistence.sessions.findById('s1')?.lastSeenAt).toBe(5_000);
    expect(persistence.sessions.deleteExpired(9_999)).toBe(0);
    expect(persistence.sessions.deleteExpired(10_000)).toBe(0);
    expect(persistence.sessions.deleteExpired(10_001)).toBe(1);
    expect(persistence.sessions.findById('s1')).toBeNull();
  });

  it('completes matches, excludes forfeits, solos and abandoned matches from leaderboard', () => {
    const persistence = makePersistence(kind);
    persistence.players.create(makePlayer('p1', 'Ada'));
    persistence.players.create(makePlayer('p2', 'Grace'));

    persistence.matches.create(makeMatch('m1'), [
      makeScore('p1', { score: 100, correctCount: 2 }),
      makeScore('p2', { score: 50 }),
    ]);
    persistence.matches.complete(
      'm1',
      [makeResult('p1'), makeResult('p2', { rank: 2, score: 50 })],
      2_000,
    );

    expect(persistence.matches.leaderboard()).toEqual([
      expect.objectContaining({
        playerId: 'p1',
        pseudo: 'Ada',
        totalPoints: 100,
        matches: 1,
        bestMatchPoints: 100,
        correctCount: 2,
        firstMatchAt: 2_000,
      }),
      expect.objectContaining({
        playerId: 'p2',
        totalPoints: 50,
        matches: 1,
      }),
    ]);

    persistence.matches.create(makeMatch('m2'), [
      makeScore('p1', { score: 500, status: 'FORFEITED' }),
      makeScore('p2', { score: 10 }),
    ]);
    persistence.matches.complete('m2', [makeResult('p2')], 3_000);
    expect(persistence.matches.leaderboard()).toEqual([
      expect.objectContaining({ playerId: 'p1', totalPoints: 100, matches: 1 }),
      expect.objectContaining({ playerId: 'p2', totalPoints: 60, matches: 2 }),
    ]);

    persistence.matches.create(makeMatch('solo', { playerCount: 1 }), [
      makeScore('p1', { score: 999 }),
    ]);
    persistence.matches.complete('solo', [makeResult('p1', { score: 999 })], 4_000);

    persistence.matches.create(makeMatch('abandoned'), [makeScore('p2', { score: 999 })]);
    persistence.matches.abandon('abandoned', 5_000);

    expect(persistence.matches.leaderboard()).toHaveLength(2);
    expect(persistence.matches.leaderboard({ limit: 1 })).toHaveLength(1);
    expect(persistence.matches.leaderboard({ offset: 1 })[0]?.playerId).toBe('p2');
    expect(persistence.matches.leaderboard({ mode: 'CONTEST' })).toEqual([]);
    expect(persistence.matches.leaderboard({ source: 'tiktok' })).toEqual([]);
  });

  it('inserts scores discovered by a later update and abandons in-progress matches', () => {
    const persistence = makePersistence(kind);
    persistence.players.create(makePlayer('p1', 'Ada'));
    persistence.players.create(makePlayer('p2', 'Grace'));
    persistence.matches.create(makeMatch('m1'), [makeScore('p1', { score: 10 })]);

    persistence.matches.updateScores(
      'm1',
      [makeScore('p1', { score: 20 }), makeScore('p2', { score: 30 })],
      2_000,
    );
    persistence.matches.complete(
      'm1',
      [makeResult('p2', { score: 30 }), makeResult('p1', { rank: 2, score: 20 })],
      3_000,
    );

    expect(persistence.matches.leaderboard()).toEqual([
      expect.objectContaining({ playerId: 'p2', totalPoints: 30 }),
      expect.objectContaining({ playerId: 'p1', totalPoints: 20 }),
    ]);

    persistence.matches.create(makeMatch('m2'), [makeScore('p1')]);
    expect(persistence.matches.abandonInProgress(4_000)).toBe(1);
    expect(persistence.matches.abandonInProgress(5_000)).toBe(0);
  });

  it('replaces and lists questions', () => {
    const persistence = makePersistence(kind);
    const questions = TEST_QUESTIONS.slice(0, 2);

    expect(persistence.questions.replaceAll(questions, 1_000)).toBe(2);
    expect(persistence.questions.listApproved()).toEqual(questions);

    expect(persistence.questions.replaceAll(questions.slice(0, 1), 2_000)).toBe(1);
    expect(persistence.questions.listApproved()).toEqual(questions.slice(0, 1));
  });
});
