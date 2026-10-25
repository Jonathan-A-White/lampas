// src/data/canon.ts — the 66 books of the Bible in canon order, Genesis to Revelation: the code public/data/index.json and the chapter files use, the name,
// the chapter count, the language the book is read in (`lang`: 'hbo' for the 39 of the Old Testament, whose Aramaic verses are words of an 'hbo' chapter, 'grc' for
// the 27 of the New) and the book's abbreviation in a Logos reference (Logos' own list, https://www.logos.com/bible-book-abbreviations, docs/resources.md).
// The 39 take their code, name, count and abbreviation from otBooks.ts; BOOKS (books.ts) is the 27 of them that read in Greek, until the
// readers move to the canon (mw-uqlxea.2). tests/unit/books.test.ts holds CANON equal to index.json.
import { OT_BOOKS } from './otBooks';
import type { SourceLanguage } from './chapter';

export interface CanonBook {
  code: string;
  name: string;
  /** how many chapters the book has */
  chapters: number;
  /** the language the book is read in */
  lang: SourceLanguage;
  /** the book's abbreviation in a Logos reference: 'Ge', 'Ro' */
  logos: string;
}

const NEW_TESTAMENT: ReadonlyArray<readonly [code: string, name: string, chapters: number, logos: string]> = [
  ['mat', 'Matthew', 28, 'Mt'],
  ['mrk', 'Mark', 16, 'Mk'],
  ['luk', 'Luke', 24, 'Lk'],
  ['jhn', 'John', 21, 'Jn'],
  ['act', 'Acts', 28, 'Ac'],
  ['rom', 'Romans', 16, 'Ro'],
  ['1co', '1 Corinthians', 16, '1Co'],
  ['2co', '2 Corinthians', 13, '2Co'],
  ['gal', 'Galatians', 6, 'Ga'],
  ['eph', 'Ephesians', 6, 'Eph'],
  ['php', 'Philippians', 4, 'Php'],
  ['col', 'Colossians', 4, 'Col'],
  ['1th', '1 Thessalonians', 5, '1Th'],
  ['2th', '2 Thessalonians', 3, '2Th'],
  ['1ti', '1 Timothy', 6, '1Ti'],
  ['2ti', '2 Timothy', 4, '2Ti'],
  ['tit', 'Titus', 3, 'Tit'],
  ['phm', 'Philemon', 1, 'Phm'],
  ['heb', 'Hebrews', 13, 'Heb'],
  ['jas', 'James', 5, 'Jas'],
  ['1pe', '1 Peter', 5, '1Pe'],
  ['2pe', '2 Peter', 3, '2Pe'],
  ['1jn', '1 John', 5, '1Jn'],
  ['2jn', '2 John', 1, '2Jn'],
  ['3jn', '3 John', 1, '3Jn'],
  ['jud', 'Jude', 1, 'Jud'],
  ['rev', 'Revelation', 22, 'Re'],
];

export const CANON: readonly CanonBook[] = [
  ...OT_BOOKS.map((b): CanonBook => ({ code: b.code, name: b.name, chapters: b.chapters, lang: 'hbo', logos: b.logos })),
  ...NEW_TESTAMENT.map(([code, name, chapters, logos]): CanonBook => ({ code, name, chapters, lang: 'grc', logos })),
];

/** The book a code names, or undefined for a code that is not one of the 66. */
export const canonBookOf = (code: string): CanonBook | undefined => CANON.find((b) => b.code === code);
