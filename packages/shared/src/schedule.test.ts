import { describe, expect, it } from 'vitest';
import {
  addDays,
  buildSchedule,
  dayStatus,
  defaultTrainingDays,
  isTrainingDay,
  nextTrainingDay,
  startOfWeek,
  toDateKey,
  weekdayOf,
  type Schedule,
} from './schedule';

// Oct 2026: Sat 10, Sun 11, Mon 12, Tue 13 (today), Wed 14, Thu 15, Fri 16, Sat 17.
const TODAY = '2026-10-13';
const sched = (overrides: Schedule['overrides'] = {}): Schedule => ({ trainingDays: defaultTrainingDays(3), overrides });

describe('dates', () => {
  it('works with local calendar dates', () => {
    expect(toDateKey(new Date(2026, 9, 13, 23, 59))).toBe('2026-10-13');
    expect(weekdayOf(TODAY)).toBe(2); // Tuesday
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(startOfWeek(TODAY)).toBe('2026-10-10'); // Saturday
    expect(startOfWeek('2026-10-10')).toBe('2026-10-10');
    expect(startOfWeek('2026-10-16')).toBe('2026-10-10'); // Friday belongs to the same week
  });
});

describe('defaultTrainingDays', () => {
  it('spreads days across the week and keeps Friday free', () => {
    expect(defaultTrainingDays(3)).toEqual([6, 1, 3]); // Sat, Mon, Wed
    for (let n = 1; n <= 6; n++) {
      expect(defaultTrainingDays(n)).toHaveLength(n);
      expect(defaultTrainingDays(n)).not.toContain(5);
    }
  });
});

describe('day status', () => {
  it('marks done, missed, today, upcoming and rest days', () => {
    const done = new Set(['2026-10-10']);
    expect(dayStatus('2026-10-10', TODAY, sched(), done)).toBe('done'); // Sat, trained
    expect(dayStatus('2026-10-12', TODAY, sched(), done)).toBe('missed'); // Mon, not trained
    expect(dayStatus('2026-10-11', TODAY, sched(), done)).toBe('rest'); // Sun
    expect(dayStatus('2026-10-14', TODAY, sched(), done)).toBe('upcoming'); // Wed
  });

  it('counts an unplanned workout as done', () => {
    expect(dayStatus('2026-10-11', TODAY, sched(), new Set(['2026-10-11']))).toBe('done');
  });

  it('applies rest days and moved workouts', () => {
    // Move Monday's workout to Tuesday (today).
    const moved = sched({ '2026-10-12': 'rest', [TODAY]: 'train' });
    expect(dayStatus('2026-10-12', TODAY, moved, new Set())).toBe('rest');
    expect(dayStatus(TODAY, TODAY, moved, new Set())).toBe('today');
    expect(isTrainingDay('2026-10-14', moved)).toBe(true); // untouched
  });
});

describe('buildSchedule', () => {
  it('assigns plan days in rotation after the last one trained', () => {
    const days = buildSchedule({
      fromKey: '2026-10-10',
      toKey: '2026-10-23',
      todayKey: TODAY,
      schedule: sched(),
      doneDates: new Set(['2026-10-10']),
      planDayCount: 3,
      lastPlanDayIndex: 0, // trained day A on Saturday
    });
    const planned = days.filter((d) => d.planDayIndex !== null).map((d) => [d.date, d.planDayIndex]);
    // Wed 14 → B, Sat 17 → C, Mon 19 → A, Wed 21 → B
    expect(planned).toEqual([
      ['2026-10-14', 1],
      ['2026-10-17', 2],
      ['2026-10-19', 0],
      ['2026-10-21', 1],
    ]);
    expect(days.find((d) => d.date === '2026-10-12')).toMatchObject({ status: 'missed', planDayIndex: null });
  });

  it('starts at day 1 for a new member', () => {
    const days = buildSchedule({
      fromKey: TODAY,
      toKey: '2026-10-17',
      todayKey: TODAY,
      schedule: sched(),
      doneDates: new Set(),
      planDayCount: 3,
      lastPlanDayIndex: null,
    });
    expect(days.find((d) => d.date === '2026-10-14')?.planDayIndex).toBe(0);
  });

  it('gives the same plan day for a date whatever range is shown', () => {
    const args = { todayKey: TODAY, schedule: sched(), doneDates: new Set<string>(), planDayCount: 3, lastPlanDayIndex: 1 };
    const week = buildSchedule({ ...args, fromKey: '2026-10-10', toKey: '2026-10-16' });
    const month = buildSchedule({ ...args, fromKey: '2026-10-01', toKey: '2026-10-31' });
    expect(month.find((d) => d.date === '2026-10-14')?.planDayIndex).toBe(week.find((d) => d.date === '2026-10-14')?.planDayIndex);
  });
});

describe('nextTrainingDay', () => {
  it('skips today once it is done', () => {
    const today = sched({ [TODAY]: 'train' });
    expect(nextTrainingDay(TODAY, today, new Set())).toBe(TODAY);
    expect(nextTrainingDay(TODAY, today, new Set([TODAY]))).toBe('2026-10-14');
  });
});
