import type { AuthResponse } from '@gymapp/shared';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../auth/AuthProvider';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Screen } from '../../components/Screen';
import { TextField } from '../../components/TextField';
import { errorKey } from '../../lib/api';
import { onlyDigits } from '../../lib/digits';
import { isValidPassword, PASSWORD_MIN_LENGTH } from '../../lib/validation';
import { colors } from '../../theme';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { api, completeAuth } = useAuth();
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!/^\d{6}$/.test(code)) return setError(t('errors.invalid_reset_code'));
    if (!isValidPassword(password)) return setError(t('errors.passwordTooShort', { min: PASSWORD_MIN_LENGTH }));
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<AuthResponse>(
        '/v1/auth/password/reset',
        { email, code, newPassword: password },
        { auth: false },
      );
      await completeAuth(res);
    } catch (err) {
      setError(t(errorKey(err) as 'errors.unknown'));
      setLoading(false);
    }
  }

  return (
    <Screen edges={['bottom']} footer={<Button title={t('auth.resetPassword')} loading={loading} onPress={onSubmit} />}>
      <AppText variant="title">{t('auth.resetTitle')}</AppText>
      <AppText color={colors.muted}>{t('auth.resetSubtitle', { email })}</AppText>
      <ErrorBanner message={error} />
      <TextField
        label={t('auth.code')}
        value={code}
        onChangeText={(v) => setCode(onlyDigits(v))}
        ltr
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={6}
      />
      <TextField
        label={t('auth.newPassword')}
        value={password}
        onChangeText={setPassword}
        hint={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        ltr
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
    </Screen>
  );
}
