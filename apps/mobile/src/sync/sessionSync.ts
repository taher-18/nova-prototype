import type { BodyMetricsPage, SessionsPage, SyncResult } from '@gymapp/shared';
import { applyRemoteBodyMetrics } from '../db/bodyMetrics';
import { kvGet, kvSet, type LocalDb } from '../db/database';
import { applyRemoteSessions } from '../db/history';
import { ApiError, type ApiClient } from '../lib/api';
import type { OutboxItem, Sender, SendOutcome } from './queue';

export const SESSION_KIND = 'session';
export const BODY_METRIC_KIND = 'bodyMetric';

/** Where each kind of queued change is uploaded. */
const ENDPOINTS: Record<string, { path: string; field: 'sessions' | 'entries' }> = {
  [SESSION_KIND]: { path: '/v1/sessions/sync', field: 'sessions' },
  [BODY_METRIC_KIND]: { path: '/v1/body-metrics/sync', field: 'entries' },
};

async function sendKind(api: ApiClient, kind: string, items: OutboxItem[]): Promise<SendOutcome[]> {
  const endpoint = ENDPOINTS[kind];
  if (!endpoint) return items.map(() => ({ status: 'rejected', error: `unknown kind ${kind}` }));
  let results: SyncResult[];
  try {
    const body = { [endpoint.field]: items.map((i) => JSON.parse(i.payload)) };
    results = (await api.post<{ results: SyncResult[] }>(endpoint.path, body)).results;
  } catch (err) {
    // The server refused the payload itself; retrying won't help.
    if (err instanceof ApiError && err.status === 400) {
      return items.map((): SendOutcome => ({ status: 'rejected', error: err.code }));
    }
    throw err;
  }
  const byId = new Map(results.map((r) => [r.id, r]));
  return items.map((item): SendOutcome => {
    const r = byId.get(item.key);
    if (!r) return { status: 'retry', error: 'missing result' };
    if (r.status === 'ok') return { status: 'ok' };
    return r.reason === 'error' ? { status: 'retry', error: 'server error' } : { status: 'rejected', error: r.reason ?? 'rejected' };
  });
}

/** Uploads queued changes, one request per kind. Network/server errors throw so the queue retries later. */
export function createSender(api: ApiClient): Sender {
  return async (items) => {
    const outcomes = new Map<OutboxItem, SendOutcome>();
    for (const kind of [...new Set(items.map((i) => i.kind))]) {
      const group = items.filter((i) => i.kind === kind);
      const res = await sendKind(api, kind, group);
      group.forEach((item, i) => outcomes.set(item, res[i]!));
    }
    return items.map((i) => outcomes.get(i)!);
  };
}

/** Downloads changes the phone doesn't have yet (e.g. after reinstalling). Returns how many arrived. */
export async function pullAll(api: ApiClient, db: LocalDb): Promise<number> {
  return (await pullPaged<SessionsPage>(api, db, '/v1/sessions', 'sync.sessionsSince', async (page) => {
    await applyRemoteSessions(db, page);
    return page.sessions.map((s) => s.updatedAt);
  })) +
    (await pullPaged<BodyMetricsPage>(api, db, '/v1/body-metrics', 'sync.bodyMetricsSince', async (page) => {
      await applyRemoteBodyMetrics(db, page);
      return page.entries.map((e) => e.updatedAt);
    }));
}

async function pullPaged<P extends { nextSince: string | null }>(
  api: ApiClient,
  db: LocalDb,
  path: string,
  cursorKey: string,
  apply: (page: P) => Promise<string[]>,
): Promise<number> {
  let since = await kvGet<string>(db, cursorKey);
  let total = 0;
  for (let page = 0; page < 20; page++) {
    const res = await api.get<P>(`${path}${since ? `?since=${encodeURIComponent(since)}` : ''}`);
    const updated = await apply(res);
    total += updated.length;
    if (updated.length) {
      since = updated[updated.length - 1]!;
      await kvSet(db, cursorKey, since);
    }
    if (!res.nextSince) break;
  }
  return total;
}
