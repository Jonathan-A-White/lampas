// src/nav/refsInText.ts — every Bible reference in free text (mw-s1dc0n.1, Share to Lampas): 'Gen. 1:28 ESV', 'Rom 8:28-30', '1 John 1:1', 'Ps 23', 'Rom 8:28, 31'.
// Pure. The book names are links.ts's (parseCanonReference, never a second table); a translation tag after a reference (ESV, NIV, KJV) is not part of it. Each
// reference keeps the words as printed and its OSIS ref; the list can be kept in the order of the page or in Bible order.
import { BOOKS, bookOf, ntBookOf, otBookOf } from '../data/books';
import { inWords, osisOf, parseHeldReference } from './links';

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
  String.raw`(?<![\p{L}\p{N}])((?:(?:[1-3]\s?|(?:First|Second|Third|III|II|I)\.?\s+))?\p{L}+(?:\s+of\s+\p{L}+)?\.?)\s*(\d+)(?::\s*(\d+)(\s*[-–]\s*(\d+))?((?:\s*,\s*\d+(?!\s*[:\d])(?:\s*[-–]\s*\d+)?)*))?`,
  'giu',
);

// 'First John', 'II Cor': the number of a book written as a word or a Roman numeral, as the digit the book table reads ('1 John'). A lowercase 'i' is the word, not a numeral.
const PREFIXES: Readonly<Record<string, string>> = { first: '1', second: '2', third: '3', i: '1', ii: '2', iii: '3' };
const numbered = (name: string): string | null => {
  const prefix = /^(First|Second|Third|III|II|I|first|second|third)\.?\s+/.exec(name);
  return prefix ? name.replace(prefix[0], `${PREFIXES[prefix[1].toLowerCase()]} `) : /^(?:i{1,3})\.?\s/i.test(name) ? null : name;
};

/** Where a verse list stops at a numbered book that follows a comma ('Rom 8:1, 2 Cor 5:17': the '2' begins '2 Cor', it is no verse of Romans): the tail cut before that comma. */
const beforeBook = (text: string, tailAt: number, tail: string): string => {
  for (const comma of tail.matchAll(/\s*,\s*/g)) {
    const next = /^([1-3]\s?\p{L}+\.?)\s*\d/u.exec(text.slice(tailAt + comma.index + comma[0].length));
    if (next && parseHeldReference(next[1])) return tail.slice(0, comma.index);
  }
  return tail;
};

/** Words of one or two letters, and a book alone with a chapter, that are far likelier to be plain English than a book unless they are written as a book is. */
const NOT_ENGLISH = (name: string, chapterOnly: boolean): boolean => {
  const word = name.replace(/\.$/, '');
  const capital = /^\p{Lu}/u.test(word);
  if (chapterOnly) return capital && !/^(?:is|re)$/i.test(word);
  return word.length > 2 || /^\d/.test(word) || capital;
};

export const chaptersOf = (book: string, testament: 'nt' | 'ot'): number | undefined => (testament === 'nt' ? ntBookOf(book)?.chapters : otBookOf(book)?.chapters);

/** A reference found in the text and the characters of the text it was read from (`start` to `end`): for what links each reference where it stands (src/reftagger/reftagger.ts). */
export interface ReferenceSpan extends FoundReference {
  start: number;
  end: number;
}

// A verse list's next chapter after a ';' ('Romans 8:1; 10:9-10'): the same book, a new chapter and verse, a range and a list of more verses.
const AFTER_SEMICOLON = /\s*;\s*(\d+)\s*:\s*(\d+)(\s*[-–]\s*(\d+))?((?:\s*,\s*\d+(?!\s*[:\d])(?:\s*[-–]\s*\d+)?)*)/y;

/** Every reference in `text`, in the order the text has them (a reference named twice is found twice), each with where it stands. With `semicolons` a ';' goes on a list into the
 *  next chapter of the same book ('Romans 8:1; 10:9-10' is Romans 8:1 and Romans 10:9-10); the Share list does not read that. */
