import { COMMON_MISTAKES, exerciseSteps, getExercise, getVariations } from '@gymapp/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { ExerciseImage } from '../../components/ExerciseImage';
import { LineChart } from '../../components/LineChart';
import { Screen } from '../../components/Screen';
import { ExerciseRow } from '../../features/exercises/ExerciseList';
import { useExerciseProgress } from '../../features/exercises/useExerciseProgress';
import { formatKg, formatShortDate } from '../../lib/format';
import { colors, radius, space } from '../../theme';

export default function ExerciseDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ex = getExercise(id);
  const progress = useExerciseProgress(id);
  if (!ex) return null;

  const lang = i18n.language;
  const name = lang === 'ar' ? ex.nameAr : ex.nameEn;
  const mistakes = COMMON_MISTAKES[ex.pattern][lang === 'ar' ? 'ar' : 'en'];
  const variations = getVariations(ex.id);
  const bests = progress.data?.bests;
  const points = progress.data?.points ?? [];
  const hasData = points.length > 0;
  const metric = progress.data?.metric ?? 'e1rm';

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: '' }} />
      <ExerciseImage exerciseId={ex.id} size="100%" height={230} toggleable />
      <AppText variant="caption" color={colors.muted} center>{t('exercise.startHint')}</AppText>

      <View style={{ gap: space.xs }}>
        <AppText variant="title">{name}</AppText>
        {lang === 'ar' ? <AppText variant="caption" color={colors.muted}>{ex.nameEn}</AppText> : null}
      </View>
      <Button
        title={t('coach.askAbout')}
        variant="secondary"
        onPress={() => router.push({ pathname: '/coach', params: { exerciseId: ex.id } })}
      />

      <View style={styles.facts}>
        <Fact label={t('exercise.equipment')} value={t(`equipmentName.${ex.equipment}`)} />
        <Fact label={t('exercise.difficulty')} value={t(`level.${ex.level}`)} />
      </View>

      <Section title={t('exercise.primary')}>
        <Tags items={ex.primaryMuscles.map((m) => t(`muscles.${m}` as 'muscles.chest'))} strong />
      </Section>
      {ex.secondaryMuscles.length > 0 ? (
        <Section title={t('exercise.secondary')}>
          <Tags items={ex.secondaryMuscles.map((m) => t(`muscles.${m}` as 'muscles.chest'))} />
        </Section>
      ) : null}

      <Section title={t('exercise.records')}>
        {hasData && bests ? (
          <View style={styles.facts}>
            {bests.maxWeightKg !== null ? <Fact label={t('exercise.bestWeight')} value={t('units.kg', { value: formatKg(bests.maxWeightKg) })} /> : null}
            {bests.maxE1rm !== null ? <Fact label={t('exercise.bestE1rm')} value={t('units.kg', { value: formatKg(bests.maxE1rm) })} /> : null}
            {bests.maxReps !== null ? <Fact label={t('exercise.bestReps')} value={String(bests.maxReps)} /> : null}
            {bests.maxDurationSec !== null ? <Fact label={t('exercise.bestDuration')} value={`${bests.maxDurationSec}s`} /> : null}
          </View>
        ) : (
          <AppText color={colors.muted}>{t('exercise.noHistory')}</AppText>
        )}
      </Section>

      {hasData ? (
        <Section title={t('exercise.history')}>
          <View style={styles.card}>
            <AppText variant="caption" color={colors.muted}>
              {t(metric === 'e1rm' ? 'exercise.chartE1rm' : metric === 'duration' ? 'exercise.chartDuration' : 'exercise.chartReps')}
            </AppText>
            <LineChart
              points={points.map((p) => ({ x: p.date, y: p.value }))}
              formatY={(y) => formatKg(y)}
              formatX={(x) => formatShortDate(x, lang)}
            />
          </View>
          <AppText variant="label">{t('exercise.recent')}</AppText>
          {points
            .slice(-5)
            .reverse()
            .map((p) => (
              <View key={p.sessionId} style={styles.historyRow}>
                <AppText color={colors.muted}>{formatShortDate(p.date, lang)}</AppText>
                <AppText variant="label" style={{ writingDirection: 'ltr' }}>
                  {p.topSet.durationSec
                    ? `${p.topSet.durationSec}s`
                    : p.topSet.weightKg
                      ? `${formatKg(p.topSet.weightKg)} kg × ${p.topSet.reps ?? '?'}`
                      : `× ${p.topSet.reps ?? '?'}`}
                </AppText>
              </View>
            ))}
        </Section>
      ) : null}

      <Section title={t('exercise.howTo')}>
        {exerciseSteps(ex, lang).map((step, i) => (
          <View key={i} style={styles.step}>
            <View style={styles.stepNum}>
              <AppText variant="label" color={colors.onPrimary}>{i + 1}</AppText>
            </View>
            <AppText style={{ flex: 1 }}>{step}</AppText>
          </View>
        ))}
      </Section>

      <Section title={t('exercise.mistakes')}>
        {mistakes.map((m, i) => (
          <View key={i} style={styles.step}>
            <AppText style={{ fontSize: 18 }}>⚠️</AppText>
            <AppText style={{ flex: 1 }}>{m}</AppText>
          </View>
        ))}
      </Section>

      {variations.length > 0 ? (
        <Section title={t('exercise.variations')}>
          {variations.map((v) => (
            <ExerciseRow key={v.id} exercise={v} onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: v.id } })} />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.sm }}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppText variant="caption" color={colors.muted}>{label}</AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

function Tags({ items, strong }: { items: string[]; strong?: boolean }) {
  return (
    <View style={styles.tags}>
      {items.map((m) => (
        <View key={m} style={[styles.tag, strong && styles.tagStrong]}>
          <AppText variant="caption" color={strong ? colors.onPrimary : colors.text}>{m}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  fact: { flexGrow: 1, flexBasis: '45%', padding: space.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.surface },
  tagStrong: { backgroundColor: colors.primary },
  card: { padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface, gap: space.sm },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.xs },
  step: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
