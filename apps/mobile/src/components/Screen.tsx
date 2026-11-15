import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors, space } from '../theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Pinned below the content (e.g. the main button). */
  footer?: ReactNode;
  edges?: Edge[];
}

export function Screen({ children, scroll = true, footer, edges = ['top', 'bottom'] }: ScreenProps) {
  const body = scroll ? (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {body}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  fill: { flex: 1 },
  content: { padding: space.xl, gap: space.lg, flexGrow: 1 },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.lg, paddingTop: space.sm, gap: space.sm },
});
