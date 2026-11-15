import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';
import { colors, radius, space } from '../theme';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  loading?: boolean;
}

const bg: Record<Variant, string> = {
  primary: colors.primary,
  secondary: colors.surfaceAlt,
  ghost: 'transparent',
  danger: colors.danger,
};
const fg: Record<Variant, string> = {
  primary: colors.onPrimary,
  secondary: colors.text,
  ghost: colors.primary,
  danger: colors.onPrimary,
};

export function Button({ title, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      style={(state) => [
        styles.base,
        { backgroundColor: bg[variant], opacity: inactive ? 0.5 : state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? <ActivityIndicator color={fg[variant]} /> : <AppText variant="label" color={fg[variant]}>{title}</AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
