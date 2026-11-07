// src/sermons/useSermons.ts — the sermons of a place for a door and its sheet (mw-qtu3zvz.2): `undefined` while sermonsFor answers, then what the place has (nothing where it has none, or every source failed).
// It reads the module's data alone (the bundled sources' book files): nothing leaves the app for a sermon's page until a row is tapped. It asks again when a source is switched On or Off or Logos is (mw-qtu3zvz.3).
// useLatest asks the sermon index service for the newest rows once the bundled ones are known (mw-qtu3zvz.5, docs/sermons.md 'When online'); useServiceSearch is the sheet's search field, answered by the service alone.
// useArchives is the 'In Logos' group of the sheet: his Pinned and On sermon archives at the place, none while Logos is Off.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { shelfOf, type ShelfState } from '../data/repositories';
import { subscribe } from '../events/bus';
import { useLogosOn } from '../useLogosOn';
import { fetchThemeSermons, search, sermonsServiceKnown, type ServiceHit, type ServiceThemeSermon } from '../services/sermons';
import { latestFor, sermonsFor, type SermonPlace, type SermonsFound } from './index';
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


/** What asking the service for the newest rows came to: `none` while there is no service to ask (or no source is On), `asking` while the bundled rows stand alone, `latest` with the merged rows, `offline` when it failed or did not answer in 2 seconds. */
export type LatestState = { status: 'none' | 'asking' | 'offline' } | { status: 'latest'; found: SermonsFound; added: number };

const NONE: LatestState = { status: 'none' };

/** The bundled `found` of a place merged with the service's newest rows. Asks again when the place, the bundled rows or a source's switch changes; the bundled rows stand meanwhile. */
export function useLatest(place: SermonPlace | null, found: SermonsFound | undefined): LatestState {
  const [switches, setSwitches] = useState(0);
  useEffect(() => subscribe('setting-changed', (event) => event.key.startsWith('sermons.') && setSwitches((n) => n + 1)), []);
  const [state, setState] = useState<{ found: SermonsFound; switches: number; answer: LatestState } | undefined>();
  useEffect(() => {
    if (!place || !found || !sermonsServiceKnown()) return;
    let alive = true;
    latestFor(place, found).then(
      (latest) => alive && setState({ found, switches, answer: latest ? { status: 'latest', found: latest.found, added: latest.added } : NONE }),
      (error: unknown) => {
        console.warn(`could not read the sermon index: ${error instanceof Error ? error.message : String(error)}`);
        if (alive) setState({ found, switches, answer: { status: 'offline' } });
      },
    );
    return () => {
      alive = false;
    };
    // the bundled rows and the switches are the key: a new object of the same place asks nothing again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found, switches]);
  if (!place || !found || !sermonsServiceKnown()) return NONE;
  return state && state.found === found && state.switches === switches ? state.answer : { status: 'asking' };
}

/** How long the search field waits after the last key before it asks. */
export const SEARCH_DEBOUNCE_MS = 300;

export type FoundState = { status: 'idle' | 'searching' | 'failed' } | { status: 'found'; hits: ServiceHit[] };

/** The search of the sheet: `query` is asked 300 ms after it stops changing, by the service alone (`GET /v1/search`); nothing is asked for an empty query or while `enabled` is false. */
export function useServiceSearch(query: string, enabled: boolean): FoundState {
  const words = query.trim();
  const [state, setState] = useState<{ words: string; answer: FoundState } | undefined>();
  useEffect(() => {
    if (!enabled || words === '') return;
    let alive = true;
    const timer = setTimeout(() => {
      search(words).then(
        (hits) => alive && setState({ words, answer: { status: 'found', hits } }),
        (error: unknown) => {
          console.warn(`could not search the sermon index: ${error instanceof Error ? error.message : String(error)}`);
          if (alive) setState({ words, answer: { status: 'failed' } });
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [words, enabled]);
  if (!enabled || words === '') return { status: 'idle' };
  return state?.words === words ? state.answer : { status: 'searching' };
}

export type ThemeSermons = { status: 'idle' | 'asking' | 'failed' } | { status: 'found'; rows: ServiceThemeSermon[] };

/** The sermons of the theme `key` ('<theme source>:<topic>') the search found, once he taps it; `idle` while none is open. */
export function useThemeSermons(key: string | null): ThemeSermons {
  const [state, setState] = useState<{ key: string; answer: ThemeSermons } | undefined>();
  useEffect(() => {
    if (key === null) return;
    let alive = true;
    const at = key.indexOf(':');
    fetchThemeSermons(key.slice(0, at), key.slice(at + 1)).then(
      (answer) => alive && setState({ key, answer: { status: 'found', rows: answer.rows } }),
      (error: unknown) => {
        console.warn(`could not read the sermons of a theme: ${error instanceof Error ? error.message : String(error)}`);
        if (alive) setState({ key, answer: { status: 'failed' } });
      },
    );
    return () => {
      alive = false;
    };
  }, [key]);
  if (key === null) return { status: 'idle' };
  return state?.key === key ? state.answer : { status: 'asking' };
}
