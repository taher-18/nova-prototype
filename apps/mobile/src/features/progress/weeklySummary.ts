import { addDays, startOfWeek, toDateKey } from '@gymapp/shared';

export interface SessionLike {
  startedAt: number;
  volumeKg: number;
  setCount: number;
}

export interface WeekTotals {
  workouts: number;
  volumeKg: number;
  sets: number;
}

export interface WeeklySummary {
  thisWeek: WeekTotals;
  lastWeek: WeekTotals;
  /** Volume change vs last week in %, or null when last week had none. */
  volumeChangePct: number | null;
}

/** This week (Saturday → today) vs the whole of last week. */
export function weeklySummary(sessions: SessionLike[], now: Date): WeeklySummary {
  const thisStart = startOfWeek(toDateKey(now));
  const lastStart = addDays(thisStart, -7);
  const empty = (): WeekTotals => ({ workouts: 0, volumeKg: 0, sets: 0 });
  const thisWeek = empty();
  const lastWeek = empty();
  for (const s of sessions) {
    const key = toDateKey(new Date(s.startedAt));
    const bucket = key >= thisStart ? thisWeek : key >= lastStart ? lastWeek : null;
    if (!bucket) continue;
    bucket.workouts++;
    bucket.volumeKg += s.volumeKg;
    bucket.sets += s.setCount;
  }
  thisWeek.volumeKg = Math.round(thisWeek.volumeKg);
  lastWeek.volumeKg = Math.round(lastWeek.volumeKg);
  const volumeChangePct =
    lastWeek.volumeKg > 0 ? Math.round(((thisWeek.volumeKg - lastWeek.volumeKg) / lastWeek.volumeKg) * 100) : null;
  return { thisWeek, lastWeek, volumeChangePct };
}
