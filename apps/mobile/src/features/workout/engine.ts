/**
 * Active-workout state and the actions that change it.
 *
 * The whole workout is one plain, JSON-serialisable object. Every action is a
 * pure function returning a new object, so the screen can save it after each
 * tap (resume after the app is closed) and the logic is unit-testable.
 * Time is passed in (`now`, ms) and ids come from `newId`, never generated here.
 */
import type { SyncSession } from '@gymapp/shared';
import { addToBests, computeBests, detectPrs, EMPTY_BESTS, volumeKg, type Bests, type PrEvent } from './records';

export type Tracking = 'reps' | 'time';

/** What the plan (or the member) asks for. */
export interface ExerciseTarget {
  exerciseId: string;
  tracking: Tracking;
  /** Uses external weight (barbell, dumbbell, machine, cable). */
  loaded: boolean;
  sets: number;
  repsMin: number | null;
  repsMax: number | null;
  durationSec: number | null;
  restSec: number;
}

/** Previous performance of an exercise, looked up before it is added. */
export interface ExerciseHistory {
  /** Working sets from the most recent workout with this exercise, in order. */
  lastSets: Array<{ reps: number | null; weightKg: number | null; durationSec: number | null }>;
  /** All-time bests before this workout. */
  bests: Bests;
}

export const NO_HISTORY: ExerciseHistory = { lastSets: [], bests: EMPTY_BESTS };

export interface ActiveSet {
  id: string;
  targetWeightKg: number | null;
  /** Same set number last time, shown beside the row. */
  previous: { reps: number | null; weightKg: number | null; durationSec: number | null } | null;
  weightKg: number | null;
  reps: number | null;
  durationSec: number | null;
  done: boolean;
  completedAt: number | null;
}

export interface ActiveExercise {
  key: string;
  exerciseId: string;
  tracking: Tracking;
  loaded: boolean;
  repsMin: number | null;
  repsMax: number | null;
  targetDurationSec: number | null;
  restSec: number;
  skipped: boolean;
  note: string;
  /** Bests before this workout (for PR detection). */
  bests: Bests;
  sets: ActiveSet[];
}

export interface RestTimer {
  endsAt: number;
  durationSec: number;
}

export interface ActiveWorkout {
  version: 1;
  id: string;
  planDayId: string | null;
  dayKey: string | null;
  startedAt: number;
  currentIndex: number;
  exercises: ActiveExercise[];
  rest: RestTimer | null;
  /** Best record per exercise and type reached in this workout. */
  prs: PrEvent[];
}

type NewId = () => string;

/** Suggested weight steps when every rep target was hit last time. */
const INCREMENT_KG = 2.5;

/**
 * Weight to aim for in set `index`: last time's weight, plus a small step if
 * every working set last time reached the top of the rep range.
 */
export function suggestWeight(target: ExerciseTarget, history: ExerciseHistory, index: number): number | null {
  if (!target.loaded || history.lastSets.length === 0) return null;
  const prev = history.lastSets[Math.min(index, history.lastSets.length - 1)]!;
  if (!prev.weightKg) return null;
  const hitAll =
    target.repsMax !== null && history.lastSets.every((s) => s.reps !== null && s.reps >= target.repsMax!);
  return hitAll ? prev.weightKg + INCREMENT_KG : prev.weightKg;
}

function buildExercise(target: ExerciseTarget, history: ExerciseHistory, newId: NewId): ActiveExercise {
  const sets = Array.from({ length: Math.max(1, target.sets) }, (_, i): ActiveSet => {
    const previous = history.lastSets[i] ?? null;
    const weight = suggestWeight(target, history, i);
    return {
      id: newId(),
      targetWeightKg: weight,
      previous,
      weightKg: weight,
      // Pre-filled so a set can be completed with one tap.
      reps: target.tracking === 'reps' ? (previous?.reps ?? target.repsMax ?? target.repsMin) : null,
      durationSec: target.tracking === 'time' ? (target.durationSec ?? previous?.durationSec ?? 30) : null,
      done: false,
      completedAt: null,
    };
  });
  return {
    key: newId(),
    exerciseId: target.exerciseId,
    tracking: target.tracking,
    loaded: target.loaded,
    repsMin: target.repsMin,
    repsMax: target.repsMax,
    targetDurationSec: target.durationSec,
    restSec: target.restSec,
    skipped: false,
    note: '',
    bests: history.bests,
    sets,
  };
}

