// src/markdown/verseLinks.ts — a New Testament verse the tutor names in an answer ('Hebrews 7:2', 'Heb 7:2', 'Romans 8:28-30') is a link that opens that verse's
// Verse view (mw-5r3p30.123). referencesIn finds them in a text; remarkVerses is the remark plugin that wraps each in a link to the reader's address of the verse
// (a range opens its first verse). The Old Testament is left as it is: Lampas holds no Old Testament text, and its verses have their jumping-off chips under the
// answer (src/TutorLinks.tsx). A name is capitalised and the chapter and verse are written with a colon, so 'a 7:2 ratio' and 'Romans 8' are not references.
import { placeOf } from '../resources/tutorLinks';
import { readerHash } from '../nav/route';

/** The verse a reference opens. */
export interface VersePlace {
  book: string;
  chapter: number;
  verse: number;
}

/** A reference found in a text: where it stands (`start` to `end`, the characters written) and the verse it opens. */
export interface FoundReference {
  start: number;
  end: number;
  place: VersePlace;
}

const REFERENCE = /\b((?:[1-3]\s?)?[A-Z][a-z]+\.?)\s?(\d{1,3}):(\d{1,3})(?:\s?[-–]\s?\d{1,3})?/g;

/** The New Testament verses `text` names, in order. A reference to a book of the Old Testament, a chapter or verse the book lacks, or no book is not one. */
export function referencesIn(text: string): FoundReference[] {
  const found: FoundReference[] = [];
  for (const m of text.matchAll(REFERENCE)) {
    const place = placeOf(`${m[1]} ${m[2]}:${m[3]}`);
    if (place?.reader && place.verse !== undefined) {
      found.push({ start: m.index, end: m.index + m[0].length, place: { book: place.book, chapter: place.chapter, verse: place.verse } });
    }
  }
  return found;
}

/** The address a verse link carries: the reader's own, with the verse. */
export const verseHash = (place: VersePlace): string => readerHash(place);

/** An address verseHash wrote (the only kind of in-app link an answer may carry). */
export const VERSE_HASH = /^#\/\?b=[a-z0-9]+&c=\d+&v=\d+$/;

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
      next.push({ type: 'link', url: verseHash(f.place), children: [{ type: 'text', value: value.slice(f.start, f.end) }] });
      at = f.end;
    }
    if (at < value.length) next.push({ type: 'text', value: value.slice(at) });
  }
  node.children = next;
}

export function remarkVerses() {
  return (tree: MdNode): void => wrap(tree);
}
