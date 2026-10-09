// src/data/skipped.ts — the new words he said Not now to on the teach sheet. Skipped for today only and kept in memory, not in
// Dexie: a new session, or the next day, offers them again. useSkipped re-renders whoever shows the list.
import { useSyncExternalStore } from 'react';

let day = '';
let skipped = new Set<string>();
let snapshot: ReadonlySet<string> = skipped;
const listeners = new Set<() => void>();

const today = (now: number): string => {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Forgets yesterday's skips when the date has changed. */
function roll(now: number): void {
  if (day === today(now)) return;
  day = today(now);
  if (skipped.size > 0) {
    skipped = new Set();
    snapshot = skipped;
  }
}

/** The lemmas (NFC) skipped today. The same set is returned until a skip changes it. */
export function skippedToday(now = Date.now()): ReadonlySet<string> {
  roll(now);
  return snapshot;
}

/** Skips `lemma` (any Unicode form) for the rest of today. */
export function skipForToday(lemma: string, now = Date.now()): void {
  roll(now);
  skipped = new Set(skipped).add(lemma.normalize('NFC'));
  snapshot = skipped;
  for (const listener of [...listeners]) listener();
}

/** The skipped lemmas as a React value. */
export function useSkipped(): ReadonlySet<string> {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => skippedToday(),
  );
}

/** Forgets every skip (tests). */
export function forgetSkipped(): void {
  skipped = new Set();
  snapshot = skipped;
  day = '';
  for (const listener of [...listeners]) listener();
}
