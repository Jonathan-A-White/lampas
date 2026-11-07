// scripts/sermons/osis.ts — reads an OSIS reference of the sermon-index repo's rows.jsonl (docs/sources.md there, 'References') into Lampas's book codes and numbering (src/data/canon.ts):
// `Rom.5.8`, `Rom.5.1-Rom.5.11`, `Rom.5.12-Rom.6.4`, a whole chapter (`Ps.23`, `Rom.5-Rom.6`) or a whole book (`Jude`). A range over books is split into one part for each book it
// touches, cut at that book's ends, so a row can be listed under every book (scripts/sermons-build.ts). The book is the OSIS name or Lampas's code, in any case.
// The verse counts come from the caller (public/data/index.json), so a chapter or verse past the end is refused and a whole chapter has its last verse.
import { CANON } from '../../src/data/canon';
import type { SermonRef } from '../../src/data/sermonIndex';

/** The verse count of each chapter of a book, by Lampas's code; undefined for a book it does not know. */
export type VerseCounts = (code: string) => readonly number[] | undefined;

// The OSIS book ids (https://wiki.crosswire.org/OSIS_Book_Abbreviations) of the 66 books, in canon order: the same order as CANON.
const OSIS_IDS = [
  'Gen', 'Exod', 'Lev', 'Num', 'Deut', 'Josh', 'Judg', 'Ruth', '1Sam', '2Sam', '1Kgs', '2Kgs', '1Chr', '2Chr', 'Ezra', 'Neh', 'Esth', 'Job', 'Ps', 'Prov', 'Eccl', 'Song', 'Isa', 'Jer', 'Lam', 'Ezek', 'Dan', 'Hos',
  'Joel', 'Amos', 'Obad', 'Jonah', 'Mic', 'Nah', 'Hab', 'Zeph', 'Hag', 'Zech', 'Mal',
  'Matt', 'Mark', 'Luke', 'John', 'Acts', 'Rom', '1Cor', '2Cor', 'Gal', 'Eph', 'Phil', 'Col', '1Thess', '2Thess', '1Tim', '2Tim', 'Titus', 'Phlm', 'Heb', 'Jas', '1Pet', '2Pet', '1John', '2John', '3John', 'Jude', 'Rev',
] as const;

/** Lampas's code of a book by its OSIS id or its own code, lower-cased; the position in CANON is the book's number. */
const CODES = new Map<string, string>();
OSIS_IDS.forEach((id, i) => {
  CODES.set(id.toLowerCase(), CANON[i].code);
  CODES.set(CANON[i].code, CANON[i].code);
});

export type OsisResult = { ok: true; parts: SermonRef[] } | { ok: false; reason: string; /** the book as written, when the book is why */ book?: string };

interface Point {
  book: string;
  chapter: number;
  verse: number;
}

const fail = (reason: string, book?: string): OsisResult => ({ ok: false, reason, ...(book === undefined ? {} : { book }) });

/**
 * The first or last verse of an endpoint written `Book`, `Book.C` or `Book.C.V`: a book is its first (or last) chapter's first (or last) verse. An error is a string.
 */
function endpoint(text: string, side: 'first' | 'last', verses: VerseCounts): Point | string | { unknownBook: string } {
  const [name, c, v, ...more] = text.split('.');
  if (more.length || !name) return `'${text}' is not Book, Book.C or Book.C.V`;
  const book = CODES.get(name.toLowerCase());
  if (!book) return { unknownBook: name };
  const counts = verses(book);
  if (!counts) return { unknownBook: name };
  const number = (s: string): number | undefined => (/^\d+$/.test(s) ? Number(s) : undefined);
  const chapter = c === undefined ? (side === 'first' ? 1 : counts.length) : number(c);
  if (chapter === undefined) return `'${text}': '${c}' is not a chapter`;
  if (chapter < 1 || chapter > counts.length) return `'${text}': chapter ${chapter} is past the end of ${book} (${counts.length} chapters)`;
  const last = counts[chapter - 1];
  const verse = v === undefined ? (side === 'first' ? 1 : last) : number(v);
  if (verse === undefined) return `'${text}': '${v}' is not a verse`;
  if (verse < 1 || verse > last) return `'${text}': verse ${verse} is not a verse of ${book} ${chapter} (${last} verses)`;
  return { book, chapter, verse };
}

export function parseOsisRef(ref: string, verses: VerseCounts): OsisResult {
  const trimmed = ref.trim();
  if (trimmed === '') return fail('no reference');
  const ends = trimmed.split('-');
  if (ends.length > 2) return fail(`'${trimmed}': more than one range`);
  const start = endpoint(ends[0], 'first', verses);
  const end = endpoint(ends[ends.length - 1], 'last', verses);
  for (const p of [start, end]) {
    if (typeof p === 'string') return fail(p);
    if ('unknownBook' in p) return fail(`unknown book '${p.unknownBook}'`, p.unknownBook);
  }
  const a = start as Point;
  const b = end as Point;
  const first = CANON.findIndex((x) => x.code === a.book);
  const last = CANON.findIndex((x) => x.code === b.book);
  const before = last < first || (last === first && (b.chapter < a.chapter || (b.chapter === a.chapter && b.verse < a.verse)));
  if (before) return fail(`'${trimmed}': the range ends before it starts`);
  const parts: SermonRef[] = [];
  for (let i = first; i <= last; i++) {
    const book = CANON[i].code;
    const counts = verses(book)!;
    const from = i === first ? a : { chapter: 1, verse: 1 };
    const to = i === last ? b : { chapter: counts.length, verse: counts[counts.length - 1] };
    parts.push({ book, chapter: from.chapter, from: from.verse, to: to.verse, ...(to.chapter === from.chapter ? {} : { toChapter: to.chapter }) });
  }
  return { ok: true, parts };
}
