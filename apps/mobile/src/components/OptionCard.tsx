import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { AppText } from './AppText';

interface OptionCardProps {
  title: string;
  description?: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  selected: boolean;
  onPress: () => void;
}

export function OptionCard({ title, description, icon, selected, onPress }: OptionCardProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && styles.selected,
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon ? (
        <View style={[styles.icon, selected && { backgroundColor: colors.primary }]}>
          <Ionicons name={icon} size={22} color={selected ? colors.onPrimary : colors.primary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="label">{title}</AppText>
        {description ? <AppText variant="caption" color={colors.muted}>{description}</AppText> : null}
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={22}
        color={selected ? colors.primary : colors.border}
      />
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
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  text: { flex: 1, gap: 2 },
});
