// src/markdown/verseLinks.ts — a Bible reference the tutor names in an answer ('Ps. 110', 'Heb 7:1-3', 'Hebrews 7:2', 'Romans 8') is a link (mw-5r3p30.133, which
// replaced mw-5r3p30.123's link straight to the verse): a tap opens a card with the passage's text, and the card's Open opens the reader there (ReferenceCard.tsx).
// referencesIn finds them in a text; remarkVerses is the remark plugin that wraps each in a link whose address is the `?ref=` form Lampas takes in (nav/links.ts,
// docs/links.md), carrying the reference as written. nav/links.ts reads the book, tutorLinks.ts placeOf checks the chapter and verse: no second parser. The Old
// Testament is linked too; a book Lampas holds no data for has a card that says it is not in Lampas yet (books.ts isHeld). A name is capitalised, so 'a 7:2 ratio' is not a reference.
// A name followed by a full stop is a reference only when it is an abbreviation ('Ps. 110', 'Rev. 1'): 'Revelation. 1. Daniel' is a sentence ending and a list's '1.' (mw-5r3p30.927).
// A reference that leans on what the answer named before it is linked too, by a ReferenceContext carried down the answer: 'Daniel, above all chapters 2, 7 and 10 to 12' is Daniel 2,
// Daniel 7 and Daniel 10-12, 'Ezekiel 10 ... verse 21 ... and 22' is Ezekiel 10:21 and 10:22. The link text stays as written; `as` is the whole reference its address carries.
import { CANON_INDEX } from '../data/bookIndex';
import { bookOf } from '../data/books';
import { parseCanonReference } from '../nav/links';
import { placeOf } from '../resources/tutorLinks';

/** The passage a reference names in a book Lampas holds: `first` and `last` are verses of `chapter`. */
export interface HeldPlace {
  book: string;
  chapter: number;
  first: number;
  last: number;
}

/** What a reference's card shows: its heading ('Hebrews 7:1-3'; a whole chapter is headed by its first verse, 'Hebrews 7:1', which is the verse shown) and the
 *  passage when Lampas holds its text (null for a book it has no data for). */
export interface ReferenceCard {
  heading: string;
  held: HeldPlace | null;
}

/** A reference found in a text: where it stands (`start` to `end`, the characters written, which `written` repeats) and its card. */
export interface FoundReference {
  start: number;
  end: number;
  written: string;
  card: ReferenceCard;
  /** the whole reference when `written` leans on the book or chapter named before it ('Daniel 10-12' for '10 to 12'); its address carries this, its text stays `written` */
  as?: string;
}

// name, chapter, then optionally ':verse' and a range's end, or a range of chapters ('Daniel 10-12')
const PATTERN = String.raw`\b((?:[1-3]\s?)?[A-Z][a-z]+\.?)\s?(\d{1,3})(?::(\d{1,3})(?:\s?[-–]\s?(\d{1,3}))?|\s?[-–]\s?(\d{1,3}))?`;
const REFERENCE = new RegExp(PATTERN, 'g');
const WHOLE = new RegExp(`^${PATTERN}$`);

/** Whether `name chapterEnd` runs on from `chapter` to a chapter the book has ('Daniel 10-12'); a dash that does not is no range. */
const runsOn = (name: string, chapter: string, chapterEnd: string): boolean => Number(chapterEnd) > Number(chapter) && placeOf(`${name} ${chapterEnd}`) !== null;

function cardFrom([, name, chapter, verse, end, chapterEnd]: RegExpExecArray | RegExpMatchArray, every = false): ReferenceCard | null {
  const place = placeOf(verse === undefined ? `${name} ${chapter}` : `${name} ${chapter}:${verse}`);
  if (!place) return null;
  const title = place.name.replace(/^Psalms /, 'Psalm ');
  const known = CANON_INDEX.books.find((b) => b.code === place.book)?.verses[place.chapter - 1];
  if (place.verse !== undefined && known !== undefined && place.verse > known) return null;
  // A range of chapters opens its first chapter and its card names all of them.
  const through = chapterEnd !== undefined && runsOn(name, chapter, chapterEnd) ? chapterEnd : undefined;
  if (!place.reader && !every) return { heading: end !== undefined ? `${title}-${end}` : through !== undefined ? `${title}-${through}` : title, held: null };
  const first = place.verse ?? 1;
  const verses = known ?? first;
  // A range ends at the chapter's last verse at most; one that does not run forward is its first verse alone.
  const last = place.verse !== undefined && end !== undefined ? Math.max(first, Math.min(Number(end), verses)) : first;
  const heading = place.verse === undefined ? (through !== undefined ? `${title}-${through}` : `${title}:1`) : last > first ? `${title}-${last}` : title;
  return { heading, held: { book: place.book, chapter: place.chapter, first, last } };
}

