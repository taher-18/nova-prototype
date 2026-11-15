import kv from '../web/kvStore';

/** Web: small values in localStorage (SecureStore is phone-only). */
export const storage = {
  get: async (key: string) => kv.getItemSync(key),
  set: async (key: string, value: string) => kv.setItemSync(key, value),
  remove: async (key: string) => kv.removeItemSync(key),
};

export const KEYS = {
  language: 'language',
  /** Set just before reloading to apply a layout direction. */
  directionReload: 'language.directionReload',
  tokens: 'auth.tokens',
  user: 'auth.user',
} as const;