export function createWorkout(input: {
  id: string;
  planDayId: string | null;
  dayKey: string | null;
  exercises: Array<{ target: ExerciseTarget; history: ExerciseHistory }>;
  now: number;
  newId: NewId;
}): ActiveWorkout {
  return {
    version: 1,
    id: input.id,
    planDayId: input.planDayId,
    dayKey: input.dayKey,
    startedAt: input.now,
    currentIndex: 0,
    exercises: input.exercises.map((e) => buildExercise(e.target, e.history, input.newId)),
    rest: null,
    prs: [],
  };
}

// ───────────── queries ─────────────

const remaining = (ex: ActiveExercise) => !ex.skipped && ex.sets.some((s) => !s.done);

export function isExerciseComplete(ex: ActiveExercise) {
  return ex.skipped || ex.sets.every((s) => s.done);
}

export function isWorkoutComplete(w: ActiveWorkout) {
  return w.exercises.every(isExerciseComplete);
}

/** "Set 2 of 4" for the current exercise. */
export function currentPosition(w: ActiveWorkout) {
  const exercise = w.exercises[w.currentIndex] ?? null;
  const nextSet = exercise ? exercise.sets.findIndex((s) => !s.done) : -1;
  return {
    exercise,
    exerciseNumber: w.currentIndex + 1,
    exerciseCount: w.exercises.length,
    /** 1-based; equals totalSets + 1 when every set is done. */
    setNumber: exercise ? (nextSet === -1 ? exercise.sets.length + 1 : nextSet + 1) : 0,
    totalSets: exercise?.sets.length ?? 0,
  };
}

export function restRemainingSec(w: ActiveWorkout, now: number): number {
  if (!w.rest) return 0;
  return Math.max(0, Math.ceil((w.rest.endsAt - now) / 1000));
}

// ───────────── helpers ─────────────

function updateExercise(w: ActiveWorkout, key: string, fn: (ex: ActiveExercise) => ActiveExercise): ActiveWorkout {
  return { ...w, exercises: w.exercises.map((ex) => (ex.key === key ? fn(ex) : ex)) };
}

/** First exercise at or after `from` that still has sets to do (wrapping around). */
function nextIncomplete(w: ActiveWorkout, from: number): number {
  const n = w.exercises.length;
  for (let i = 0; i < n; i++) {
    const idx = (from + i) % n;
    if (remaining(w.exercises[idx]!)) return idx;
  }
  return Math.min(from, Math.max(0, n - 1));
}

/** Bests to beat for a set: history plus the other sets done in this workout. */
function bestsExcluding(ex: ActiveExercise, setId: string): Bests {
  return ex.sets.filter((s) => s.done && s.id !== setId).reduce(addToBests, ex.bests);
}

/**
 * Keeps one PR per exercise and type (the best one), so the member is
 * celebrated once per record type per exercise in a workout.
 */
function recordPrs(w: ActiveWorkout, events: PrEvent[]): { prs: PrEvent[]; fresh: PrEvent[] } {
  let prs = w.prs;
  const fresh: PrEvent[] = [];
  for (const e of events) {
    const existing = prs.find((p) => p.exerciseId === e.exerciseId && p.type === e.type);
    if (!existing) {
      fresh.push(e);
      prs = [...prs, e];
    } else if (e.value > existing.value) {
      prs = prs.map((p) => (p === existing ? { ...e, previous: existing.previous } : p));
    }
  }
  return { prs, fresh };
}

function recomputePrs(w: ActiveWorkout, exerciseKey: string): PrEvent[] {
  const ex = w.exercises.find((e) => e.key === exerciseKey);
  if (!ex) return w.prs;
  const others = w.prs.filter((p) => p.exerciseId !== ex.exerciseId);
  let state: PrEvent[] = [];
  let bests = ex.bests;
  for (const s of ex.sets.filter((s) => s.done).sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0))) {
    const events = detectPrs(ex.exerciseId, s.id, s, bests);
    for (const e of events) {
      const i = state.findIndex((p) => p.type === e.type);
      if (i === -1) state = [...state, e];
      else if (e.value > state[i]!.value) state = state.map((p, j) => (j === i ? { ...e, previous: p.previous } : p));
    }
    bests = addToBests(bests, s);
  }
  return [...others, ...state];
}

