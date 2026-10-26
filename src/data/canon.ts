// src/data/canon.ts — the 66 books of the Bible in canon order, Genesis to Revelation: the code public/data/index.json and the chapter files use, the name,
// the chapter count, the language the book is read in (`lang`: 'hbo' for the 39 of the Old Testament, whose Aramaic verses are words of an 'hbo' chapter, 'grc' for
// the 27 of the New) and the book's abbreviation in a Logos reference (Logos' own list, https://www.logos.com/bible-book-abbreviations, docs/resources.md).
// `code` of the Old Testament is ours (three letters, never one of the New's); the count is the Protestant one, the one Logos' Bibles use.
// books.ts is the door every screen takes (BOOKS is this list; NT_BOOKS and OT_BOOKS are its two halves). tests/unit/books.test.ts holds CANON equal to index.json.
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

const OLD_TESTAMENT: ReadonlyArray<readonly [code: string, name: string, chapters: number, logos: string]> = [
  ['gen', 'Genesis', 50, 'Ge'],
  ['exo', 'Exodus', 40, 'Ex'],
  ['lev', 'Leviticus', 27, 'Le'],
  ['num', 'Numbers', 36, 'Nu'],
  ['deu', 'Deuteronomy', 34, 'De'],
  ['jos', 'Joshua', 24, 'Jos'],
  ['jdg', 'Judges', 21, 'Jdg'],
  ['rut', 'Ruth', 4, 'Ru'],
  ['1sa', '1 Samuel', 31, '1Sa'],
  ['2sa', '2 Samuel', 24, '2Sa'],
  ['1ki', '1 Kings', 22, '1Ki'],
  ['2ki', '2 Kings', 25, '2Ki'],
  ['1ch', '1 Chronicles', 29, '1Ch'],
  ['2ch', '2 Chronicles', 36, '2Ch'],
  ['ezr', 'Ezra', 10, 'Ezr'],
  ['neh', 'Nehemiah', 13, 'Ne'],
  ['est', 'Esther', 10, 'Es'],
  ['job', 'Job', 42, 'Job'],
  ['psa', 'Psalms', 150, 'Ps'],
  ['pro', 'Proverbs', 31, 'Pr'],
  ['ecc', 'Ecclesiastes', 12, 'Ec'],
  ['sng', 'Song of Solomon', 8, 'So'],
  ['isa', 'Isaiah', 66, 'Isa'],
  ['jer', 'Jeremiah', 52, 'Jer'],
  ['lam', 'Lamentations', 5, 'La'],
  ['ezk', 'Ezekiel', 48, 'Eze'],
  ['dan', 'Daniel', 12, 'Da'],
  ['hos', 'Hosea', 14, 'Ho'],
  ['jol', 'Joel', 3, 'Joel'],
  ['amo', 'Amos', 9, 'Am'],
  ['oba', 'Obadiah', 1, 'Ob'],
  ['jon', 'Jonah', 4, 'Jon'],
  ['mic', 'Micah', 7, 'Mic'],
  ['nam', 'Nahum', 3, 'Na'],
  ['hab', 'Habakkuk', 3, 'Hab'],
  ['zep', 'Zephaniah', 3, 'Zep'],
  ['hag', 'Haggai', 2, 'Hag'],
  ['zec', 'Zechariah', 14, 'Zec'],
  ['mal', 'Malachi', 4, 'Mal'],
];

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
  ...OLD_TESTAMENT.map(([code, name, chapters, logos]): CanonBook => ({ code, name, chapters, lang: 'hbo', logos })),
  ...NEW_TESTAMENT.map(([code, name, chapters, logos]): CanonBook => ({ code, name, chapters, lang: 'grc', logos })),
];

/** The book a code names, or undefined for a code that is not one of the 66. */
export const canonBookOf = (code: string): CanonBook | undefined => CANON.find((b) => b.code === code);
