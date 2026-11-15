import { addDays, toDateKey } from '@gymapp/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';
import { useCalendar } from '../schedule/useSchedule';
import { planReminders } from './plan';
import { cancelWorkoutReminders, scheduleReminders, useReminderSettings } from './reminders';

/** Reminders are planned this many days ahead and refreshed whenever the app opens. */
const DAYS_AHEAD = 14;

/**
 * Keeps reminders in step with the schedule, rest days, finished workouts and
 * the reminder settings. Logging a workout cancels that day's "missed" nudge.
 * Clears everything on sign-out.
 */
export function ReminderSync() {
  const { t } = useTranslation();
  const settings = useReminderSettings();
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));

  // A new day starts while the app sits in the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTodayKey(toDateKey(new Date()));
    });
    return () => sub.remove();
  }, []);

  const cal = useCalendar(addDays(todayKey, -1), addDays(todayKey, DAYS_AHEAD - 1));

  const planned = cal.days
    ? planReminders(
        cal.days.map((d) => {
          const planDay = d.planDayIndex !== null ? cal.plan?.days[d.planDayIndex] : undefined;
          return {
            date: d.date,
            status: d.status,
            workoutName: planDay ? t(`plan.day.${planDay.key}` as 'plan.day.push') : null,
          };
        }),
        new Date(),
        settings,
      )
    : null;
  const key = planned ? planned.map((r) => `${r.kind}:${r.date}:${r.fireAt.getTime()}:${r.workoutName ?? ''}`).join('|') : null;

  useEffect(() => {
    if (key === null || !planned) return;
    void scheduleReminders(planned);
    // `key` captures everything that changes the reminders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => () => void cancelWorkoutReminders(), []);
  return null;
}
