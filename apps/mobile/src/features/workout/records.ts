/**
 * Personal records. Plain TypeScript (no React Native) so it can be unit-tested.
 */

export interface SetValues {
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  isWarmup?: boolean;
}

export interface Bests {
  /** Heaviest weight lifted for at least one rep. */
  maxWeightKg: number | null;
  /** Best estimated one-rep max. */
  maxE1rm: number | null;
  /** Most reps in a set without added weight (bodyweight exercises). */
  maxReps: number | null;
  /** Longest hold (time-based exercises). */
  maxDurationSec: number | null;
}

export type PrType = 'weight' | 'e1rm' | 'reps' | 'duration';

export interface PrEvent {
  exerciseId: string;
  setId: string;
  type: PrType;
  value: number;
  /** The record that was beaten. */
  previous: number;
}

export const EMPTY_BESTS: Bests = { maxWeightKg: null, maxE1rm: null, maxReps: null, maxDurationSec: null };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Epley formula. Only trusted up to 12 reps; above that it overestimates. */
export function estimateOneRepMax(weightKg: number | null, reps: number | null): number | null {
  if (!weightKg || weightKg <= 0 || !reps || reps <= 0 || reps > 12) return null;
  if (reps === 1) return weightKg;
  return round1(weightKg * (1 + reps / 30));
}

const max = (a: number | null, b: number | null) => (a === null ? b : b === null ? a : Math.max(a, b));

export function addToBests(bests: Bests, set: SetValues): Bests {
  if (set.isWarmup) return bests;
  const loaded = !!set.weightKg && set.weightKg > 0;
  return {
    maxWeightKg: loaded && set.reps ? max(bests.maxWeightKg, set.weightKg) : bests.maxWeightKg,
    maxE1rm: max(bests.maxE1rm, estimateOneRepMax(set.weightKg, set.reps)),
    maxReps: !loaded && set.reps ? max(bests.maxReps, set.reps) : bests.maxReps,
    maxDurationSec: set.durationSec ? max(bests.maxDurationSec, set.durationSec) : bests.maxDurationSec,
  };
}

export function computeBests(sets: SetValues[]): Bests {
  return sets.reduce(addToBests, EMPTY_BESTS);
}

export const hasHistory = (b: Bests) =>
  b.maxWeightKg !== null || b.maxE1rm !== null || b.maxReps !== null || b.maxDurationSec !== null;

/**
 * Records this set breaks compared to `bests`. Nothing counts as a record the
 * first time you do an exercise — there is nothing to beat yet.
 */
export function detectPrs(
  exerciseId: string,
  setId: string,
  set: SetValues,
  bests: Bests,
): PrEvent[] {
  if (set.isWarmup || !hasHistory(bests)) return [];
  const events: PrEvent[] = [];
  const push = (type: PrType, value: number | null, previous: number | null) => {
    if (value !== null && previous !== null && value > previous) {
      events.push({ exerciseId, setId, type, value, previous });
    }
  };
  const loaded = !!set.weightKg && set.weightKg > 0;
  if (loaded && set.reps) {
    push('weight', set.weightKg, bests.maxWeightKg);
    // A heavier weight already says it all; only report e1RM on its own.
    if (!events.length) push('e1rm', estimateOneRepMax(set.weightKg, set.reps), bests.maxE1rm);
  } else if (set.reps) {
    push('reps', set.reps, bests.maxReps);
  }
  if (set.durationSec) push('duration', set.durationSec, bests.maxDurationSec);
  return events;
}

/** Total weight moved: weight × reps over working sets. */
export function volumeKg(sets: SetValues[]): number {
  return round1(sets.reduce((sum, s) => (s.isWarmup ? sum : sum + (s.weightKg ?? 0) * (s.reps ?? 0)), 0));
}