export function referenceSpans(text: string, { semicolons = false }: { semicolons?: boolean } = {}): ReferenceSpan[] {
  const found: ReferenceSpan[] = [];
  FIND.lastIndex = 0;
  for (let m = FIND.exec(text); m; m = FIND.exec(text)) {
    const [matched, name, chapterText, verseText, range, rangeEnd, listTail] = m;
    // A book of the Apocrypha is read by the tutor's links (verseLinks.ts, tutorLinks.ts), not listed here: Lampas holds no text of it, and a saved list, Share's cards and the
    // Memorize list are of verses it can open (mw-5r3p30.1034).
    const read = numbered(name);
    const named = read === null ? null : parseHeldReference(read);
    const chapter = Number(chapterText);
    const limit = named && chaptersOf(named.book, named.testament);
    if (!named || named.chapter !== undefined || !limit || chapter < 1 || chapter > limit || !NOT_ENGLISH(read as string, verseText === undefined)) {
      // a numbered book with no such chapter ('3 John 4') is read through, or its 'John 4' would be taken for John
      FIND.lastIndex = named && limit && chapter > limit && /^(?:\d|first|second|third|i{1,3}\b)/i.test(name) ? m.index + matched.length : m.index + 1;
      continue;
    }
    const more = beforeBook(text, m.index + matched.length - (listTail ?? '').length, listTail ?? '');
    const whole = matched.slice(0, matched.length - ((listTail ?? '').length - more.length));
    const { book, testament } = named;
    const make = (printed: string, chapterOf: number, verse: number | undefined, at: number, to: number, lastVerse?: number): ReferenceSpan => ({
      printed,
      ref: `${osisOf(book)}.${chapterOf}${verse === undefined ? '' : `.${verse}`}`,
      book,
      testament,
      chapter: chapterOf,
      ...(verse === undefined ? {} : { verse }),
      ...(lastVerse === undefined || lastVerse === verse ? {} : { lastVerse }),
      start: at,
      end: to,
    });
    if (verseText === undefined) {
      found.push(make(whole.trim(), chapter, undefined, m.index, m.index + whole.trimEnd().length));
      continue;
    }
    // the verses after the first: a list ('Rom 8:28, 31') is one reference for each verse, written with the book as printed ('Rom 8:31')
    const listed = (at: number, tail: string, head: string, chapterOf: number): void => {
      for (const item of tail.matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?/g)) {
        const itemAt = at + (item.index as number);
        found.push(make(`${head}:${item[1]}`, chapterOf, Number(item[1]), itemAt, itemAt + item[0].length, item[2] === undefined ? undefined : Number(item[2])));
      }
    };
    const head = `${name.trim()} ${chapterText}`;
    const first = Number(verseText);
    found.push(make(`${head}:${verseText}${range ?? ''}`, chapter, first, m.index, m.index + whole.length - more.length, rangeEnd === undefined ? undefined : Number(rangeEnd)));
    listed(m.index + whole.length - more.length, more, head, chapter);
    let end = m.index + whole.length;
    while (semicolons) {
      AFTER_SEMICOLON.lastIndex = end;
      const next = AFTER_SEMICOLON.exec(text);
      const nextChapter = next && Number(next[1]);
      if (!next || !nextChapter || nextChapter > limit) break;
      const nextHead = `${name.trim()} ${next[1]}`;
      const rawTail = next[5] ?? '';
      const verseEnd = end + next[0].length - rawTail.length;
      const tail = beforeBook(text, verseEnd, rawTail);
      const itemAt = end + next[0].indexOf(next[1]);
      found.push(make(`${nextHead}:${next[2]}${next[3] ?? ''}`, nextChapter, Number(next[2]), itemAt, verseEnd, next[4] === undefined ? undefined : Number(next[4])));
      listed(verseEnd, tail, nextHead, nextChapter);
      end += next[0].length - (rawTail.length - tail.length);
    }
    FIND.lastIndex = end;
  }
  return found;
}

/** Every reference in `text`, in the order the text has them (a reference named twice is found twice). */
export function findReferences(text: string): FoundReference[] {
  return referenceSpans(text).map((span) => {
    const reference: Partial<ReferenceSpan> = { ...span };
    delete reference.start;
    delete reference.end;
    return reference as FoundReference;
  });
}

/** Where a book stands in the Bible: canon order, the Old Testament's books first, then the New's. */
const bookPlace = (r: Pick<FoundReference, 'book'>): number => BOOKS.findIndex((b) => b.code === r.book);

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

/** What a reference is called on its card: in words ('Genesis 1:28', 'Psalm 23', a range 'Genesis 1:28-30'), as the tutor's cards head it. */
export function headingOf(r: Pick<FoundReference, 'ref' | 'lastVerse'>): string {
  const words = inWords(r.ref).replace(/^Psalms /, 'Psalm ');
  return r.lastVerse === undefined ? words : `${words}-${r.lastVerse}`;
}

/** A book's name as the lists write it. */
export const bookNameOf = (r: Pick<FoundReference, 'book' | 'testament'>): string => bookOf(r.book)?.name ?? r.book;

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
