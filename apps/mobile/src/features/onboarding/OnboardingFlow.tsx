import { Ionicons } from '@expo/vector-icons';
import {
  defaultTrainingDays,
  EQUIPMENT_SETUPS,
  EXPERIENCE_LEVELS,
  GENDERS,
  GOALS,
  onboardingSchema,
  SESSION_MINUTES,
  type OnboardingAnswers,
  type PublicUser,
} from '@gymapp/shared';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { ErrorBanner } from '../../components/ErrorBanner';
import { OptionCard } from '../../components/OptionCard';
import { ProgressBar } from '../../components/ProgressBar';
import { Screen } from '../../components/Screen';
import { SkeletonCards } from '../../components/Skeleton';
import { TextField } from '../../components/TextField';
import { errorKey } from '../../lib/api';
import { parseUserNumber } from '../../lib/digits';
import { colors, space } from '../../theme';
import { HomeGymField, homeGymValue } from '../homeGym/HomeGymField';
import { useActivePlan } from '../plan/usePlan';
import { WeekdayPicker } from '../schedule/WeekdayPicker';

type IconName = ComponentProps<typeof Ionicons>['name'];
type Draft = Partial<Omit<OnboardingAnswers, 'birthYear' | 'heightCm' | 'weightKg' | 'homeGym'>>;
type BodyFields = { birthYear: string; heightCm: string; weightKg: string };

const STEPS = ['gender', 'goal', 'experience', 'equipment', 'schedule', 'gym', 'body'] as const;

const GENDER_ICONS: Record<(typeof GENDERS)[number], IconName> = {
  male: 'male',
  female: 'female',
  prefer_not_to_say: 'person',
};
const GOAL_ICONS: Record<(typeof GOALS)[number], IconName> = {
  lose_fat: 'flame',
  build_muscle: 'barbell',
  get_stronger: 'trophy',
  general_fitness: 'heart',
};
const EXPERIENCE_ICONS: Record<(typeof EXPERIENCE_LEVELS)[number], IconName> = {
  beginner: 'leaf',
  intermediate: 'trending-up',
  advanced: 'rocket',
};
const EQUIPMENT_ICONS: Record<(typeof EQUIPMENT_SETUPS)[number], IconName> = {
  full_gym: 'business',
  dumbbells: 'home',
  bodyweight: 'body',
};

interface Props {
  /** Called after the member taps "Let's go" on the ready screen. */
  onDone: (user: PublicUser) => void;
  /** Leaves the flow from the first step (only when retaking the quiz). */
  onExit?: () => void;
  initial?: Partial<OnboardingAnswers>;
}

