import { useQuery } from '@tanstack/react-query';
import { getExerciseProgress } from '../../db/history';
import { useData } from '../../sync/DataProvider';

export function useExerciseProgress(exerciseId: string) {
  const { db } = useData();
  return useQuery({
    queryKey: ['local', 'progress', exerciseId],
    queryFn: () => getExerciseProgress(db, exerciseId),
  });
}
