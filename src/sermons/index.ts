// src/sermons/index.ts — the sermons module's door (docs/sermons.md): the registry of sources and sermonsFor, the sermons of a place. A second source is one file in src/sermons/sources/ and one line in SOURCES.
import { getKnownSermonSources, rememberSermonSources, savedSettings, type KnownSermonSource } from '../data/repositories';
import { fetchSermons, fetchSources, sermonsServiceKnown, type ServiceSermon } from '../services/sermons';
import { THEME_MAX_VERSES } from '../data/themeIndex';
import { enabledSources as enabledThemeSources, themesFor } from '../themes';
import { enabledSources as enabledOf } from './enabled';
import { SOURCES } from './sources';
import { knownSources, setKnownSermonSources } from './known';
import { mergeServiceRows } from './merge';
import { sermonsForSources, themeTier, type TopicLinks } from './sermonsFor';
import type { SameTheme, SermonPlace, SermonRow, SermonsFound, SermonSource } from './types';

export type { SameTheme, SermonPlace, SermonRow, SermonSource, SermonsFound } from './types';

export { SOURCES };

/** The sources in use: SOURCES, or a list a test put in their place. */
let active: readonly SermonSource[] = SOURCES;

/** The test seam (tests/support/test-sermons.ts): the sources the screens ask, or `undefined` for the registered ones again. */
export function setSermonSources(sources: readonly SermonSource[] | undefined): void {
  active = sources ?? SOURCES;
}

/**
 * The sources that are on (src/sermons/enabled.ts): each reads its saved switch `sermons.<id>` (written by Settings once it has a switch per source, the next story), else its `default`: On for the free
 * sources, Off for his Logos archives. Registry order.
 */
export async function enabledSources(sources: readonly SermonSource[] = active): Promise<SermonSource[]> {
  const saved = await savedSettings();
  return enabledOf(sources, (key) => saved[key]);
}

/** The sermons of a place from every source that is on: for a verse or a passage those preached on it first, then the rest of the chapter (src/sermons/sermonsFor.ts); { here: [], chapter: [] } where there are none. */
export async function sermonsFor(place: SermonPlace): Promise<SermonsFound> {
  return sermonsForSources(await enabledSources(), place);
}

const NO_THEME: SameTheme = { groups: [], more: 0 };

/**
 * 'On the same theme' (docs/sermons.md): the sermons of the sources that are on whose preaching text overlaps a link of a topic that also links the verse or passage, the topic at most 300 verses, a sermon once with
 * its narrowest topic, none that `found` already lists, at most 12. A whole chapter has none. It reads only what the join needs: the topic's books that have a sermon, and in them the theme sources' links. A source that
 * fails is logged and answers nothing; the others still answer.
 */
export async function sameThemeFor(place: SermonPlace, found: SermonsFound): Promise<SameTheme> {
  const { from } = place;
  if (from === undefined) return NO_THEME;
  const themes = (await themesFor({ book: place.book, chapter: place.chapter, from, ...(place.to === undefined ? {} : { to: place.to }) })).filter((theme) => theme.verses <= THEME_MAX_VERSES);
  if (themes.length === 0) return NO_THEME;
  const sermonSources = await enabledSources();
  const books = [...new Set(themes.flatMap((theme) => theme.books ?? [place.book]))];
  const rowsByBook = new Map<string, SermonRow[]>();
  await Promise.all(
    books.map(async (book) => {
      const answers = await Promise.all(
        sermonSources.map((source) =>
          (source.sermonsInBook?.(book) ?? Promise.resolve<SermonRow[]>([])).catch((error: unknown) => {
            console.warn(`could not read the sermons of ${source.id}: ${error instanceof Error ? error.message : String(error)}`);
            return [];
          }),
        ),
      );
      const rows = answers.flat();
      if (rows.length > 0) rowsByBook.set(book, rows);
    }),
  );
  if (rowsByBook.size === 0) return NO_THEME;
  const themeSources = new Map((await enabledThemeSources()).map((source) => [source.id, source]));
  const topics: TopicLinks[] = await Promise.all(
    themes.map(async (theme) => {
      const source = themeSources.get(theme.source);
      const inBooks = (theme.books ?? [place.book]).filter((book) => rowsByBook.has(book));
      const links = (
        await Promise.all(
          inBooks.map(async (book) => {
            try {
              return (await source!.book(book)).links.filter((link) => link.topic === theme.topic).map((link) => link.ref);
            } catch (error) {
              console.warn(`could not read the themes of ${theme.source}: ${error instanceof Error ? error.message : String(error)}`);
              return [];
            }
          }),
        )
      ).flat();
      return { source: theme.source, id: theme.topic, label: theme.label, verses: theme.verses, links };
    }),
  );
  const skip = new Set([...found.here, ...found.chapter].map((row) => `${row.source}:${row.id}`));
  return themeTier(topics, [...rowsByBook.values()].flat(), skip);
}