// ───────────── actions ─────────────

export interface CompleteResult {
  workout: ActiveWorkout;
  /** Records broken by this set for the first time this workout (celebrate these). */
  newPrs: PrEvent[];
}

export function completeSet(w: ActiveWorkout, exerciseKey: string, setId: string, now: number): CompleteResult {
  const ex = w.exercises.find((e) => e.key === exerciseKey);
  const set = ex?.sets.find((s) => s.id === setId);
  if (!ex || !set || set.done) return { workout: w, newPrs: [] };

  const doneSet: ActiveSet = {
    ...set,
    done: true,
    completedAt: now,
    reps: ex.tracking === 'reps' ? (set.reps ?? ex.repsMax ?? ex.repsMin) : set.reps,
  };
  const events = detectPrs(ex.exerciseId, setId, doneSet, bestsExcluding(ex, setId));
  let next = updateExercise(w, exerciseKey, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? doneSet : s)),
  }));
  const { prs, fresh } = recordPrs(next, events);
  next = { ...next, prs };

  const exIndex = next.exercises.findIndex((e) => e.key === exerciseKey);
  const updatedEx = next.exercises[exIndex]!;
  if (!remaining(updatedEx)) next = { ...next, currentIndex: nextIncomplete(next, exIndex + 1) };
  else next = { ...next, currentIndex: exIndex };

  // Rest after every set except the very last one of the workout.
  next = {
    ...next,
    rest: isWorkoutComplete(next) ? null : { endsAt: now + ex.restSec * 1000, durationSec: ex.restSec },
  };
  return { workout: next, newPrs: fresh };
}

export function uncompleteSet(w: ActiveWorkout, exerciseKey: string, setId: string): ActiveWorkout {
  const next = updateExercise(w, exerciseKey, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? { ...s, done: false, completedAt: null } : s)),
  }));
  const index = next.exercises.findIndex((e) => e.key === exerciseKey);
  return { ...next, prs: recomputePrs(next, exerciseKey), currentIndex: index === -1 ? next.currentIndex : index };
}

export function updateSet(
  w: ActiveWorkout,
  exerciseKey: string,
  setId: string,
  patch: Partial<Pick<ActiveSet, 'weightKg' | 'reps' | 'durationSec'>>,
): ActiveWorkout {
  const next = updateExercise(w, exerciseKey, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
  }));
  const set = next.exercises.find((e) => e.key === exerciseKey)?.sets.find((s) => s.id === setId);
  return set?.done ? { ...next, prs: recomputePrs(next, exerciseKey) } : next;
}

export function addSet(w: ActiveWorkout, exerciseKey: string, newId: NewId): ActiveWorkout {
  return updateExercise(w, exerciseKey, (e) => {
    const last = e.sets[e.sets.length - 1];
    const set: ActiveSet = {
      id: newId(),
      targetWeightKg: last?.targetWeightKg ?? null,
      previous: null,
      weightKg: last?.weightKg ?? null,
      reps: last?.reps ?? e.repsMax,
      durationSec: last?.durationSec ?? e.targetDurationSec,
      done: false,
      completedAt: null,
    };
    return { ...e, skipped: false, sets: [...e.sets, set] };
  });
}

export function removeSet(w: ActiveWorkout, exerciseKey: string, setId: string): ActiveWorkout {
  const next = updateExercise(w, exerciseKey, (e) =>
    e.sets.length <= 1 ? e : { ...e, sets: e.sets.filter((s) => s.id !== setId) },
  );
  return { ...next, prs: recomputePrs(next, exerciseKey) };
}

export function addExercise(
  w: ActiveWorkout,
  target: ExerciseTarget,
  history: ExerciseHistory,
  newId: NewId,
): ActiveWorkout {
  const exercises = [...w.exercises, buildExercise(target, history, newId)];
  const next = { ...w, exercises };
  // Jump to it if everything else is already done.
  return isWorkoutComplete({ ...w }) ? { ...next, currentIndex: exercises.length - 1 } : next;
}

