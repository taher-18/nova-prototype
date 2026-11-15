import * as Notifications from 'expo-notifications';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';
import i18n from '../../i18n';
import { ensureNotificationPermission } from '../workout/feedback';
import type { PlannedReminder, ReminderSettings } from './plan';

export type { ReminderSettings } from './plan';

const SETTINGS_KEY = 'reminders.settings';
const IDS_KEY = 'reminders.ids';
export const DEFAULT_REMINDERS: ReminderSettings = { enabled: true, hour: 18, minute: 0, missed: true };

function readSettings(): ReminderSettings {
  try {
    const raw = Storage.getItemSync(SETTINGS_KEY);
    return raw ? { ...DEFAULT_REMINDERS, ...(JSON.parse(raw) as Partial<ReminderSettings>) } : DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

let settings = readSettings();
const listeners = new Set<() => void>();

export const getReminderSettings = () => settings;

export function saveReminderSettings(next: ReminderSettings) {
  settings = next;
  try {
    Storage.setItemSync(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // Kept in memory for this session.
  }
  listeners.forEach((l) => l());
}

/** Current settings; re-renders when they change (Profile → reminders). */
export function useReminderSettings(): ReminderSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => settings,
  );
}

export async function cancelWorkoutReminders() {
  let ids: string[] = [];
  try {
    ids = JSON.parse(Storage.getItemSync(IDS_KEY) ?? '[]') as string[];
  } catch {}
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));
  try {
    Storage.setItemSync(IDS_KEY, '[]');
  } catch {}
}

function content(r: PlannedReminder): Notifications.NotificationContentInput {
  if (r.kind === 'missed') {
    return {
      title: i18n.t('reminders.missedTitle'),
      body: i18n.t('reminders.missedBody'),
      sound: true,
      data: { type: 'missed-reminder', date: r.date },
    };
  }
  return {
    title: r.workoutName ? i18n.t('reminders.titleWithWorkout', { name: r.workoutName }) : i18n.t('reminders.title'),
    body: i18n.t('reminders.body'),
    sound: true,
    data: { type: 'workout-reminder', date: r.date },
  };
}

/** Replaces all scheduled reminders with these (one-off, by date). */
export async function scheduleReminders(planned: PlannedReminder[]) {
  await cancelWorkoutReminders();
  if (planned.length === 0) return;
  if (!(await ensureNotificationPermission())) return;
  const ids: string[] = [];
  for (const r of planned) {
    try {
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: content(r),
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.fireAt },
        }),
      );
    } catch {
      // A reminder that can't be scheduled is skipped; the rest still go out.
    }
  }
  try {
    Storage.setItemSync(IDS_KEY, JSON.stringify(ids));
  } catch {}
}
