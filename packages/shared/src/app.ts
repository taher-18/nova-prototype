import brand from './brand.json';

/**
 * Product name and identifiers come from brand.json, the single place to
 * rename the app (it is also read by apps/mobile/app.config.ts).
 * Store identifiers (bundle id / package) can't change after the first release.
 */
export const APP_NAME: string = brand.name;
export const APP_SLUG: string = brand.slug;
