import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backoffMs, MemoryOutboxStore, SyncQueue, type OutboxItem, type SendOutcome } from '../src/sync/queue';

let now = 1_000_000;
let store: MemoryOutboxStore;

function queue(send: (items: OutboxItem[]) => Promise<SendOutcome[]>, batchSize = 20) {
  return new SyncQueue(store, send, { now: () => now, batchSize });
}

const allOk = async (items: OutboxItem[]) => items.map((): SendOutcome => ({ status: 'ok' }));

beforeEach(() => {
  now = 1_000_000;
  store = new MemoryOutboxStore();
});

describe('SyncQueue', () => {
  it('sends queued items in order and removes them', async () => {
    const send = vi.fn(allOk);
    const q = queue(send);
    await q.enqueue('session', 'a', { n: 1 });
    now += 1;
    await q.enqueue('session', 'b', { n: 2 });

    expect(await q.flush()).toEqual({ sent: 2, retrying: 0, rejected: 0 });
    expect(send.mock.calls[0]![0].map((i) => JSON.parse(i.payload).n)).toEqual([1, 2]);
    expect(await q.pendingCount()).toBe(0);
  });

  it('keeps only the latest version of the same item', async () => {
    const send = vi.fn(allOk);
    const q = queue(send);
    await q.enqueue('session', 'a', { v: 1 });
    await q.enqueue('session', 'a', { v: 2 });
    await q.flush();
    expect(send.mock.calls[0]![0].map((i) => JSON.parse(i.payload))).toEqual([{ v: 2 }]);
  });

  it('keeps everything when offline and backs off', async () => {
    const q = queue(async () => {
      throw new Error('network_error');
    });
    await q.enqueue('session', 'a', {});
    expect(await q.flush()).toEqual({ sent: 0, retrying: 1, rejected: 0 });
    expect(store.items[0]).toMatchObject({ attempts: 1, lastError: 'network_error', nextAttemptAt: now + backoffMs(1) });

    // Not due yet: nothing is sent.
    const send = vi.fn(allOk);
    const later = queue(send);
    await later.flush();
    expect(send).not.toHaveBeenCalled();

    now += backoffMs(1);
    expect(await later.flush()).toMatchObject({ sent: 1 });
    expect(await later.pendingCount()).toBe(0);
  });

  it('drops items the server rejects and retries the ones it asks to', async () => {
    const q = queue(async (items) =>
      items.map((i): SendOutcome =>
        i.key === 'bad' ? { status: 'rejected', error: 'forbidden' } : i.key === 'busy' ? { status: 'retry', error: 'try later' } : { status: 'ok' },
      ),
    );
    await q.enqueue('session', 'bad', {});
    await q.enqueue('session', 'good', {});
    await q.enqueue('session', 'busy', {});

    expect(await q.flush()).toEqual({ sent: 1, retrying: 1, rejected: 1 });
    expect(store.dead.map((d) => [d.key, d.error])).toEqual([['bad', 'forbidden']]);
    expect(store.items.map((i) => i.key)).toEqual(['busy']);
  });

  it('sends in batches', async () => {
    const send = vi.fn(allOk);
    const q = queue(send, 2);
    for (const k of ['a', 'b', 'c', 'd', 'e']) await q.enqueue('session', k, {});
    expect(await q.flush()).toMatchObject({ sent: 5 });
    expect(send.mock.calls.map((c) => c[0].length)).toEqual([2, 2, 1]);
  });

  it('runs one flush at a time', async () => {
    let release!: () => void;
    const send = vi.fn(async (items: OutboxItem[]) => {
      await new Promise<void>((r) => (release = r));
      return items.map((): SendOutcome => ({ status: 'ok' }));
    });
    const q = queue(send);
    await q.enqueue('session', 'a', {});
    const first = q.flush();
    const second = q.flush();
    expect(second).toBe(first);
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    release();
    await first;
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('caps the backoff', () => {
    expect(backoffMs(1)).toBe(30_000);
    expect(backoffMs(2)).toBe(60_000);
    expect(backoffMs(20)).toBe(30 * 60_000);
  });
});
