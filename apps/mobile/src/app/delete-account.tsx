import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/ErrorBanner';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { errorKey } from '../lib/api';
import { useData } from '../sync/DataProvider';
import { colors } from '../theme';

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const { deleteAccount } = useAuth();
  const { wipe } = useData();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setLoading(true);
    setError(null);
    try {
      await deleteAccount(password, wipe);
      Alert.alert(t('deleteAccount.done'));
    } catch (err) {
      setError(t(errorKey(err) as 'errors.unknown'));
      setLoading(false);
    }
  }

  return (
    <Screen
      edges={['bottom']}
      footer={
        <Button
          title={t('deleteAccount.confirm')}
          variant="danger"
          loading={loading}
          disabled={!password}
          onPress={onDelete}
        />
      }
    >
      <AppText variant="title">{t('deleteAccount.title')}</AppText>
      <AppText color={colors.muted}>{t('deleteAccount.body')}</AppText>
      <ErrorBanner message={error} />
      <TextField
        label={t('deleteAccount.confirmPassword')}
        value={password}
        onChangeText={setPassword}
        ltr
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
      />
    </Screen>
  );
}
