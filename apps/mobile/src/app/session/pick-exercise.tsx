import { getVariations } from '@gymapp/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { AppText } from '../../components/AppText';
import { ExerciseList, ExerciseRow } from '../../features/exercises/ExerciseList';
import { useActiveWorkout } from '../../features/workout/ActiveWorkoutProvider';
import { colors, space } from '../../theme';

/** Pick an exercise to add to, or swap into, the active workout. */
export default function PickExerciseScreen() {
  const { t } = useTranslation();
  const { mode, key } = useLocalSearchParams<{ mode: 'add' | 'replace'; key?: string }>();
  const w = useActiveWorkout();
  const replacing = mode === 'replace' ? w.workout?.exercises.find((e) => e.key === key) : undefined;
  const inWorkout = w.workout?.exercises.map((e) => e.exerciseId) ?? [];
  const variations = replacing ? getVariations(replacing.exerciseId).filter((v) => !inWorkout.includes(v.id)) : [];

  async function select(exerciseId: string) {
    if (replacing) await w.replaceExercise(replacing.key, exerciseId);
    else await w.addExercise(exerciseId);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: replacing ? t('workout.replace') : t('workout.pickTitle') }} />
      <ExerciseList
        exclude={inWorkout}
        onSelect={(e) => void select(e.id)}
        header={
          variations.length > 0 ? (
            <View style={{ gap: space.sm }}>
              <AppText variant="heading">{t('workout.pickVariations')}</AppText>
              {variations.map((v) => (
                <ExerciseRow key={v.id} exercise={v} onPress={() => void select(v.id)} />
              ))}
              <AppText variant="heading" style={{ marginTop: space.md }}>{t('workout.pickAll')}</AppText>
            </View>
          ) : null
        }
      />
    </View>
  );
}
