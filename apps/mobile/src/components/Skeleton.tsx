import { useEffect } from 'react';
import { Animated, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, space } from '../theme';

/** Shared pulse so every skeleton on screen breathes together. */
const pulse = new Animated.Value(0.5);
let running = false;
function startPulse() {
  if (running) return;
  running = true;
  Animated.loop(
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
    ]),
  ).start();
}

interface BlockProps {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}

/** Grey placeholder in the shape of content that is still loading. */
export function SkeletonBlock({ width = '100%', height = 16, rounded = radius.sm, style }: BlockProps) {
  useEffect(startPulse, []);
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.skeleton, opacity: pulse }, style]}
    />
  );
}

/** Placeholder for a list of cards (plan days, workouts…). */
export function SkeletonCards({ count = 3, height = 76 }: { count?: number; height?: number }) {
  return (
    <View style={{ gap: space.md }} accessibilityLabel="Loading" accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.card, { height }]}>
          <SkeletonBlock width={44} height={44} rounded={22} />
          <View style={{ flex: 1, gap: space.sm }}>
            <SkeletonBlock width="60%" height={16} />
            <SkeletonBlock width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Placeholder for a hero card at the top of a screen. */
export function SkeletonHero() {
  return (
    <View style={[styles.card, styles.hero]}>
      <SkeletonBlock width="30%" height={12} />
      <SkeletonBlock width="70%" height={26} />
      <SkeletonBlock width="45%" height={14} />
      <SkeletonBlock height={48} rounded={radius.md} style={{ marginTop: space.sm }} />
    </View>
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
  hero: { flexDirection: 'column', alignItems: 'stretch', gap: space.sm, height: undefined },
});
