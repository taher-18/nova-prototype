import type { Gender } from '@gymapp/shared';
import Storage from 'expo-sqlite/kv-store';
import { useSyncExternalStore } from 'react';

/**
 * The member's gender from the onboarding quiz, kept on the phone so
 * exercise photos can match it offline.
 */
const KEY = 'profile.gender';
const listeners = new Set<() => void>();

function read(): Gender | null {
  try {
    return (Storage.getItemSync(KEY) as Gender | null) ?? null;
  } catch {
    return null;
  }
}

let current = read();

export function rememberGender(gender: Gender | null | undefined) {
  const next = gender ?? null;
  if (next === current) return;
  current = next;
  try {
    if (next) Storage.setItemSync(KEY, next);
    else Storage.removeItemSync(KEY);
  } catch {
    // Not saved; it is fetched again with the profile.
  }
  listeners.forEach((l) => l());
}

export function useGender(): Gender | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
