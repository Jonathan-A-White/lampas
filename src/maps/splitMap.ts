// src/maps/splitMap.ts — the map the Reader's dock holds (mw-5r3p30.1129.2), as the text the setting `splitMap` keeps: the chapter the map was opened from and the card (its source and id), 'gen|14|biblemapper|BattleAtValleyOfSiddim'.
// Empty when the dock holds no map. Pure: the setting (src/settings/definitions/split.ts) checks its value with decodeSplitMap, and the dock (src/maps/MapDock.tsx) finds the card again from it.
import type { MapCard, MapRef } from './types';

export interface SplitMapRef {
  /** the chapter the map was opened from: where `mapsFor` finds the card again */
  book: string;
  chapter: number;
  source: string;
  id: string;
}

const PARTS = 4;

export const encodeSplitMap = (card: MapCard, ref: MapRef): string => [ref.book, ref.chapter, card.source, card.id].join('|');

/** The map a kept value stands for, or null for an empty or a damaged value. The card id is the rest of the text, so a `|` in it is kept. */
export function decodeSplitMap(text: string): SplitMapRef | null {
  const parts = text.split('|');
  if (parts.length < PARTS) return null;
  const [book, chapter, source, ...rest] = parts;
  const id = rest.join('|');
  const n = Number(chapter);
  return book !== '' && Number.isInteger(n) && n > 0 && source !== '' && id !== '' ? { book, chapter: n, source, id } : null;
}
