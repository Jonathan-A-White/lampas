// src/library/useShelf.ts — his shelf as the Library screens read it: the state of every book he has touched and may be offered (his import holds it, or Logos gives it free: src/data/owned.ts, mw-qtu3zvz.126), by Resource ID,
// kept live as he taps. Undefined while the shelf is read.
// A Bible's state is never the shelf's own: it is On while one of the three Settings keys (his Bible in Logos for each part) names it, so Settings and the Library cannot disagree (mw-5r3p30.1135).
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { getLogosBibles, offeredShelfOf, ownedResources, type ShelfState } from '../data/repositories';
import type { LogosBibles } from '../resources/logosBible';
import { withBibles } from './bibleParts';
import { shelfStates } from './kinds';
import { isOffered, type Owned } from '../data/owned';

/** His Bible in Logos for each part, live; undefined while it is read. */
export function useBibles(): LogosBibles | undefined {
  return useLiveQuery(getLogosBibles, []);
}

/** The Resource IDs his Library import holds, live; undefined while it is read. */
export function useOwned(): Owned | undefined {
  return useLiveQuery(ownedResources, []);
}

export function useShelf(): ReadonlyMap<string, ShelfState> | undefined {
  const rows = useLiveQuery(() => offeredShelfOf(), []);
  const bibles = useBibles();
  const owned = useOwned();
  return useMemo(() => {
    if (rows === undefined || bibles === undefined || owned === undefined) return undefined;
    // a Bible the Settings name is the shelf's only while it may be offered
    return new Map([...withBibles(shelfStates(rows), Object.values(bibles))].filter(([id]) => isOffered(id, owned)));
  }, [rows, bibles, owned]);
}
