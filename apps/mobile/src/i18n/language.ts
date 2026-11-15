import { getLocales } from 'expo-localization';
import { reloadAppAsync } from 'expo';
import { Alert, I18nManager, Platform } from 'react-native';
import { KEYS, storage } from '../lib/storage';
import i18n, { initI18n, isRTLLanguage, LANGUAGES, type AppLanguage } from '.';

export function deviceLanguage(): AppLanguage {
  return getLocales()[0]?.languageCode === 'ar' ? 'ar' : 'en';
}

export async function loadSavedLanguage(): Promise<AppLanguage | null> {
  const saved = await storage.get(KEYS.language);
  return LANGUAGES.find((l) => l === saved) ?? null;
}

/**
 * True if the native layout direction doesn't match the language yet.
 * On the web the direction is set on the page instead (no reload needed).
 */
export const needsDirectionChange = (lng: AppLanguage) =>
  Platform.OS !== 'web' && I18nManager.isRTL !== isRTLLanguage(lng);

/** Web: right-to-left comes from the page's dir attribute. */
function applyWebDirection(lng: AppLanguage) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  document.documentElement.dir = isRTLLanguage(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
}

/**
 * Sets the direction flags. They only take effect after the JS app reloads,
 * so callers must call reloadApp() afterwards when needsDirectionChange().
 */
function setDirection(lng: AppLanguage) {
  const rtl = isRTLLanguage(lng);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

/**
 * Restarts the JS app so a new layout direction applies. Uses Expo's reload,
 * which works in Expo Go, development and release builds. (React Native's
 * DevSettings.reload() restarts without Expo Go's native modules and crashes.)
 */
export async function reloadApp() {
  try {
    await reloadAppAsync('Layout direction changed');
  } catch {
    Alert.alert(i18n.t('language.restartTitle'), i18n.t('language.restartBody'));
  }
}

/** Changes, saves and applies the language; reloads if the direction flips. */
export async function changeLanguage(lng: AppLanguage) {
  await storage.set(KEYS.language, lng);
  await initI18n(lng);
  applyWebDirection(lng);
  if (needsDirectionChange(lng)) {
    setDirection(lng);
    await storage.set(KEYS.directionReload, lng);
    await reloadApp();
  }
}

/**
 * Called once at startup. Returns whether the user has picked a language yet.
 * If the saved language needs the other direction, fixes it and reloads.
 */
export async function bootstrapLanguage(): Promise<{ chosen: boolean; reloading: boolean }> {
  const saved = await loadSavedLanguage();
  const lng = saved ?? deviceLanguage();
  await initI18n(lng);
  applyWebDirection(lng);
  const alreadyReloaded = (await storage.get(KEYS.directionReload)) === saved;
  await storage.remove(KEYS.directionReload);
  if (saved && needsDirectionChange(saved)) {
    setDirection(saved);
    // Reload at most once per change, so a reload that can't apply the
    // direction never turns into a crash/reload loop.
    if (!alreadyReloaded) {
      await storage.set(KEYS.directionReload, saved);
      await reloadApp();
      return { chosen: true, reloading: true };
    }
  }
  return { chosen: saved !== null, reloading: false };
}

export const currentLanguage = (): AppLanguage => (i18n.language === 'ar' ? 'ar' : 'en');
