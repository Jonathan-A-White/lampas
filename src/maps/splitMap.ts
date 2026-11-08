// src/maps/splitMap.ts — the map the Reader's dock holds (mw-5r3p30.1129.2), as the text the setting `splitMap` keeps: the chapter the map was opened from and the card (its source and id), 'gen|14|biblemapper|BattleAtValleyOfSiddim'.
// Empty when the dock holds no map. Pure: the setting (src/settings/definitions/split.ts) checks its value with decodeSplitMap, and the dock (src/maps/MapDock.tsx) finds the card again from it.
import type { MapCard, MapKind, MapRef } from './types';

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

/** The kinds of map the Maps sheet lists, in its order (Events, Regions, Videos): a source's cards are listed by kind in this order, so the sheet and the dock agree on "the first". */
export const SHEET_KINDS: readonly MapKind[] = ['event', 'region', 'video'];

/** Whether a card can stand in the dock: a map that opens in the app (not a video, which is its article, and not a link-only source's row). */
export const dockable = (card: MapCard): boolean => card.kind !== 'video' && card.open === undefined;

/**
 * The map the dock shows in a chapter whose maps are `cards` (mapsFor's answer, the Maps sheet's source order), when it was last set to `kept` (docs/design/reader-split.md 'On moving chapter'):
 * the same map if the chapter has it, else the chapter's first in the Maps sheet's order (the sources in order, each source's cards by kind: Events, Regions), else null (the row reads
 * 'No map for ...'). Videos and link-only rows cannot be docked and are passed over.
 */
export function dockedCard(cards: readonly MapCard[], kept: Pick<SplitMapRef, 'source' | 'id'>): MapCard | null {
  const own = cards.filter(dockable);
  const same = own.find((card) => card.source === kept.source && card.id === kept.id);
  if (same) return same;
  const sources = [...new Set(own.map((card) => card.source))];
  for (const source of sources) {
    for (const kind of SHEET_KINDS) {
      const first = own.find((card) => card.source === source && card.kind === kind);
      if (first) return first;
    }
  }
  return null;
}
