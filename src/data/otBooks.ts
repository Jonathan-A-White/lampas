// src/data/otBooks.ts — the 39 books of the Old Testament in canon order. Lampas holds no Old Testament text (public/data is the New Testament
// only, tests/unit/books.test.ts), so this is a list for the chapter picker: each book opens in Logos (src/resources/logosBible.ts). `code` is
// ours (three letters, never one of data/books.ts); `logos` is the book's abbreviation in a Logos reference, taken from Logos' own list
// (https://www.logos.com/bible-book-abbreviations, docs/resources.md); `chapters` is the Protestant chapter count, the one Logos' Bibles use.
export interface OtBook {
  code: string;
  name: string;
  logos: string;
  chapters: number;
}

export const OT_BOOKS: readonly OtBook[] = [
  { code: 'gen', name: 'Genesis', logos: 'Ge', chapters: 50 },
  { code: 'exo', name: 'Exodus', logos: 'Ex', chapters: 40 },
  { code: 'lev', name: 'Leviticus', logos: 'Le', chapters: 27 },
  { code: 'num', name: 'Numbers', logos: 'Nu', chapters: 36 },
  { code: 'deu', name: 'Deuteronomy', logos: 'De', chapters: 34 },
  { code: 'jos', name: 'Joshua', logos: 'Jos', chapters: 24 },
  { code: 'jdg', name: 'Judges', logos: 'Jdg', chapters: 21 },
  { code: 'rut', name: 'Ruth', logos: 'Ru', chapters: 4 },
  { code: '1sa', name: '1 Samuel', logos: '1Sa', chapters: 31 },
  { code: '2sa', name: '2 Samuel', logos: '2Sa', chapters: 24 },
  { code: '1ki', name: '1 Kings', logos: '1Ki', chapters: 22 },
  { code: '2ki', name: '2 Kings', logos: '2Ki', chapters: 25 },
  { code: '1ch', name: '1 Chronicles', logos: '1Ch', chapters: 29 },
  { code: '2ch', name: '2 Chronicles', logos: '2Ch', chapters: 36 },
  { code: 'ezr', name: 'Ezra', logos: 'Ezr', chapters: 10 },
  { code: 'neh', name: 'Nehemiah', logos: 'Ne', chapters: 13 },
  { code: 'est', name: 'Esther', logos: 'Es', chapters: 10 },
  { code: 'job', name: 'Job', logos: 'Job', chapters: 42 },
  { code: 'psa', name: 'Psalms', logos: 'Ps', chapters: 150 },
  { code: 'pro', name: 'Proverbs', logos: 'Pr', chapters: 31 },
  { code: 'ecc', name: 'Ecclesiastes', logos: 'Ec', chapters: 12 },
  { code: 'sng', name: 'Song of Solomon', logos: 'So', chapters: 8 },
  { code: 'isa', name: 'Isaiah', logos: 'Isa', chapters: 66 },
  { code: 'jer', name: 'Jeremiah', logos: 'Jer', chapters: 52 },
  { code: 'lam', name: 'Lamentations', logos: 'La', chapters: 5 },
  { code: 'ezk', name: 'Ezekiel', logos: 'Eze', chapters: 48 },
  { code: 'dan', name: 'Daniel', logos: 'Da', chapters: 12 },
  { code: 'hos', name: 'Hosea', logos: 'Ho', chapters: 14 },
  { code: 'jol', name: 'Joel', logos: 'Joel', chapters: 3 },
  { code: 'amo', name: 'Amos', logos: 'Am', chapters: 9 },
  { code: 'oba', name: 'Obadiah', logos: 'Ob', chapters: 1 },
  { code: 'jon', name: 'Jonah', logos: 'Jon', chapters: 4 },
  { code: 'mic', name: 'Micah', logos: 'Mic', chapters: 7 },
  { code: 'nam', name: 'Nahum', logos: 'Na', chapters: 3 },
  { code: 'hab', name: 'Habakkuk', logos: 'Hab', chapters: 3 },
  { code: 'zep', name: 'Zephaniah', logos: 'Zep', chapters: 3 },
  { code: 'hag', name: 'Haggai', logos: 'Hag', chapters: 2 },
  { code: 'zec', name: 'Zechariah', logos: 'Zec', chapters: 14 },
  { code: 'mal', name: 'Malachi', logos: 'Mal', chapters: 4 },
];

export const otBookOf = (code: string): OtBook | undefined => OT_BOOKS.find((b) => b.code === code);
