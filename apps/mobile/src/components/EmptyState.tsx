import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { AppText } from './AppText';
import { Button } from './Button';

interface Props {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  body?: string;
  action?: { label: string; onPress: () => void };
}

/** Friendly placeholder when a list or section has nothing to show yet. */
export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <AppText variant="label" center>{title}</AppText>
      {body ? <AppText variant="caption" color={colors.muted} center>{body}</AppText> : null}
      {action ? <Button title={action.label} variant="secondary" onPress={action.onPress} style={{ alignSelf: 'stretch' }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
});
