import { router } from 'expo-router';
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

export default function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!isValidEmail(email) || !password) {
      setError(t('errors.invalid_credentials'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(t(errorKey(err) as 'errors.unknown'));
      setLoading(false);
    }
  }

  return (
    <Screen edges={['bottom']} footer={<Button title={t('auth.login')} loading={loading} onPress={onSubmit} />}>
      <AppText variant="title">{t('auth.loginTitle')}</AppText>
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
      />
      <TextField
        label={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        ltr
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={onSubmit}
      />
      <Button
        title={t('auth.forgotPassword')}
        variant="ghost"
        onPress={() => router.push({ pathname: '/forgot-password', params: { email } })}
      />
      <Button title={t('auth.noAccount')} variant="ghost" onPress={() => router.replace('/signup')} />
    </Screen>
  );
}
