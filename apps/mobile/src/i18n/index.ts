import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from './ar';
import en from './en';

export const LANGUAGES = ['en', 'ar'] as const;
export type AppLanguage = (typeof LANGUAGES)[number];

export const isRTLLanguage = (lng: string) => lng === 'ar';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}

export function initI18n(lng: AppLanguage) {
  if (i18n.isInitialized) return i18n.changeLanguage(lng);
  return i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
