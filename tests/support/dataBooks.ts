// tests/support/dataBooks.ts — the books of public/data, for a test that walks them: which of its directories are books (dataBooks, NOT_BOOKS) and which books
// are read in Greek (GREEK_BOOKS, isGreekBook). One file for both since mw-82lb97i.11: until then the Greek half stood in a file of this name with a hyphen in it.
//
// A test that walks every book of the data reads public/data/<book>/<chapter>.json through dataBooks, so that the next directory there that is not a book
// (the ladder's, the recorded voice's) is added to NOT_BOOKS here, once, rather than to about 28 walkers (mw-82lb97i.10).
// A skip list, not public/data/index.json: a book directory that index.json does not yet name stays in front of the walkers, which would catch it, where the index would hide it.
// A walker's own further filter (isGreekBook below, the verses- files, which are files and not directories) stays on top of this.
//
// public/data holds the Old Testament's chapters too (mw-uqlxea.1, docs/data.md 'The Old Testament data'), whose words are Hebrew with the table's parsing codes;
// a test that walks the Greek text (the RP parsing codes, the ladders, the weave) walks GREEK_BOOKS only.
import { readdirSync, readFileSync } from 'node:fs';

/** The directories of public/data that hold no chapters: ladder/ is scripts/ladder-el.ts's, audio/ is the recorded voice's timings (docs/data.md). */
export const NOT_BOOKS: readonly string[] = ['ladder', 'audio'];

/** The names of the book directories of `root` (public/data by default), sorted: every directory but those in NOT_BOOKS. */
export function dataBooks(root = 'public/data'): string[] {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !NOT_BOOKS.includes(d.name))
    .map((d) => d.name)
    .sort();
}

interface IndexBook {
  code: string;
  chapters: number;
  lang?: string;
}
const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as { books: IndexBook[] };

/** The books of public/data/index.json read in Greek (a book that does not say is read in Greek). */
export const GREEK_BOOKS: readonly IndexBook[] = index.books.filter((b) => (b.lang ?? 'grc') === 'grc');

export const isGreekBook = (code: string): boolean => GREEK_BOOKS.some((b) => b.code === code);