export function OnboardingFlow({ onDone, onExit, initial }: Props) {
  const { t } = useTranslation();
  const { saveOnboarding } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => {
    const d: Draft = { daysPerWeek: 3, sessionMinutes: 60, ...initial };
    const days =
      d.trainingDays && d.trainingDays.length === d.daysPerWeek ? d.trainingDays : defaultTrainingDays(d.daysPerWeek ?? 3);
    return { ...d, trainingDays: days, daysPerWeek: days.length };
  });
  const [body, setBody] = useState<BodyFields>({
    birthYear: initial?.birthYear?.toString() ?? '',
    heightCm: initial?.heightCm?.toString() ?? '',
    weightKg: initial?.weightKg?.toString() ?? '',
  });
  const [gymText, setGymText] = useState(initial?.homeGym ?? '');
  const [gymError, setGymError] = useState(false);
  const [bodyErrors, setBodyErrors] = useState<Partial<Record<keyof BodyFields, boolean>>>({});
  const [phase, setPhase] = useState<'quiz' | 'saving' | 'ready'>('quiz');
  const [error, setError] = useState<string | null>(null);
  const [savedUser, setSavedUser] = useState<PublicUser | null>(null);

  const current = STEPS[step]!;
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const canContinue =
    (current === 'gender' && !!draft.gender) ||
    (current === 'goal' && !!draft.goal) ||
    (current === 'experience' && !!draft.experience) ||
    (current === 'equipment' && !!draft.equipment) ||
    (current === 'schedule' && (draft.trainingDays?.length ?? 0) >= 2 && !!draft.sessionMinutes) ||
    current === 'gym' ||
    current === 'body';

  async function submit(includeBody: boolean) {
    const extras = includeBody
      ? {
          birthYear: parseUserNumber(body.birthYear),
          heightCm: parseUserNumber(body.heightCm),
          weightKg: parseUserNumber(body.weightKg),
        }
      : {};
    const gym = homeGymValue(gymText);
    // Empty: clear it only if one was saved before (retaking the quiz).
    const homeGym = gym === 'invalid' ? undefined : gym ?? (initial?.homeGym ? null : undefined);
    const parsed = onboardingSchema.safeParse({ ...draft, ...extras, homeGym });
    if (!parsed.success) {
      const bad = new Set(parsed.error.issues.map((i) => String(i.path[0])));
      setBodyErrors({ birthYear: bad.has('birthYear'), heightCm: bad.has('heightCm'), weightKg: bad.has('weightKg') });
      return;
    }
    setBodyErrors({});
    setError(null);
    setPhase('saving');
    try {
      setSavedUser(await saveOnboarding(parsed.data));
      setPhase('ready');
    } catch (err) {
      setError(t(errorKey(err) as 'errors.unknown'));
      setPhase('quiz');
    }
  }

  function next() {
    if (current === 'body') return void submit(true);
    if (current === 'gym' && homeGymValue(gymText) === 'invalid') return setGymError(true);
    setGymError(false);
    setStep((s) => s + 1);
  }

  function back() {
    if (step === 0) onExit?.();
    else setStep((s) => s - 1);
  }

  if (phase === 'saving') {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText variant="heading" center>{t('onboarding.building')}</AppText>
        </View>
      </Screen>
    );
  }

  if (phase === 'ready' && savedUser) {
    return <ReadyView onStart={() => onDone(savedUser)} />;
  }

  const showBack = step > 0 || !!onExit;

  return (
    <Screen
      footer={
        <>
          <ErrorBanner message={error} />
          <Button title={t('common.continue')} disabled={!canContinue} onPress={next} />
          {current === 'body' ? (
            <Button title={t('common.skip')} variant="ghost" onPress={() => void submit(false)} />
          ) : null}
          {current === 'gym' ? (
            <Button
              title={t('common.skip')}
              variant="ghost"
              onPress={() => {
                setGymText('');
                setGymError(false);
                setStep((s) => s + 1);
              }}
            />
          ) : null}
        </>
      }
    >
      <View style={styles.header}>
        {showBack ? (
          <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('common.back')}>
            <Ionicons name={I18nManager.isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.text} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1, gap: space.xs }}>
          <AppText variant="caption" color={colors.muted}>
            {t('onboarding.stepOf', { step: step + 1, total: STEPS.length })}
          </AppText>
          <ProgressBar value={(step + 1) / STEPS.length} />
        </View>
      </View>

      {current === 'gender' && (
        <Step title={t('onboarding.gender.title')} subtitle={t('onboarding.gender.subtitle')}>
          {GENDERS.map((g) => (
            <OptionCard
              key={g}
              title={t(`onboarding.gender.${g}`)}
              icon={GENDER_ICONS[g]}
              selected={draft.gender === g}
              onPress={() => set('gender', g)}
            />
          ))}
        </Step>
      )}

      {current === 'goal' && (
        <Step title={t('onboarding.goal.title')}>
          {GOALS.map((g) => (
            <OptionCard
              key={g}
              title={t(`onboarding.goal.${g}`)}
              description={t(`onboarding.goal.${g}_desc`)}
              icon={GOAL_ICONS[g]}
              selected={draft.goal === g}
              onPress={() => set('goal', g)}
            />
          ))}
        </Step>
      )}

      {current === 'experience' && (
        <Step title={t('onboarding.experience.title')}>
          {EXPERIENCE_LEVELS.map((lvl) => (
            <OptionCard
              key={lvl}
              title={t(`onboarding.experience.${lvl}`)}
              description={t(`onboarding.experience.${lvl}_desc`)}
              icon={EXPERIENCE_ICONS[lvl]}
              selected={draft.experience === lvl}
              onPress={() => set('experience', lvl)}
            />
          ))}
        </Step>
      )}

      {current === 'equipment' && (
        <Step title={t('onboarding.equipment.title')}>
          {EQUIPMENT_SETUPS.map((eq) => (
            <OptionCard
              key={eq}
              title={t(`onboarding.equipment.${eq}`)}
              description={t(`onboarding.equipment.${eq}_desc`)}
              icon={EQUIPMENT_ICONS[eq]}
              selected={draft.equipment === eq}
              onPress={() => set('equipment', eq)}
            />
          ))}
        </Step>
      )}

      {current === 'schedule' && (
        <Step title={t('onboarding.schedule.title')}>
          <AppText variant="label">{t('onboarding.schedule.pickDays')}</AppText>
          <WeekdayPicker
            value={draft.trainingDays ?? []}
            max={6}
            onChange={(days) => setDraft((d) => ({ ...d, trainingDays: days, daysPerWeek: days.length }))}
          />
          <AppText variant="caption" color={colors.muted}>
            {(draft.trainingDays?.length ?? 0) < 2
              ? t('onboarding.schedule.pickAtLeast')
              : t('onboarding.schedule.daysCount', { count: draft.trainingDays?.length ?? 0 })}
          </AppText>
          <AppText variant="label" style={{ marginTop: space.md }}>
            {t('onboarding.schedule.sessionLength')}
          </AppText>
          <View style={styles.chips}>
            {SESSION_MINUTES.map((m) => (
              <Chip
                key={m}
                label={t('onboarding.schedule.minutes', { count: m })}
                selected={draft.sessionMinutes === m}
                onPress={() => set('sessionMinutes', m)}
              />
            ))}
          </View>
        </Step>
      )}

      {current === 'gym' && (
        <Step title={t('homeGym.title')} subtitle={t('homeGym.subtitle')}>
          <HomeGymField value={gymText} onChange={setGymText} error={gymError ? t('homeGym.invalid') : null} />
        </Step>
      )}

      {current === 'body' && (
        <Step title={t('onboarding.body.title')} subtitle={t('onboarding.body.subtitle')}>
          {(
            [
              ['birthYear', 'onboarding.body.birthYear', 'number-pad'],
              ['heightCm', 'onboarding.body.height', 'number-pad'],
              ['weightKg', 'onboarding.body.weight', 'decimal-pad'],
            ] as const
          ).map(([key, label, keyboard]) => (
            <TextField
              key={key}
              label={t(label)}
              keyboardType={keyboard}
              ltr
              value={body[key]}
              onChangeText={(v) => setBody((b) => ({ ...b, [key]: v }))}
              error={bodyErrors[key] ? t('onboarding.body.invalid') : null}
              maxLength={key === 'weightKg' ? 5 : 4}
            />
          ))}
        </Step>
      )}
    </Screen>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs, marginBottom: space.sm }}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? <AppText color={colors.muted}>{subtitle}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

