import { exerciseName } from '@gymapp/shared';
import { useEffect, useRef } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/AppText';
import { formatKg } from '../../../lib/format';
import { colors, radius, space } from '../../../theme';
import type { PrEvent } from '../records';

export function prText(t: TFunction, pr: PrEvent) {
  const value = pr.type === 'weight' || pr.type === 'e1rm' ? formatKg(pr.value) : pr.value;
  const previous = pr.type === 'weight' || pr.type === 'e1rm' ? formatKg(pr.previous) : pr.previous;
  const key = ({ weight: 'workout.prWeight', e1rm: 'workout.prE1rm', reps: 'workout.prReps', duration: 'workout.prDuration' } as const)[pr.type];
  return t(key, { value, previous });
}

/** Trophy banner that drops in when a set beats a personal record. */
export function PrCelebration({ prs, onDone }: { prs: PrEvent[]; onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (prs.length === 0) return;
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onDone());
    }, 3500);
    return () => clearTimeout(timer);
  }, [prs, anim, onDone]);

  if (prs.length === 0) return null;
  const pr = prs[0]!;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.overlay,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }, { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] },
      ]}
    >
      <Pressable onPress={onDone} style={styles.card} accessibilityRole="alert">
        <AppText style={styles.trophy}>🏆</AppText>
        <View style={{ flex: 1 }}>
          <AppText variant="label" color={colors.onPrimary}>{t('workout.newPr')}</AppText>
          <AppText variant="caption" color={colors.onPrimary}>
            {exerciseName(pr.exerciseId, i18n.language)} · {prText(t, pr)}
          </AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: space.sm, start: space.lg, end: space.lg, zIndex: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.gold,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  trophy: { fontSize: 36, lineHeight: 44 },
});
