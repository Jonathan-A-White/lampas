// src/library/useInLogosRows.ts — the books of his shelf that open at a place, live with the shelf and the Greek dial (docs/design/library-at-scale.md 3.6): the rows of the chooser and what
// decides whether the second door is drawn. Undefined until the shelf and the dial are read.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { getLogosBibles, shelfOf, type ShelfState } from '../data/repositories';
import { CATALOGUE, type CatalogueEntry } from '../resources/catalogue';
import type { StudyPlace } from '../resources/types';
import { useGreekInterest } from '../settings/useGreekInterest';
import { bibleFor } from '../resources/logosBible';
import { inLogosRows, type InLogosRow } from './inLogos';
import { withBibles } from './bibleParts';

export function useInLogosRows(place: StudyPlace, entries: readonly CatalogueEntry[] = CATALOGUE): InLogosRow[] | undefined {
  const held = useLiveQuery(() => shelfOf(), []);
  const bibles = useLiveQuery(getLogosBibles, []);
  const level = useGreekInterest();
  const { book, chapter, verse } = place;
  return useMemo(() => {
    if (held === undefined || bibles === undefined || level === undefined) return undefined;
    // the Bible is the one set in Settings for the place's part, not a row of the shelf
    const states = withBibles(new Map<string, ShelfState>(held.map((r) => [r.id, r.state])), [bibleFor(book, bibles)]);
    return inLogosRows(entries, states, { book, chapter, verse }, level);
  }, [held, bibles, level, entries, book, chapter, verse]);
}
