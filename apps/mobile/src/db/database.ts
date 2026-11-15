import * as SQLite from 'expo-sqlite';

/**
 * On-device database, one file per user so two people sharing a phone never
 * see each other's workouts. Holds workout history (for "last time" numbers,
 * records and charts), the sync outbox and the in-progress workout.
 */
export type LocalDb = SQLite.SQLiteDatabase;

const MIGRATIONS: string[] = [
  `
  CREATE TABLE sessions (
    id TEXT PRIMARY KEY NOT NULL,
    plan_day_id TEXT,
    day_key TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    exercise_notes TEXT NOT NULL DEFAULT '{}',
    deleted INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_started ON sessions(started_at);
  CREATE TABLE sets (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    exercise_id TEXT NOT NULL,
    set_index INTEGER NOT NULL,
    reps INTEGER,
    weight_kg REAL,
    duration_sec INTEGER,
    is_warmup INTEGER NOT NULL DEFAULT 0,
    completed_at INTEGER NOT NULL
  );
  CREATE INDEX sets_exercise ON sets(exercise_id, completed_at);
  CREATE INDEX sets_session ON sets(session_id);
  CREATE TABLE outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    key TEXT NOT NULL,
    payload TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at INTEGER NOT NULL,
    last_error TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE outbox_dead (
    id INTEGER PRIMARY KEY,
    kind TEXT NOT NULL,
    key TEXT NOT NULL,
    payload TEXT NOT NULL,
    error TEXT,
    failed_at INTEGER NOT NULL
  );
  CREATE TABLE kv (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
  `,
  `
  CREATE TABLE body_metrics (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    value REAL NOT NULL,
    logged_at INTEGER NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX body_metrics_kind ON body_metrics(kind, logged_at);
  `,
];

const fileName = (userId: string) => `gymapp-${userId}.db`;

export async function openUserDb(userId: string): Promise<LocalDb> {
  const db = await SQLite.openDatabaseAsync(fileName(userId));
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = row?.user_version ?? 0;
  for (let v = version; v < MIGRATIONS.length; v++) {
    await db.withExclusiveTransactionAsync(async (tx) => {
      await tx.execAsync(MIGRATIONS[v]!);
      await tx.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
  return db;
}

/** Removes the user's local data (account deletion). */
export async function deleteUserDb(db: LocalDb | null, userId: string) {
  try {
    await db?.closeAsync();
  } catch {}
  await SQLite.deleteDatabaseAsync(fileName(userId)).catch(() => {});
}

export async function kvGet<T>(db: LocalDb, key: string): Promise<T | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function kvSet(db: LocalDb, key: string, value: unknown) {
  await db.runAsync(
    'INSERT INTO kv (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    JSON.stringify(value),
  );
}

export async function kvDelete(db: LocalDb, key: string) {
  await db.runAsync('DELETE FROM kv WHERE key = ?', key);
}
