import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { PlanDayCard } from '../../components/PlanDayCard';
import { QueryState } from '../../components/QueryState';
import { Screen } from '../../components/Screen';
import { useActivePlan } from '../../features/plan/usePlan';
import { ApiError } from '../../lib/api';
import { colors } from '../../theme';

export default function PlanScreen() {
  const { t } = useTranslation();
  const plan = useActivePlan();
  const noPlan = plan.error instanceof ApiError && plan.error.code === 'no_active_plan';

  return (
    <Screen edges={['top']}>
      <AppText variant="title">{t('plan.title')}</AppText>
      <Button title={t('library.browse')} variant="secondary" onPress={() => router.push('/exercises')} />
      <Button title={t('scheduleEdit.edit')} variant="ghost" onPress={() => router.push('/schedule/edit')} />
      {noPlan ? (
        <>
          <AppText color={colors.muted}>{t('plan.noPlan')}</AppText>
          <Button title={t('plan.createPlan')} onPress={() => router.push('/retake-quiz')} />
        </>
      ) : (
        <QueryState isPending={plan.isPending} error={plan.error} onRetry={() => plan.refetch()} />
      )}
      {plan.data ? (
        <>
          <AppText variant="caption" color={colors.muted}>
            {t('home.planSummary', { days: plan.data.daysPerWeek, goal: t(`onboarding.goal.${plan.data.goal}`) })}
          </AppText>
          {plan.data.days.map((day) => (
            <PlanDayCard key={day.id} day={day} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}
