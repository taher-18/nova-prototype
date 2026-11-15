import { StyleSheet, Text, type TextProps } from 'react-native';
import { colors, fonts } from '../theme';

type Variant = 'display' | 'stat' | 'title' | 'heading' | 'body' | 'label' | 'caption';

const variants = StyleSheet.create({
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 44 },
  /** Big numbers (timers, stats). */
  stat: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 44 },
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 36 },
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 28 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 },
});

export interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

export function AppText({ variant = 'body', color = colors.text, center, style, ...rest }: AppTextProps) {
  return (
    <Text
      style={[variants[variant], { color }, center && { textAlign: 'center' }, style]}
      {...rest}
    />
  );
}
