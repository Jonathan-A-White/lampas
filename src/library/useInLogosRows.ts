// src/library/useInLogosRows.ts — the books of his shelf that open at a place, live with the shelf and the Greek dial (docs/design/library-at-scale.md 3.6): the rows of the chooser and what
// decides whether the second door is drawn. Undefined until the shelf and the dial are read.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { shelfOf, type ShelfState } from '../data/repositories';
import { CATALOGUE, type CatalogueEntry } from '../resources/catalogue';
import type { StudyPlace } from '../resources/types';
import { useGreekInterest } from '../settings/useGreekInterest';
import { inLogosRows, type InLogosRow } from './inLogos';

export function useInLogosRows(place: StudyPlace, entries: readonly CatalogueEntry[] = CATALOGUE): InLogosRow[] | undefined {
  const held = useLiveQuery(() => shelfOf(), []);
  const level = useGreekInterest();
  const { book, chapter, verse } = place;
  return useMemo(() => {
    if (held === undefined || level === undefined) return undefined;
    const states = new Map<string, ShelfState>(held.map((r) => [r.id, r.state]));
    return inLogosRows(entries, states, { book, chapter, verse }, level);
  }, [held, level, entries, book, chapter, verse]);
}
