/**
 * Picks the motivation line shown on Home and after a workout. It reacts to
 * the member's week (done, missed, close to the goal) and rotates daily so
 * it doesn't repeat every time the app opens.
 */

export const MOTIVATION_POOLS = {
  trainDay: 5,
  restDay: 4,
  doneToday: 4,
  goalReached: 3,
  almostThere: 3,
  comeback: 4,
  finish: 5,
} as const;

export type MotivationPool = keyof typeof MOTIVATION_POOLS;

export interface MotivationInput {
  todayStatus: 'done' | 'today' | 'rest' | 'missed' | 'upcoming';
  doneThisWeek: number;
  weeklyGoal: number;
  missedThisWeek: number;
  /** Changes once a day (e.g. days since 1970), so the line rotates daily. */
  seed: number;
}

export interface Motivation {
  pool: MotivationPool;
  index: number;
  /** Values for the message text, e.g. workouts left this week. */
  params: Record<string, number>;
}

export function pickMotivation(input: MotivationInput): Motivation {
  const left = Math.max(0, input.weeklyGoal - input.doneThisWeek);
  const pool: MotivationPool =
    input.todayStatus === 'done'
      ? left === 0
        ? 'goalReached'
        : 'doneToday'
      : left === 0 && input.doneThisWeek > 0
        ? 'goalReached'
        : input.missedThisWeek > 0 && input.todayStatus !== 'rest'
          ? 'comeback'
          : left === 1 && input.todayStatus === 'today'
            ? 'almostThere'
            : input.todayStatus === 'today'
              ? 'trainDay'
              : 'restDay';
  return { pool, index: rotate(input.seed, MOTIVATION_POOLS[pool]), params: { left, done: input.doneThisWeek } };
}

/** For the finish screen: a different line each workout. */
export function finishMotivation(seed: number): Motivation {
  return { pool: 'finish', index: rotate(seed, MOTIVATION_POOLS.finish), params: {} };
}

export const daySeed = (date = new Date()) =>
  Math.floor((date.getTime() - date.getTimezoneOffset() * 60_000) / 86_400_000);

const rotate = (seed: number, size: number) => ((Math.floor(seed) % size) + size) % size;
