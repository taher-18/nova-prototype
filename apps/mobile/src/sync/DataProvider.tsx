import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { deleteUserDb, openUserDb, type LocalDb } from '../db/database';
import { SqliteOutboxStore } from '../db/outboxStore';
import { SyncQueue } from './queue';
import { createSender, pullAll } from './sessionSync';

interface DataContextValue {
  db: LocalDb;
  queue: SyncQueue;
  pending: number;
  /** Uploads queued workouts and downloads new history. Never throws. */
  syncNow(): Promise<void>;
  /** Re-read local data in all screens (after saving a workout). */
  refreshLocal(): void;
  /** Deletes this user's on-device data. */
  wipe(): Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const RETRY_INTERVAL_MS = 2 * 60_000;

/** Opens the signed-in user's local database and keeps it in sync with the server. */
export function DataProvider({ children }: { children: ReactNode }) {
  const { user, api } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const [db, setDb] = useState<LocalDb | null>(null);
  const [pending, setPending] = useState(0);
  const dbRef = useRef<LocalDb | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    openUserDb(userId).then((opened) => {
      if (cancelled) return void opened.closeAsync().catch(() => {});
      dbRef.current = opened;
      setDb(opened);
    });
    return () => {
      cancelled = true;
      const current = dbRef.current;
      dbRef.current = null;
      setDb(null);
      current?.closeAsync().catch(() => {});
    };
  }, [userId]);

  const queue = useMemo(
    () => (db ? new SyncQueue(new SqliteOutboxStore(db), createSender(api)) : null),
    [db, api],
  );

  const refreshLocal = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['local'] });
  }, [queryClient]);

  const syncNow = useCallback(async () => {
    if (!db || !queue) return;
    try {
      await queue.flush();
      const pulled = await pullAll(api, db);
      if (pulled > 0) refreshLocal();
    } catch {
      // Offline or server down: the queue keeps everything for later.
    }
    setPending(await queue.pendingCount().catch(() => 0));
  }, [db, queue, api, refreshLocal]);

  useEffect(() => {
    if (!queue) return;
    void syncNow();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void syncNow();
    });
    const timer = setInterval(() => {
      void queue.pendingCount().then((n) => (n > 0 ? syncNow() : undefined));
    }, RETRY_INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [queue, syncNow]);

  const wipe = useCallback(async () => {
    if (!userId) return;
    const current = dbRef.current;
    dbRef.current = null;
    setDb(null);
    await deleteUserDb(current, userId);
  }, [userId]);

  if (userId && (!db || !queue)) return null; // opening (a few ms)
  const value = db && queue ? { db, queue, pending, syncNow, refreshLocal, wipe } : null;
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData is only available when signed in');
  return ctx;
}

export const useOptionalData = () => useContext(DataContext);
