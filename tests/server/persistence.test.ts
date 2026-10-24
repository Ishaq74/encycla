import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_MIGRATIONS_DIR,
  getMigrationStatus,
  loadMigrations,
  migrate,
} from '../../server/db/migrate';
import { createMemoryPersistence, initializePersistence } from '../../server/persistence/db';
import { TEST_QUESTIONS } from '../fixtures/questions';
import { makeMatch, makePlayer, makeScore } from '../fixtures/persistence';

const openDatabases: Database.Database[] = [];

function memoryDatabase(): Database.Database {
  const db = new Database(':memory:');
  openDatabases.push(db);
  return db;
}

afterEach(() => {
  while (openDatabases.length > 0) {
    openDatabases.pop()?.close();
  }
});

describe('migrations', () => {
  it('loads the initial migration from the default directory', () => {
    const migrations = loadMigrations(DEFAULT_MIGRATIONS_DIR);
    expect(migrations).toHaveLength(1);
    expect(migrations[0]).toMatchObject({ version: 1, name: 'init' });
    expect(migrations[0]?.sql).toContain('CREATE TABLE players');
  });

  it('applies migrations once and records the schema version', () => {
    const db = memoryDatabase();

    expect(migrate(db, { now: 1_234 })).toBe(1);
    expect(migrate(db, { now: 1_234 })).toBe(0);
    expect(getMigrationStatus(db)).toEqual({
      current: 1,
      latest: 1,
      applied: [1],
    });
    expect(db.pragma('user_version', { simple: true })).toBe(1);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual(
      expect.arrayContaining([
        'players',
        'player_sessions',
        'matches',
        'scores',
        'questions',
        'questions_pending',
        'schema_migrations',
      ]),
    );
  });

  it('rejects a database created by a newer schema version', () => {
    const db = memoryDatabase();
    migrate(db);
    db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
      99,
      'future',
      1,
    );

    expect(() => migrate(db)).toThrow('newer than supported version');
  });
});

describe('initializePersistence', () => {
  it('initializes SQLite, imports questions and exposes repositories', () => {
    const initialized = initializePersistence({
      databasePath: ':memory:',
      questions: TEST_QUESTIONS.slice(0, 2),
      now: 2_000,
    });

    expect(initialized.degradedReason).toBeNull();
    expect(initialized.questionsError).toBeNull();
    expect(initialized.questionsImported).toBe(2);
    expect(initialized.persistence.kind).toBe('sqlite');
    expect(initialized.persistence.questions.listApproved()).toHaveLength(2);

    initialized.persistence.close();
  });

  it('falls back to an in-memory persistence when SQLite cannot open', () => {
    const directory = mkdtempSync(join(tmpdir(), 'encycla-db-'));
    try {
      const initialized = initializePersistence({
        databasePath: directory,
        questions: TEST_QUESTIONS.slice(0, 1),
      });

      expect(initialized.persistence.kind).toBe('memory');
      expect(initialized.degradedReason).toBeTruthy();
      expect(initialized.questionsImported).toBe(1);
      expect(initialized.persistence.questions.listApproved()).toHaveLength(1);
      initialized.persistence.close();
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('abandons in-progress matches at startup and excludes them from the leaderboard', () => {
    const initialized = initializePersistence({ databasePath: ':memory:' });
    const persistence = initialized.persistence;
    persistence.players.create(makePlayer('p1', 'Ada'));
    persistence.matches.create(makeMatch('m1'), [makeScore('p1')]);

    expect(persistence.matches.abandonInProgress(5_000)).toBe(1);
    expect(persistence.matches.leaderboard()).toEqual([]);

    if (persistence.db) {
      const match = persistence.db
        .prepare('SELECT status, ended_at FROM matches WHERE id = ?')
        .get('m1') as { status: string; ended_at: number };
      expect(match).toEqual({ status: 'abandoned', ended_at: 5_000 });
    }
    persistence.close();
  });

  it('provides a usable memory persistence for tests', () => {
    const persistence = createMemoryPersistence(TEST_QUESTIONS.slice(0, 3));
    expect(persistence.kind).toBe('memory');
    expect(persistence.questions.listApproved()).toHaveLength(3);
    expect(persistence.matches.leaderboard()).toEqual([]);
    persistence.close();
  });
});
