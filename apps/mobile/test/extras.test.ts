import { describe, expect, it } from 'vitest';
import { weeklySummary } from '../src/features/progress/weeklySummary';
import { platesFor } from '../src/features/workout/plates';
import { warmupSets } from '../src/features/workout/warmup';

describe('platesFor', () => {
  it('loads each side with the fewest plates', () => {
    expect(platesFor(100)).toEqual({ perSide: [25, 15], totalKg: 100, missingKg: 0 });
    expect(platesFor(62.5)).toEqual({ perSide: [20, 1.25], totalKg: 62.5, missingKg: 0 });
    expect(platesFor(142.5)).toEqual({ perSide: [25, 25, 10, 1.25], totalKg: 142.5, missingKg: 0 });
  });

  it('handles the empty bar, other bars and weights plates can’t make', () => {
    expect(platesFor(20)).toEqual({ perSide: [], totalKg: 20, missingKg: 0 });
    expect(platesFor(15, 15)).toEqual({ perSide: [], totalKg: 15, missingKg: 0 });
    expect(platesFor(61)).toMatchObject({ perSide: [20], totalKg: 60, missingKg: 1 });
  });
});

describe('warmupSets', () => {
  it('ramps up to a heavy barbell lift', () => {
    expect(warmupSets(100, 'barbell')).toEqual([
      { weightKg: 20, reps: 10 },
      { weightKg: 50, reps: 5 },
      { weightKg: 70, reps: 3 },
      { weightKg: 85, reps: 1 },
    ]);
  });

  it('keeps it short for lighter lifts and skips light or bodyweight work', () => {
    expect(warmupSets(50, 'barbell')).toEqual([
      { weightKg: 20, reps: 10 },
      { weightKg: 25, reps: 5 },
      { weightKg: 35, reps: 3 },
    ]);
    expect(warmupSets(30, 'barbell')).toEqual([]);
    expect(warmupSets(24, 'dumbbell')).toEqual([
      { weightKg: 12, reps: 8 },
      { weightKg: 18, reps: 4 },
    ]);
    expect(warmupSets(10, 'dumbbell')).toEqual([]);
    expect(warmupSets(null, 'barbell')).toEqual([]);
    expect(warmupSets(60, 'bodyweight')).toEqual([]);
  });
});

describe('weeklySummary', () => {
  // Tue 13 Oct 2026; week starts Sat 10.
  const now = new Date(2026, 9, 13, 20);
  const at = (day: number) => new Date(2026, 9, day, 18).getTime();

  it('compares this week with last week', () => {
    const s = weeklySummary(
      [
        { startedAt: at(10), volumeKg: 5000, setCount: 18 },
        { startedAt: at(12), volumeKg: 6000, setCount: 20 },
        { startedAt: at(5), volumeKg: 4000, setCount: 16 }, // last week
        { startedAt: at(8), volumeKg: 6000, setCount: 18 }, // last week (Thu)
        { startedAt: at(1), volumeKg: 9999, setCount: 30 }, // two weeks ago
      ],
      now,
    );
    expect(s.thisWeek).toEqual({ workouts: 2, volumeKg: 11000, sets: 38 });
    expect(s.lastWeek).toEqual({ workouts: 2, volumeKg: 10000, sets: 34 });
    expect(s.volumeChangePct).toBe(10);
  });

  it('has no change figure without last week', () => {
    expect(weeklySummary([{ startedAt: at(12), volumeKg: 100, setCount: 3 }], now).volumeChangePct).toBeNull();
  });
});
