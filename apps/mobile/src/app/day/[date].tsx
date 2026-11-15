import { addDays, exerciseName, fromDateKey } from '@gymapp/shared';
import { useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { ExerciseImage } from '../../components/ExerciseImage';
import { QueryState } from '../../components/QueryState';
import { Screen } from '../../components/Screen';
import { getSessionDetail } from '../../db/history';
import { DAY_STYLE } from '../../features/schedule/dayStyle';
import { useCalendar, useScheduleActions } from '../../features/schedule/useSchedule';
import { useActiveWorkout } from '../../features/workout/ActiveWorkoutProvider';
import { formatClock, formatKg, formatPrescription } from '../../lib/format';
import { useData } from '../../sync/DataProvider';
import { colors, radius, space } from '../../theme';

export default function DayScreen() {
  const { t, i18n } = useTranslation();
  const { date } = useLocalSearchParams<{ date: string }>();
  // Load two weeks around the day so moving a workout can offer nearby dates.
  const cal = useCalendar(addDays(date, -1), addDays(date, 14));
  const actions = useScheduleActions();
  const w = useActiveWorkout();
  const [moving, setMoving] = useState(false);
  const [starting, setStarting] = useState(false);

  const day = cal.days?.find((d) => d.date === date);
  const planDay = day && day.planDayIndex !== null ? cal.plan?.days[day.planDayIndex] : undefined;
  const override = cal.schedule?.overrides.find((o) => o.date === date);
  const isFuture = date >= cal.todayKey;
  const lang = i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB';
  const title = fromDateKey(date).toLocaleDateString(lang, { weekday: 'long', day: 'numeric', month: 'long' });

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setMoving(false);
    } catch {
      Alert.alert(t('dayScreen.needsConnection'));
    }
  };

  async function start() {
    if (!planDay) return;
    setStarting(true);
    try {
      await w.startFromPlanDay(planDay);
      router.push('/session/active');
    } finally {
      setStarting(false);
    }
  }

  // Dates the workout can move to: the next two weeks, excluding this one and days already done.
  const moveTargets =
    cal.days?.filter((d) => d.date >= cal.todayKey && d.date !== date && d.status !== 'done').slice(0, 10) ?? [];
  const busy = actions.move.isPending || actions.setDay.isPending || actions.resetDay.isPending;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: '' }} />
      <AppText variant="title">{title}</AppText>
      {cal.isPending || cal.error ? (
        <QueryState isPending={cal.isPending} error={cal.error} onRetry={cal.refetch} />
      ) : day ? (
        <>
          <View style={[styles.badge, { backgroundColor: DAY_STYLE[day.status].bg, borderColor: DAY_STYLE[day.status].border }]}>
            <AppText variant="label" color={DAY_STYLE[day.status].fg}>{t(`dayStatus.${day.status}`)}</AppText>
          </View>

          {day.sessions.map((s) => (
            <SessionCard key={s.id} id={s.id} />
          ))}

          {planDay && (day.status === 'today' || day.status === 'upcoming') ? (
            <View style={styles.card}>
              <AppText variant="caption" color={colors.muted}>{t('dayScreen.planned')}</AppText>
              <AppText variant="heading">{t(`plan.day.${planDay.key}` as 'plan.day.push')}</AppText>
              {planDay.exercises.map((ex) => (
                <View key={ex.id} style={styles.exRow}>
                  <ExerciseImage exerciseId={ex.exerciseId} size={44} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="label" numberOfLines={1}>
                      {i18n.language === 'ar' ? ex.exercise.nameAr : ex.exercise.nameEn}
                    </AppText>
                    <AppText variant="caption" color={colors.muted}>{formatPrescription(t, ex)}</AppText>
                  </View>
                </View>
              ))}
              {day.status === 'today' && !w.workout ? (
                <Button title={t('workout.start')} loading={starting} onPress={() => void start()} />
              ) : null}
              <Button title={t('dayScreen.move')} variant="secondary" disabled={busy} onPress={() => setMoving((m) => !m)} />
              {moving ? (
                <View style={{ gap: space.sm }}>
                  <AppText variant="caption" color={colors.muted}>{t('dayScreen.moveTo')}</AppText>
                  <View style={styles.chips}>
                    {moveTargets.map((target) => (
                      <Chip
                        key={target.date}
                        selected={false}
                        label={fromDateKey(target.date).toLocaleDateString(lang, { weekday: 'short', day: 'numeric' })}
                        onPress={() => void run(() => actions.move.mutateAsync({ from: date, to: target.date }))}
                      />
                    ))}
                  </View>
                </View>
              ) : null}
              <Button
                title={t('dayScreen.makeRest')}
                variant="ghost"
                disabled={busy}
                onPress={() => void run(() => actions.setDay.mutateAsync({ date, kind: 'rest' }))}
              />
            </View>
          ) : null}

          {day.status === 'rest' && day.sessions.length === 0 ? (
            <EmptyState
              icon="moon-outline"
              title={t('dayScreen.noWorkout')}
              action={
                isFuture
                  ? { label: t('dayScreen.trainHere'), onPress: () => void run(() => actions.setDay.mutateAsync({ date, kind: 'train' })) }
                  : undefined
              }
            />
          ) : null}

          {day.status === 'missed' ? (
            <Button
              title={t('dayScreen.wasRest')}
              variant="secondary"
              disabled={busy}
              onPress={() => void run(() => actions.setDay.mutateAsync({ date, kind: 'rest' }))}
            />
          ) : null}

          {override ? (
            <Button
              title={t('dayScreen.reset')}
              variant="ghost"
              disabled={busy}
              onPress={() => void run(() => actions.resetDay.mutateAsync(date))}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

/** A finished workout: duration, volume and every set. */
function SessionCard({ id }: { id: string }) {
  const { t, i18n } = useTranslation();
  const { db } = useData();
  const detail = useQuery({ queryKey: ['local', 'session', id], queryFn: () => getSessionDetail(db, id) });
  const s = detail.data;
  if (!s) return null;
  return (
    <View style={[styles.card, { borderWidth: 1.5, borderColor: colors.success }]}>
      <AppText variant="caption" color={colors.muted}>{t('dayScreen.completed')}</AppText>
      <AppText variant="heading">{s.dayKey ? t(`plan.day.${s.dayKey}` as 'plan.day.push') : t('workout.custom')}</AppText>
      <AppText variant="caption" color={colors.muted}>
        {s.endedAt ? `${formatClock((s.endedAt - s.startedAt) / 1000)} · ` : ''}
        {s.setCount} {t('finish.sets')}
        {s.volumeKg > 0 ? ` · ${t('units.kg', { value: formatKg(s.volumeKg) })}` : ''}
      </AppText>
      {s.exercises.map((ex) => (
        <View key={ex.exerciseId} style={{ gap: 2 }}>
          <AppText variant="label">{exerciseName(ex.exerciseId, i18n.language)}</AppText>
          <AppText variant="caption" color={colors.muted} style={{ writingDirection: 'ltr' }}>
            {ex.sets
              .map((set) =>
                set.durationSec ? `${set.durationSec}s` : set.weightKg ? `${formatKg(set.weightKg)}×${set.reps ?? '?'}` : `×${set.reps ?? '?'}`,
              )
              .join('  ·  ')}
          </AppText>
          {ex.note ? <AppText variant="caption" color={colors.muted}>“{ex.note}”</AppText> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, borderWidth: 1.5 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
