// src/nav/parseReference.ts — the one reader of a place he types (mw-5r3p30.622): 'John 18:36', 'jn18', '1 Jn 2:1', 'Ps 23', 'Song 2:4', 'John 18:36-38'. It is
// parseCanonReference (src/nav/links.ts, the one table of book names, never a second) plus the checks a field needs: a book's name alone is not a place (the field
// filters its list as before), and a chapter the book does not have says how many it has. Pure. A field that takes a book or a place (the Reader's Choose a book
// search, the reading plan's pick) reads what he typed with `readPlace` and nothing else; tests/unit/parse-reference.test.ts fails on a second table of names.
import { bookOf } from '../data/books';
import { otBookOf } from '../data/otBooks';
import { parseCanonReference } from './links';

/** What a field makes of what he typed. */
export type PlaceRead =
  /** not a reference: a book's name alone, a word, nothing (the field filters its list) */
  | { kind: 'none' }
  /** a reference to a book and chapter Lampas lists; `testament` 'ot' has no text in Lampas, only a place to open in Logos or Audible */
  | { kind: 'place'; testament: 'nt' | 'ot'; book: string; chapter: number; verse?: number; to?: number }
  /** a reference whose chapter the book does not have: `message` says so ('John has 21 chapters') */
  | { kind: 'bad'; message: string };

/** 'John has 21 chapters', and 'Jude has 1 chapter'. */
const hasChapters = (name: string, chapters: number): string => `${name} has ${chapters} ${chapters === 1 ? 'chapter' : 'chapters'}`;

export function readPlace(text: string): PlaceRead {
  const found = parseCanonReference(text);
  if (!found || found.chapter === undefined) return { kind: 'none' };
  const { testament, book, chapter, verse, to } = found;
  const held = testament === 'nt' ? bookOf(book) : otBookOf(book);
  if (!held) return { kind: 'none' };
  if (chapter < 1 || chapter > held.chapters) return { kind: 'bad', message: hasChapters(held.name, held.chapters) };
  return { kind: 'place', testament, book, chapter, ...(verse === undefined ? {} : { verse }), ...(to === undefined ? {} : { to }) };
}
