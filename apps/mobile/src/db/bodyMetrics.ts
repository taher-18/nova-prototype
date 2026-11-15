import type { BodyMetricEntry, BodyMetricKind, BodyMetricsPage } from '@gymapp/shared';
import type { LocalDb } from './database';

export interface BodyMetricRow {
  id: string;
  kind: BodyMetricKind;
  value: number;
  loggedAt: number;
}

/** Saves an entry locally (the caller queues it for sync). */
export async function saveBodyMetric(db: LocalDb, e: BodyMetricEntry) {
  await db.runAsync(
    `INSERT INTO body_metrics (id, kind, value, logged_at, deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, value = excluded.value, logged_at = excluded.logged_at,
       deleted = excluded.deleted, updated_at = excluded.updated_at`,
    e.id,
    e.kind,
    e.value,
    Date.parse(e.loggedAt),
    e.deleted ? 1 : 0,
    Date.parse(e.clientUpdatedAt),
  );
}

export async function listBodyMetrics(db: LocalDb, kind: BodyMetricKind): Promise<BodyMetricRow[]> {
  const rows = await db.getAllAsync<{ id: string; kind: BodyMetricKind; value: number; logged_at: number }>(
    'SELECT id, kind, value, logged_at FROM body_metrics WHERE kind = ? AND deleted = 0 ORDER BY logged_at',
    kind,
  );
  return rows.map((r) => ({ id: r.id, kind: r.kind, value: r.value, loggedAt: r.logged_at }));
}

/** Most recent value of every kind. */
export async function latestBodyMetrics(db: LocalDb): Promise<Partial<Record<BodyMetricKind, BodyMetricRow>>> {
  const rows = await db.getAllAsync<{ id: string; kind: BodyMetricKind; value: number; logged_at: number }>(
    `SELECT id, kind, value, logged_at FROM body_metrics b
     WHERE deleted = 0 AND logged_at = (SELECT MAX(logged_at) FROM body_metrics WHERE kind = b.kind AND deleted = 0)`,
  );
  return Object.fromEntries(rows.map((r) => [r.kind, { id: r.id, kind: r.kind, value: r.value, loggedAt: r.logged_at }]));
}

export async function applyRemoteBodyMetrics(db: LocalDb, page: BodyMetricsPage) {
  for (const remote of page.entries) {
    const local = await db.getFirstAsync<{ updated_at: number }>('SELECT updated_at FROM body_metrics WHERE id = ?', remote.id);
    if (local && local.updated_at >= Date.parse(remote.clientUpdatedAt)) continue;
    await saveBodyMetric(db, remote);
  }
}
