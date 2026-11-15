import { StyleSheet, View } from 'react-native';
import { colors, radius, space } from '../theme';
import { AppText } from './AppText';

export function ErrorBanner({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <AppText variant="caption" color={colors.danger}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.dangerSoft, borderRadius: radius.sm, padding: space.md },
});
