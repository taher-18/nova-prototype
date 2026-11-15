/**
 * Weekly streak: a week counts when the member trains at least `weeklyGoal`
 * times in it. Weeks start on Saturday by default (the Egyptian work week).
 */
export const SATURDAY = 6;

/** Local-midnight start of the week containing `date`. */
export function weekStart(date: Date, weekStartsOn = SATURDAY): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

const weekKey = (date: Date, weekStartsOn: number) => weekStart(date, weekStartsOn).getTime();

function previousWeek(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() - 7);
  return d;
}

export interface StreakInfo {
  thisWeekCount: number;
  weeklyGoal: number;
  /** This week's goal is already met. */
  weekComplete: boolean;
  /** Consecutive weeks meeting the goal, counting this week once it is met. */
  currentWeeks: number;
  longestWeeks: number;
}

export function computeStreak(
  workoutDates: Date[],
  weeklyGoal: number,
  now: Date,
  weekStartsOn = SATURDAY,
): StreakInfo {
  const goal = Math.max(1, weeklyGoal);
  const counts = new Map<number, number>();
  for (const d of workoutDates) {
    const k = weekKey(d, weekStartsOn);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const met = (start: Date) => (counts.get(start.getTime()) ?? 0) >= goal;

  const thisWeek = weekStart(now, weekStartsOn);
  const thisWeekCount = counts.get(thisWeek.getTime()) ?? 0;

  // Current streak: count back from last week (this week is still open).
  let current = 0;
  for (let w = previousWeek(thisWeek); met(w); w = previousWeek(w)) current++;
  if (met(thisWeek)) current++;

  // Longest streak over all weeks with workouts.
  let longest = 0;
  const weeks = [...counts.keys()].sort((a, b) => a - b);
  let run = 0;
  let prev: number | null = null;
  for (const k of weeks) {
    if (!met(new Date(k))) {
      run = 0;
      prev = k;
      continue;
    }
    const consecutive = prev !== null && previousWeek(new Date(k)).getTime() === prev;
    run = consecutive && run > 0 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = k;
  }

  return {
    thisWeekCount,
    weeklyGoal: goal,
    weekComplete: thisWeekCount >= goal,
    currentWeeks: current,
    longestWeeks: Math.max(longest, current),
  };
}
