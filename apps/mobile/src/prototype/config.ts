/**
 * Prototype mode (EXPO_PUBLIC_PROTOTYPE=1): no backend and no login. The app
 * talks to a local stand-in for the API (localServer.ts) that keeps the
 * profile, plan and schedule on the device. Workouts already live in the
 * on-device database. Without the flag the app behaves exactly as before.
 */
import { Platform } from 'react-native';

export const PROTOTYPE = process.env.EXPO_PUBLIC_PROTOTYPE === '1';

/** Local notifications (reminders, rest timer): phones only, and off in prototype mode. */
export const NOTIFICATIONS = !PROTOTYPE && Platform.OS !== 'web';
