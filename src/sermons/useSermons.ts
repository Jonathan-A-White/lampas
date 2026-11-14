// src/sermons/useSermons.ts — the sermons of a place for a door and its sheet (mw-qtu3zvz.2): `undefined` while sermonsFor answers, then what the place has (nothing where it has none, or every source failed).
// It reads the module's data alone (the bundled sources' book files): nothing leaves the app for a sermon's page until a row is tapped. It asks again when a source is switched On or Off or Logos is (mw-qtu3zvz.3).
// useLatest asks the sermon index service for the newest rows once the bundled ones are known (mw-qtu3zvz.5, docs/sermons.md 'When online'); useServiceSearch is the sheet's search field, answered by the service alone.
// useArchives is the 'In Logos' group of the sheet: his sermon books that are On at the place (a book a passage list stands for is not among them), none while Logos is Off.
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { loadChapter } from '../data/chapter';
import { passagesOf } from '../data/passage';
import { ownedResources, shelfOf, type ShelfState } from '../data/repositories';
import { subscribe } from '../events/bus';
import { addressOffered } from '../data/owned';
import { useLogosOn } from '../useLogosOn';
import { fetchThemeSermons, search, sermonsServiceKnown, type ServiceHit, type ServiceThemeSermon } from '../services/sermons';
import { activeSources, latestFor, sermonsFor, type SermonPlace, type SermonsFound } from './index';
import { talkSermonsFor, type ListedSermon } from './forTutor';
import { logosArchives, underLists, type ArchiveRow } from './sources/logos';

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

