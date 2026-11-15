import type { ActivePlanExercise } from '@gymapp/shared';
import type { TFunction } from 'i18next';

export function formatPrescription(t: TFunction, ex: Pick<ActivePlanExercise, 'sets' | 'repsMin' | 'repsMax' | 'durationSec'>) {
  if (ex.durationSec !== null) return t('plan.setsSeconds', { sets: ex.sets, seconds: ex.durationSec });
  return t('plan.setsReps', { sets: ex.sets, min: ex.repsMin, max: ex.repsMax });
}

export function formatRest(t: TFunction, restSec: number) {
  if (restSec >= 120 && restSec % 60 === 0) return t('plan.restMin', { minutes: restSec / 60 });
  return t('plan.rest', { seconds: restSec });
}

export function exerciseDisplayName(ex: { nameEn: string; nameAr: string }, language: string) {
  return language === 'ar' ? ex.nameAr : ex.nameEn;
}

/** 75 → "1:15", 3725 → "1:02:05". */
export function formatClock(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(s).padStart(2, '0')}`;
}

/** 62.5 → "62.5", 60 → "60". */
export function formatKg(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return '';
  return String(Math.round(kg * 100) / 100);
}

/** Short date in the app language, e.g. "13 Oct". */
export function formatShortDate(ms: number, language: string): string {
  return new Date(ms).toLocaleDateString(language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}
