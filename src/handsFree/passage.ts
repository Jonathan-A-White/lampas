// src/handsFree/passage.ts — the words after 'read', 'open' or 'go to' become a place (mw-rl10piw.7): the kit's normaliseSpoken (number words as digits, 'first' as 1, no
// punctuation), 'chapter' and 'verse' dropped (what is left is a book and one or two numbers), then readPlace (src/nav/parseReference.ts, the one reader of a place and of
// the book names). The recogniser's habits: a chapter and a verse said as 'john 3 16' (or 'john 3:16', which normalising makes the same) are John 3:16 when the chapter has
// that verse, and 'john 316', one number too big for a chapter, is read as a chapter and a verse the same way. Pure.
import { normaliseSpoken } from 'voice-kit/handsfree';
import { CANON_INDEX } from '../data/bookIndex';
import { readPlace } from '../nav/parseReference';

/** What the words come to: a place in a book Lampas holds, nothing, or a chapter the book does not have (`message` says so: 'John has 21 chapters'). */
export type SpokenPlace = { kind: 'place'; book: string; chapter: number; verse?: number } | { kind: 'none' } | { kind: 'bad'; message: string };

const NONE: SpokenPlace = { kind: 'none' };

/** How many verses a chapter has; 0 for a chapter Lampas does not hold. */
const versesIn = (book: string, chapter: number): number => CANON_INDEX.books.find((b) => b.code === book)?.verses[chapter - 1] ?? 0;

/** The place `book` `chapter`:`verse` names, only when the chapter has that verse. */
function chapterAndVerse(name: string, chapter: string, verse: string): SpokenPlace {
  const read = readPlace(`${name} ${chapter}:${verse}`);
  if (read.kind !== 'place' || read.testament === 'ap' || read.verse === undefined) return NONE;
  return read.verse >= 1 && read.verse <= versesIn(read.book, read.chapter) ? { kind: 'place', book: read.book, chapter: read.chapter, verse: read.verse } : NONE;
}

/** The place the words name ('john 3', 'first john 2', 'romans 8 verse 28', 'john 316'). `words` are the words after the command's phrase, spoken as they came. */
export function placeOfWords(words: string): SpokenPlace {
  const plain = normaliseSpoken(words)
    .split(' ')
    .filter((w) => w !== 'chapter' && w !== 'verse' && w !== 'verses')
    .join(' ');
  const parts = /^(.*?[a-z.])\s*(\d+)(?:\s+(\d+))?$/.exec(plain);
  if (!parts) return NONE;
  const [, name, first, second] = parts;
  if (second !== undefined) return chapterAndVerse(name, first, second);
  const whole = readPlace(`${name} ${first}`);
  if (whole.kind === 'place') return whole.testament === 'ap' ? NONE : { kind: 'place', book: whole.book, chapter: whole.chapter };
  if (whole.kind === 'none') return NONE;
  // one number too big for a chapter: 'john 316' is a chapter and a verse said together
  for (let at = 1; at < first.length; at++) {
    const split = chapterAndVerse(name, first.slice(0, at), first.slice(at));
    if (split.kind === 'place') return split;
  }
  return whole;
}
