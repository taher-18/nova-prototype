import { Pressable, StyleSheet } from 'react-native';
import { colors, radius, space } from '../theme';
import { AppText } from './AppText';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <AppText variant="label" color={selected ? colors.onPrimary : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: 56,
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
});
