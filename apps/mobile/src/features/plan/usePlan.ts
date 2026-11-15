import type { ActivePlan } from '@gymapp/shared';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthProvider';

export function useActivePlan() {
  const { api } = useAuth();
  return useQuery({
    queryKey: ['plan', 'active'],
    queryFn: () => api.get<ActivePlan>('/v1/plans/active'),
    staleTime: 5 * 60_000,
  });
}

