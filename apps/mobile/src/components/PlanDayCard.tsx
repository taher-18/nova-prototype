import { Ionicons } from '@expo/vector-icons';
import type { ActivePlanDay } from '@gymapp/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { I18nManager, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export function PlanDayCard({ day, highlight }: { day: ActivePlanDay; highlight?: boolean }) {
  const { t, i18n } = useTranslation();
  const names = day.exercises
    .slice(0, 3)
    .map((e) => (i18n.language === 'ar' ? e.exercise.nameAr : e.exercise.nameEn))
    .join(' · ');

  return (
    <PressableScale
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/plan/[dayIndex]', params: { dayIndex: String(day.dayIndex) } })}
      style={[styles.card, highlight && styles.highlight]}
    >
      <View style={styles.badge}>
        <AppText variant="label" color={highlight ? colors.onPrimary : colors.primary}>
          {day.dayIndex + 1}
        </AppText>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="label">{t(`plan.day.${day.key}` as 'plan.day.push')}</AppText>
        <AppText variant="caption" color={colors.muted} numberOfLines={1}>
          {names}
        </AppText>
        <AppText variant="caption" color={colors.muted}>
          {t('home.exercisesCount', { count: day.exercises.length })}
        </AppText>
      </View>
      <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.muted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  highlight: { backgroundColor: colors.primarySoft, borderWidth: 1.5, borderColor: colors.primary },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
