import { defaultWeeklyGoal } from '@gymapp/shared';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { useSchedule, useScheduleActions } from '../../features/schedule/useSchedule';
import { WeekdayPicker } from '../../features/schedule/WeekdayPicker';
import { colors } from '../../theme';

export default function EditTrainingDaysScreen() {
  const { t } = useTranslation();
  const schedule = useSchedule();
  const { setTrainingDays } = useScheduleActions();
  const [days, setDays] = useState<number[]>([]);

  useEffect(() => {
    if (schedule.data) setDays(schedule.data.trainingDays);
  }, [schedule.data]);

  async function save() {
    try {
      await setTrainingDays.mutateAsync(days);
      router.back();
    } catch {
      Alert.alert(t('dayScreen.needsConnection'));
    }
  }

  return (
    <Screen
      edges={['bottom']}
      footer={<Button title={t('common.save')} disabled={days.length === 0} loading={setTrainingDays.isPending} onPress={save} />}
    >
      <Stack.Screen options={{ title: t('scheduleEdit.title') }} />
      <AppText color={colors.muted}>{t('scheduleEdit.subtitle')}</AppText>
      <WeekdayPicker value={days} onChange={setDays} />
      {days.length > 0 ? (
        <AppText variant="caption" color={colors.muted} style={styles.hint}>
          {t('scheduleEdit.goalHint', { count: defaultWeeklyGoal(days.length) })}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ hint: { textAlign: 'center' } });
