// src/maps/openMaps.ts — the one way to open the Maps sheet (mw-zbjgn3r.2): openMaps(ref) from a door, and from the tutor (a later story). The sheet itself is drawn by <MapsHost />
// (src/maps/MapsSheet.tsx, mounted once in App), which reads the place held here; closing takes it away again.
import { useSyncExternalStore } from 'react';
import type { MapRef } from './types';

let current: MapRef | null = null;
const listeners = new Set<() => void>();
const tell = (): void => listeners.forEach((l) => l());

/** Opens the Maps sheet for a place (a verse, a passage or a chapter). */
export function openMaps(ref: MapRef): void {
  current = ref;
  tell();
}

export function closeMaps(): void {
  if (current === null) return;
  current = null;
  tell();
}

/** The place whose sheet is open, or null. */
export function useOpenMaps(): MapRef | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => current,
  );
}
