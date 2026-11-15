import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en';
import ar from '../src/i18n/ar';
import { MOTIVATION_POOLS, pickMotivation } from '../src/features/motivation/motivation';

const base = { doneThisWeek: 0, weeklyGoal: 3, missedThisWeek: 0, seed: 0 };

describe('pickMotivation', () => {
  it('fits the day', () => {
    expect(pickMotivation({ ...base, todayStatus: 'today' }).pool).toBe('trainDay');
    expect(pickMotivation({ ...base, todayStatus: 'rest' }).pool).toBe('restDay');
    expect(pickMotivation({ ...base, todayStatus: 'done', doneThisWeek: 1 }).pool).toBe('doneToday');
    expect(pickMotivation({ ...base, todayStatus: 'done', doneThisWeek: 3 }).pool).toBe('goalReached');
    expect(pickMotivation({ ...base, todayStatus: 'today', doneThisWeek: 2 })).toMatchObject({ pool: 'almostThere', params: { left: 1 } });
    expect(pickMotivation({ ...base, todayStatus: 'today', missedThisWeek: 1 }).pool).toBe('comeback');
    // A planned rest day is never a "come back" nudge.
    expect(pickMotivation({ ...base, todayStatus: 'rest', missedThisWeek: 1 }).pool).toBe('restDay');
  });

  it('rotates daily within the pool', () => {
    const seen = new Set(
      [0, 1, 2, 3, 4, 5].map((seed) => pickMotivation({ ...base, todayStatus: 'today', seed }).index),
    );
    expect(seen.size).toBe(MOTIVATION_POOLS.trainDay);
  });

  it('has every message in both languages', () => {
    for (const dict of [en, ar]) {
      for (const [pool, size] of Object.entries(MOTIVATION_POOLS)) {
        const lines = (dict.motivation as Record<string, Record<string, string>>)[pool]!;
        expect(Object.keys(lines), pool).toEqual([...Array(size).keys()].map(String));
      }
    }
  });
});
