// src/data/books.ts — the 27 books of the New Testament in canonical order, with the codes public/data/index.json uses. The Reader's
// title ('1 John 1') is needed before any file has loaded, so the names are here; the chapter counts are not (they come from
// index.json through loadIndex, src/data/chapter.ts). tests/unit/books.test.ts holds this list equal to the index.
export interface Book {
  code: string;
  name: string;
}

export const BOOKS: readonly Book[] = [
  { code: 'mat', name: 'Matthew' },
  { code: 'mrk', name: 'Mark' },
  { code: 'luk', name: 'Luke' },
  { code: 'jhn', name: 'John' },
  { code: 'act', name: 'Acts' },
  { code: 'rom', name: 'Romans' },
  { code: '1co', name: '1 Corinthians' },
  { code: '2co', name: '2 Corinthians' },
  { code: 'gal', name: 'Galatians' },
  { code: 'eph', name: 'Ephesians' },
  { code: 'php', name: 'Philippians' },
  { code: 'col', name: 'Colossians' },
  { code: '1th', name: '1 Thessalonians' },
  { code: '2th', name: '2 Thessalonians' },
  { code: '1ti', name: '1 Timothy' },
  { code: '2ti', name: '2 Timothy' },
  { code: 'tit', name: 'Titus' },
  { code: 'phm', name: 'Philemon' },
  { code: 'heb', name: 'Hebrews' },
  { code: 'jas', name: 'James' },
  { code: '1pe', name: '1 Peter' },
  { code: '2pe', name: '2 Peter' },
  { code: '1jn', name: '1 John' },
  { code: '2jn', name: '2 John' },
  { code: '3jn', name: '3 John' },
  { code: 'jud', name: 'Jude' },
  { code: 'rev', name: 'Revelation' },
];

/** The book a code names, or undefined for a code that is not one of the 27. */
export const bookOf = (code: string): Book | undefined => BOOKS.find((b) => b.code === code);

/** 'Romans 8', '1 John 1'. */
export const titleOf = (code: string, chapter: number): string => `${bookOf(code)?.name ?? code} ${chapter}`;
