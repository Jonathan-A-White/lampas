// tests/support/test-sermons.ts — sermon sources of the tests' own (mw-qtu3zvz.2): rows held here, so a scenario shows the Sermons door and sheet with no data file read and no page fetched.
// registerTestSermons() puts them in the registry (src/sermons/index.ts setSermonSources); forgetTestSermons() puts the real ones back.
import { setSermonSources } from '../../src/sermons';
import type { SermonPlace, SermonRow, SermonSource } from '../../src/sermons/types';

const row = (source: string, id: string, title: string, at: [string, number, number, number, number?], preacher?: string, date?: string): SermonRow => ({
  id,
  source,
  title,
  ...(preacher === undefined ? {} : { preacher }),
  ...(date === undefined ? {} : { date }),
  ref: { book: at[0], chapter: at[1], from: at[2], to: at[3], ...(at[4] === undefined ? {} : { toChapter: at[4] }) },
  role: 'text',
  open: { url: `https://sermons.test/${source}/${id}` },
  opensIn: 'web',
});

/**
 * The first source's rows, in verse order as a book's file lists them. Romans 5 has four (one on verse 8 alone, one on 1 to 11, one on 12 to 21, one on 5:12 to 6:4), Jonah 1 two;
 * every other chapter has none.
 */
export const TEST_ROWS: Record<string, SermonRow[]> = {
  rom: [
    row('testsermons', 'peace', 'Peace with God', ['rom', 5, 1, 11], 'Test Preacher', '1861-04-07'),
    row('testsermons', 'love', 'Love Commended', ['rom', 5, 8, 8], 'Test Preacher', '1880-03-14'),
    row('testsermons', 'reign', 'Reigning in Life', ['rom', 5, 12, 21], 'Test Preacher', '1872'),
    row('testsermons', 'adam', 'Death in Adam, Life in Christ', ['rom', 5, 12, 4, 6], 'Test Preacher', '1866-10'),
  ],
  jon: [row('testsermons', 'run', 'Running from God', ['jon', 1, 1, 3], 'Test Preacher', '1855-01-21'), row('testsermons', 'storm', 'The Storm at Sea', ['jon', 1, 4, 10], 'Test Preacher', '1856')],
};

/** The second source's: one row of Romans 5:6-8, with no date. */
export const TEST_ROWS_SECOND: Record<string, SermonRow[]> = {
  rom: [row('testsecond', 'shown', 'God’s Love Shown', ['rom', 5, 6, 8], 'Test Second Preacher')],
};

const sourceOf = (id: string, name: string, rows: Record<string, SermonRow[]>, default_: 'on' | 'off' = 'on'): SermonSource => ({
  id,
  name,
  homepage: `https://${id}.test`,
  credit: `${name}, a source of the tests’ own`,
  describe: `Sermons of the tests’ own: ${name}.`,
  default: default_,
  sermonsFor: async (place: SermonPlace) => (rows[place.book] ?? []).filter((r) => (r.ref.toChapter ?? r.ref.chapter) >= place.chapter && r.ref.chapter <= place.chapter),
  sermonsInBook: async (book: string) => rows[book] ?? [],
});

export const testSource = sourceOf('testsermons', 'Test Sermons', TEST_ROWS);
export const secondSource = sourceOf('testsecond', 'Test Second Sermons', TEST_ROWS_SECOND);
/** A source whose switch starts Off: nothing of it is used while nothing is saved. */
export const offSource = sourceOf('testoff', 'Test Off Sermons', TEST_ROWS, 'off');

/** Registers the tests' first source (with `second`, the other one after it; with `off`, only a source that starts Off; with `none`, a source with no rows at all). */
export const registerTestSermons = ({ second = false, off = false, none = false }: { second?: boolean; off?: boolean; none?: boolean } = {}): void => {
  if (off) return setSermonSources([offSource]);
  if (none) return setSermonSources([sourceOf('testnone', 'Test No Sermons', {})]);
  setSermonSources([testSource, ...(second ? [secondSource] : [])]);
};
export const forgetTestSermons = (): void => setSermonSources(undefined);