export function skipExercise(w: ActiveWorkout, exerciseKey: string): ActiveWorkout {
  const next = updateExercise(w, exerciseKey, (e) => ({ ...e, skipped: true }));
  const index = next.exercises.findIndex((e) => e.key === exerciseKey);
  const current = index === next.currentIndex ? nextIncomplete(next, index + 1) : next.currentIndex;
  return { ...next, currentIndex: current };
}

export function unskipExercise(w: ActiveWorkout, exerciseKey: string): ActiveWorkout {
  const next = updateExercise(w, exerciseKey, (e) => ({ ...e, skipped: false }));
  return { ...next, currentIndex: next.exercises.findIndex((e) => e.key === exerciseKey) };
}

/**
 * Swaps an exercise for another (e.g. the machine is taken). Completed sets
 * stay with the original exercise, so only allowed before any set is done.
 */
export function replaceExercise(
  w: ActiveWorkout,
  exerciseKey: string,
  target: ExerciseTarget,
  history: ExerciseHistory,
  newId: NewId,
): ActiveWorkout {
  const old = w.exercises.find((e) => e.key === exerciseKey);
  if (!old || old.sets.some((s) => s.done)) return w;
  const replacement = buildExercise({ ...target, sets: old.sets.length, restSec: old.restSec }, history, newId);
  return updateExercise(w, exerciseKey, () => ({ ...replacement, key: old.key, note: old.note }));
}

export function setNote(w: ActiveWorkout, exerciseKey: string, note: string): ActiveWorkout {
  return updateExercise(w, exerciseKey, (e) => ({ ...e, note }));
}

export function goToExercise(w: ActiveWorkout, index: number): ActiveWorkout {
  if (index < 0 || index >= w.exercises.length) return w;
  return { ...w, currentIndex: index };
}

export function adjustRest(w: ActiveWorkout, deltaSec: number, now: number): ActiveWorkout {
  if (!w.rest) return w;
  const endsAt = w.rest.endsAt + deltaSec * 1000;
  return endsAt <= now ? { ...w, rest: null } : { ...w, rest: { endsAt, durationSec: w.rest.durationSec + deltaSec } };
}

export function skipRest(w: ActiveWorkout): ActiveWorkout {
  return { ...w, rest: null };
}

// ───────────── finishing ─────────────

export interface WorkoutSummary {
  durationSec: number;
  volumeKg: number;
  setsDone: number;
  exercisesDone: number;
  prs: PrEvent[];
}

export function summarize(w: ActiveWorkout, now: number): WorkoutSummary {
  const doneSets = w.exercises.flatMap((e) => e.sets.filter((s) => s.done));
  return {
    durationSec: Math.max(0, Math.round((now - w.startedAt) / 1000)),
    volumeKg: volumeKg(doneSets),
    setsDone: doneSets.length,
    exercisesDone: w.exercises.filter((e) => e.sets.some((s) => s.done)).length,
    prs: w.prs,
  };
}

/** The finished workout in the shape the API stores (completed sets only). */
export function toSyncSession(w: ActiveWorkout, endedAt: number): SyncSession {
  const notes = Object.fromEntries(
    w.exercises.filter((e) => e.note.trim()).map((e) => [e.exerciseId, e.note.trim()]),
  );
  return {
    id: w.id,
    planDayId: w.planDayId,
    dayKey: w.dayKey,
    startedAt: new Date(w.startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    notes: null,
    exerciseNotes: notes,
    clientUpdatedAt: new Date(endedAt).toISOString(),
    deleted: false,
    sets: w.exercises.flatMap((e) =>
      e.sets
        .filter((s) => s.done)
        .map((s, i) => ({
          id: s.id,
          exerciseId: e.exerciseId,
          setIndex: i,
          reps: s.reps,
          weightKg: s.weightKg,
          durationSec: s.durationSec,
          isWarmup: false,
          completedAt: new Date(s.completedAt!).toISOString(),
        })),
    ),
  };
}

/** Bests from a list of past sets (used when building history). */
export { computeBests };
