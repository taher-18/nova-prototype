import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';
import { PROTOTYPE } from './config';

/**
 * User-test tracking (prototype mode only). Each tester opens a personal
 * link like .../nova-prototype/?t=T1; the ID is saved on the device and sent
 * with a few events to a Google Sheet. Failures are ignored: tracking must
 * never get in the way of the app.
 */

const ENDPOINT =
  'https://script.google.com/macros/s/AKfycbzsiimQtV-xH5KcsJVQThw8_RIoIjQ3agSQu7wYbkLKZltGDmAn5tlQiLCxs56dCDOx7A/exec';
const TESTER_KEY = 'prototype.tester';

export type TrackedEvent = 'app_open' | 'plan_created' | 'workout_logged';

/** Saves the tester ID from the link (?t=T1), if there is one. */
export function captureTesterId() {
  if (!PROTOTYPE || Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const fromLink = new URLSearchParams(window.location.search).get('t')?.trim();
    if (fromLink && /^[\w-]{1,40}$/.test(fromLink)) Storage.setItemSync(TESTER_KEY, fromLink);
  } catch {}
}

export function testerId(): string | null {
  try {
    return Storage.getItemSync(TESTER_KEY);
  } catch {
    return null;
  }
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
