import { forwardRef } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radius, space } from '../theme';
import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
  /** Emails, codes and numbers are typed left-to-right even in Arabic (iOS). */
  ltr?: boolean;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, hint, ltr, style, ...rest },
  ref,
) {
  return (
    <View style={styles.wrap}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          error ? { borderColor: colors.danger } : null,
          ltr ? { writingDirection: 'ltr' } : null,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger}>{error}</AppText>
      ) : hint ? (
        <AppText variant="caption" color={colors.muted}>{hint}</AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.inputBg,
  },
});
