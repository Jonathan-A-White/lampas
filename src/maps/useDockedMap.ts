// src/maps/useDockedMap.ts — which map the Reader's dock holds (mw-5r3p30.1129.2, docs/maps.md 'Split'): the setting `splitMap` (src/maps/splitMap.ts) read, and its card found again from the chapter it was opened from (useMaps, as the Maps sheet reads it).
import { useMemo } from 'react';
import { useSplitMap } from '../reader/split/splitSettings';
import { placeName } from './placeName';
import { decodeSplitMap, dockedCard } from './splitMap';
import type { MapCard, MapRef } from './types';
import { useMaps } from './useMaps';

/** The least the dock's body needs for a map, in px: the credit row (a text-sm line and the margin above it); the picture and the links scroll in the dock's body. */
export const MAP_CREDIT_ROW = 28;

/** What the dock holds in the chapter now open: `ref` is that chapter, and `card` the map shown, undefined while the chapter's maps are read and null when the chapter has none to show. */
export interface DockedMap {
  ref: MapRef;
  card: MapCard | undefined | null;
}

/**
 * The map the dock shows beside `chapter`, or null while the dock holds no map (a stub). The setting `splitMap` is the map he docked and the chapter he docked it from; the dock follows the
 * chapter that is open (docs/design/reader-split.md 'On moving chapter'): his map if this chapter has it, else this chapter's first (dockedCard), else none. Nothing is written when the chapter
 * moves, so going back to the chapter he docked it from brings his map back, and a reload shows what the open chapter shows.
 */
export function useDockedMap(open: boolean, chapter: { book: string; chapter: number }): DockedMap | null {
  const kept = useSplitMap();
  const at = open && kept ? decodeSplitMap(kept) : null;
  const { book, chapter: number } = chapter;
  const ref = useMemo<MapRef>(() => ({ book, chapter: number }), [book, number]);
  const cards = useMaps(at ? ref : null);
  if (!at) return null;
  return { ref, card: cards === undefined ? undefined : dockedCard(cards, at) };
}

export const dockedTitle = (docked: DockedMap): string => (docked.card ? docked.card.title : docked.card === null ? `No map for ${placeName(docked.ref)}` : 'Map');
