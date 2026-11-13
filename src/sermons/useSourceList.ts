// src/sermons/useSourceList.ts — the one list of sermon sources as this phone has it (sourceList.ts), live: the passage lists (the bundled ones and those the sermon index service added), the Logos sermon books his
// import holds, each switch as it stands, kept live as he taps. Undefined until his settings, his shelf, his import and the Logos switch are all read, so the page never draws first with every switch Off.
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { ownedResources, savedSettings, shelfOf, type ShelfState } from '../data/repositories';
import { SERMON_INDEX } from '../data/sermonIndex';
import { useGrownRows } from '../settings/useGrownRows';
import { useLogosOn } from '../useLogosOn';
import { activeSources } from './index';
import { knownSources } from './known';
import { sourceList, type SourceList } from './sourceList';
import { SERMON_BOOKS } from './sources/logos';

/** How many sermons the bundled index lists for a source; undefined for a source it does not hold. */
const sermonCount = (id: string): number | undefined => SERMON_INDEX.sources.find((source) => source.id === id)?.rows;

export function useSourceList(): SourceList | undefined {
  // a source the service gave on an earlier day is read from the phone, and one it tells of now joins the list
  const grown = useGrownRows();
  const saved = useLiveQuery(savedSettings, []);
  const held = useLiveQuery(() => shelfOf(), []);
  const owned = useLiveQuery(ownedResources, []);
  const logosOn = useLogosOn();
  return useMemo(() => {
    if (saved === undefined || held === undefined || owned === undefined || logosOn === undefined) return undefined;
    return sourceList({
      sources: [...activeSources(), ...knownSources()],
      books: SERMON_BOOKS,
      sermonCount,
      owned,
      logosOn,
      read: (key) => saved[key],
      shelf: new Map<string, ShelfState>(held.map((row) => [row.id, row.state])),
    });
    // `grown` changes when the service's sources do
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, held, owned, logosOn, grown]);
}
