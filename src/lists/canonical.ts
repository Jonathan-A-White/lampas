// src/lists/canonical.ts — a verse list keeps each reference as a canonical string, the OSIS form src/nav/links.ts writes with an optional last verse: 'Rom.8.28', 'Ps.62.1-2', 'Ps.23'
// (a chapter alone). Pure. `canonicalOf` makes the string from a reference found in text (src/nav/refsInText.ts), `listedOf` reads it back to what the pop-up needs.
import { OSIS, OT_OSIS } from '../nav/links';
import { chaptersOf, headingOf, type FoundReference, type ListedReference } from '../nav/refsInText';

/** The canonical string of a reference: its OSIS ref and, for a range, `-<last verse>`. */
export const canonicalOf = (r: Pick<FoundReference, 'ref' | 'lastVerse'>): string => (r.lastVerse === undefined ? r.ref : `${r.ref}-${r.lastVerse}`);

/** '1 reference', '5 references'. */
export const referencesLine = (n: number): string => `${n} ${n === 1 ? 'reference' : 'references'}`;

const SHAPE = /^([1-3]?[A-Za-z]+)\.(\d{1,3})(?:\.(\d{1,3})(?:-(\d{1,3}))?)?$/;

const codeOf = (table: Readonly<Record<string, string>>, osis: string): string | undefined => Object.keys(table).find((code) => table[code] === osis);

/** The reference a canonical string names, as the Share sheet lists one (so the same pop-up opens), or null for a string that names no chapter of the Bible. */
export function listedOf(canonical: string): ListedReference | null {
  const m = SHAPE.exec(canonical.trim());
  if (!m) return null;
  const [, osis, chapterText, verseText, lastText] = m;
  const nt = codeOf(OSIS, osis);
  const book = nt ?? codeOf(OT_OSIS, osis);
  if (!book) return null;
  const testament = nt ? 'nt' : 'ot';
  const chapter = Number(chapterText);
  const limit = chaptersOf(book, testament);
  if (!limit || chapter < 1 || chapter > limit) return null;
  const verse = verseText === undefined ? undefined : Number(verseText);
  const last = lastText === undefined ? undefined : Number(lastText);
  const listed: ListedReference = {
    printed: '',
    ref: `${osis}.${chapter}${verse === undefined ? '' : `.${verse}`}`,
    book,
    testament,
    chapter,
    ...(verse === undefined || verse < 1 ? {} : { verse }),
    ...(verse === undefined || last === undefined || last <= verse ? {} : { lastVerse: last }),
    count: 1,
  };
  return { ...listed, printed: headingOf(listed) };
}
