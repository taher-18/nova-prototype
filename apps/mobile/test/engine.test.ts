import { describe, expect, it } from 'vitest';
import {
  addExercise,
  addSet,
  adjustRest,
  completeSet,
  createWorkout,
  currentPosition,
  NO_HISTORY,
  removeSet,
  replaceExercise,
  restRemainingSec,
  setNote,
  skipExercise,
  skipRest,
  suggestWeight,
  summarize,
  toSyncSession,
  uncompleteSet,
  updateSet,
  type ActiveWorkout,
  type ExerciseHistory,
  type ExerciseTarget,
} from '../src/features/workout/engine';
import { computeBests } from '../src/features/workout/records';

let n = 0;
const newId = () => `id-${++n}`;
const T0 = Date.UTC(2026, 9, 13, 18, 0, 0);

const squat: ExerciseTarget = {
  exerciseId: 'Barbell_Squat',
  tracking: 'reps',
  loaded: true,
  sets: 3,
  repsMin: 8,
  repsMax: 10,
  durationSec: null,
  restSec: 90,
};
const plank: ExerciseTarget = {
  exerciseId: 'Plank',
  tracking: 'time',
  loaded: false,
  sets: 2,
  repsMin: null,
  repsMax: null,
  durationSec: 45,
  restSec: 45,
};

const squatHistory: ExerciseHistory = {
  lastSets: [
    { reps: 10, weightKg: 60, durationSec: null },
    { reps: 9, weightKg: 60, durationSec: null },
    { reps: 8, weightKg: 60, durationSec: null },
  ],
  bests: computeBests([{ reps: 10, weightKg: 60, durationSec: null }]),
};

function start(history: ExerciseHistory = squatHistory): ActiveWorkout {
  return createWorkout({
    id: 'w1',
    planDayId: 'day-1',
    dayKey: 'full_body_a',
    exercises: [
      { target: squat, history },
      { target: plank, history: NO_HISTORY },
    ],
    now: T0,
    newId,
  });
}

const complete = (w: ActiveWorkout, exIndex: number, setIndex: number, at = T0) =>
  completeSet(w, w.exercises[exIndex]!.key, w.exercises[exIndex]!.sets[setIndex]!.id, at);

describe('starting a workout', () => {
  it('pre-fills sets from last time so each can be done with one tap', () => {
    const w = start();
    const [s1, s2] = w.exercises[0]!.sets;
    expect(s1).toMatchObject({ weightKg: 60, reps: 10, previous: { reps: 10, weightKg: 60 } });
    expect(s2).toMatchObject({ weightKg: 60, reps: 9 });
    expect(w.exercises[1]!.sets[0]).toMatchObject({ durationSec: 45, reps: null });
  });

  it('starts empty-handed for new exercises', () => {
    const w = start(NO_HISTORY);
    expect(w.exercises[0]!.sets[0]).toMatchObject({ weightKg: null, reps: 10, previous: null });
  });

  it('suggests +2.5 kg after hitting every rep target', () => {
    const allTen: ExerciseHistory = {
      ...squatHistory,
      lastSets: squatHistory.lastSets.map((s) => ({ ...s, reps: 10 })),
    };
    expect(suggestWeight(squat, allTen, 0)).toBe(62.5);
    expect(suggestWeight(squat, squatHistory, 0)).toBe(60);
    expect(suggestWeight(plank, NO_HISTORY, 0)).toBeNull();
  });
});

describe('set tracking', () => {
  it('shows which set is next', () => {
    let w = start();
    expect(currentPosition(w)).toMatchObject({ exerciseNumber: 1, exerciseCount: 2, setNumber: 1, totalSets: 3 });
    w = complete(w, 0, 0).workout;
    expect(currentPosition(w)).toMatchObject({ setNumber: 2, totalSets: 3 });
  });

  it('starts the rest timer after each set', () => {
    const w = complete(start(), 0, 0, T0).workout;
    expect(w.rest).toEqual({ endsAt: T0 + 90_000, durationSec: 90 });
    expect(restRemainingSec(w, T0 + 30_000)).toBe(60);
    expect(restRemainingSec(adjustRest(w, 15, T0), T0)).toBe(105);
    expect(restRemainingSec(adjustRest(w, -15, T0), T0)).toBe(75);
    expect(skipRest(w).rest).toBeNull();
    expect(adjustRest(w, -200, T0).rest).toBeNull();
  });

  it('moves to the next exercise when all sets are done', () => {
    let w = start();
    for (let i = 0; i < 3; i++) w = complete(w, 0, i).workout;
    expect(currentPosition(w)).toMatchObject({ exerciseNumber: 2, setNumber: 1 });
  });

  it('has no rest after the very last set', () => {
    let w = start();
    for (let i = 0; i < 3; i++) w = complete(w, 0, i).workout;
    w = complete(w, 1, 0).workout;
    expect(w.rest).not.toBeNull();
    w = complete(w, 1, 1).workout;
    expect(w.rest).toBeNull();
  });

  it('ignores completing a set twice', () => {
    const once = complete(start(), 0, 0, T0).workout;
    const twice = complete(once, 0, 0, T0 + 5000);
    expect(twice.workout).toBe(once);
  });

  it('edits weight and reps inline, and can undo a set', () => {
    let w = start();
    const key = w.exercises[0]!.key;
    const setId = w.exercises[0]!.sets[0]!.id;
    w = updateSet(w, key, setId, { weightKg: 65, reps: 6 });
    w = completeSet(w, key, setId, T0).workout;
    expect(w.exercises[0]!.sets[0]).toMatchObject({ weightKg: 65, reps: 6, done: true, completedAt: T0 });
    w = uncompleteSet(w, key, setId);
    expect(w.exercises[0]!.sets[0]).toMatchObject({ done: false, completedAt: null });
  });

  it('adds and removes sets, keeping at least one', () => {
    let w = start();
    const key = w.exercises[1]!.key;
    w = addSet(w, key, newId);
    expect(w.exercises[1]!.sets).toHaveLength(3);
    expect(w.exercises[1]!.sets[2]).toMatchObject({ durationSec: 45, done: false });
    for (const s of [...w.exercises[1]!.sets]) w = removeSet(w, key, s.id);
    expect(w.exercises[1]!.sets).toHaveLength(1);
  });
});

