// src/sermons/useSourceList.ts — the one list of sermon sources as this phone has it (sourceList.ts), live: the passage lists (the bundled ones and those the sermon index service added), the Logos sermon books his
// import holds, each switch as it stands, kept live as he taps. Undefined until his settings, his shelf, his import and the Logos switch are all read, so the page never draws first with every switch Off.
// readSourceList is the same list read once, now: the live one follows a write a moment late, so a tap on the page goes by this one (SermonSourcesPage.tsx, mw-qtu3zvz.197).
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import type { Owned } from '../data/owned';
import { ownedResources, savedSettings, shelfOf, type LibraryRow, type ShelfState } from '../data/repositories';
import { SERMON_INDEX } from '../data/sermonIndex';
import { useGrownRows } from '../settings/useGrownRows';
import { useLogosOn } from '../useLogosOn';
import { activeSources } from './index';
import { knownSources } from './known';
import { sourceList, type SourceList } from './sourceList';
import { SERMON_BOOKS } from './sources/logos';

/** How many sermons the bundled index lists for a source; undefined for a source it does not hold. */
const sermonCount = (id: string): number | undefined => SERMON_INDEX.sources.find((source) => source.id === id)?.rows;

/** The list made from what the phone holds: his saved settings, his shelf, his import and the Logos switch. */
const listFrom = (saved: Record<string, string>, held: readonly LibraryRow[], owned: Owned, logosOn: boolean): SourceList =>
  sourceList({
    sources: [...activeSources(), ...knownSources()],
    books: SERMON_BOOKS,
    sermonCount,
    owned,
    logosOn,
    read: (key) => saved[key],
    shelf: new Map<string, ShelfState>(held.map((row) => [row.id, row.state])),
  });

export function useSourceList(): SourceList | undefined {
  // a source the service gave on an earlier day is read from the phone, and one it tells of now joins the list
  const grown = useGrownRows();
  const saved = useLiveQuery(savedSettings, []);
  const held = useLiveQuery(() => shelfOf(), []);
  const owned = useLiveQuery(ownedResources, []);
  const logosOn = useLogosOn();
  return useMemo(() => {
    if (saved === undefined || held === undefined || owned === undefined || logosOn === undefined) return undefined;
    return listFrom(saved, held, owned, logosOn);
    // `grown` changes when the service's sources do
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, held, owned, logosOn, grown]);
}

/** The list read from the phone once, as it stands now, with the Logos switch as the page has it. The live list follows a write a moment late, so what a tap on the page changes is worked out from this one when
 *  the tap's turn comes (SermonSourcesPage.tsx inTurn, mw-qtu3zvz.197), never from the rows as they are drawn. */
export async function readSourceList(logosOn: boolean): Promise<SourceList> {
  const [saved, held, owned] = await Promise.all([savedSettings(), shelfOf(), ownedResources()]);
  return listFrom(saved, held, owned, logosOn);
}
