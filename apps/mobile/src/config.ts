import Constants from 'expo-constants';

/**
 * API base URL.
 * - Set EXPO_PUBLIC_API_URL for builds (e.g. https://api.example.com).
 * - In development it defaults to the computer running Metro on port 3000,
 *   so a phone on the same Wi-Fi reaches the local API automatically.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:3000`;
}

export const API_URL = resolveApiUrl();
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
