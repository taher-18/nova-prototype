/**
 * Outbox for changes made offline. Items are stored first (survive app
 * restarts) and sent when the network is back. Plain TypeScript: storage and
 * sending are injected, so the queue logic is unit-tested.
 */

export interface OutboxItem {
  id: number;
  kind: string;
  /** Identifies the thing being synced; a newer item with the same key replaces older pending ones. */
  key: string;
  payload: string;
  attempts: number;
  nextAttemptAt: number;
  lastError: string | null;
  createdAt: number;
}

export interface OutboxStore {
  add(item: { kind: string; key: string; payload: string; now: number }): Promise<void>;
  /** Items ready to send, oldest first. */
  due(now: number, limit: number): Promise<OutboxItem[]>;
  remove(ids: number[]): Promise<void>;
  reschedule(id: number, attempts: number, nextAttemptAt: number, error: string): Promise<void>;
  /** Moves an item the server refused out of the queue (kept for debugging). */
  deadLetter(id: number, error: string): Promise<void>;
  pendingCount(): Promise<number>;
}

export type SendOutcome = { status: 'ok' } | { status: 'rejected'; error: string } | { status: 'retry'; error: string };

/**
 * Sends a batch. Returns one outcome per item (same order). Throwing means
 * the whole batch failed (offline, server down) and will be retried.
 */
export type Sender = (items: OutboxItem[]) => Promise<SendOutcome[]>;

export interface FlushResult {
  sent: number;
  retrying: number;
  rejected: number;
}

export const BASE_BACKOFF_MS = 30_000;
export const MAX_BACKOFF_MS = 30 * 60_000;

export function backoffMs(attempts: number): number {
  return Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempts - 1));
}

export class SyncQueue {
  private flushing: Promise<FlushResult> | null = null;

  constructor(
    private readonly store: OutboxStore,
    private readonly send: Sender,
    private readonly options: { now?: () => number; batchSize?: number } = {},
  ) {}

  private now() {
    return this.options.now?.() ?? Date.now();
  }

  async enqueue(kind: string, key: string, payload: unknown): Promise<void> {
    await this.store.add({ kind, key, payload: JSON.stringify(payload), now: this.now() });
  }

  pendingCount() {
    return this.store.pendingCount();
  }

  /** Sends everything that is due. Concurrent calls share one run. */
  flush(): Promise<FlushResult> {
    this.flushing ??= this.run().finally(() => {
      this.flushing = null;
    });
    return this.flushing;
  }

  private async run(): Promise<FlushResult> {
    const result: FlushResult = { sent: 0, retrying: 0, rejected: 0 };
    const batchSize = this.options.batchSize ?? 20;
    // Bounded so a misbehaving sender can't spin forever.
    for (let round = 0; round < 50; round++) {
      const now = this.now();
      const items = await this.store.due(now, batchSize);
      if (items.length === 0) break;

      let outcomes: SendOutcome[];
      try {
        outcomes = await this.send(items);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        for (const item of items) {
          await this.store.reschedule(item.id, item.attempts + 1, now + backoffMs(item.attempts + 1), message);
        }
        result.retrying += items.length;
        break; // offline: stop and try again later
      }

      const ok: number[] = [];
      for (const [i, item] of items.entries()) {
        const outcome = outcomes[i] ?? { status: 'retry', error: 'no result' };
        if (outcome.status === 'ok') ok.push(item.id);
        else if (outcome.status === 'rejected') {
          await this.store.deadLetter(item.id, outcome.error);
          result.rejected++;
        } else {
          await this.store.reschedule(item.id, item.attempts + 1, now + backoffMs(item.attempts + 1), outcome.error);
          result.retrying++;
        }
      }
      await this.store.remove(ok);
      result.sent += ok.length;
      if (items.length < batchSize) break;
    }
    return result;
  }
}

/** In-memory store (tests, and a fallback if SQLite isn't available). */
export class MemoryOutboxStore implements OutboxStore {
  items: OutboxItem[] = [];
  dead: Array<OutboxItem & { error: string }> = [];
  private nextId = 1;

  async add({ kind, key, payload, now }: { kind: string; key: string; payload: string; now: number }) {
    this.items = this.items.filter((i) => !(i.kind === kind && i.key === key));
    this.items.push({ id: this.nextId++, kind, key, payload, attempts: 0, nextAttemptAt: now, lastError: null, createdAt: now });
  }
  async due(now: number, limit: number) {
    return this.items
      .filter((i) => i.nextAttemptAt <= now)
      .sort((a, b) => a.createdAt - b.createdAt || a.id - b.id)
      .slice(0, limit);
  }
  async remove(ids: number[]) {
    this.items = this.items.filter((i) => !ids.includes(i.id));
  }
  async reschedule(id: number, attempts: number, nextAttemptAt: number, error: string) {
    this.items = this.items.map((i) => (i.id === id ? { ...i, attempts, nextAttemptAt, lastError: error } : i));
  }
  async deadLetter(id: number, error: string) {
    const item = this.items.find((i) => i.id === id);
    if (item) this.dead.push({ ...item, error });
    await this.remove([id]);
  }
  async pendingCount() {
    return this.items.length;
  }
}
