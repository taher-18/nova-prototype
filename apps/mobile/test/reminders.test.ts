import { describe, expect, it } from 'vitest';
import { MISSED_HOUR, planReminders, type ReminderDay } from '../src/features/reminders/plan';

const settings = { enabled: true, hour: 18, minute: 0, missed: true };
const local = (date: string, hour: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y!, m! - 1, d!, hour, 0, 0, 0);
};
const brief = (rs: ReturnType<typeof planReminders>) => rs.map((r) => `${r.kind} ${r.date} ${r.fireAt.getDate()}@${r.fireAt.getHours()}`);

// Mon 12 rest-day pattern: Sat 10 train, Sun 11 rest, Mon 12 train, Tue 13 (today) train, Wed 14 rest, Thu 15 train
const week: ReminderDay[] = [
  { date: '2026-10-12', status: 'missed' },
  { date: '2026-10-13', status: 'today', workoutName: 'Push' },
  { date: '2026-10-14', status: 'rest' },
  { date: '2026-10-15', status: 'upcoming', workoutName: 'Legs' },
];

describe('planReminders', () => {
  it('reminds on open training days and the morning after', () => {
    const now = local('2026-10-13', 8); // Tue 08:00
    expect(brief(planReminders(week, now, settings))).toEqual([
      `missed 2026-10-12 13@${MISSED_HOUR}`, // yesterday was missed
      'workout 2026-10-13 13@18',
      // No nudge for today: yesterday's was the nudge for this slump.
      'workout 2026-10-15 15@18',
      `missed 2026-10-15 16@${MISSED_HOUR}`,
    ]);
    expect(planReminders(week, now, settings)[1]?.workoutName).toBe('Push');
  });

  it('skips done days, rest days and times already past', () => {
    const now = local('2026-10-13', 19); // after today's reminder time
    const done = week.map((d) => (d.date === '2026-10-13' ? { ...d, status: 'done' as const } : d));
    expect(brief(planReminders(done, now, settings))).toEqual([
      'workout 2026-10-15 15@18',
      `missed 2026-10-15 16@${MISSED_HOUR}`,
    ]);
  });

  it("doesn't nag twice in a row after several missed days", () => {
    const now = local('2026-10-13', 8);
    const slump: ReminderDay[] = [
      { date: '2026-10-11', status: 'missed' },
      { date: '2026-10-12', status: 'missed' },
      { date: '2026-10-13', status: 'today' },
    ];
    const missed = planReminders(slump, now, settings).filter((r) => r.kind === 'missed');
    // The 11th's nudge already went out; the 12th and today follow a missed day.
    expect(missed).toEqual([]);
  });

  it('respects the settings', () => {
    const now = local('2026-10-13', 8);
    expect(planReminders(week, now, { ...settings, enabled: false })).toEqual([]);
    expect(planReminders(week, now, { ...settings, missed: false }).every((r) => r.kind === 'workout')).toBe(true);
  });
});
