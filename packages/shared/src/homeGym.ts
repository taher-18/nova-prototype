import { z } from 'zod';

/**
 * The gym a member says they train at, typed by the member (optional).
 * Nova uses it to see which gyms already have members on the app, before
 * any gym signs up. It is not a gym membership.
 */

export const HOME_GYM_MAX = 80;

export const homeGymNameSchema = z.string().trim().min(2).max(HOME_GYM_MAX);

/** `null` clears it ("I train at home" / prefer not to say). */
export const setHomeGymSchema = z.object({ name: homeGymNameSchema.nullable() });

export interface HomeGymSuggestion {
  name: string;
  members: number;
}

/** Members needed before a gym name is suggested to others (keeps typos and junk out). */
export const SUGGEST_MIN_MEMBERS = 3;

/**
 * Turns the many spellings of one gym into one key:
 * "Gold's  Gym", "golds gym" and "GOLDS-GYM" match, and common Arabic
 * spelling variants (أ/إ/آ, ة/ه, ى/ي, tatweel, diacritics) match too.
 */
export function normalizeGymName(name: string): string {
  return name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ْـ]/g, '') // Arabic diacritics and tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/['’`]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
