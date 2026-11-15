import { APP_NAME } from '@gymapp/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../components/AppText';
import { OptionCard } from '../components/OptionCard';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { type AppLanguage } from '../i18n';
import { changeLanguage, currentLanguage } from '../i18n/language';
import { colors, space } from '../theme';
import { useLanguageChoice } from '../i18n/LanguageChoice';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const { markChosen } = useLanguageChoice();
  const [selected, setSelected] = useState<AppLanguage>(currentLanguage());
  const [busy, setBusy] = useState(false);

  async function confirm() {
    setBusy(true);
    // May reload the app to switch between left-to-right and right-to-left.
    await changeLanguage(selected);
    markChosen();
  }

  return (
    <Screen footer={<Button title={t('common.continue')} loading={busy} onPress={confirm} />}>
      <View style={styles.hero}>
        <AppText variant="display" color={colors.primary}>{APP_NAME}</AppText>
        <AppText variant="title">{t('language.title')}</AppText>
        <AppText color={colors.muted}>{t('language.subtitle')}</AppText>
      </View>
      <OptionCard title="العربية" description="Arabic" selected={selected === 'ar'} onPress={() => setSelected('ar')} />
      <OptionCard title="English" description="الإنجليزية" selected={selected === 'en'} onPress={() => setSelected('en')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: space.sm, marginTop: space.xxl, marginBottom: space.lg },
});
