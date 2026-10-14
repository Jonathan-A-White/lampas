// src/nav/refsInText.ts — every Bible reference in free text (mw-s1dc0n.1, Share to Lampas): 'Gen. 1:28 ESV', 'Rom 8:28-30', '1 John 1:1', 'Ps 23', 'Rom 8:28, 31'.
// Pure. The book names are links.ts's (parseCanonReference, never a second table); a translation tag after a reference (ESV, NIV, KJV) is not part of it. Each
// reference keeps the words as printed and its OSIS ref; the list can be kept in the order of the page or in Bible order.
import { BOOKS, bookOf } from '../data/books';
import { OT_BOOKS, otBookOf } from '../data/otBooks';
import { osisOf, parseCanonReference } from './links';

/** One reference found in the text. A list ('Rom 8:28, 31') is one reference for each verse; a range keeps its first verse and `lastVerse`. */
export interface FoundReference {
  /** the words as printed ('Gen. 1:28'; the verses of a list after the first are written with the book as printed: 'Rom 8:31') */
  printed: string;
  /** the OSIS ref of its first verse, as links.ts writes it ('Gen.1.28', 'Ps.23') */
  ref: string;
  /** our book code ('gen', '1jn') and which testament names it */
  book: string;
  testament: 'nt' | 'ot';
  chapter: number;
  verse?: number;
  lastVerse?: number;
}

/** A reference as listed: the first of its kind in the text, and how many times the text names it. */
export interface ListedReference extends FoundReference {
  count: number;
}

export type RefsOrder = 'page' | 'bible';

// A book (a number, a word, or 'Song of Solomon', and a dot), then a chapter, then ':' verse, a range and a list of more verses. Tried at the start of each word
// (a start that turns out to be no book is skipped, one character on, so '2 Cor' is found in 'In 2 Cor 5:17').
const FIND = new RegExp(
  String.raw`(?<![\p{L}\p{N}])((?:[1-3]\s?)?\p{L}+(?:\s+of\s+\p{L}+)?\.?)\s*(\d+)(?::\s*(\d+)(\s*[-–]\s*(\d+))?((?:\s*,\s*\d+(?!\s*[:\d])(?:\s*[-–]\s*\d+)?)*))?`,
  'giu',
);

/** Words of one or two letters, and a book alone with a chapter, that are far likelier to be plain English than a book unless they are written as a book is. */
const NOT_ENGLISH = (name: string, chapterOnly: boolean): boolean => {
  const word = name.replace(/\.$/, '');
  const capital = /^\p{Lu}/u.test(word);
  if (chapterOnly) return capital && !/^(?:is|re)$/i.test(word);
  return word.length > 2 || /^\d/.test(word) || capital;
};

const chaptersOf = (book: string, testament: 'nt' | 'ot'): number | undefined => (testament === 'nt' ? bookOf(book)?.chapters : otBookOf(book)?.chapters);

/** Every reference in `text`, in the order the text has them (a reference named twice is found twice). */
export function findReferences(text: string): FoundReference[] {
  const found: FoundReference[] = [];
  FIND.lastIndex = 0;
  for (let m = FIND.exec(text); m; m = FIND.exec(text)) {
    const [whole, name, chapterText, verseText, range, rangeEnd, more] = m;
    const named = parseCanonReference(name);
    const chapter = Number(chapterText);
    const limit = named && chaptersOf(named.book, named.testament);
    if (!named || named.chapter !== undefined || !limit || chapter < 1 || chapter > limit || !NOT_ENGLISH(name, verseText === undefined)) {
      FIND.lastIndex = m.index + 1;
      continue;
    }
    const { book, testament } = named;
    const head = `${name.trim()} ${chapterText}`;
    const make = (printed: string, verse: number | undefined, lastVerse?: number): FoundReference => ({
      printed,
      ref: `${osisOf(book)}.${chapter}${verse === undefined ? '' : `.${verse}`}`,
      book,
      testament,
      chapter,
      ...(verse === undefined ? {} : { verse }),
      ...(lastVerse === undefined || lastVerse === verse ? {} : { lastVerse }),
    });
    if (verseText === undefined) {
      found.push(make(whole.trim(), undefined));
      continue;
    }
    const first = Number(verseText);
    found.push(make(`${head}:${verseText}${range ?? ''}`, first, rangeEnd === undefined ? undefined : Number(rangeEnd)));
    for (const item of more ? more.matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?/g) : []) found.push(make(`${head}:${item[1]}`, Number(item[1]), item[2] === undefined ? undefined : Number(item[2])));
  }
  return found;
}

/** Where a book stands in the Bible: the Old Testament's books first, then the New's. */
const bookPlace = (r: Pick<FoundReference, 'book' | 'testament'>): number =>
  r.testament === 'ot' ? OT_BOOKS.findIndex((b) => b.code === r.book) : OT_BOOKS.length + BOOKS.findIndex((b) => b.code === r.book);

const sameReference = (a: FoundReference, b: FoundReference): boolean => a.ref === b.ref && a.lastVerse === b.lastVerse;

/** The references as a list: each distinct one once, at its first place in the text with how many times it was named ('page'), or sorted by book, chapter and
 *  verse ('bible', a chapter alone before its verses). */
export function listReferences(found: readonly FoundReference[], order: RefsOrder): ListedReference[] {
  const listed: ListedReference[] = [];
  for (const r of found) {
    const seen = listed.find((l) => sameReference(l, r));
    if (seen) seen.count += 1;
    else listed.push({ ...r, count: 1 });
  }
  if (order === 'page') return listed;
  return listed.sort(
    (a, b) => bookPlace(a) - bookPlace(b) || a.chapter - b.chapter || (a.verse ?? 0) - (b.verse ?? 0) || (a.lastVerse ?? 0) - (b.lastVerse ?? 0),
  );
}

/** A book's name as the lists write it. */
export const bookNameOf = (r: Pick<FoundReference, 'book' | 'testament'>): string => (r.testament === 'nt' ? bookOf(r.book)?.name : otBookOf(r.book)?.name) ?? r.book;

/** A list in Bible order cut into its books, each with its references. */
export function groupedByBook(listed: readonly ListedReference[]): { book: string; name: string; refs: ListedReference[] }[] {
  const groups: { book: string; name: string; refs: ListedReference[] }[] = [];
  for (const r of listed) {
    const last = groups[groups.length - 1];
    if (last && last.book === r.book) last.refs.push(r);
    else groups.push({ book: r.book, name: bookNameOf(r), refs: [r] });
  }
  return groups;
}
