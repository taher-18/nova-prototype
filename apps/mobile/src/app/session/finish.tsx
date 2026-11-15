import { exerciseName } from '@gymapp/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { finishMotivation } from '../../features/motivation/motivation';
import { useActiveWorkout, type FinishedWorkout } from '../../features/workout/ActiveWorkoutProvider';
import { prText } from '../../features/workout/components/PrCelebration';
import { formatClock, formatKg } from '../../lib/format';
import { useData } from '../../sync/DataProvider';
import { colors, radius, space } from '../../theme';

export default function FinishScreen() {
  const { t, i18n } = useTranslation();
  const { getLastFinished } = useActiveWorkout();
  const { pending } = useData();
  const [result, setResult] = useState<FinishedWorkout | null>(null);

  useEffect(() => {
    void getLastFinished().then(setResult);
  }, [getLastFinished]);

  if (!result) return null;
  const { summary, streakAfter, streakBefore } = result;
  const saved = summary.setsDone > 0;
  const streakGrew = streakAfter.currentWeeks > streakBefore.currentWeeks;
  const motivation = finishMotivation(summary.durationSec + summary.setsDone);

  return (
    <Screen footer={<Button title={t('finish.done')} onPress={() => router.dismissTo('/(tabs)')} />}>
      <View style={styles.hero}>
        <AppText style={styles.emoji}>{summary.prs.length > 0 ? '🏆' : '💪'}</AppText>
        <AppText variant="title" center>{t('finish.title')}</AppText>
        {saved ? (
          <AppText center color={colors.muted}>{t(`motivation.finish.${motivation.index}` as 'motivation.finish.0')}</AppText>
        ) : (
          <AppText center color={colors.muted}>{t('finish.notSaved')}</AppText>
        )}
      </View>

      <View style={styles.grid}>
        <Stat label={t('finish.duration')} value={formatClock(summary.durationSec)} />
        <Stat label={t('finish.volume')} value={t('units.kg', { value: formatKg(summary.volumeKg) })} />
        <Stat label={t('finish.sets')} value={String(summary.setsDone)} />
        <Stat label={t('finish.exercises')} value={String(summary.exercisesDone)} />
      </View>

      <View style={styles.card}>
        <AppText variant="heading">{t('finish.prs')}</AppText>
        {summary.prs.length === 0 ? (
          <AppText color={colors.muted}>{t('finish.noPrs')}</AppText>
        ) : (
          summary.prs.map((pr) => (
            <View key={`${pr.exerciseId}-${pr.type}`} style={styles.prRow}>
              <AppText style={{ fontSize: 22 }}>🏆</AppText>
              <View style={{ flex: 1 }}>
                <AppText variant="label">{exerciseName(pr.exerciseId, i18n.language)}</AppText>
                <AppText variant="caption" color={colors.muted}>{prText(t, pr)}</AppText>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={[styles.card, streakAfter.weekComplete && styles.streakDone]}>
        <AppText variant="heading">
          {t('finish.streak')} {streakAfter.currentWeeks > 0 ? '🔥' : ''}
        </AppText>
        <AppText variant="label" color={streakGrew ? colors.primary : colors.text}>
          {t('finish.streakWeeks', { count: streakAfter.currentWeeks })}
        </AppText>
        <ProgressBar value={streakAfter.thisWeekCount / streakAfter.weeklyGoal} />
        <AppText variant="caption" color={colors.muted}>
          {streakAfter.weekComplete
            ? t('finish.weekDone')
            : t('finish.weekProgress', { done: streakAfter.thisWeekCount, goal: streakAfter.weeklyGoal })}
        </AppText>
      </View>

      {saved && pending > 0 ? (
        <AppText variant="caption" center color={colors.muted}>{t('workout.pendingSync')}</AppText>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" color={colors.muted}>{label}</AppText>
      <AppText variant="title" style={{ writingDirection: 'ltr' }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.xs, marginTop: space.lg },
  emoji: { fontSize: 56, lineHeight: 72 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { flexBasis: '47%', flexGrow: 1, padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: 2 },
  card: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: space.sm },
  streakDone: { backgroundColor: colors.primarySoft },
  prRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