/** The card of one reference as written ('Heb 7:1-3'), or null when it names no place in the Bible. With `every` the card holds an Old Testament passage too (a Review question's
 *  verse, whose chapter the Reader holds in Hebrew, mw-gdcyf98.4); without it a place Lampas holds no data for is linked only. */
export function cardOf(written: string, every = false): ReferenceCard | null {
  const m = WHOLE.exec(written.trim());
  return m && cardFrom(m, every);
}

/** Where a reference as written ('Ecclesiastes 12:13', 'Isaiah 53:5-7') points, for a link to a Bible app: the book's code, the chapter and the first verse
 *  (none for a whole chapter). Null for a place Lampas holds, which opens in the Reader, and for a text that names no place. */
export function elsewhereOf(written: string): { book: string; chapter: number; verse?: number } | null {
  const m = WHOLE.exec(written.trim());
  if (!m) return null;
  const place = placeOf(m[3] === undefined ? `${m[1]} ${m[2]}` : `${m[1]} ${m[2]}:${m[3]}`);
  if (!place || place.reader) return null;
  return { book: place.book, chapter: place.chapter, ...(place.verse === undefined ? {} : { verse: place.verse }) };
}

/** Whether `dotted` ('Revelation.', 'Psalm.') is a book's whole name with a full stop after it, not an abbreviation ('Rev.', 'Ps.'). */
function fullNameWithStop(dotted: string): boolean {
  if (!dotted.endsWith('.')) return false;
  const named = parseCanonReference(dotted.slice(0, -1));
  const squash = (n: string): string => n.toLowerCase().replace(/[^a-z0-9]/g, '');
  const said = squash(dotted);
  return named !== null && (said === squash(bookOf(named.book)?.name ?? '') || (named.book === 'psa' && said === 'psalm'));
}

/** What an answer has named so far, carried from one text of it to the next so a later 'chapters 2, 7 and 10 to 12' or '22' knows its book and chapter. `kind` is what the
 *  last thing named was: a book alone, a chapter written in full ('Ezekiel 10'), a chapter that leaned on the book, or a verse. `fresh` is true while no sentence has ended since;
 *  `chain` is true right after a link, when ', 9' or ' and 11' goes on with the list. */
export interface ReferenceContext {
  book?: string;
  chapter?: number;
  kind: 'book' | 'chapter-ref' | 'chapter' | 'verse';
  fresh: boolean;
  chain: boolean;
}

export const newReferenceContext = (): ReferenceContext => ({ kind: 'book', fresh: false, chain: false });

// A chapter or verse word, then its number; a book's name alone; a number alone (one to three digits, never part of a longer number).
const CONTEXT = /(\b(?:[Cc]hapters?|[Cc]hs?\.|[Vv]erses?|[Vv]v?\.)\s?(?=\d))|(\b(?:[1-3]\s?)?[A-Z][a-z]+)|((?<!\d)(\d{1,3})(?::(\d{1,3}))?(?!\d))/g;
const ITEM = /(\d{1,3})(?:\s?(?:to|through|[-–])\s?(\d{1,3}))?(?!\d)/y;
const SEPARATOR = /\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+/y;
const SEPARATOR_ONLY = /^(?:\s*,\s*(?:(?:and|or)\s+)?|\s+(?:and|or)\s+)$/;
const CONNECTOR = /\b(?:in|see|from|through|compare|cf\.?|also|and|or|to)\s*$/i;
// What may follow a number that is a reference and not a count ('3 times'), a year or a list's '1.': the end of the text, a punctuation mark, or a word that goes on with the sentence.
const FOLLOW = /^(?:\.?\s*$|\s*[,;:)\]—–-]|\s+(?:and|or|to|through|with|but|where|which|is|are|was|were|as|for|from|also|then|says|shows|speaks|begins|opens|gives|has|have|in|on|the|that)\b)/;
const ENDS_SENTENCE = /[.!?;:]/;

