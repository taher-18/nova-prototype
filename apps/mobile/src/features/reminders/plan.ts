import { addDays, fromDateKey, type DayStatus } from '@gymapp/shared';

/**
 * Works out which reminders to schedule for the coming days. Pure, so it can
 * be tested; reminders.ts turns the result into local notifications.
 *
 * - "workout": on each training day that isn't done yet, at the chosen time.
 * - "missed": the morning after a training day with no workout, once per
 *   slump (not again if the training day before was missed too).
 * Rest days and moved workouts are respected because the days come from the
 * member's schedule with its overrides.
 */

export const MISSED_HOUR = 9;

export interface ReminderSettings {
  enabled: boolean;
  hour: number;
  minute: number;
  /** Nudge the morning after a missed workout. */
  missed: boolean;
}

export interface ReminderDay {
  date: string;
  status: DayStatus;
  /** Name of the planned workout, e.g. "Push day", when known. */
  workoutName?: string | null;
}

export interface PlannedReminder {
  kind: 'workout' | 'missed';
  /** The training day the reminder is about. */
  date: string;
  fireAt: Date;
  workoutName?: string | null;
}

const at = (dateKey: string, hour: number, minute = 0) => {
  const d = fromDateKey(dateKey);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const isOpenTrainingDay = (s: DayStatus) => s === 'today' || s === 'upcoming' || s === 'missed';

export function planReminders(days: ReminderDay[], now: Date, settings: ReminderSettings): PlannedReminder[] {
  if (!settings.enabled) return [];
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const out: PlannedReminder[] = [];
  let previousTraining: DayStatus | null = null;

  for (const day of sorted) {
    if (isOpenTrainingDay(day.status)) {
      const workoutAt = at(day.date, settings.hour, settings.minute);
      if (workoutAt > now) out.push({ kind: 'workout', date: day.date, fireAt: workoutAt, workoutName: day.workoutName });

      const missedAt = at(addDays(day.date, 1), MISSED_HOUR);
      if (settings.missed && missedAt > now && previousTraining !== 'missed') {
        out.push({ kind: 'missed', date: day.date, fireAt: missedAt, workoutName: day.workoutName });
      }
    }
    if (day.status !== 'rest') previousTraining = day.status;
  }
  return out.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
