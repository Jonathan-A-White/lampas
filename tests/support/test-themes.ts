// tests/support/test-themes.ts — theme sources of the tests' own (mw-qtu3zvz.4): topics and links held here, so a scenario shows the Themes line and the sermons on the same theme with no data file read.
// registerTestThemes() puts them in the registry (src/themes/index.ts setThemeSources); forgetTestThemes() puts the real ones back. They are made for tests/support/test-sermons.ts' rows: Romans 5:8 has two narrow
// topics (Atonement, Love-Hatred: Of God) and a whole-subject one (God, over the cap), and Jonah 1 has a sermon on each of the narrow ones.
import { setThemeSources } from '../../src/themes';
import type { Link, ThemeBook, ThemeSource, Topic } from '../../src/themes/types';

const link = (topic: string, book: string, chapter: number, from: number, to: number, part?: number, toChapter?: number): Link => ({
  topic,
  ...(part === undefined ? {} : { part }),
  ref: { book, chapter, from, to, ...(toChapter === undefined ? {} : { toChapter }) },
});

const topic = (id: string, label: string, verses: number, books: string[] | undefined, parts: Array<[number, string]> = []): Topic => ({
  id,
  label,
  parts: parts.map(([n, text]) => ({ n, label: text })),
  verses,
  ...(books === undefined ? {} : { books }),
});

/** The first source's topics and links, by book. */
export const TEST_THEME_BOOKS: Record<string, ThemeBook> = {
  rom: {
    topics: [
      topic('atonement', 'Atonement', 20, ['rom', 'jon'], [[1, 'Doctrine of']]),
      topic('love-hatred', 'Love-Hatred', 12, ['rom', 'jon'], [[4, 'Of God']]),
      topic('god', 'God', 4051, undefined),
    ],
    links: [link('atonement', 'rom', 5, 8, 8, 1), link('love-hatred', 'rom', 5, 6, 8, 4), link('god', 'rom', 5, 1, 21), link('atonement', 'rom', 5, 12, 21, 1)],
  },
  jon: {
    topics: [topic('atonement', 'Atonement', 20, ['rom', 'jon'], [[1, 'Doctrine of']]), topic('love-hatred', 'Love-Hatred', 12, ['rom', 'jon'], [[4, 'Of God']]), topic('god', 'God', 4051, undefined)],
    links: [link('atonement', 'jon', 1, 1, 3, 1), link('love-hatred', 'jon', 1, 4, 10, 4), link('god', 'jon', 1, 1, 17)],
  },
};

/** The second source's: a topic of its own on Romans 5:8. */
export const TEST_THEME_BOOKS_SECOND: Record<string, ThemeBook> = {
  rom: { topics: [topic('commendation', 'Commendation', 5, ['rom', 'jon'])], links: [link('commendation', 'rom', 5, 8, 8)] },
  jon: { topics: [topic('commendation', 'Commendation', 5, ['rom', 'jon'])], links: [link('commendation', 'jon', 1, 3, 3)] },
};

const sourceOf = (id: string, name: string, books: Record<string, ThemeBook>, default_: 'on' | 'off' = 'on'): ThemeSource => ({
  id,
  name,
  homepage: `https://${id}.test`,
  credit: `${name}, a source of the tests’ own`,
  describe: `Themes of the tests’ own: ${name}.`,
  default: default_,
  book: async (book: string) => books[book] ?? { topics: [], links: [] },
});

export const testThemes = sourceOf('testthemes', 'Test Themes', TEST_THEME_BOOKS);
export const secondThemes = sourceOf('testthemes2', 'Test More Themes', TEST_THEME_BOOKS_SECOND);
/** A source whose switch starts Off: nothing of it is used while nothing is saved. */
export const offThemes = sourceOf('testthemesoff', 'Test Off Themes', TEST_THEME_BOOKS, 'off');

/** Registers the tests' first source (with `second`, the other one after it; with `off`, only a source that starts Off; with `none`, no source at all). */
export const registerTestThemes = ({ second = false, off = false, none = false }: { second?: boolean; off?: boolean; none?: boolean } = {}): void => {
  if (none) return setThemeSources([]);
  if (off) return setThemeSources([offThemes]);
  setThemeSources([testThemes, ...(second ? [secondThemes] : [])]);
};
export const forgetTestThemes = (): void => setThemeSources(undefined);
