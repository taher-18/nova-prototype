import { Ionicons } from '@expo/vector-icons';
import { addDays, fromDateKey, startOfWeek, toDateKey, type ActivePlanDay } from '@gymapp/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { PressableScale } from '../../components/PressableScale';
import { QueryState } from '../../components/QueryState';
import { Screen } from '../../components/Screen';
import { useActiveWorkout } from '../../features/workout/ActiveWorkoutProvider';
import { WorkoutInProgressCard } from '../../features/workout/WorkoutInProgressCard';
import { daySeed, pickMotivation } from '../../features/motivation/motivation';
import { useCalendar } from '../../features/schedule/useSchedule';
import { WeekStrip } from '../../features/schedule/WeekStrip';
import { colors, radius, space } from '../../theme';

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const w = useActiveWorkout();
  const [starting, setStarting] = useState(false);

  // This week plus three weeks ahead, to find the next workout.
  const weekStartKey = startOfWeek(toDateKey(new Date()));
  const cal = useCalendar(weekStartKey, addDays(weekStartKey, 27));
  const week = cal.days?.slice(0, 7);
  const today = cal.days?.find((d) => d.date === cal.todayKey);
  const plannedDay = (index: number | null | undefined) =>
    index !== null && index !== undefined ? cal.plan?.days[index] : undefined;
  const todayPlan = plannedDay(today?.planDayIndex);
  const next = cal.days?.find((d) => d.date > cal.todayKey && d.planDayIndex !== null);
  const nextPlan = plannedDay(next?.planDayIndex);
  const doneThisWeek = week?.filter((d) => d.status === 'done').length ?? 0;
  const missed = week?.filter((d) => d.status === 'missed').length ?? 0;
  const weeklyGoal = cal.schedule?.weeklyGoal ?? 3;
  const motivation = today
    ? pickMotivation({ todayStatus: today.status, doneThisWeek, weeklyGoal, missedThisWeek: missed, seed: daySeed() })
    : null;

  async function start(day: ActivePlanDay | undefined) {
    if (!day) return;
    setStarting(true);
    try {
      await w.startFromPlanDay(day);
      router.push('/session/active');
    } finally {
      setStarting(false);
    }
  }

  const dayName = (key: string | null | undefined) => (key ? t(`plan.day.${key}` as 'plan.day.push') : t('workout.custom'));
  const dateLabel = (key: string) =>
    key === addDays(cal.todayKey, 1)
      ? t('today.tomorrow')
      : fromDateKey(key).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
        });

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <AppText variant="title" style={{ flex: 1 }}>
          {user?.displayName ? t('home.greeting', { name: user.displayName }) : t('home.greetingNoName')}
        </AppText>
        <PressableScale onPress={() => router.push('/profile/edit')}>
          <Avatar url={user?.avatarUrl} name={user?.displayName} email={user?.email} size={44} />
        </PressableScale>
      </View>

      <WorkoutInProgressCard />

      {cal.isPending || cal.error ? (
        <QueryState isPending={cal.isPending} error={cal.error} onRetry={cal.refetch} skeleton="hero" />
      ) : (
        <>
          {motivation ? (
            <View style={styles.motivation}>
              <Ionicons name="flash" size={20} color={colors.gold} />
              <AppText variant="label" style={{ flex: 1 }}>
                {t(`motivation.${motivation.pool}.${motivation.index}` as 'motivation.trainDay.0', motivation.params)}
              </AppText>
            </View>
          ) : null}

          <PressableScale style={[styles.card, styles.coachCard]} onPress={() => router.push('/coach')}>
            <View style={styles.coachIcon}>
              <Ionicons name="sparkles" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label">{t('coach.open')}</AppText>
              <AppText variant="caption" color={colors.muted}>{t('coach.openSub')}</AppText>
            </View>
            <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.muted} />
          </PressableScale>

          {/* Today */}
          {!w.workout && today ? (
            today.status === 'done' ? (
              <View style={[styles.card, styles.doneCard]}>
                <AppText variant="caption" color={colors.muted}>{t('today.title')}</AppText>
                <AppText variant="title">{t('today.doneTitle')}</AppText>
                {today.sessions.map((s) => (
                  <AppText key={s.id} color={colors.muted}>
                    {t('today.doneBody', { name: dayName(s.dayKey), sets: s.setCount })}
                  </AppText>
                ))}
              </View>
            ) : today.status === 'today' && todayPlan ? (
              <View style={styles.hero}>
                <AppText variant="caption" color={colors.onPrimary}>{t('workout.today')}</AppText>
                <AppText variant="title" color={colors.onPrimary}>{dayName(todayPlan.key)}</AppText>
                <AppText color={colors.onPrimary}>
                  {t('home.exercisesCount', { count: todayPlan.exercises.length })} ·{' '}
                  {t('home.minutes', { count: cal.plan?.sessionMinutes ?? 60 })}
                </AppText>
                <Button
                  title={t('workout.start')}
                  variant="secondary"
                  loading={starting}
                  onPress={() => void start(todayPlan)}
                  style={{ marginTop: space.sm }}
                />
              </View>
            ) : (
              <View style={styles.card}>
                <View style={styles.rowCenter}>
                  <Ionicons name="moon" size={22} color={colors.primary} />
                  <AppText variant="heading">{t('today.restTitle')}</AppText>
                </View>
                <AppText color={colors.muted}>{t('today.restBody')}</AppText>
                {nextPlan ? (
                  <Button
                    title={t('today.trainAnyway')}
                    variant="secondary"
                    loading={starting}
                    onPress={() => void start(nextPlan)}
                  />
                ) : null}
              </View>
            )
          ) : null}

          {/* Next */}
          <PressableScale
            style={styles.card}
            disabled={!next}
            onPress={() => next && router.push({ pathname: '/day/[date]', params: { date: next.date } })}
          >
            <AppText variant="caption" color={colors.muted}>{t('today.next')}</AppText>
            {next && nextPlan ? (
              <View style={styles.rowCenter}>
                <View style={{ flex: 1 }}>
                  <AppText variant="heading">{dayName(nextPlan.key)}</AppText>
                  <AppText color={colors.muted}>{dateLabel(next.date)}</AppText>
                </View>
                <AppText variant="caption" color={colors.muted}>
                  {t('home.exercisesCount', { count: nextPlan.exercises.length })}
                </AppText>
              </View>
            ) : (
              <AppText color={colors.muted}>{t('today.noNext')}</AppText>
            )}
          </PressableScale>

          {/* Week */}
          {week ? (
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <AppText variant="heading">{t('week.title')}</AppText>
                <AppText variant="caption" color={colors.muted}>
                  {t('week.workouts', { done: doneThisWeek, goal: weeklyGoal })}
                </AppText>
              </View>
              <WeekStrip days={week} todayKey={cal.todayKey} />
              {missed > 0 ? (
                <AppText variant="caption" color={colors.muted}>{t('today.missedNote', { count: missed })}</AppText>
              ) : null}
              <Button title={t('scheduleEdit.edit')} variant="ghost" onPress={() => router.push('/schedule/edit')} />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: space.xl, gap: space.xs },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  motivation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  coachCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  coachIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCard: { borderWidth: 1.5, borderColor: colors.success },
  rowCenter: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
