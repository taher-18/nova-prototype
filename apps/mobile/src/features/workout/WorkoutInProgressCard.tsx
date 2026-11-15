import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { formatClock } from '../../lib/format';
import { useNow } from '../../lib/useNow';
import { colors, radius, space } from '../../theme';
import { useActiveWorkout } from './ActiveWorkoutProvider';

/** "Workout in progress — Resume" card, shown on Home and the Workout tab. */
export function WorkoutInProgressCard() {
  const { t } = useTranslation();
  const { workout } = useActiveWorkout();
  const now = useNow(1000);
  if (!workout) return null;
  return (
    <Pressable onPress={() => router.push('/session/active')} style={styles.card} accessibilityRole="button">
      <View style={styles.icon}>
        <Ionicons name="play" size={22} color={colors.onPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label" color={colors.onPrimary}>{t('workout.inProgress')}</AppText>
        <AppText variant="caption" color={colors.onPrimary}>
          {t('workout.elapsed', { time: formatClock((now - workout.startedAt) / 1000) })}
        </AppText>
      </View>
      <AppText variant="label" color={colors.onPrimary}>{t('workout.resume')}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.success,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
