import { Ionicons } from '@expo/vector-icons';
import { APP_NAME } from '@gymapp/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { Screen } from '../../components/Screen';
import { colors, space } from '../../theme';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  return (
    <Screen
      scroll={false}
      footer={
        <>
          <Button title={t('welcome.getStarted')} onPress={() => router.push('/signup')} />
          <Button title={t('welcome.haveAccount')} variant="secondary" onPress={() => router.push('/login')} />
        </>
      }
    >
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Ionicons name="barbell" size={56} color={colors.onPrimary} />
        </View>
        <AppText variant="display" center>{APP_NAME}</AppText>
        <AppText variant="heading" center color={colors.muted}>{t('welcome.tagline')}</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
});
