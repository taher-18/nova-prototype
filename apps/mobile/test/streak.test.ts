import { describe, expect, it } from 'vitest';
import { computeStreak, weekStart } from '../src/features/workout/streak';

// Local dates. Oct 2026: Sat 3, Sat 10, Sat 17.
const d = (day: number, month = 9) => new Date(2026, month, day, 18);

describe('weekStart', () => {
  it('starts weeks on Saturday', () => {
    expect(weekStart(d(13)).getDate()).toBe(10); // Tue → Sat 10
    expect(weekStart(d(10)).getDate()).toBe(10); // Sat itself
    expect(weekStart(d(9)).getDate()).toBe(3); // Fri → previous Sat
  });
});

describe('computeStreak', () => {
  it('counts consecutive weeks that met the goal', () => {
    const dates = [d(26, 8), d(28, 8), d(4), d(6), d(11)];
    // weeks: Sep 26 (2 ✓), Oct 3 (2 ✓), Oct 10 (1 so far)
    const s = computeStreak(dates, 2, d(13));
    expect(s).toMatchObject({ thisWeekCount: 1, weeklyGoal: 2, weekComplete: false, currentWeeks: 2 });
  });

  it('includes this week once the goal is reached', () => {
    const s = computeStreak([d(4), d(6), d(11), d(12)], 2, d(13));
    expect(s).toMatchObject({ weekComplete: true, currentWeeks: 2 });
  });

  it('resets after a missed week, but keeps the longest', () => {
    const dates = [d(19, 8), d(20, 8), d(26, 8), d(27, 8), /* Oct 3 week missed */ d(11), d(12)];
    const s = computeStreak(dates, 2, d(13));
    expect(s.currentWeeks).toBe(1);
    expect(s.longestWeeks).toBe(2);
  });

  it('is zero for a new member', () => {
    expect(computeStreak([], 3, d(13))).toMatchObject({ thisWeekCount: 0, currentWeeks: 0, longestWeeks: 0 });
  });
});
