// src/sermons/index.ts — the sermons module's door (docs/sermons.md): the registry of sources and sermonsFor, the sermons of a place. A second source is one file in src/sermons/sources/ and one line in SOURCES.
import { savedSettings } from '../data/repositories';
import { THEME_MAX_VERSES } from '../data/themeIndex';
import { enabledSources as enabledThemeSources, themesFor } from '../themes';
import { enabledSources as enabledOf } from './enabled';
import { SOURCES } from './sources';
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

/** The source a row came from: it knows the row's credit and its home page. */
export function sourceOf(row: Pick<SermonRow, 'source'>): SermonSource | undefined {
  return active.find((source) => source.id === row.source);
}
