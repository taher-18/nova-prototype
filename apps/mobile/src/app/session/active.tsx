import { Ionicons } from '@expo/vector-icons';
import { exerciseName, getExercise } from '@gymapp/shared';
import { router } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Alert, I18nManager, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionSheet, type SheetAction } from '../../components/ActionSheet';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { ExerciseImage } from '../../components/ExerciseImage';
import { PrCelebration } from '../../features/workout/components/PrCelebration';
import { RestTimerBar } from '../../features/workout/components/RestTimerBar';
import { SetRow } from '../../features/workout/components/SetRow';
import { useActiveWorkout } from '../../features/workout/ActiveWorkoutProvider';
import { currentPosition, isExerciseComplete, restRemainingSec, type ActiveExercise } from '../../features/workout/engine';
import { restOverInApp } from '../../features/workout/feedback';
import { warmupSets } from '../../features/workout/warmup';
import { formatClock, formatKg } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { colors, fonts, radius, space } from '../../theme';

/** Keeps the screen on during a workout (phones; browsers vary, so not on the web). */
const useKeepScreenOn = Platform.OS === 'web' ? () => {} : useKeepAwake;

export default function ActiveWorkoutScreen() {
  useKeepScreenOn();
  const { t, i18n } = useTranslation();
  const w = useActiveWorkout();
  const now = useNow(500);
  const workout = w.workout;
  const restLeft = workout ? restRemainingSec(workout, now) : 0;
  const restWasRunning = useRef(false);
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  // Rest finished while the app is open: buzz and clear the timer.
  useEffect(() => {
    if (!workout?.rest) {
      restWasRunning.current = false;
      return;
    }
    if (restLeft > 0) restWasRunning.current = true;
    else if (restWasRunning.current) {
      restWasRunning.current = false;
      restOverInApp();
      w.skipRest();
    } else {
      w.skipRest(); // already over when the screen opened
    }
  }, [restLeft, workout?.rest, w]);

  if (!workout) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <Button title={t('common.back')} variant="secondary" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const pos = currentPosition(workout);
  const ex = pos.exercise;
  const nextSet = ex && !ex.skipped ? ex.sets.find((st) => !st.done) : undefined;
  const setsLeft = workout.exercises.reduce(
    (n, e) => n + (e.skipped ? 0 : e.sets.filter((s) => !s.done).length),
    0,
  );
  const setsDone = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);

  function finish() {
    const go = async () => {
      const result = await w.finish();
      if (result) router.replace('/session/finish');
    };
    if (setsDone === 0) {
      Alert.alert(t('workout.finishConfirmTitle'), t('workout.finishEmptyBody'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('workout.discard'), style: 'destructive', onPress: () => void w.discard().then(() => router.back()) },
      ]);
    } else if (setsLeft > 0) {
      Alert.alert(t('workout.finishConfirmTitle'), t('workout.finishConfirmBody', { count: setsLeft }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('workout.finish'), onPress: () => void go() },
      ]);
    } else {
      void go();
    }
  }

  function moreActions(exercise: ActiveExercise): SheetAction[] {
    const started = exercise.sets.some((s) => s.done);
    return [
      {
        label: t('coach.askAbout'),
        icon: 'sparkles-outline',
        onPress: () => router.push({ pathname: '/coach', params: { exerciseId: exercise.exerciseId } }),
      },
      {
        label: t('workout.replace'),
        icon: 'swap-horizontal',
        onPress: () =>
          started
            ? Alert.alert(t('workout.replaceLocked'))
            : router.push({ pathname: '/session/pick-exercise', params: { mode: 'replace', key: exercise.key } }),
      },
      exercise.skipped
        ? { label: t('workout.unskip'), icon: 'play-outline', onPress: () => w.unskipExercise(exercise.key) }
        : { label: t('workout.skipExercise'), icon: 'play-skip-forward-outline', onPress: () => w.skipExercise(exercise.key) },
      {
        label: t('workout.discard'),
        icon: 'trash-outline',
        destructive: true,
        onPress: () =>
          Alert.alert(t('workout.discard'), t('workout.discardConfirm'), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('workout.discard'), style: 'destructive', onPress: () => void w.discard().then(() => router.back()) },
          ]),
      },
    ];
  }

  const back = I18nManager.isRTL ? 'chevron-forward' : 'chevron-back';
  const forward = I18nManager.isRTL ? 'chevron-back' : 'chevron-forward';

  return (
    <View style={styles.safe}>
      {/* Top bar: minimise, elapsed time, finish. Padded by the real insets so it never sits under the notch. */}
      <View style={[styles.topBar, { paddingTop: insets.top + space.sm }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t('workout.minimize')}
        >
          <Ionicons name="chevron-down" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.timer} accessibilityLabel={t('workout.workoutTime')}>
          <AppText variant="caption" color={colors.muted}>{t('workout.workoutTime')}</AppText>
          <AppText variant="title" style={styles.ltr}>
            {formatClock((now - workout.startedAt) / 1000)}
          </AppText>
        </View>
        <Pressable
          onPress={finish}
          hitSlop={8}
          style={({ pressed }) => [styles.finish, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Ionicons name="flag" size={16} color={colors.onPrimary} />
          <AppText variant="label" color={colors.onPrimary}>{t('workout.finish')}</AppText>
        </Pressable>
      </View>

      <PrCelebration prs={w.celebration} onDone={w.dismissCelebration} />

      {workout.rest && restLeft > 0 ? (
        <View style={styles.restWrap}>
          <RestTimerBar
            remainingSec={restLeft}
            totalSec={workout.rest.durationSec}
            onAdjust={w.adjustRest}
            onSkip={w.skipRest}
          />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Exercise chips to jump around */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {workout.exercises.map((e, i) => {
            const done = isExerciseComplete(e);
            return (
              <Pressable
                key={e.key}
                onPress={() => w.goTo(i)}
                style={[styles.chip, i === workout.currentIndex && styles.chipActive, done && styles.chipDone]}
              >
                {done ? (
                  <Ionicons name={e.skipped ? 'remove' : 'checkmark'} size={16} color={i === workout.currentIndex ? colors.onPrimary : colors.success} />
                ) : null}
                <AppText variant="caption" color={i === workout.currentIndex ? colors.onPrimary : colors.text} numberOfLines={1}>
                  {i + 1}. {exerciseName(e.exerciseId, i18n.language)}
                </AppText>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => router.push({ pathname: '/session/pick-exercise', params: { mode: 'add' } })}
            style={[styles.chip, styles.addChip]}
            accessibilityLabel={t('workout.addExercise')}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
          </Pressable>
        </ScrollView>

        {!ex ? (
          <View style={styles.emptyBox}>
            <AppText center color={colors.muted}>{t('workout.noExercises')}</AppText>
            <Button
              title={t('workout.addExercise')}
              onPress={() => router.push({ pathname: '/session/pick-exercise', params: { mode: 'add' } })}
            />
          </View>
        ) : (
          <>
            {/* Current exercise header */}
            <View style={styles.headerRow}>
              <Pressable onPress={() => w.goTo(workout.currentIndex - 1)} disabled={workout.currentIndex === 0} hitSlop={8} style={styles.navBtn}>
                <Ionicons name={back} size={26} color={workout.currentIndex === 0 ? colors.border : colors.text} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={colors.muted}>
                  {t('workout.exerciseOf', { n: pos.exerciseNumber, total: pos.exerciseCount })}
                </AppText>
                <Pressable onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: ex.exerciseId } })}>
                  <AppText variant="title" numberOfLines={2}>
                    {exerciseName(ex.exerciseId, i18n.language)}
                  </AppText>
                </Pressable>
              </View>
              <Pressable onPress={() => setMenuOpen(true)} hitSlop={8} style={styles.navBtn} accessibilityLabel="More">
                <Ionicons name="ellipsis-horizontal-circle" size={28} color={colors.text} />
              </Pressable>
              <Pressable
                onPress={() => w.goTo(workout.currentIndex + 1)}
                disabled={workout.currentIndex >= workout.exercises.length - 1}
                hitSlop={8}
                style={styles.navBtn}
              >
                <Ionicons
                  name={forward}
                  size={26}
                  color={workout.currentIndex >= workout.exercises.length - 1 ? colors.border : colors.text}
                />
              </Pressable>
            </View>

            <ExerciseImage exerciseId={ex.exerciseId} size="100%" height={190} toggleable />

            <View style={styles.targetBox}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" color={colors.muted}>{t('workout.target')}</AppText>
                <AppText variant="label">{targetText(ex, t)}</AppText>
              </View>
              {getExercise(ex.exerciseId)?.equipment === 'barbell' ? (
                <Pressable
                  onPress={() => {
                    const kg = ex.sets.find((s) => !s.done)?.weightKg ?? ex.sets[0]?.weightKg ?? 60;
                    router.push({ pathname: '/session/plates', params: { kg: String(kg) } });
                  }}
                  hitSlop={8}
                  style={styles.platesBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('plates.title')}
                >
                  <Ionicons name="calculator-outline" size={22} color={colors.primary} />
                </Pressable>
              ) : null}
              <View style={styles.setBadge}>
                <AppText variant="label" color={ex.skipped ? colors.muted : colors.primary}>
                  {ex.skipped
                    ? t('workout.skipped')
                    : pos.setNumber > pos.totalSets
                      ? t('workout.allSetsDone')
                      : t('workout.setOf', { n: pos.setNumber, total: pos.totalSets })}
                </AppText>
              </View>
            </View>

            <WarmupHint exercise={ex} />

            {/* Column headings */}
            <View style={styles.columns}>
              <AppText variant="caption" color={colors.muted} style={{ width: 28, textAlign: 'center' }}>#</AppText>
              <AppText variant="caption" color={colors.muted} style={{ flex: 1 }}>{t('workout.last')}</AppText>
              {ex.tracking === 'time' ? (
                <AppText variant="caption" color={colors.muted} style={styles.colHead}>{t('workout.sec')}</AppText>
              ) : (
                <>
                  {ex.loaded ? <AppText variant="caption" color={colors.muted} style={styles.colHead}>{t('workout.kg')}</AppText> : null}
                  <AppText variant="caption" color={colors.muted} style={styles.colHead}>{t('workout.reps')}</AppText>
                </>
              )}
              <View style={{ width: 52 }} />
            </View>

            {ex.sets.map((set, i) => (
              <SetRow
                key={set.id}
                exercise={ex}
                set={set}
                index={i}
                current={!ex.skipped && i === pos.setNumber - 1}
                onToggle={() => (set.done ? w.uncompleteSet(ex.key, set.id) : w.completeSet(ex.key, set.id))}
                onChange={(patch) => w.updateSet(ex.key, set.id, patch)}
                onRemove={() => w.removeSet(ex.key, set.id)}
              />
            ))}
            <Button title={t('workout.addSet')} variant="ghost" onPress={() => w.addSet(ex.key)} />

            <View style={styles.noteBox}>
              <Ionicons name="create-outline" size={18} color={colors.muted} />
              <TextInput
                value={ex.note}
                onChangeText={(note) => w.setNote(ex.key, note)}
                placeholder={t('workout.notePlaceholder')}
                placeholderTextColor={colors.muted}
                style={styles.noteInput}
                multiline
                maxLength={500}
                accessibilityLabel={t('workout.note')}
              />
            </View>

          </>
        )}
      </ScrollView>

      {/* Main action within thumb reach: complete the current set, then move on, then finish. */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, space.md) }]}>
        {ex && nextSet ? (
          <Button
            title={t('workout.completeSet', { n: pos.setNumber, total: pos.totalSets })}
            onPress={() => w.completeSet(ex.key, nextSet.id)}
          />
        ) : ex && workout.currentIndex < workout.exercises.length - 1 ? (
          <Button title={t('workout.nextExercise')} onPress={() => w.goTo(workout.currentIndex + 1)} />
        ) : (
          <Button title={t('workout.finishWorkout')} onPress={finish} disabled={setsDone === 0 && !ex} />
        )}
      </View>

      {ex ? (
        <ActionSheet
          visible={menuOpen}
          title={exerciseName(ex.exerciseId, i18n.language)}
          actions={moreActions(ex)}
          onClose={() => setMenuOpen(false)}
        />
      ) : null}
    </View>
  );
}