/** His sermon books at the place, live with his shelf and the Logos switch: `undefined` until both are read, `[]` while Logos is Off or none is On. A book with more than sermons is on another kind's shelf, so the whole shelf is read. */
export function useArchives(place: SermonPlace | null): ArchiveRow[] | undefined {
  const held = useLiveQuery(() => shelfOf(), []);
  const owned = useLiveQuery(ownedResources, []);
  const logos = useLogosOn();
  const book = place?.book;
  const chapter = place?.chapter;
  const from = place?.from;
  return useMemo(() => {
    if (held === undefined || owned === undefined || logos === undefined) return undefined;
    if (!logos || book === undefined || chapter === undefined) return [];
    return logosArchives({ book, chapter, ...(from === undefined ? {} : { from }) }, new Map<string, ShelfState>(held.map((r) => [r.id, r.state])), undefined, owned, underLists(activeSources()));
  }, [held, owned, logos, book, chapter, from]);
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

/**
 * The sermons of a place as the door counts them (mw-qtu3zvz.63): the bundled rows, and once the service has answered for the chapter its rows merged in (a sermon in both counts once). Where the service is unknown, offline,
 * failing or slow the bundled rows stand and nothing is shown of it. The ask is kept a chapter, so every verse of it and the sheet share one.
 */
export function useSermonsWithLatest(place: SermonPlace | null): SermonsFound | undefined {
  const bundled = useSermons(place);
  const latest = useLatest(place, bundled);
  return latest.status === 'latest' ? latest.found : bundled;
}

/** How long the search field waits after the last key before it asks. */
export const SEARCH_DEBOUNCE_MS = 300;

export type FoundState = { status: 'idle' | 'searching' | 'failed' } | { status: 'found'; hits: ServiceHit[] };

/** The search of the sheet: `query` is asked 300 ms after it stops changing, by the service alone (`GET /v1/search`); nothing is asked for an empty query or while `enabled` is false. A hit whose address opens a Logos resource
 *  he does not own (src/data/owned.ts addressOffered, mw-qtu3zvz.126) is left out; `searching` stands until his import is read. */
export function useServiceSearch(query: string, enabled: boolean): FoundState {
  const words = query.trim();
  const owned = useLiveQuery(ownedResources, []);
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
  const answer = state?.words === words ? state.answer : undefined;
  return useMemo((): FoundState => {
    if (!enabled || words === '') return { status: 'idle' };
    if (answer === undefined || owned === undefined) return { status: 'searching' };
    return answer.status === 'found' ? { status: 'found', hits: answer.hits.filter((hit) => hit.url === null || addressOffered(hit.url, owned)) } : answer;
  }, [enabled, words, answer, owned]);
}

export type ThemeSermons = { status: 'asking' | 'failed' } | { status: 'found'; rows: ServiceThemeSermon[] };

/**
 * The sermons of each theme the search found (`keys`, '<theme source>:<topic>' each), asked at once when the hits arrive, so Found can leave out a theme with no sermons (mw-qtu3zvz.65) and say how many a theme has.
 * A key not answered yet is `asking`, one that could not be asked `failed`; nothing is asked for none. A sermon whose address opens a Logos resource he does not own (src/data/owned.ts addressOffered, mw-qtu3zvz.126) is left out,
 * and a key stays `asking` until his import is read.
 */
export function useThemeSermons(keys: readonly string[]): ReadonlyMap<string, ThemeSermons> {
  const owned = useLiveQuery(ownedResources, []);
  const [answers, setAnswers] = useState<ReadonlyMap<string, ThemeSermons>>(new Map());
  const wanted = keys.join('\n');
  useEffect(() => {
    if (wanted === '') return;
    let alive = true;
    for (const key of wanted.split('\n')) {
      const at = key.indexOf(':');
      fetchThemeSermons(key.slice(0, at), key.slice(at + 1)).then(
        (answer) => alive && setAnswers((held) => new Map(held).set(key, { status: 'found', rows: answer.rows })),
        (error: unknown) => {
          console.warn(`could not read the sermons of a theme: ${error instanceof Error ? error.message : String(error)}`);
          if (alive) setAnswers((held) => new Map(held).set(key, { status: 'failed' }));
        },
      );
    }
    return () => {
      alive = false;
    };
  }, [wanted]);
  return useMemo(
    () =>
      new Map(
        keys.map((key): [string, ThemeSermons] => {
          const answer = answers.get(key);
          if (answer === undefined || owned === undefined) return [key, { status: 'asking' }];
          return [key, answer.status === 'found' ? { status: 'found', rows: answer.rows.filter((row) => addressOffered(row.url, owned)) } : answer];
        }),
      ),
    [wanted, answers, owned], // eslint-disable-line react-hooks/exhaustive-deps
  );
}

/**
 * The rows the tutor was told of for a talk on `place` (src/sermons/forTutor.ts talkSermonsFor), which a `sermon` link of its answer is found among: `undefined` while they are read, `[]` where there are none; nothing is read for a null place.
 * It asks again when a sermon source or a theme list is switched.
 */
export function useTalkSermons(place: SermonPlace | null): ListedSermon[] | undefined {
  const [switches, setSwitches] = useState(0);
  useEffect(() => subscribe('setting-changed', (event) => (event.key.startsWith('sermons.') || event.key.startsWith('themes.') || event.key === 'resource.logos') && setSwitches((n) => n + 1)), []);
  const key = place ? `${place.book}.${place.chapter}.${place.from ?? ''}.${switches}` : '';
  const [held, setHeld] = useState<{ key: string; rows: ListedSermon[] } | undefined>();
  useEffect(() => {
    if (!place) return;
    let alive = true;
    talkSermonsFor(place).then((answer) => alive && setHeld({ key, rows: answer?.rows ?? [] }));
    return () => {
      alive = false;
    };
    // the place is the key: a new object of the same place asks nothing again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return held?.key === key ? held.rows : undefined;
}

/**
 * The verses of the section the place's first verse stands under (the MSB heading's passage, src/data/passage.ts), for Found to rank a sermon on the pericope (mw-qtu3zvz.66): read only while `enabled` (a search is typed),
 * `undefined` until read, for a whole chapter, for a verse under no heading, and where the chapter cannot be read (nothing is said of that: the pericope tier is simply empty).
 */
export function usePericope(place: SermonPlace, enabled: boolean): { first: number; last: number } | undefined {
  const { book, chapter, from } = place;
  const key = `${book}.${chapter}.${from ?? ''}`;
  const [held, setHeld] = useState<{ key: string; span: { first: number; last: number } | undefined } | undefined>();
  useEffect(() => {
    if (!enabled || from === undefined) return;
    let alive = true;
    loadChapter(book, chapter).then(
      (loaded) => {
        const passage = passagesOf(loaded.verses).find((p) => from >= p.first && from <= p.last);
        if (alive) setHeld({ key, span: passage ? { first: passage.first, last: passage.last } : undefined });
      },
      () => alive && setHeld({ key, span: undefined }),
    );
    return () => {
      alive = false;
    };
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return held?.key === key ? held.span : undefined;
}
