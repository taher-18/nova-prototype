/**
 * The user-test tester ID (from links like ...?t=T1), kept in localStorage.
 * Plain browser code with no app imports, so it can run before anything
 * else: the exported index.html has the same logic inline, and the app entry
 * (index.js) runs it again before the router can change the address.
 * The same key is written by both, so keep them in step.
 */
export const TESTER_KEY = 'nova_tester_id';
/** Key used by the first build; still read so earlier testers keep their ID. */
const OLD_KEY = 'prototype.tester';

const VALID = /^[\w-]{1,40}$/;

/** Saves ?t= from the address, overwriting an older ID. Returns the saved ID. */
export function captureTesterIdFromUrl(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const fromLink = new URLSearchParams(window.location.search).get('t')?.trim();
    if (fromLink && VALID.test(fromLink)) window.localStorage.setItem(TESTER_KEY, fromLink);
    return savedTesterId();
  } catch {
    return null;
  }
}

export function savedTesterId(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(TESTER_KEY) ?? window.localStorage.getItem(OLD_KEY);
  } catch {
    return null;
  }
}