function ReadyView({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  const plan = useActivePlan();

  return (
    <Screen footer={<Button title={t('onboarding.letsGo')} onPress={onStart} disabled={!plan.data} />}>
      <View style={styles.readyHero}>
        <View style={styles.readyIcon}>
          <Ionicons name="checkmark" size={40} color={colors.onPrimary} />
        </View>
        <AppText variant="title" center>{t('onboarding.readyTitle')}</AppText>
        {plan.data ? (
          <AppText center color={colors.muted}>
            {t('onboarding.readySubtitle', { days: plan.data.daysPerWeek, minutes: plan.data.sessionMinutes })}
          </AppText>
        ) : null}
      </View>
      {plan.isPending ? <SkeletonCards count={3} height={64} /> : null}
      {plan.isError ? <Button title={t('common.retry')} variant="secondary" onPress={() => plan.refetch()} /> : null}
      {plan.data?.days.map((day) => (
        <View key={day.id} style={styles.readyDay}>
          <AppText variant="label">
            {t('plan.dayN', { n: day.dayIndex + 1 })} · {t(`plan.day.${day.key}` as 'plan.day.push')}
          </AppText>
          <AppText variant="caption" color={colors.muted}>
            {t('home.exercisesCount', { count: day.exercises.length })}
          </AppText>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  readyHero: { alignItems: 'center', gap: space.sm, marginTop: space.xl },
  readyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  readyDay: {
    padding: space.lg,
    borderRadius: 12,
    backgroundColor: colors.surface,
    gap: 2,
  },
});
