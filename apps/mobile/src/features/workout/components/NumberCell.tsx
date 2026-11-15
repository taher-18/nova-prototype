import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { parseUserNumber } from '../../../lib/digits';
import { formatKg } from '../../../lib/format';
import { colors, fonts, radius } from '../../../theme';

interface Props {
  value: number | null;
  onChange: (value: number | null) => void;
  decimal?: boolean;
  placeholder?: string;
  done?: boolean;
  accessibilityLabel: string;
}

/** Compact number input for a set row. Accepts Arabic digits. */
export function NumberCell({ value, onChange, decimal, placeholder, done, accessibilityLabel }: Props) {
  const [text, setText] = useState(formatKg(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(formatKg(value));
  }, [value]);

  function commit(raw: string) {
    const n = parseUserNumber(raw);
    const clean = n === undefined ? null : decimal ? Math.round(n * 100) / 100 : Math.round(n);
    if (clean !== value) onChange(clean);
  }

  return (
    <TextInput
      value={text}
      onChangeText={(t) => {
        setText(t);
        commit(t);
      }}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setText(formatKg(value));
      }}
      keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      selectTextOnFocus
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      maxLength={6}
      accessibilityLabel={accessibilityLabel}
      style={[styles.input, done && styles.done]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minWidth: 64,
    height: 48,
    borderRadius: radius.sm,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    writingDirection: 'ltr',
  },
  done: { backgroundColor: 'transparent', borderColor: 'transparent' },
});
