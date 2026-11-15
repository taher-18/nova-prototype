import { z } from 'zod';

/**
 * Training schedule: which weekdays a member trains, plus per-date changes
 * (rest days and moved workouts). Pure functions on local calendar dates
 * ("YYYY-MM-DD"), shared by the app and, later, the gym dashboard
 * (so "missed" is never confused with a planned rest day).
 */

/** JavaScript weekdays: 0 = Sunday … 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type OverrideKind = 'rest' | 'train';
export type DayStatus = 'done' | 'missed' | 'today' | 'upcoming' | 'rest';

export interface Schedule {
  trainingDays: number[];
  /** date → change for that day only */
  overrides: Record<string, OverrideKind>;
}

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const trainingDaysSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7)
  .refine((days) => new Set(days).size === days.length, 'Duplicate weekday');

/**
 * Default training weekdays for N days a week. Weeks start on Saturday and
 * Friday stays free (the Egyptian weekend).
 */
export function defaultTrainingDays(daysPerWeek: number): number[] {
  const byCount: Record<number, number[]> = {
    1: [6],
    2: [6, 2],
    3: [6, 1, 3],
    4: [6, 0, 2, 3],
    5: [6, 0, 1, 2, 3],
    6: [6, 0, 1, 2, 3, 4],
    7: [6, 0, 1, 2, 3, 4, 5],
  };
  return byCount[Math.min(7, Math.max(1, daysPerWeek))]!;
}

// ───────────── dates ─────────────

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date of a Date, e.g. "2026-10-13". */
export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local noon of a date key (noon avoids daylight-saving edge cases). */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12);
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function weekdayOf(key: string): number {
  return fromDateKey(key).getDay();
}

/** Saturday (by default) of the week containing `key`. */
export function startOfWeek(key: string, weekStartsOn = 6): string {
  const diff = (weekdayOf(key) - weekStartsOn + 7) % 7;
  return addDays(key, -diff);
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((fromDateKey(toKey).getTime() - fromDateKey(fromKey).getTime()) / 86_400_000);
}

// ───────────── schedule ─────────────

export function isTrainingDay(key: string, schedule: Schedule): boolean {
  const override = schedule.overrides[key];
  if (override) return override === 'train';
  return schedule.trainingDays.includes(weekdayOf(key));
}

export function dayStatus(key: string, todayKey: string, schedule: Schedule, doneDates: Set<string>): DayStatus {
  if (doneDates.has(key)) return 'done';
  if (!isTrainingDay(key, schedule)) return 'rest';
  if (key < todayKey) return 'missed';
  return key === todayKey ? 'today' : 'upcoming';
}

export interface ScheduledDay {
  date: string;
  status: DayStatus;
  /** Plan day (index into plan.days) planned for this date; null for rest/missed/done. */
  planDayIndex: number | null;
}

/**
 * Statuses for every date in [fromKey, toKey], with plan days assigned to the
 * upcoming training days in rotation, continuing after the last plan day
 * the member actually trained.
 */
export function buildSchedule(input: {
  fromKey: string;
  toKey: string;
  todayKey: string;
  schedule: Schedule;
  doneDates: Set<string>;
  planDayCount: number;
  /** Index of the plan day trained most recently, or null. */
  lastPlanDayIndex: number | null;
}): ScheduledDay[] {
  const { fromKey, toKey, todayKey, schedule, doneDates, planDayCount, lastPlanDayIndex } = input;
  const days: ScheduledDay[] = [];
  let next = lastPlanDayIndex === null ? 0 : (lastPlanDayIndex + 1) % Math.max(1, planDayCount);
  // Count assignments from today so the rotation is the same whatever range is shown.
  const futureStart = todayKey;
  let cursor = futureStart;
  const assigned = new Map<string, number>();
  if (planDayCount > 0 && toKey >= futureStart) {
    for (let i = 0; i < 400 && cursor <= toKey; i++) {
      const status = dayStatus(cursor, todayKey, schedule, doneDates);
      if (status === 'today' || status === 'upcoming') {
        assigned.set(cursor, next);
        next = (next + 1) % planDayCount;
      }
      cursor = addDays(cursor, 1);
    }
  }
  for (let key = fromKey, i = 0; key <= toKey && i < 400; key = addDays(key, 1), i++) {
    days.push({
      date: key,
      status: dayStatus(key, todayKey, schedule, doneDates),
      planDayIndex: assigned.get(key) ?? null,
    });
  }
  return days;
}

/** First training day from today on that isn't done yet. */
export function nextTrainingDay(
  todayKey: string,
  schedule: Schedule,
  doneDates: Set<string>,
  horizonDays = 30,
): string | null {
  for (let i = 0; i <= horizonDays; i++) {
    const key = addDays(todayKey, i);
    const status = dayStatus(key, todayKey, schedule, doneDates);
    if (status === 'today' || status === 'upcoming') return key;
  }
  return null;
}

// ───────────── API contract ─────────────

/** Response of GET /v1/schedule */
export interface ScheduleResponse {
  trainingDays: number[];
  weeklyGoal: number;
  overrides: Array<{ date: string; kind: OverrideKind }>;
}

export const setTrainingDaysSchema = z.object({ trainingDays: trainingDaysSchema });
export const setOverrideSchema = z.object({ kind: z.enum(['rest', 'train']) });
export const moveWorkoutSchema = z.object({ from: dateKeySchema, to: dateKeySchema });

export function toSchedule(res: Pick<ScheduleResponse, 'trainingDays' | 'overrides'>): Schedule {
  return {
    trainingDays: res.trainingDays,
    overrides: Object.fromEntries(res.overrides.map((o) => [o.date, o.kind])),
  };
}