/** The number of sermons a found set holds. */
export const countOf = (found: SermonsFound): number => found.here.length + found.chapter.length;

/** The source a row came from: it knows the row's credit and its home page. A source only the index service has (known.ts) is found too. */
export function sourceOf(row: Pick<SermonRow, 'source'>): SermonSource | undefined {
  return active.find((source) => source.id === row.source) ?? knownSources().find((source) => source.id === row.source);
}

/** Reads the kept list of the service's own sources into memory (known.ts); the registry of Settings rows grows from it. Called when the app starts and before the sheet asks. */
export async function loadKnownSermonSources(): Promise<void> {
  setKnownSermonSources(await getKnownSermonSources());
}

/** The service's own sources that are On (their saved switch, else the service's `on_by_default`), in the order they were first seen. */
export async function enabledServiceSources(): Promise<SermonSource[]> {
  const saved = await savedSettings();
  return enabledOf(knownSources(), (key) => saved[key]);
}

/** What asking the service gave: the bundled `found` merged with its rows, and how many it gave that the bundle lacks. */
export interface Latest {
  found: SermonsFound;
  added: number;
}

/** The longest the list of the service's sources is kept before it is asked for again. */
const SOURCES_KEPT_MS = 5 * 60 * 1000;
let listed: { at: number; asked: Promise<void> } | undefined;

/** Forgets that the list of the service's sources was asked for (a test starts over). */
export const forgetServiceSources = (): void => {
  listed = undefined;
};

/**
 * Asks the service which sources it has, at most once in five minutes (a failure is not kept): a sermon source the bundle lacks is kept on the phone and, the first time it is seen, announced so that Settings grows its
 * On | Off row (known.ts, src/settings/registry.ts). A failure here leaves the list as it was.
 */
function noteServiceSources(): Promise<void> {
  if (listed && Date.now() - listed.at < SOURCES_KEPT_MS) return listed.asked;
  const asked = (async () => {
    const own = new Set(active.map((source) => source.id));
    const found: KnownSermonSource[] = (await fetchSources())
      .filter((source) => source.kind === 'sermons' && !own.has(source.id))
      .map((source) => ({ id: source.id, name: source.name, credit: source.credit, homepage: source.homepage, onByDefault: source.on_by_default }));
    const fresh = await rememberSermonSources(found);
    if (fresh.length > 0 || found.length > 0) setKnownSermonSources(await getKnownSermonSources());
  })();
  listed = { at: Date.now(), asked };
  asked.catch(() => {
    if (listed?.asked === asked) listed = undefined;
  });
  return asked;
}

/** The osis-style address of the chapter the place is in: the service takes Lampas's own book codes. */
const chapterRef = (place: SermonPlace): string => `${place.book}.${place.chapter}`;

/**
 * The newest rows (docs/sermons.md 'When online'): the service is asked for the place's chapter with the sources that are On (the bundled ones and the service's own) and its rows are merged into the bundled `found`
 * (merge.ts: the service's row wins by source and id). A source the service lists that the bundle lacks is kept the first time it is seen, and if it turns out to be On at once (`on_by_default`) it is asked for too.
 * `undefined` when there is no service or no source is On; throws when the service does not answer (2 seconds, services/sermons.ts), so the sheet can say 'Offline'.
 */
export async function latestFor(place: SermonPlace, found: SermonsFound): Promise<Latest | undefined> {
  if (!sermonsServiceKnown()) return undefined;
  await loadKnownSermonSources();
  const bundled = (await enabledSources()).map((source) => source.id);
  const own = (await enabledServiceSources()).map((source) => source.id);
  const asked = [...bundled, ...own];
  if (asked.length === 0) return undefined;
  const ref = chapterRef(place);
  const [answer] = await Promise.all([fetchSermons(ref, asked, 200), noteServiceSources().catch(() => undefined)]);
  let rows: ServiceSermon[] = answer.rows;
  // a source first seen just now that is On at once: its rows come in a second call
  const after = (await enabledServiceSources()).map((source) => source.id).filter((id) => !asked.includes(id));
  if (after.length > 0) {
    try {
      rows = [...rows, ...(await fetchSermons(ref, after, 200)).rows];
    } catch (error) {
      console.warn(`could not read the new sermon sources: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return mergeServiceRows(found, rows, { place, sources: [...asked, ...after] });
}
