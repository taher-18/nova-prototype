import * as SecureStore from 'expo-secure-store';

/** Small key/value values. SecureStore is encrypted (Keychain / Keystore). */
export const storage = {
  get: (key: string) => SecureStore.getItemAsync(key),
  set: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  remove: (key: string) => SecureStore.deleteItemAsync(key),
};

export const KEYS = {
  language: 'language',
  /** Set just before reloading to apply a layout direction. */
  directionReload: 'language.directionReload',
  tokens: 'auth.tokens',
  user: 'auth.user',
} as const;
