import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.surface, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
});
