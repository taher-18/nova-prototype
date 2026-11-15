import { Ionicons } from '@expo/vector-icons';
import type { ActivePlanDay } from '@gymapp/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { QueryState } from '../../components/QueryState';
import { Screen } from '../../components/Screen';
import { useActivePlan } from '../../features/plan/usePlan';
import { useActiveWorkout } from '../../features/workout/ActiveWorkoutProvider';
import { useNextPlanDay, useRecentSessions } from '../../features/workout/useNextDay';
import { WorkoutInProgressCard } from '../../features/workout/WorkoutInProgressCard';
import { formatClock, formatKg, formatShortDate } from '../../lib/format';
import { colors, radius, space } from '../../theme';

export default function WorkoutTab() {
  const { t, i18n } = useTranslation();
  const plan = useActivePlan();
  const next = useNextPlanDay(plan.data);
  const recent = useRecentSessions(5);
  const w = useActiveWorkout();
  const [starting, setStarting] = useState<string | null>(null);

  async function start(day: ActivePlanDay | null) {
    setStarting(day?.id ?? 'empty');
    try {
      if (day) await w.startFromPlanDay(day);
      else await w.startEmpty();
      router.push('/session/active');
    } finally {
      setStarting(null);
    }
  }

  const dayName = (key: string | null) => (key ? t(`plan.day.${key}` as 'plan.day.push') : t('workout.custom'));

  return (
    <Screen edges={['top']}>
      <AppText variant="title">{t('workout.tabTitle')}</AppText>

      {w.workout ? (
        <WorkoutInProgressCard />
      ) : (
        <>
          <QueryState isPending={plan.isPending} error={plan.error} onRetry={() => plan.refetch()} />
          {next ? (
            <View style={styles.hero}>
              <AppText variant="caption" color={colors.onPrimary}>{t('workout.today')}</AppText>
              <AppText variant="title" color={colors.onPrimary}>{dayName(next.key)}</AppText>
              <AppText color={colors.onPrimary}>{t('home.exercisesCount', { count: next.exercises.length })}</AppText>
              <Button
                title={t('workout.start')}
                variant="secondary"
                loading={starting === next.id}
                disabled={!!starting}
                onPress={() => void start(next)}
                style={{ marginTop: space.sm }}
              />
            </View>
          ) : null}

          {plan.data && plan.data.days.length > 1 ? (
            <View style={{ gap: space.sm }}>
              <AppText variant="heading">{t('workout.otherDays')}</AppText>
              {plan.data.days
                .filter((d) => d.id !== next?.id)
                .map((d) => (
                  <View key={d.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="label">{dayName(d.key)}</AppText>
                      <AppText variant="caption" color={colors.muted}>{t('home.exercisesCount', { count: d.exercises.length })}</AppText>
                    </View>
                    <Button
                      title={t('workout.startDay')}
                      variant="secondary"
                      loading={starting === d.id}
                      disabled={!!starting}
                      onPress={() => void start(d)}
                      style={styles.smallBtn}
                    />
                  </View>
                ))}
            </View>
          ) : null}

          <Pressable style={styles.row} onPress={() => void start(null)} disabled={!!starting} accessibilityRole="button">
            <Ionicons name="add-circle-outline" size={28} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <AppText variant="label">{t('workout.empty')}</AppText>
              <AppText variant="caption" color={colors.muted}>{t('workout.emptyHint')}</AppText>
            </View>
          </Pressable>
        </>
      )}

      <Pressable style={styles.row} onPress={() => router.push('/exercises')} accessibilityRole="button">
        <Ionicons name="library-outline" size={26} color={colors.primary} />
        <AppText variant="label" style={{ flex: 1 }}>{t('library.browse')}</AppText>
      </Pressable>

      <View style={{ gap: space.sm }}>
        <AppText variant="heading">{t('workout.recent')}</AppText>
        {recent.data?.length ? (
          recent.data.map((s) => (
            <View key={s.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppText variant="label">{dayName(s.dayKey)}</AppText>
                <AppText variant="caption" color={colors.muted}>
                  {formatShortDate(s.startedAt, i18n.language)}
                  {s.endedAt ? ` · ${formatClock((s.endedAt - s.startedAt) / 1000)}` : ''} · {s.setCount} {t('finish.sets')}
                </AppText>
              </View>
              {s.volumeKg > 0 ? (
                <AppText variant="label" color={colors.muted}>{t('units.kg', { value: formatKg(s.volumeKg) })}</AppText>
              ) : null}
            </View>
          ))
        ) : (
          <AppText color={colors.muted}>{t('workout.noRecent')}</AppText>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: space.xl, gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    minHeight: 64,
  },
  smallBtn: { minHeight: 44, paddingHorizontal: space.lg },
});
