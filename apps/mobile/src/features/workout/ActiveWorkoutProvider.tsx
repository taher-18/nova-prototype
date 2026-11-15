import { getExercise, type ActivePlanDay } from '@gymapp/shared';
import { randomUUID } from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { kvDelete, kvGet, kvSet } from '../../db/database';
import { getExerciseHistory, saveSession, workoutDates } from '../../db/history';
import { useData } from '../../sync/DataProvider';
import { SESSION_KIND } from '../../sync/sessionSync';
import * as E from './engine';
import {
  cancelRestNotification,
  ensureNotificationPermission,
  haptic,
  scheduleRestNotification,
} from './feedback';
import type { PrEvent } from './records';
import { computeStreak, type StreakInfo } from './streak';
import { track } from '../../prototype/tracking';

const ACTIVE_KEY = 'workout.active';
const LAST_FINISHED_KEY = 'workout.lastFinished';
const WEEKLY_GOAL_KEY = 'profile.weeklyGoal';

export interface FinishedWorkout {
  sessionId: string;
  dayKey: string | null;
  summary: E.WorkoutSummary;
  streakBefore: StreakInfo;
  streakAfter: StreakInfo;
}

/** Default targets when an exercise is added by hand (not from the plan). */
export function defaultTarget(exerciseId: string): E.ExerciseTarget {
  const ex = getExercise(exerciseId);
  const time = ex?.tracking === 'time';
  const loaded = !!ex && ex.equipment !== 'bodyweight' && ex.equipment !== 'pullup_bar';
  return {
    exerciseId,
    tracking: time ? 'time' : 'reps',
    loaded,
    sets: 3,
    repsMin: time ? null : 8,
    repsMax: time ? null : 12,
    durationSec: time ? 30 : null,
    restSec: time ? 45 : 90,
  };
}

function targetFromPlan(ex: ActivePlanDay['exercises'][number]): E.ExerciseTarget {
  return {
    exerciseId: ex.exerciseId,
    tracking: ex.exercise.tracking,
    loaded: ex.exercise.equipment !== 'bodyweight' && ex.exercise.equipment !== 'pullup_bar',
    sets: ex.sets,
    repsMin: ex.repsMin,
    repsMax: ex.repsMax,
    durationSec: ex.durationSec,
    restSec: ex.restSec,
  };
}

interface ActiveWorkoutContextValue {
  workout: E.ActiveWorkout | null;
  /** Records to celebrate right now (cleared by dismissCelebration). */
  celebration: PrEvent[];
  dismissCelebration(): void;
  startFromPlanDay(day: ActivePlanDay): Promise<void>;
  startEmpty(): Promise<void>;
  completeSet(exerciseKey: string, setId: string): void;
  uncompleteSet(exerciseKey: string, setId: string): void;
  updateSet(exerciseKey: string, setId: string, patch: Partial<Pick<E.ActiveSet, 'weightKg' | 'reps' | 'durationSec'>>): void;
  addSet(exerciseKey: string): void;
  removeSet(exerciseKey: string, setId: string): void;
  addExercise(exerciseId: string): Promise<void>;
  replaceExercise(exerciseKey: string, exerciseId: string): Promise<void>;
  skipExercise(exerciseKey: string): void;
  unskipExercise(exerciseKey: string): void;
  setNote(exerciseKey: string, note: string): void;
  goTo(index: number): void;
  adjustRest(deltaSec: number): void;
  skipRest(): void;
  finish(): Promise<FinishedWorkout | null>;
  discard(): Promise<void>;
  /** Saves the weekly goal (from the profile) for streaks offline. */
  setWeeklyGoal(goal: number): void;
  getLastFinished(): Promise<FinishedWorkout | null>;
}

const Ctx = createContext<ActiveWorkoutContextValue | null>(null);

/**
 * Holds the in-progress workout and saves it after every change, so closing
 * the app (or the phone dying) never loses a workout.
 */
