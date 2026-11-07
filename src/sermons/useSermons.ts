// src/sermons/useSermons.ts — the sermons of a place for a door and its sheet (mw-qtu3zvz.2): `undefined` while sermonsFor answers, then what the place has (nothing where it has none, or every source failed).
// It reads the module's data alone (the bundled sources' book files): nothing leaves the app for a sermon's page until a row is tapped. It asks again when a source is switched On or Off or Logos is (mw-qtu3zvz.3).
// useArchives is the 'In Logos' group of the sheet: his Pinned and On sermon archives at the place, none while Logos is Off.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { shelfOf, type ShelfState } from '../data/repositories';
import { subscribe } from '../events/bus';
import { useLogosOn } from '../useLogosOn';
import { sermonsFor, type SermonPlace, type SermonsFound } from './index';
import { logosArchives, type ArchiveRow } from './sources/logos';

export function useSermons(place: SermonPlace | null): SermonsFound | undefined {
  // a source switched On or Off (or Logos, which one can ride on) asks the place again
  const [switches, setSwitches] = useState(0);
  useEffect(() => subscribe('setting-changed', (event) => (event.key.startsWith('sermons.') || event.key === 'resource.logos') && setSwitches((n) => n + 1)), []);
  const key = place ? `${place.book}.${place.chapter}.${place.from ?? ''}.${place.to ?? ''}.${switches}` : '';
  const [found, setFound] = useState<{ key: string; found: SermonsFound } | undefined>();
  useEffect(() => {
    if (!place) return;
    let alive = true;
    sermonsFor(place).then(
      (answer) => alive && setFound({ key, found: answer }),
      (error: unknown) => {
        console.warn(`could not read the sermons of the place: ${error instanceof Error ? error.message : String(error)}`);
        if (alive) setFound({ key, found: { here: [], chapter: [] } });
      },
    );
    return () => {
      alive = false;
    };
    // the place is the key: a new object of the same place asks nothing again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return found?.key === key ? found.found : undefined;
}

/** His sermon archives at the place, live with his shelf and the Logos switch: `undefined` until both are read, `[]` while Logos is Off or none is On or Pinned. */
export function useArchives(place: SermonPlace | null): ArchiveRow[] | undefined {
  const held = useLiveQuery(() => shelfOf('sermons'), []);
  const logos = useLogosOn();
  const book = place?.book;
  const chapter = place?.chapter;
  const from = place?.from;
  return useMemo(() => {
    if (held === undefined || logos === undefined) return undefined;
    if (!logos || book === undefined || chapter === undefined) return [];
    return logosArchives({ book, chapter, ...(from === undefined ? {} : { from }) }, new Map<string, ShelfState>(held.map((r) => [r.id, r.state])));
  }, [held, logos, book, chapter, from]);
}
