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
import { isValidEmail, isValidPassword, PASSWORD_MIN_LENGTH } from '../../lib/validation';
import { colors } from '../../theme';

export default function SignupScreen() {
  const { t } = useTranslation();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = submitted && !isValidEmail(email) ? t('errors.invalidEmail') : null;
  const passwordError =
    submitted && !isValidPassword(password) ? t('errors.passwordTooShort', { min: PASSWORD_MIN_LENGTH }) : null;

  async function onSubmit() {
    setSubmitted(true);
    if (!isValidEmail(email) || !isValidPassword(password)) return;
    setLoading(true);
    setError(null);
    try {
      await signup({ email, password, displayName: name.trim() || undefined });
      // The navigator moves to onboarding once signed in.
    } catch (err) {
      setError(t(errorKey(err) as 'errors.unknown'));
      setLoading(false);
    }
  }

  return (
    <Screen
      edges={['bottom']}
      footer={
        <>
          <Button title={t('auth.signup')} loading={loading} onPress={onSubmit} />
          <AppText variant="caption" color={colors.muted} center>{t('auth.terms')}</AppText>
        </>
      }
    >
      <AppText variant="title">{t('auth.signupTitle')}</AppText>
      <ErrorBanner message={error} />
      <TextField
        label={`${t('auth.name')} (${t('common.optional')})`}
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        maxLength={60}
      />
      <TextField
        label={t('auth.email')}
        value={email}
        onChangeText={setEmail}
        error={emailError}
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
        error={passwordError}
        hint={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
        ltr
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={onSubmit}
      />
      <Button title={t('welcome.haveAccount')} variant="ghost" onPress={() => router.replace('/login')} />
    </Screen>
  );
}