export function ActiveWorkoutProvider({ children }: { children: ReactNode }) {
  const { db, queue, syncNow, refreshLocal } = useData();
  const [workout, setWorkout] = useState<E.ActiveWorkout | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [celebration, setCelebration] = useState<PrEvent[]>([]);
  const ref = useRef<E.ActiveWorkout | null>(null);

  useEffect(() => {
    kvGet<E.ActiveWorkout>(db, ACTIVE_KEY).then((saved) => {
      ref.current = saved;
      setWorkout(saved);
      setLoaded(true);
    });
  }, [db]);

  /** Applies a change, then saves it. Uses a ref so rapid taps don't lose updates. */
  const apply = useCallback(
    (fn: (w: E.ActiveWorkout) => E.ActiveWorkout) => {
      const current = ref.current;
      if (!current) return;
      const next = fn(current);
      if (next === current) return;
      ref.current = next;
      setWorkout(next);
      void kvSet(db, ACTIVE_KEY, next);
      // Keep the lock-screen notification in step with the rest timer.
      if (next.rest?.endsAt !== current.rest?.endsAt) {
        if (next.rest) void scheduleRestNotification((next.rest.endsAt - Date.now()) / 1000);
        else void cancelRestNotification();
      }
    },
    [db],
  );

  const begin = useCallback(
    async (planDayId: string | null, dayKey: string | null, targets: E.ExerciseTarget[]) => {
      const exercises = await Promise.all(
        targets.map(async (target) => ({ target, history: await getExerciseHistory(db, target.exerciseId) })),
      );
      const w = E.createWorkout({ id: randomUUID(), planDayId, dayKey, exercises, now: Date.now(), newId: randomUUID });
      ref.current = w;
      setWorkout(w);
      await kvSet(db, ACTIVE_KEY, w);
      void ensureNotificationPermission();
    },
    [db],
  );

  const setWeeklyGoal = useCallback((goal: number) => void kvSet(db, WEEKLY_GOAL_KEY, goal), [db]);
  const getLastFinished = useCallback(() => kvGet<FinishedWorkout>(db, LAST_FINISHED_KEY), [db]);

  const value = useMemo<ActiveWorkoutContextValue>(
    () => ({
      workout,
      celebration,
      dismissCelebration: () => setCelebration([]),
      startFromPlanDay: (day) => begin(day.id, day.key, day.exercises.map(targetFromPlan)),
      startEmpty: () => begin(null, null, []),
      completeSet(exerciseKey, setId) {
        const current = ref.current;
        if (!current) return;
        const result = E.completeSet(current, exerciseKey, setId, Date.now());
        apply(() => result.workout);
        void haptic.tap();
        if (result.newPrs.length > 0) {
          void haptic.record();
          setCelebration(result.newPrs);
        }
      },
      uncompleteSet: (k, s) => apply((w) => E.uncompleteSet(w, k, s)),
      updateSet: (k, s, patch) => apply((w) => E.updateSet(w, k, s, patch)),
      addSet: (k) => apply((w) => E.addSet(w, k, randomUUID)),
      removeSet: (k, s) => apply((w) => E.removeSet(w, k, s)),
      async addExercise(exerciseId) {
        const history = await getExerciseHistory(db, exerciseId);
        apply((w) => E.addExercise(w, defaultTarget(exerciseId), history, randomUUID));
      },
      async replaceExercise(exerciseKey, exerciseId) {
        const history = await getExerciseHistory(db, exerciseId);
        apply((w) => E.replaceExercise(w, exerciseKey, defaultTarget(exerciseId), history, randomUUID));
      },
      skipExercise: (k) => apply((w) => E.skipExercise(w, k)),
      unskipExercise: (k) => apply((w) => E.unskipExercise(w, k)),
      setNote: (k, note) => apply((w) => E.setNote(w, k, note)),
      goTo: (i) => apply((w) => E.goToExercise(w, i)),
      adjustRest: (delta) => apply((w) => E.adjustRest(w, delta, Date.now())),
      skipRest: () => apply((w) => E.skipRest(w)),
      async finish() {
        const w = ref.current;
        if (!w) return null;
        const now = Date.now();
        const goal = (await kvGet<number>(db, WEEKLY_GOAL_KEY)) ?? 3;
        const before = computeStreak(await workoutDates(db), goal, new Date(now));
        const summary = E.summarize(w, now);
        const hasSets = summary.setsDone > 0;
        if (hasSets) {
          const session = E.toSyncSession(w, now);
          await saveSession(db, session);
          await queue.enqueue(SESSION_KIND, session.id, session);
        }
        const after = computeStreak(await workoutDates(db), goal, new Date(now));
        const finished: FinishedWorkout = {
          sessionId: w.id,
          dayKey: w.dayKey,
          summary,
          streakBefore: before,
          streakAfter: after,
        };
        await kvSet(db, LAST_FINISHED_KEY, finished);
        await kvDelete(db, ACTIVE_KEY);
        await cancelRestNotification();
        ref.current = null;
        setWorkout(null);
        refreshLocal();
        if (hasSets) {
          void syncNow();
          track('workout_logged');
        }
        return finished;
      },
      async discard() {
        await kvDelete(db, ACTIVE_KEY);
        await cancelRestNotification();
        ref.current = null;
        setWorkout(null);
      },
      setWeeklyGoal,
      getLastFinished,
    }),
    [workout, celebration, apply, begin, db, queue, refreshLocal, syncNow, setWeeklyGoal, getLastFinished],
  );

  if (!loaded) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useActiveWorkout() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useActiveWorkout must be used inside ActiveWorkoutProvider');
  return ctx;
}

export const useOptionalActiveWorkout = () => useContext(Ctx);
