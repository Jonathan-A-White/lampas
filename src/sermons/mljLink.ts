// src/sermons/mljLink.ts — the Martyn Lloyd-Jones row (mw-qtu3zvz.280.17, docs/sermons.md 'The MLJ Trust row'): one row in every chapter's Sermons list that opens the MLJ Trust's own sermon search for the chapter.
// A live link and nothing more: the Trust's terms forbid building a database of its sermons however gathered, so nothing of its pages is fetched, copied or stored; the address is built from the book and the chapter alone.
// The address form was read once, from the one page https://www.mljtrust.org/sermons/: its search box goes to /search/?q=<text> and searches the sermons' title, description and scripture reference text
// (it has no address for a scripture filter), so the query is the chapter as a reader writes it, 'Romans 8'.
import { titleOf } from '../data/books';
import type { SermonPlace, SermonRow } from './types';

/** The row's source id: it is not a source of the index (nothing is listed from it), only the id the tutor's `sermon` link names it by. */
export const MLJ_SOURCE = 'mlj-trust';
/** The row's id within that source. */
export const MLJ_ID = 'search';
/** The row's title: the preacher and the Trust that holds his sermons, the credit. */
export const MLJ_TITLE = 'Martyn Lloyd-Jones (MLJ Trust)';
/** The preacher's name, as the tutor is told it. */
export const MLJ_PREACHER = 'Martyn Lloyd-Jones';
/** The Trust's own search. */
const SEARCH = 'https://www.mljtrust.org/search/';

/** The MLJ Trust's own search for the chapter of `place` (a verse or a passage is searched as its chapter): https://www.mljtrust.org/search/?q=Romans%208. */
export function mljSearchUrl(place: SermonPlace): string {
  // one psalm is written 'Psalm 23', as the Trust's own sermon titles write it, not the book's name 'Psalms'
  const text = place.book === 'psa' ? `Psalm ${place.chapter}` : titleOf(place.book, place.chapter);
  return `${SEARCH}?q=${encodeURIComponent(text)}`;
}

/** The row as a sermon row, so the sheet and the tutor's link read it as any other web link; its `ref` is a stand-in (the chapter's first verse), the chapter is named by the tutor's own `ref` text (forTutor.ts). */
export function mljRow(place: SermonPlace): SermonRow {
  return {
    id: MLJ_ID,
    source: MLJ_SOURCE,
    title: MLJ_TITLE,
    preacher: MLJ_PREACHER,
    ref: { book: place.book, chapter: place.chapter, from: 1, to: 1 },
    role: 'text',
    open: { url: mljSearchUrl(place) },
    opensIn: 'web',
  };
}
