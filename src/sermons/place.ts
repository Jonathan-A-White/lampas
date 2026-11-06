// src/sermons/place.ts — the place the Verse view's Sermons door is asked for (mw-qtu3zvz.2). A verse is `from`, a passage `from` and `to`, the whole chapter (the place line's) no verse at all, so the sheet
// is headed 'Romans 5' and not 'Romans 5:1-11'. The sermon index is in Lampas's chapters and verses; a Septuagint chapter (Swete's Greek, src/reader/septuagint.ts) numbers its verses its own way (Greek Ps 22:1 is
// Psalm 23:1), so there each verse is asked for as the Lampas verse it answers (`ref`), and a view of verses Lampas has none for asks for the chapter.
import type { Chapter, Verse } from '../data/chapter';
import { isSeptuagint } from '../reader/septuagint';
import type { SermonPlace } from './types';

/** `whole` is whether the verse or passage is the whole chapter (src/copy/format.ts copyUnitOf); `lampas` is the Lampas chapter the Reader was opened on. */
export function sermonPlaceOf(chapter: Pick<Chapter, 'edition' | 'verses'>, verse: Pick<Verse, 'n' | 'to'>, book: string, lampas: number, whole: boolean): SermonPlace {
  const all: SermonPlace = { book, chapter: lampas };
  if (whole) return all;
  if (!isSeptuagint(chapter)) return { book, chapter: lampas, from: verse.n, ...(verse.to === undefined ? {} : { to: verse.to }) };
  const asked = chapter.verses.filter((v) => v.n >= verse.n && v.n <= (verse.to ?? verse.n));
  const numbers = asked.flatMap((v) => [v.ref, ...(v.refs ?? [])]).flatMap((ref) => (ref && ref !== 'none' && ref.book === book && ref.chapter === lampas ? [ref.verse] : []));
  if (numbers.length === 0) return all;
  const from = Math.min(...numbers);
  const to = Math.max(...numbers);
  return { book, chapter: lampas, from, ...(to === from ? {} : { to }) };
}
