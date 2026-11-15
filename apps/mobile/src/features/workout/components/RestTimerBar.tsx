import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../../../components/AppText';
import { formatClock } from '../../../lib/format';
import { colors, radius, space } from '../../../theme';

interface Props {
  remainingSec: number;
  totalSec: number;
  onAdjust: (deltaSec: number) => void;
  onSkip: () => void;
}

/** Rest countdown with −15s / +15s / skip, pinned above the set list. */
export function RestTimerBar({ remainingSec, totalSec, onAdjust, onSkip }: Props) {
  const { t } = useTranslation();
  const progress = totalSec > 0 ? Math.min(1, remainingSec / totalSec) : 0;
  return (
    <View style={styles.wrap} accessibilityRole="timer" accessibilityLabel={`${t('workout.rest')} ${formatClock(remainingSec)}`}>
      <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      <View style={styles.row}>
        <Button label="−15" onPress={() => onAdjust(-15)} />
        <View style={styles.center}>
          <AppText variant="caption" color={colors.onPrimary}>{t('workout.rest')}</AppText>
          <AppText variant="title" color={colors.onPrimary} style={styles.clock}>
            {formatClock(remainingSec)}
          </AppText>
        </View>
        <Button label="+15" onPress={() => onAdjust(15)} />
        <Button label={t('workout.skip')} onPress={onSkip} wide />
      </View>
    </View>
  );
}

function Button({ label, onPress, wide }: { label: string; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.button, wide && styles.wide, pressed && { opacity: 0.7 }]}
    >
      <AppText variant="label" color={colors.onPrimary}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.primaryDark, borderRadius: radius.lg, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, bottom: 0, start: 0, backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center', padding: space.sm, gap: space.sm },
  center: { flex: 1, alignItems: 'center' },
  clock: { writingDirection: 'ltr' },
  button: {
    minWidth: 56,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  wide: { minWidth: 64 },
});
