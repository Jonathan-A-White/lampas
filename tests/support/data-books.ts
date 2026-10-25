// tests/support/data-books.ts — which books of public/data are read in Greek. public/data holds the Old Testament's chapters too (mw-uqlxea.1, docs/data.md 'The Old Testament data'),
// whose words are Hebrew with the table's parsing codes; a test that walks the Greek text (the RP parsing codes, the ladders, the weave) walks these books only.
import { readFileSync } from 'node:fs';

interface IndexBook {
  code: string;
  chapters: number;
  lang?: string;
}
const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as { books: IndexBook[] };

/** The books of public/data/index.json read in Greek (a book that does not say is read in Greek). */
export const GREEK_BOOKS: readonly IndexBook[] = index.books.filter((b) => (b.lang ?? 'grc') === 'grc');

export const isGreekBook = (code: string): boolean => GREEK_BOOKS.some((b) => b.code === code);
