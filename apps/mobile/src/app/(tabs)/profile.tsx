import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, I18nManager, Pressable, StyleSheet, View } from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { AppText } from '../../components/AppText';
import { Avatar } from '../../components/Avatar';
import { Chip } from '../../components/Chip';
import { Screen } from '../../components/Screen';
import { APP_VERSION } from '../../config';
import type { AppLanguage } from '../../i18n';
import { changeLanguage, currentLanguage, reloadApp } from '../../i18n/language';
import { saveReminderSettings, useReminderSettings } from '../../features/reminders/reminders';
import { useSchedule } from '../../features/schedule/useSchedule';
import { NOTIFICATIONS, PROTOTYPE } from '../../prototype/config';
import { testerId } from '../../prototype/tracking';
import { colors, radius, saveThemeName, space, themeName, type ThemeName } from '../../theme';

const REMINDER_HOURS = [7, 12, 17, 19, 21];

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, api, setUser, logout } = useAuth();
  const [language, setLanguage] = useState(currentLanguage());
  const reminders = useReminderSettings();
  const schedule = useSchedule();

  function pickTheme(name: ThemeName) {
    if (name === themeName) return;
    saveThemeName(name);
    void reloadApp(); // colours are applied at startup
  }

  // ReminderSync reschedules as soon as the settings change.
  const updateReminders = saveReminderSettings;

  const trainingDays = [6, 0, 1, 2, 3, 4, 5]
    .filter((d) => schedule.data?.trainingDays.includes(d))
    .map((d) => t(`weekdays.${d}` as 'weekdays.0'))
    .join(' · ');

  async function pickLanguage(lng: AppLanguage) {
    if (lng === language) return;
    setLanguage(lng);
    // Keep emails from the server in the same language (best effort when offline).
    try {
      await setUser(await api.patch('/v1/me', { locale: lng }));
    } catch {}
    await changeLanguage(lng);
  }

  function retakeQuiz() {
    Alert.alert(t('profile.retakeQuiz'), t('profile.retakeConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.continue'), onPress: () => router.push('/retake-quiz') },
    ]);
  }

  return (
    <Screen edges={['top']}>
      <AppText variant="title">{t('profile.title')}</AppText>
      <Pressable style={[styles.card, styles.userCard]} onPress={() => router.push('/profile/edit')} accessibilityRole="button">
        <Avatar url={user?.avatarUrl} name={user?.displayName} email={user?.email} size={64} />
        <View style={{ flex: 1, gap: 2 }}>
          {user?.displayName ? <AppText variant="heading">{user.displayName}</AppText> : null}
          <AppText color={colors.muted}>
            {PROTOTYPE ? (testerId() ? t('history.tester', { id: testerId() }) : t('history.testerUnknown')) : user?.email}
          </AppText>
          <AppText variant="caption" color={colors.primary}>{t('profile.editProfile')}</AppText>
        </View>
      </Pressable>

      <View style={{ gap: space.sm }}>
        <AppText variant="label">{t('profile.language')}</AppText>
        <View style={styles.chips}>
          <Chip label="العربية" selected={language === 'ar'} onPress={() => void pickLanguage('ar')} />
          <Chip label="English" selected={language === 'en'} onPress={() => void pickLanguage('en')} />
        </View>
      </View>

      <View style={{ gap: space.sm }}>
        <AppText variant="label">{t('appearance.title')}</AppText>
        <View style={styles.chips}>
          <Chip label={t('appearance.dark')} selected={themeName === 'dark'} onPress={() => pickTheme('dark')} />
          <Chip label={t('appearance.light')} selected={themeName === 'light'} onPress={() => pickTheme('light')} />
        </View>
      </View>

      {NOTIFICATIONS ? (
      <View style={{ gap: space.sm }}>
        <AppText variant="label">{t('reminders.settingsTitle')}</AppText>
        <View style={styles.chips}>
          <Chip label={t('reminders.on')} selected={reminders.enabled} onPress={() => updateReminders({ ...reminders, enabled: true })} />
          <Chip label={t('reminders.off')} selected={!reminders.enabled} onPress={() => updateReminders({ ...reminders, enabled: false })} />
        </View>
        {reminders.enabled ? (
          <>
            <AppText variant="caption" color={colors.muted}>{t('reminders.time')}</AppText>
            <View style={styles.chips}>
              {REMINDER_HOURS.map((h) => (
                <Chip
                  key={h}
                  label={`${String(h).padStart(2, '0')}:00`}
                  selected={reminders.hour === h && reminders.minute === 0}
                  onPress={() => updateReminders({ ...reminders, hour: h, minute: 0 })}
                />
              ))}
            </View>
            <AppText variant="caption" color={colors.muted}>{t('reminders.missedToggle')}</AppText>
            <View style={styles.chips}>
              <Chip label={t('reminders.on')} selected={reminders.missed} onPress={() => updateReminders({ ...reminders, missed: true })} />
              <Chip label={t('reminders.off')} selected={!reminders.missed} onPress={() => updateReminders({ ...reminders, missed: false })} />
            </View>
          </>
        ) : null}
      </View>
      ) : null}

      <View style={styles.list}>
        <Row
          icon="calendar-outline"
          label={t('scheduleEdit.edit')}
          detail={trainingDays || undefined}
          onPress={() => router.push('/schedule/edit')}
        />
        <Row icon="refresh" label={t('profile.retakeQuiz')} onPress={retakeQuiz} />
        {/* Prototype mode has no account to sign out of or delete. */}
        {PROTOTYPE ? null : (
          <>
            <Row icon="log-out-outline" label={t('profile.logout')} onPress={() => void logout()} />
            <Row icon="trash-outline" label={t('profile.deleteAccount')} danger onPress={() => router.push('/delete-account')} />
          </>
        )}
      </View>

      <AppText variant="caption" color={colors.muted} center>
        {t('profile.version', { version: APP_VERSION })}
      </AppText>
    </Screen>
  );
}

function Row({
  icon,
  label,
  detail,
  onPress,
  danger,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={22} color={color} />
      <View style={{ flex: 1 }}>
        <AppText variant="label" color={color}>{label}</AppText>
        {detail ? <AppText variant="caption" color={colors.muted}>{detail}</AppText> : null}
      </View>
      <Ionicons name={I18nManager.isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.surface, gap: 2 },
  userCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  list: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, minHeight: 56 },
});