/** Where the reference `written` stands in `text` (`start` to `end` are the characters shown as the link), or null when it names no place. */
function leaning(text: string, start: number, end: number, as: string): FoundReference | null {
  const card = cardOf(as);
  return card ? { start, end, written: text.slice(start, end), card, as } : null;
}

/** The references `text` names, in order, in any book of the Bible; with `context` (one per answer), also those that lean on a book or chapter named before them.
 *  A book Lampas does not know, a chapter or verse the book lacks, or no book is not one. */
export function referencesIn(text: string, context: ReferenceContext = newReferenceContext()): FoundReference[] {
  const events: { start: number; end: number; explicit?: FoundReference; m?: RegExpExecArray }[] = [];
  for (const m of text.matchAll(REFERENCE)) {
    if (fullNameWithStop(m[1])) continue;
    // A dash that runs on to no chapter is not part of the reference.
    const end = m[5] !== undefined && !runsOn(m[1], m[2], m[5]) ? m.index + m[0].search(/\s?[-–]\s?\d{1,3}$/) : m.index + m[0].length;
    const card = cardFrom(end === m.index + m[0].length ? m : ([m[0], m[1], m[2], m[3], m[4]] as unknown as RegExpMatchArray));
    if (card) events.push({ start: m.index, end, explicit: { start: m.index, end, written: text.slice(m.index, end), card }, m });
  }
  const spans = events.map((e) => [e.start, e.end]);
  for (const m of text.matchAll(CONTEXT)) {
    if (!spans.some(([a, b]) => m.index < b && m.index + m[0].length > a)) events.push({ start: m.index, end: m.index + m[0].length, m });
  }
  events.sort((a, b) => a.start - b.start);

  const found: FoundReference[] = [];
  let cursor = 0;
  let taken = 0;
  const leant = (hit: FoundReference | null, chapter: number, kind: ReferenceContext['kind']): boolean => {
    if (!hit) return false;
    found.push(hit);
    context.chapter = chapter;
    context.kind = kind;
    context.fresh = true;
    context.chain = true;
    return true;
  };
  for (const ev of events) {
    if (ev.start < taken) continue;
    const gap = text.slice(cursor, ev.start);
    if (ENDS_SENTENCE.test(gap)) context.fresh = false;
    cursor = ev.end;
    if (ev.explicit && ev.m) {
      found.push(ev.explicit);
      context.book = ev.m[1];
      context.chapter = Number(ev.m[2]);
      context.kind = ev.m[3] === undefined ? 'chapter-ref' : 'verse';
      context.fresh = true;
      context.chain = true;
      continue;
    }
    const m = ev.m as RegExpExecArray;
    if (m[2] !== undefined) {
      // a book's name alone (not a word of one or two letters, which is likelier plain English)
      const named = m[2].replace(/^[1-3]\s?/, '').length >= 3 ? parseCanonReference(m[2]) : null;
      context.chain = false;
      if (named && named.chapter === undefined) {
        context.book = m[2];
        context.chapter = undefined;
        context.kind = 'book';
        context.fresh = true;
      }
      continue;
    }
    const book = context.book;
    if (m[1] !== undefined) {
      // 'chapters 2, 7 and 10 to 12', 'verse 22', 'vv. 3-5': each number is a link of its own, the word before them is not
      const chapters = /^[Cc]h/.test(m[1]);
      context.chain = false;
      if (book === undefined || (!chapters && context.chapter === undefined)) continue;
      let at = ev.end;
      for (let first = true; ; first = false) {
        ITEM.lastIndex = at;
        const item = ITEM.exec(text);
        if (!item) break;
        const range = item[2] !== undefined && Number(item[2]) > Number(item[1]);
        const itemEnd = range ? at + item[0].length : at + item[1].length;
        if (!first && !FOLLOW.test(text.slice(itemEnd))) break;
        const numbers = range ? `${item[1]}-${item[2]}` : item[1];
        leant(leaning(text, at, itemEnd, chapters ? `${book} ${numbers}` : `${book} ${context.chapter}:${numbers}`), chapters ? Number(item[1]) : (context.chapter as number), chapters ? 'chapter' : 'verse');
        taken = itemEnd;
        SEPARATOR.lastIndex = itemEnd;
        const sep = SEPARATOR.exec(text);
        if (!sep) break;
        at = itemEnd + sep[0].length;
      }
      cursor = Math.max(cursor, taken);
      continue;
    }
    // a number alone: it goes on a list ('Romans 8, 9 and 11') or stands in a clause about the book ('Ezekiel sees it depart in 11')
    const chain = context.chain;
    context.chain = false;
    if (book === undefined) continue;
    const goesOn = chain && SEPARATOR_ONLY.test(gap);
    if (!goesOn && !(context.fresh && CONNECTOR.test(gap))) continue;
    const chapterVerse = m[5] !== undefined;
    const reachesTo = chapterVerse ? null : /^\s?(?:to|through|[-–])\s?(\d{1,3})(?!\d)/.exec(text.slice(ev.end));
    const range = reachesTo !== null && Number(reachesTo[1]) > Number(m[4]);
    const end = ev.end + (range && reachesTo ? reachesTo[0].length : 0);
    if (!FOLLOW.test(text.slice(end))) continue;
    const numbers = range && reachesTo ? `${m[4]}-${reachesTo[1]}` : m[4];
    const verse = context.kind === 'verse' || (!goesOn && context.kind === 'chapter-ref');
    let hit: FoundReference | null;
    if (chapterVerse) hit = leaning(text, ev.start, end, `${book} ${m[4]}:${m[5]}`);
    else if (verse && context.chapter !== undefined) hit = leaning(text, ev.start, end, `${book} ${context.chapter}:${numbers}`);
    else hit = verse ? null : leaning(text, ev.start, end, `${book} ${numbers}`);
    if (leant(hit, chapterVerse ? Number(m[4]) : verse ? (context.chapter as number) : Number(m[4]), chapterVerse || verse ? 'verse' : 'chapter')) {
      taken = end;
      cursor = end;
    }
  }
  if (ENDS_SENTENCE.test(text.slice(cursor))) context.fresh = false;
  return found;
}

