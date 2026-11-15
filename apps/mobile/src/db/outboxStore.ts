import type { OutboxItem, OutboxStore } from '../sync/queue';
import type { LocalDb } from './database';

interface Row {
  id: number;
  kind: string;
  key: string;
  payload: string;
  attempts: number;
  next_attempt_at: number;
  last_error: string | null;
  created_at: number;
}

const toItem = (r: Row): OutboxItem => ({
  id: r.id,
  kind: r.kind,
  key: r.key,
  payload: r.payload,
  attempts: r.attempts,
  nextAttemptAt: r.next_attempt_at,
  lastError: r.last_error,
  createdAt: r.created_at,
});

export class SqliteOutboxStore implements OutboxStore {
  constructor(private readonly db: LocalDb) {}

  async add({ kind, key, payload, now }: { kind: string; key: string; payload: string; now: number }) {
    await this.db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync('DELETE FROM outbox WHERE kind = ? AND key = ?', kind, key);
      await tx.runAsync(
        'INSERT INTO outbox (kind, key, payload, next_attempt_at, created_at) VALUES (?, ?, ?, ?, ?)',
        kind,
        key,
        payload,
        now,
        now,
      );
    });
  }

  async due(now: number, limit: number) {
    const rows = await this.db.getAllAsync<Row>(
      'SELECT * FROM outbox WHERE next_attempt_at <= ? ORDER BY created_at, id LIMIT ?',
      now,
      limit,
    );
    return rows.map(toItem);
  }

  async remove(ids: number[]) {
    if (ids.length === 0) return;
    await this.db.runAsync(`DELETE FROM outbox WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids);
  }

  async reschedule(id: number, attempts: number, nextAttemptAt: number, error: string) {
    await this.db.runAsync(
      'UPDATE outbox SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?',
      attempts,
      nextAttemptAt,
      error,
      id,
    );
  }

  async deadLetter(id: number, error: string) {
    await this.db.withExclusiveTransactionAsync(async (tx) => {
      await tx.runAsync(
        `INSERT OR REPLACE INTO outbox_dead (id, kind, key, payload, error, failed_at)
         SELECT id, kind, key, payload, ?, ? FROM outbox WHERE id = ?`,
        error,
        Date.now(),
        id,
      );
      await tx.runAsync('DELETE FROM outbox WHERE id = ?', id);
    });
  }

  async pendingCount() {
    const row = await this.db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM outbox');
    return row?.n ?? 0;
  }
}
