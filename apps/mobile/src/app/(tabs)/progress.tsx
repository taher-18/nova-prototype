import { Ionicons } from '@expo/vector-icons';
import { BODY_METRIC_KINDS, BODY_METRIC_UNITS } from '@gymapp/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { LineChart } from '../../components/LineChart';
import { PressableScale } from '../../components/PressableScale';
import { Screen } from '../../components/Screen';
import { SkeletonBlock } from '../../components/Skeleton';
import { listRecentSessions, workoutDates } from '../../db/history';
import { useBodyMetric, useLatestBodyMetrics } from '../../features/progress/useBodyMetrics';
import { weeklySummary } from '../../features/progress/weeklySummary';
import { MonthCalendar } from '../../features/schedule/MonthCalendar';
import { useSchedule } from '../../features/schedule/useSchedule';
import { computeStreak } from '../../features/workout/streak';
import { formatClock, formatKg, formatShortDate } from '../../lib/format';
import { toDateKey } from '@gymapp/shared';
import { useData } from '../../sync/DataProvider';
import { colors, radius, space } from '../../theme';

export default function ProgressTab() {
  const { t, i18n } = useTranslation();
  const { db } = useData();
  const schedule = useSchedule();
  const goal = schedule.data?.weeklyGoal ?? 3;
  const stats = useQuery({
    queryKey: ['local', 'progress-stats'],
    queryFn: async () => {
      const [recent, dates] = await Promise.all([listRecentSessions(db, 1000), workoutDates(db)]);
      return { recent, dates };
    },
  });
  const weight = useBodyMetric('weight');
  const latest = useLatestBodyMetrics();

  const summary = stats.data ? weeklySummary(stats.data.recent, new Date()) : null;
  const streak = stats.data ? computeStreak(stats.data.dates, goal, new Date()) : null;
  const change = summary?.volumeChangePct ?? null;

  return (
    <Screen edges={['top']}>
      <AppText variant="title">{t('progress.title')}</AppText>

      {/* Weekly summary */}
      <View style={styles.card}>
        <AppText variant="heading">{t('progress.summary')}</AppText>
        {summary && streak ? (
          <>
            <View style={styles.stats}>
              <Stat label={t('progress.workouts')} value={`${summary.thisWeek.workouts}/${goal}`} />
              <Stat label={t('progress.volume')} value={t('units.kg', { value: formatKg(summary.thisWeek.volumeKg) })} />
              <Stat label={t('progress.streak')} value={`🔥 ${t('progress.streakWeeks', { count: streak.currentWeeks })}`} />
            </View>
            {change !== null ? (
              <View style={[styles.change, { backgroundColor: change >= 0 ? colors.successSoft : colors.dangerSoft }]}>
                <Ionicons name={change >= 0 ? 'trending-up' : 'trending-down'} size={18} color={change >= 0 ? colors.success : colors.danger} />
                <AppText variant="label" color={change >= 0 ? colors.success : colors.danger}>
                  {change >= 0 ? '+' : ''}
                  {change}% {t('progress.vsLastWeek')}
                </AppText>
              </View>
            ) : (
              <AppText variant="caption" color={colors.muted}>{t('progress.noLastWeek')}</AppText>
            )}
          </>
        ) : (
          <SkeletonBlock height={64} />
        )}
      </View>

      {/* Every logged workout with its date (testers screenshot this as proof). */}
      <AppText variant="heading">{t('history.title')}</AppText>
      <View style={styles.card}>
        {stats.data && streak ? (
          <>
            <AppText variant="label">
              {t('history.total', { count: stats.data.recent.length })} · 🔥 {t('progress.streakWeeks', { count: streak.currentWeeks })}
            </AppText>
            <AppText variant="caption" color={colors.muted}>
              {t('history.best', { count: streak.longestWeeks })}
            </AppText>
            {stats.data.recent.length === 0 ? (
              <AppText color={colors.muted}>{t('history.empty')}</AppText>
            ) : (
              stats.data.recent.map((s) => {
                const date = new Date(s.startedAt);
                return (
                  <PressableScale
                    key={s.id}
                    style={styles.historyRow}
                    onPress={() => router.push({ pathname: '/day/[date]', params: { date: toDateKey(date) } })}
                  >
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="label">
                        {date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {' · '}
                        {date.toLocaleTimeString(i18n.language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </AppText>
                      <AppText variant="caption" color={colors.muted}>
                        {s.dayKey ? t(`plan.day.${s.dayKey}` as 'plan.day.push') : t('workout.custom')} ·{' '}
                        {t('history.sets', { count: s.setCount })}
                        {s.endedAt ? ` · ${formatClock((s.endedAt - s.startedAt) / 1000)}` : ''}
                      </AppText>
                    </View>
                  </PressableScale>
                );
              })
            )}
          </>
        ) : (
          <SkeletonBlock height={64} />
        )}
      </View>

      {/* Calendar */}
      <AppText variant="heading">{t('progress.calendar')}</AppText>
      <MonthCalendar />

      {/* Body weight */}
      <AppText variant="heading">{t('progress.body')}</AppText>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <AppText variant="label">{t('metrics.weight')}</AppText>
          {latest.data?.weight ? (
            <AppText variant="title">{t('units.kg', { value: formatKg(latest.data.weight.value) })}</AppText>
          ) : null}
        </View>
        {weight.data && weight.data.length > 1 ? (
          <LineChart
            height={120}
            points={weight.data.map((p) => ({ x: p.loggedAt, y: p.value }))}
            formatY={(y) => formatKg(y)}
            formatX={(x) => formatShortDate(x, i18n.language)}
          />
        ) : null}
        <Button title={t('progress.logWeight')} variant="secondary" onPress={() => router.push({ pathname: '/body/[kind]', params: { kind: 'weight' } })} />
      </View>

      {/* Measurements */}
      <AppText variant="heading">{t('progress.measurements')}</AppText>
      <View style={styles.list}>
        {BODY_METRIC_KINDS.filter((k) => k !== 'weight').map((kind) => {
          const value = latest.data?.[kind];
          return (
            <PressableScale
              key={kind}
              style={styles.row}
              onPress={() => router.push({ pathname: '/body/[kind]', params: { kind } })}
              accessibilityRole="button"
            >
              <AppText variant="label" style={{ flex: 1 }}>{t(`metrics.${kind}`)}</AppText>
              <AppText color={value ? colors.text : colors.muted}>
                {value ? `${formatKg(value.value)} ${BODY_METRIC_UNITS[kind]}` : '—'}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" color={colors.muted}>{label}</AppText>
      <AppText variant="heading" numberOfLines={1}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.md },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md, gap: 2 },
  change: { flexDirection: 'row', alignItems: 'center', gap: space.xs, alignSelf: 'flex-start', paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { backgroundColor: colors.surface, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', padding: space.lg, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
