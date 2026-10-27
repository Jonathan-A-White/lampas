// src/maps/openMaps.ts — the one way to open the Maps sheet (mw-zbjgn3r.2): openMaps(ref) from a door, and from the tutor (a later story). The sheet itself is drawn by <MapsHost />
// (src/maps/MapsSheet.tsx, mounted once in App), which reads the place held here; closing takes it away again.
import { useSyncExternalStore } from 'react';
import type { MapRef } from './types';

let current: MapRef | null = null;
/** The map to open over the sheet, by card id (the tutor's map link, mw-zbjgn3r.4); null for the sheet alone. */
let card: string | null = null;
const listeners = new Set<() => void>();
const tell = (): void => listeners.forEach((l) => l());

/** Opens the Maps sheet for a place (a verse, a passage or a chapter); with `cardId`, the map of that card is opened over it (once the place's maps are read), and a card the place lacks leaves the sheet alone, and so does a card that opens elsewhere (`open`, a link-only source's row: MapView is never opened for it, the tutor's chip for it is a link, src/TutorLinks.tsx, and the sheet draws it as its own link row). */
export function openMaps(ref: MapRef, cardId?: string): void {
  current = ref;
  card = cardId ?? null;
  tell();
}

export function closeMaps(): void {
  if (current === null) return;
  current = null;
  card = null;
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

/** The id of the card openMaps was asked to open, or null. */
export function useOpenMapCard(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => card,
  );
}
