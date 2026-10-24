import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  file: string;
  sql: string;
}

export interface MigrateOptions {
  migrationsDir?: string;
  now?: number;
}

export interface MigrationStatus {
  current: number;
  latest: number;
  applied: number[];
}

export const DEFAULT_MIGRATIONS_DIR = fileURLToPath(new URL('./migrations', import.meta.url));

export function loadMigrations(migrationsDir = DEFAULT_MIGRATIONS_DIR): Migration[] {
  const files = readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const migrations: Migration[] = [];
  let previous = 0;

  for (const file of files) {
    const match = /^(\d+)_([a-z0-9_]+)\.sql$/.exec(file);
    if (!match) {
      throw new Error(`Invalid migration filename: ${file}`);
    }

    const version = Number(match[1]);
    const name = match[2] as string;

    if (!Number.isSafeInteger(version) || version <= previous) {
      throw new Error(`Migration versions must be strictly increasing: ${file}`);
    }

    previous = version;
    migrations.push({
      version,
      name,
      file,
      sql: readFileSync(join(migrationsDir, file), 'utf8'),
    });
  }

  return migrations;
}

function ensureMigrationTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      name       TEXT    NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);
}

function appliedVersions(db: Database.Database): number[] {
  const rows = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as {
    version: number;
  }[];
  return rows.map((row) => row.version);
}

export function getMigrationStatus(
  db: Database.Database,
  migrationsDir = DEFAULT_MIGRATIONS_DIR,
): MigrationStatus {
  ensureMigrationTable(db);
  const migrations = loadMigrations(migrationsDir);
  const applied = appliedVersions(db);
  return {
    current: applied.at(-1) ?? 0,
    latest: migrations.at(-1)?.version ?? 0,
    applied,
  };
}

export function migrate(db: Database.Database, options: MigrateOptions = {}): number {
  const migrations = loadMigrations(options.migrationsDir);
  const now = options.now ?? Date.now();
  ensureMigrationTable(db);

  const applied = new Set(appliedVersions(db));
  const current = Math.max(0, ...applied);
  const latest = migrations.at(-1)?.version ?? 0;

  if (current > latest) {
    throw new Error(`Database schema version ${current} is newer than supported version ${latest}`);
  }

  for (const migration of migrations) {
    if (migration.version < current && !applied.has(migration.version)) {
      throw new Error(`Database is missing migration ${migration.version} (${migration.name})`);
    }
  }

  const insert = db.prepare(
    'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
  );
  let appliedCount = 0;

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    db.transaction(() => {
      db.exec(migration.sql);
      insert.run(migration.version, migration.name, now);
    })();

    applied.add(migration.version);
    appliedCount += 1;
  }

  db.pragma(`user_version = ${latest}`);
  return appliedCount;
}