describe('changing exercises mid-workout', () => {
  it('skips an exercise and moves on', () => {
    let w = start();
    w = skipExercise(w, w.exercises[0]!.key);
    expect(w.exercises[0]!.skipped).toBe(true);
    expect(currentPosition(w).exerciseNumber).toBe(2);
  });

  it('replaces an exercise that has not started', () => {
    let w = start();
    const key = w.exercises[0]!.key;
    w = setNote(w, key, 'rack busy');
    w = replaceExercise(w, key, { ...squat, exerciseId: 'Leg_Press', sets: 5, restSec: 30 }, NO_HISTORY, newId);
    expect(w.exercises[0]).toMatchObject({ key, exerciseId: 'Leg_Press', note: 'rack busy', restSec: 90 });
    expect(w.exercises[0]!.sets).toHaveLength(3); // keeps the planned number of sets
  });

  it('refuses to replace an exercise that already has sets done', () => {
    const w = complete(start(), 0, 0).workout;
    expect(replaceExercise(w, w.exercises[0]!.key, { ...squat, exerciseId: 'Leg_Press' }, NO_HISTORY, newId)).toBe(w);
  });

  it('adds an exercise at the end', () => {
    const w = addExercise(start(), { ...squat, exerciseId: 'Barbell_Curl' }, NO_HISTORY, newId);
    expect(w.exercises.map((e) => e.exerciseId)).toEqual(['Barbell_Squat', 'Plank', 'Barbell_Curl']);
  });
});

describe('personal records during a workout', () => {
  it('celebrates a new record once per type and keeps the best value', () => {
    let w = start();
    const key = w.exercises[0]!.key;
    const [s1, s2] = w.exercises[0]!.sets;
    w = updateSet(w, key, s1!.id, { weightKg: 65, reps: 8 });
    const first = completeSet(w, key, s1!.id, T0);
    expect(first.newPrs.map((p) => [p.type, p.value, p.previous])).toEqual([['weight', 65, 60]]);

    w = updateSet(first.workout, key, s2!.id, { weightKg: 67.5, reps: 6 });
    const second = completeSet(w, key, s2!.id, T0 + 1);
    expect(second.newPrs).toEqual([]); // already celebrated a weight PR this workout
    expect(second.workout.prs).toEqual([
      expect.objectContaining({ type: 'weight', value: 67.5, previous: 60 }),
    ]);
  });

  it('removes the record when the set is undone', () => {
    let w = start();
    const key = w.exercises[0]!.key;
    const s1 = w.exercises[0]!.sets[0]!;
    w = updateSet(w, key, s1.id, { weightKg: 70 });
    w = completeSet(w, key, s1.id, T0).workout;
    expect(w.prs).toHaveLength(1);
    expect(uncompleteSet(w, key, s1.id).prs).toEqual([]);
  });
});

describe('finishing', () => {
  it('summarises duration, volume, sets and records', () => {
    let w = start();
    for (let i = 0; i < 3; i++) w = complete(w, 0, i).workout;
    w = complete(w, 1, 0).workout;
    const s = summarize(w, T0 + 50 * 60_000);
    expect(s).toMatchObject({ durationSec: 3000, setsDone: 4, exercisesDone: 2 });
    expect(s.volumeKg).toBe(60 * 10 + 60 * 9 + 60 * 8);
  });

  it('exports only completed sets for syncing', () => {
    let w = start();
    w = complete(w, 0, 0, T0).workout;
    w = complete(w, 0, 2, T0 + 1000).workout;
    w = setNote(w, w.exercises[0]!.key, '  knees ok ');
    const session = toSyncSession(w, T0 + 60_000);
    expect(session).toMatchObject({
      id: 'w1',
      planDayId: 'day-1',
      dayKey: 'full_body_a',
      exerciseNotes: { Barbell_Squat: 'knees ok' },
    });
    expect(session.sets.map((s) => [s.exerciseId, s.setIndex, s.weightKg])).toEqual([
      ['Barbell_Squat', 0, 60],
      ['Barbell_Squat', 1, 60],
    ]);
  });

  it('survives a save/restore round trip', () => {
    const w = complete(start(), 0, 0).workout;
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
  });
});