const REF_PREFIX = '#/?ref=';

/** The address a reference link carries: the `?ref=` form Lampas takes in (nav/links.ts), with the reference as written. */
export const referenceHash = (written: string): string => `${REF_PREFIX}${encodeURIComponent(written)}`;

/** The reference a referenceHash address carries, or null for any other address. */
export function writtenOf(href: string): string | null {
  if (!href.startsWith(REF_PREFIX)) return null;
  try {
    return decodeURIComponent(href.slice(REF_PREFIX.length));
  } catch {
    return null;
  }
}

interface MdNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
}

// What keeps a sentence going: a new paragraph, heading or list item ends it.
const INLINE = new Set(['strong', 'emphasis', 'delete']);

function wrap(node: MdNode, context: ReferenceContext): void {
  const children = node.children;
  if (!children || node.type === 'link' || node.type === 'linkReference') return;
  if (!INLINE.has(node.type)) context.fresh = context.chain = false;
  const next: MdNode[] = [];
  for (const child of children) {
    const found = child.type === 'text' && child.value !== undefined ? referencesIn(child.value, context) : [];
    if (found.length === 0) {
      wrap(child, context);
      next.push(child);
      continue;
    }
    const value = child.value as string;
    let at = 0;
    for (const f of found) {
      if (f.start > at) next.push({ type: 'text', value: value.slice(at, f.start) });
      next.push({ type: 'link', url: referenceHash(f.as ?? f.written), children: [{ type: 'text', value: value.slice(f.start, f.end) }] });
      at = f.end;
    }
    if (at < value.length) next.push({ type: 'text', value: value.slice(at) });
  }
  node.children = next;
}

export function remarkVerses() {
  return (tree: MdNode): void => wrap(tree, newReferenceContext());
}
