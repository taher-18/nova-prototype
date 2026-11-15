import type { BodyMetricKind } from '@gymapp/shared';
import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { latestBodyMetrics, listBodyMetrics, saveBodyMetric } from '../../db/bodyMetrics';
import { useData } from '../../sync/DataProvider';
import { BODY_METRIC_KIND } from '../../sync/sessionSync';

export function useBodyMetric(kind: BodyMetricKind) {
  const { db } = useData();
  return useQuery({ queryKey: ['local', 'body', kind], queryFn: () => listBodyMetrics(db, kind) });
}

export function useLatestBodyMetrics() {
  const { db } = useData();
  return useQuery({ queryKey: ['local', 'body', 'latest'], queryFn: () => latestBodyMetrics(db) });
}

/** Log or delete entries offline-first: saved on the phone, then synced. */
export function useBodyMetricActions() {
  const { db, queue, refreshLocal, syncNow } = useData();
  async function write(entry: Parameters<typeof saveBodyMetric>[1]) {
    await saveBodyMetric(db, entry);
    await queue.enqueue(BODY_METRIC_KIND, entry.id, entry);
    refreshLocal();
    void syncNow();
  }
  return {
    log: (kind: BodyMetricKind, value: number, loggedAt = new Date()) => {
      const now = new Date().toISOString();
      return write({ id: randomUUID(), kind, value, loggedAt: loggedAt.toISOString(), clientUpdatedAt: now });
    },
    remove: (entry: { id: string; kind: BodyMetricKind; value: number; loggedAt: number }) =>
      write({
        id: entry.id,
        kind: entry.kind,
        value: entry.value,
        loggedAt: new Date(entry.loggedAt).toISOString(),
        clientUpdatedAt: new Date().toISOString(),
        deleted: true,
      }),
  };
}
