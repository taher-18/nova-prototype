import {
  addDays,
  buildSchedule,
  toDateKey,
  toSchedule,
  type ActivePlan,
  type OverrideKind,
  type ScheduleResponse,
  type ScheduledDay,
} from '@gymapp/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthProvider';
import { kvGet, kvSet } from '../../db/database';
import { lastPlannedSession, sessionsBetween, type SessionSummaryRow } from '../../db/history';
import { useData } from '../../sync/DataProvider';
import { useActivePlan } from '../plan/usePlan';

const CACHE_KEY = 'schedule.cached';

/** Training weekdays and day changes. Falls back to the last copy when offline. */
export function useSchedule() {
  const { api } = useAuth();
  const { db } = useData();
  return useQuery({
    queryKey: ['schedule'],
    queryFn: async () => {
      try {
        const res = await api.get<ScheduleResponse>('/v1/schedule');
        await kvSet(db, CACHE_KEY, res);
        return res;
      } catch (err) {
        const cached = await kvGet<ScheduleResponse>(db, CACHE_KEY);
        if (cached) return cached;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/** Changes to the schedule (need a connection). */
export function useScheduleActions() {
  const { api } = useAuth();
  const { db } = useData();
  const queryClient = useQueryClient();
  const apply = async (res: ScheduleResponse) => {
    queryClient.setQueryData(['schedule'], res);
    await kvSet(db, CACHE_KEY, res);
    void queryClient.invalidateQueries({ queryKey: ['profile'] });
  };
  return {
    setTrainingDays: useMutation({
      mutationFn: (trainingDays: number[]) => api.put<ScheduleResponse>('/v1/schedule/training-days', { trainingDays }),
      onSuccess: apply,
    }),
    setDay: useMutation({
      mutationFn: ({ date, kind }: { date: string; kind: OverrideKind }) =>
        api.put<ScheduleResponse>(`/v1/schedule/days/${date}`, { kind }),
      onSuccess: apply,
    }),
    resetDay: useMutation({
      mutationFn: (date: string) => api.delete<ScheduleResponse>(`/v1/schedule/days/${date}`),
      onSuccess: apply,
    }),
    move: useMutation({
      mutationFn: ({ from, to }: { from: string; to: string }) => api.post<ScheduleResponse>('/v1/schedule/move', { from, to }),
      onSuccess: apply,
    }),
  };
}

export interface CalendarDay extends ScheduledDay {
  sessions: SessionSummaryRow[];
}

function lastPlanDayIndex(plan: ActivePlan | undefined, last: { planDayId: string | null; dayKey: string | null } | null) {
  if (!plan || !last) return null;
  const byId = plan.days.findIndex((d) => d.id === last.planDayId);
  if (byId !== -1) return byId;
  const byKey = plan.days.findIndex((d) => d.key === last.dayKey);
  return byKey === -1 ? null : byKey;
}

/**
 * Every date in [fromKey, toKey] with its status (done, missed, today,
 * upcoming, rest), the planned plan day, and the workouts done that day.
 */
export function useCalendar(fromKey: string, toKey: string) {
  const { db } = useData();
  const schedule = useSchedule();
  const plan = useActivePlan();
  const local = useQuery({
    queryKey: ['local', 'calendar', fromKey, toKey],
    queryFn: async () => {
      const from = new Date(`${fromKey}T00:00:00`).getTime();
      const to = new Date(`${addDays(toKey, 1)}T00:00:00`).getTime();
      const [sessions, last] = await Promise.all([sessionsBetween(db, from, to), lastPlannedSession(db)]);
      return { sessions, last };
    },
  });

  const todayKey = toDateKey(new Date());
  let days: CalendarDay[] | undefined;
  if (schedule.data && local.data) {
    const byDate = new Map<string, SessionSummaryRow[]>();
    for (const s of local.data.sessions) {
      const key = toDateKey(new Date(s.startedAt));
      byDate.set(key, [...(byDate.get(key) ?? []), s]);
    }
    days = buildSchedule({
      fromKey,
      toKey,
      todayKey,
      schedule: toSchedule(schedule.data),
      doneDates: new Set(byDate.keys()),
      planDayCount: plan.data?.days.length ?? 0,
      lastPlanDayIndex: lastPlanDayIndex(plan.data, local.data.last),
    }).map((d) => ({ ...d, sessions: byDate.get(d.date) ?? [] }));
  }
  return {
    days,
    plan: plan.data,
    schedule: schedule.data,
    todayKey,
    isPending: schedule.isPending || local.isPending || plan.isPending,
    error: schedule.error ?? plan.error,
    refetch: () => {
      void schedule.refetch();
      void plan.refetch();
      void local.refetch();
    },
  };
}
