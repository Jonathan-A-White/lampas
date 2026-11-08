// src/maps/useDockedMap.ts — which map the Reader's dock holds (mw-5r3p30.1129.2, docs/maps.md 'Split'): the setting `splitMap` (src/maps/splitMap.ts) read, and its card found again from the chapter it was opened from (useMaps, as the Maps sheet reads it).
import { useMemo } from 'react';
import { useSplitMap } from '../reader/split/splitSettings';
import { decodeSplitMap } from './splitMap';
import type { MapCard, MapRef } from './types';
import { useMaps } from './useMaps';

/** The least the dock's body needs for a map, in px: the credit row (a text-sm line and the margin above it); the picture and the links scroll in the dock's body. */
export const MAP_CREDIT_ROW = 28;

/** What the dock holds, or null while it holds no map. `card` is undefined while the maps of its chapter are read and null when the chapter no longer has it (its source switched Off). */
export interface DockedMap {
  ref: MapRef;
  card: MapCard | undefined | null;
}

export function useDockedMap(open: boolean): DockedMap | null {
  const kept = useSplitMap();
  const at = open && kept ? decodeSplitMap(kept) : null;
  const book = at?.book;
  const chapter = at?.chapter;
  const ref = useMemo<MapRef | null>(() => (book !== undefined && chapter !== undefined ? { book, chapter } : null), [book, chapter]);
  const cards = useMaps(ref);
  if (!at || !ref) return null;
  return { ref, card: cards === undefined ? undefined : (cards.find((c) => c.source === at.source && c.id === at.id) ?? null) };
}

export const dockedTitle = (docked: DockedMap): string => docked.card?.title ?? 'Map';
