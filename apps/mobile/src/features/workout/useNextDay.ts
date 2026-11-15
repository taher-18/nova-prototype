import type { ActivePlan } from '@gymapp/shared';
import { useQuery } from '@tanstack/react-query';
import { lastPlanDayId, listRecentSessions } from '../../db/history';
import { useData } from '../../sync/DataProvider';

/** The plan day after the one trained most recently (day 1 for a new plan). */
export function useNextPlanDay(plan: ActivePlan | undefined) {
  const { db } = useData();
  const last = useQuery({ queryKey: ['local', 'lastPlanDay'], queryFn: () => lastPlanDayId(db) });
  if (!plan || plan.days.length === 0) return undefined;
  const index = plan.days.findIndex((d) => d.id === last.data);
  return plan.days[(index + 1) % plan.days.length];
}

export function useRecentSessions(limit = 5) {
  const { db } = useData();
  return useQuery({ queryKey: ['local', 'recent', limit], queryFn: () => listRecentSessions(db, limit) });
}
