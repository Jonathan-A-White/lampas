// src/data/books.ts — the 27 books of the New Testament in canonical order, with the codes public/data/index.json uses. The Reader's
// title ('1 John 1') and the buttons at the foot of a chapter are needed before any file has loaded, so the names and the chapter
// counts are here; the picker's grid reads the counts from index.json through loadIndex (src/data/chapter.ts).
// tests/unit/books.test.ts holds this list equal to the index.
export interface Book {
  code: string;
  name: string;
  /** how many chapters the book has */
  chapters: number;
}

export const BOOKS: readonly Book[] = [
  { code: 'mat', name: 'Matthew', chapters: 28 },
  { code: 'mrk', name: 'Mark', chapters: 16 },
  { code: 'luk', name: 'Luke', chapters: 24 },
  { code: 'jhn', name: 'John', chapters: 21 },
  { code: 'act', name: 'Acts', chapters: 28 },
  { code: 'rom', name: 'Romans', chapters: 16 },
  { code: '1co', name: '1 Corinthians', chapters: 16 },
  { code: '2co', name: '2 Corinthians', chapters: 13 },
  { code: 'gal', name: 'Galatians', chapters: 6 },
  { code: 'eph', name: 'Ephesians', chapters: 6 },
  { code: 'php', name: 'Philippians', chapters: 4 },
  { code: 'col', name: 'Colossians', chapters: 4 },
  { code: '1th', name: '1 Thessalonians', chapters: 5 },
  { code: '2th', name: '2 Thessalonians', chapters: 3 },
  { code: '1ti', name: '1 Timothy', chapters: 6 },
  { code: '2ti', name: '2 Timothy', chapters: 4 },
  { code: 'tit', name: 'Titus', chapters: 3 },
  { code: 'phm', name: 'Philemon', chapters: 1 },
  { code: 'heb', name: 'Hebrews', chapters: 13 },
  { code: 'jas', name: 'James', chapters: 5 },
  { code: '1pe', name: '1 Peter', chapters: 5 },
  { code: '2pe', name: '2 Peter', chapters: 3 },
  { code: '1jn', name: '1 John', chapters: 5 },
  { code: '2jn', name: '2 John', chapters: 1 },
  { code: '3jn', name: '3 John', chapters: 1 },
  { code: 'jud', name: 'Jude', chapters: 1 },
  { code: 'rev', name: 'Revelation', chapters: 22 },
];

/** The book a code names, or undefined for a code that is not one of the 27. */
export const bookOf = (code: string): Book | undefined => BOOKS.find((b) => b.code === code);

/** 'Romans 8', '1 John 1'. */
export const titleOf = (code: string, chapter: number): string => `${bookOf(code)?.name ?? code} ${chapter}`;
