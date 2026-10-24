import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { QuestionRecord } from '../../shared/schemas';
import { migrate } from '../db/migrate';
import {
  MemoryMatchRepository,
  MemoryPlayerRepository,
  MemoryQuestionRepository,
  MemorySessionRepository,
} from './memory/repositories';
import type { Persistence } from './repositories';
import {
  SqliteMatchRepository,
  SqlitePlayerRepository,
  SqliteQuestionRepository,
  SqliteSessionRepository,
} from './sqlite/repositories';

export interface OpenPersistenceOptions {
  databasePath: string;
  questions?: readonly QuestionRecord[];
  migrationsDir?: string;
  now?: number;
}

export interface PersistenceInitialization {
  persistence: Persistence;
  questionsImported: number;
  abandonedMatches: number;
  degradedReason: string | null;
  questionsError: string | null;
}

export function openDatabase(databasePath: string): Database.Database {
  if (databasePath !== ':memory:') {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.pragma('synchronous = NORMAL');
  return db;
}

export function createSqlitePersistence(db: Database.Database): Persistence {
  const players = new SqlitePlayerRepository(db);
  const sessions = new SqliteSessionRepository(db);
  const matches = new SqliteMatchRepository(db, players);
  const questions = new SqliteQuestionRepository(db);

  return {
    kind: 'sqlite',
    db,
    players,
    sessions,
    matches,
    questions,
    close: () => db.close(),
  };
}

export function createMemoryPersistence(questions: readonly QuestionRecord[] = []): Persistence {
  const players = new MemoryPlayerRepository();
  const sessions = new MemorySessionRepository();
  const matches = new MemoryMatchRepository(players);
  const questionRepository = new MemoryQuestionRepository(questions);

  return {
    kind: 'memory',
    db: null,
    players,
    sessions,
    matches,
    questions: questionRepository,
    close: () => undefined,
  };
}

function quickCheck(db: Database.Database): boolean {
  return db.pragma('quick_check', { simple: true }) === 'ok';
}

export function initializePersistence(options: OpenPersistenceOptions): PersistenceInitialization {
  const now = options.now ?? Date.now();
  let db: Database.Database;

  try {
    db = openDatabase(options.databasePath);
  } catch (error) {
    return {
      persistence: createMemoryPersistence(options.questions),
      questionsImported: options.questions?.length ?? 0,
      abandonedMatches: 0,
      degradedReason: error instanceof Error ? error.message : String(error),
      questionsError: null,
    };
  }

  try {
    if (!quickCheck(db)) {
      db.close();
      return {
        persistence: createMemoryPersistence(options.questions),
        questionsImported: options.questions?.length ?? 0,
        abandonedMatches: 0,
        degradedReason: 'PRAGMA quick_check failed',
        questionsError: null,
      };
    }
  } catch (error) {
    db.close();
    return {
      persistence: createMemoryPersistence(options.questions),
      questionsImported: options.questions?.length ?? 0,
      abandonedMatches: 0,
      degradedReason: error instanceof Error ? error.message : String(error),
      questionsError: null,
    };
  }

  try {
    migrate(db, {
      ...(options.migrationsDir === undefined ? {} : { migrationsDir: options.migrationsDir }),
      now,
    });
  } catch (error) {
    db.close();
    throw error;
  }

  const persistence = createSqlitePersistence(db);
  let questionsImported = 0;
  let questionsError: string | null = null;

  if (options.questions !== undefined && options.questions.length > 0) {
    try {
      questionsImported = persistence.questions.replaceAll(options.questions, now);
    } catch (error) {
      questionsError = error instanceof Error ? error.message : String(error);
    }
  }

  const abandonedMatches = persistence.matches.abandonInProgress(now);

  return {
    persistence,
    questionsImported,
    abandonedMatches,
    degradedReason: null,
    questionsError,
  };
}
