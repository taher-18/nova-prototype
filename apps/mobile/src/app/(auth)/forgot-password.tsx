import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthProvider';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { errorKey } from '../../lib/api';
import { isValidEmail } from '../../lib/validation';
import { colors } from '../../theme';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { api } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!isValidEmail(email)) return setError(t('errors.invalidEmail'));
    setLoading(true);
    setError(null);
    try {
      await api.post('/v1/auth/password/forgot', { email }, { auth: false });
      router.push({ pathname: '/reset-password', params: { email: email.trim().toLowerCase() } });
    } catch (err) {
      setError(t(errorKey(err) as 'errors.unknown'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen edges={['bottom']} footer={<Button title={t('auth.sendCode')} loading={loading} onPress={onSubmit} />}>
      <AppText variant="title">{t('auth.forgotTitle')}</AppText>
      <AppText color={colors.muted}>{t('auth.forgotSubtitle')}</AppText>
      <ErrorBanner message={error} />
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        ltr
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        onSubmitEditing={onSubmit}
      />
    </Screen>
  );
}
