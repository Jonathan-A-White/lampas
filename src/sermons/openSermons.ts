// src/sermons/openSermons.ts — the one way to open the Sermons sheet (mw-qtu3zvz.2): openSermons(place) from a door. The sheet itself is drawn by <SermonsHost /> (src/sermons/SermonsSheet.tsx,
// mounted once in App), which reads the place held here; closing takes it away again.
import { useSyncExternalStore } from 'react';
import type { SermonPlace } from './types';

let current: SermonPlace | null = null;
const listeners = new Set<() => void>();
const tell = (): void => listeners.forEach((l) => l());

/** Opens the Sermons sheet for a place (a verse, a passage or a chapter). */
export function openSermons(place: SermonPlace): void {
  current = place;
  tell();
}

export function closeSermons(): void {
  if (current === null) return;
  current = null;
  tell();
}

/** The place whose sheet is open, or null. */
export function useOpenSermons(): SermonPlace | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => current,
  );
}
