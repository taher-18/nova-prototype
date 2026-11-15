import type { ActivePlanExercise } from '@gymapp/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { ExerciseImage } from '../../components/ExerciseImage';
import { useActiveWorkout } from '../../features/workout/ActiveWorkoutProvider';
import { QueryState } from '../../components/QueryState';
import { Screen } from '../../components/Screen';
import { useActivePlan } from '../../features/plan/usePlan';
import { exerciseDisplayName, formatPrescription, formatRest } from '../../lib/format';
import { colors, radius, space } from '../../theme';

export default function PlanDayScreen() {
  const { t } = useTranslation();
  const { dayIndex } = useLocalSearchParams<{ dayIndex: string }>();
  const plan = useActivePlan();
  const day = plan.data?.days.find((d) => d.dayIndex === Number(dayIndex));
  const w = useActiveWorkout();
  const [starting, setStarting] = useState(false);

  async function start() {
    if (!day) return;
    setStarting(true);
    try {
      await w.startFromPlanDay(day);
      router.push('/session/active');
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen
      edges={['bottom']}
      footer={
        day && !w.workout ? <Button title={t('workout.start')} loading={starting} onPress={() => void start()} /> : null
      }
    >
      <Stack.Screen options={{ title: day ? t(`plan.day.${day.key}` as 'plan.day.push') : '' }} />
      <QueryState isPending={plan.isPending} error={plan.error} onRetry={() => plan.refetch()} />
      {day ? (
        <>
          <AppText color={colors.muted}>
            {t('plan.dayN', { n: day.dayIndex + 1 })} · {t('home.exercisesCount', { count: day.exercises.length })}
          </AppText>
          {day.exercises.map((ex, i) => (
            <ExerciseRow key={ex.id} index={i} exercise={ex} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function ExerciseRow({ exercise, index }: { exercise: ActivePlanExercise; index: number }) {
  const { t, i18n } = useTranslation();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
      onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: exercise.exerciseId } })}
      accessibilityRole="button"
    >
      <View>
        <ExerciseImage exerciseId={exercise.exerciseId} size={64} />
        <View style={styles.thumbIndex}>
          <AppText variant="caption" color={colors.onPrimary}>{index + 1}</AppText>
        </View>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="caption" color={colors.primary}>
          {t(`plan.role.${exercise.role}`)}
        </AppText>
        <AppText variant="label">{exerciseDisplayName(exercise.exercise, i18n.language)}</AppText>
        <AppText variant="caption" color={colors.muted}>
          {formatPrescription(t, exercise)} · {formatRest(t, exercise.restSec)}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  thumbIndex: {
    position: 'absolute',
    top: -6,
    start: -6,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
