// src/markdown/verseLinks.ts — a Bible reference the tutor names in an answer ('Ps. 110', 'Heb 7:1-3', 'Hebrews 7:2', 'Romans 8') is a link (mw-5r3p30.133, which
// replaced mw-5r3p30.123's link straight to the verse): a tap opens a card with the passage's text, and the card's Open opens the reader there (ReferenceCard.tsx).
// referencesIn finds them in a text; remarkVerses is the remark plugin that wraps each in a link whose address is the `?ref=` form Lampas takes in (nav/links.ts,
// docs/links.md), carrying the reference as written. nav/links.ts reads the book, tutorLinks.ts placeOf checks the chapter and verse: no second parser. The Old
// Testament is linked too; its card says Lampas has no text for it yet. A name is capitalised, so 'a 7:2 ratio' is not a reference.
import { BOOK_INDEX } from '../data/bookIndex';
import { placeOf } from '../resources/tutorLinks';

/** The passage of the New Testament a reference names, which Lampas holds: `first` and `last` are verses of `chapter`. */
export interface HeldPlace {
  book: string;
  chapter: number;
  first: number;
  last: number;
}

/** What a reference's card shows: its heading ('Hebrews 7:1-3'; a whole chapter is headed by its first verse, 'Hebrews 7:1', which is the verse shown) and the
 *  passage when Lampas holds its text (null for the Old Testament). */
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
}

// name, chapter, then optionally ':verse' and a range's end
const PATTERN = String.raw`\b((?:[1-3]\s?)?[A-Z][a-z]+\.?)\s?(\d{1,3})(?::(\d{1,3})(?:\s?[-–]\s?(\d{1,3}))?)?`;
const REFERENCE = new RegExp(PATTERN, 'g');
const WHOLE = new RegExp(`^${PATTERN}$`);

function cardFrom([, name, chapter, verse, end]: RegExpExecArray | RegExpMatchArray): ReferenceCard | null {
  const place = placeOf(verse === undefined ? `${name} ${chapter}` : `${name} ${chapter}:${verse}`);
  if (!place) return null;
  const title = place.name.replace(/^Psalms /, 'Psalm ');
  if (!place.reader) return { heading: end === undefined ? title : `${title}-${end}`, held: null };
  const first = place.verse ?? 1;
  const verses = BOOK_INDEX.books.find((b) => b.code === place.book)?.verses[place.chapter - 1] ?? first;
  // A range ends at the chapter's last verse at most; one that does not run forward is its first verse alone.
  const last = place.verse !== undefined && end !== undefined ? Math.max(first, Math.min(Number(end), verses)) : first;
  const heading = place.verse === undefined ? `${title}:1` : last > first ? `${title}-${last}` : title;
  return { heading, held: { book: place.book, chapter: place.chapter, first, last } };
}

/** The card of one reference as written ('Heb 7:1-3'), or null when it names no place in the Bible. */
export function cardOf(written: string): ReferenceCard | null {
  const m = WHOLE.exec(written.trim());
  return m && cardFrom(m);
}

/** The references `text` names, in order, in any book of the Bible. A book Lampas does not know, a chapter or verse the book lacks, or no book is not one. */
export function referencesIn(text: string): FoundReference[] {
  const found: FoundReference[] = [];
  for (const m of text.matchAll(REFERENCE)) {
    const card = cardFrom(m);
    if (card) found.push({ start: m.index, end: m.index + m[0].length, written: m[0], card });
  }
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

function wrap(node: MdNode): void {
  const children = node.children;
  if (!children || node.type === 'link' || node.type === 'linkReference') return;
  const next: MdNode[] = [];
  for (const child of children) {
    const found = child.type === 'text' && child.value !== undefined ? referencesIn(child.value) : [];
    if (found.length === 0) {
      wrap(child);
      next.push(child);
      continue;
    }
    const value = child.value as string;
    let at = 0;
    for (const f of found) {
      if (f.start > at) next.push({ type: 'text', value: value.slice(at, f.start) });
      next.push({ type: 'link', url: referenceHash(f.written), children: [{ type: 'text', value: value.slice(f.start, f.end) }] });
      at = f.end;
    }
    if (at < value.length) next.push({ type: 'text', value: value.slice(at) });
  }
  node.children = next;
}

export function remarkVerses() {
  return (tree: MdNode): void => wrap(tree);
}