/** Suggested warm-up sets, shown until the first working set is done. */
function WarmupHint({ exercise }: { exercise: ActiveExercise }) {
  const { t } = useTranslation();
  const equipment = getExercise(exercise.exerciseId)?.equipment;
  if (!equipment || exercise.skipped || exercise.sets.some((s) => s.done)) return null;
  const sets = warmupSets(exercise.sets[0]?.weightKg ?? null, equipment);
  if (sets.length === 0) return null;
  return (
    <View style={styles.warmup}>
      <Ionicons name="flame-outline" size={18} color={colors.warning} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="caption" color={colors.muted}>{t('warmup.title')} · {t('warmup.hint')}</AppText>
        <AppText variant="label" style={styles.ltr}>
          {sets.map((s) => `${formatKg(s.weightKg)}×${s.reps}`).join('  ·  ')}
        </AppText>
      </View>
    </View>
  );
}

function targetText(ex: ActiveExercise, t: TFunction) {
  const sets = ex.sets.length;
  if (ex.tracking === 'time') return `${sets} × ${t('workout.targetSeconds', { seconds: ex.targetDurationSec ?? 30 })}`;
  const reps = ex.repsMin !== null && ex.repsMax !== null ? t('workout.targetReps', { min: ex.repsMin, max: ex.repsMax }) : '';
  const weight = ex.sets.find((s) => !s.done)?.targetWeightKg ?? ex.sets[0]?.targetWeightKg;
  return `${sets} × ${reps}${weight ? ` · ${formatKg(weight)} ${t('workout.kg')}` : ''}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  timer: { flex: 1, alignItems: 'center' },
  bottomBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  ltr: { writingDirection: 'ltr', fontFamily: fonts.bold },
  finish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    height: 48,
  },
  restWrap: { paddingHorizontal: space.lg, paddingTop: space.sm },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  chips: { gap: space.sm, paddingBottom: space.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.md,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    maxWidth: 200,
  },
  chipActive: { backgroundColor: colors.primary },
  chipDone: { opacity: 0.85 },
  addChip: { backgroundColor: colors.primarySoft },
  emptyBox: { gap: space.lg, paddingVertical: space.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  navBtn: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  targetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  platesBtn: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  warmup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  setBadge: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  columns: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.sm },
  colHead: { minWidth: 64, textAlign: 'center' },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  noteInput: { flex: 1, minHeight: 40, fontFamily: fonts.regular, fontSize: 15, color: colors.text, textAlignVertical: 'top' },
});
