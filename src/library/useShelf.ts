// src/library/useShelf.ts — his shelf as the Library screens read it: the state of every book he has touched, by Resource ID, kept live as he taps. Undefined while the shelf is read.
// A Bible's state is never the shelf's own: it is On while one of the three Settings keys (his Bible in Logos for each part) names it, so Settings and the Library cannot disagree (mw-5r3p30.1135).
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { getLogosBibles, shelfOf, type ShelfState } from '../data/repositories';
import type { LogosBibles } from '../resources/logosBible';
import { withBibles } from './bibleParts';
import { shelfStates } from './kinds';

/** His Bible in Logos for each part, live; undefined while it is read. */
export function useBibles(): LogosBibles | undefined {
  return useLiveQuery(getLogosBibles, []);
}

export function useShelf(): ReadonlyMap<string, ShelfState> | undefined {
  const rows = useLiveQuery(() => shelfOf(), []);
  const bibles = useBibles();
  return useMemo(() => (rows === undefined || bibles === undefined ? undefined : withBibles(shelfStates(rows), Object.values(bibles))), [rows, bibles]);
}
