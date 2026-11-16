import { Platform } from 'react-native';
import { PROTOTYPE } from './config';
import { captureTesterIdFromUrl, savedTesterId } from './testerId';

/**
 * User-test tracking (prototype mode only). Each tester opens a personal
 * link like .../nova-prototype/?t=T1; the ID is saved on the device
 * (see testerId.ts) and sent with a few events to a Google Sheet. Failures
 * are ignored: tracking must never get in the way of the app.
 */

const ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzsiimQtV-xH5KcsJVQThw8_RIoIjQ3agSQu7wYbkLKZltGDmAn5tlQiLCxs56dCDOx7A/exec';

export type TrackedEvent = 'app_open' | 'plan_created' | 'workout_logged';

/** Saves the tester ID from the link (?t=T1) if the page still has it. */
export function captureTesterId() {
  if (PROTOTYPE && Platform.OS === 'web') captureTesterIdFromUrl();
}

/** The saved tester ID, read fresh every time. */
export function testerId(): string | null {
  return savedTesterId();
}

export function track(event: TrackedEvent) {
  if (!PROTOTYPE) return;
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ tester: testerId() ?? 'unknown', event, ts: new Date().toISOString() }),
    }).catch(() => {});
  } catch {
    // Ignore: tracking is best effort.
  }
}
