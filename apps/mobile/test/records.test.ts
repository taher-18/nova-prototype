import { describe, expect, it } from 'vitest';
import { computeBests, detectPrs, EMPTY_BESTS, estimateOneRepMax, volumeKg } from '../src/features/workout/records';

describe('estimateOneRepMax', () => {
  it('uses the Epley formula', () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
    expect(estimateOneRepMax(100, 10)).toBe(133.3);
  });

  it('ignores sets it cannot estimate reliably', () => {
    expect(estimateOneRepMax(100, 15)).toBeNull();
    expect(estimateOneRepMax(null, 5)).toBeNull();
    expect(estimateOneRepMax(0, 5)).toBeNull();
  });
});

describe('detectPrs', () => {
  const history = computeBests([
    { reps: 8, weightKg: 60, durationSec: null },
    { reps: 5, weightKg: 70, durationSec: null },
  ]);

  it('finds a heavier weight', () => {
    const prs = detectPrs('Barbell_Squat', 's1', { reps: 3, weightKg: 72.5, durationSec: null }, history);
    expect(prs).toEqual([{ exerciseId: 'Barbell_Squat', setId: 's1', type: 'weight', value: 72.5, previous: 70 }]);
  });

  it('finds a better estimated max at a lighter weight', () => {
    // 65 × 10 ≈ 86.7 kg e1RM beats 70 × 5 ≈ 81.7
    const prs = detectPrs('Barbell_Squat', 's1', { reps: 10, weightKg: 65, durationSec: null }, history);
    expect(prs.map((p) => p.type)).toEqual(['e1rm']);
  });

  it('does not report a record for matching the previous best', () => {
    expect(detectPrs('Barbell_Squat', 's1', { reps: 5, weightKg: 70, durationSec: null }, history)).toEqual([]);
  });

  it('never celebrates the first time an exercise is done', () => {
    expect(detectPrs('Barbell_Squat', 's1', { reps: 5, weightKg: 200, durationSec: null }, EMPTY_BESTS)).toEqual([]);
  });

  it('ignores warm-up sets', () => {
    expect(detectPrs('Barbell_Squat', 's1', { reps: 5, weightKg: 100, durationSec: null, isWarmup: true }, history)).toEqual([]);
  });

  it('tracks reps for bodyweight and time for holds', () => {
    const pushups = computeBests([{ reps: 12, weightKg: null, durationSec: null }]);
    expect(detectPrs('Pushups', 's', { reps: 15, weightKg: null, durationSec: null }, pushups)[0]?.type).toBe('reps');
    const plank = computeBests([{ reps: null, weightKg: null, durationSec: 45 }]);
    expect(detectPrs('Plank', 's', { reps: null, weightKg: null, durationSec: 60 }, plank)[0]).toMatchObject({
      type: 'duration',
      value: 60,
      previous: 45,
    });
  });
});

describe('volumeKg', () => {
  it('sums weight × reps for working sets only', () => {
    expect(
      volumeKg([
        { reps: 10, weightKg: 50, durationSec: null },
        { reps: 8, weightKg: 52.5, durationSec: null },
        { reps: 10, weightKg: 20, durationSec: null, isWarmup: true },
        { reps: 15, weightKg: null, durationSec: null },
      ]),
    ).toBe(920);
  });
});
