// src/resources/enduringWord.ts — Enduring Word (David Guzik's Bible commentary on the web, https://enduringword.com, mw-1l901so): a commentary for whoever has no DGCB volume of the book in Logos. Lampas only LINKS
// and opens the chapter's page; nothing of its text is in the bundle (its permissions page: "No permission is needed to link to resources"; what is quoted carries the credit line below and may not be changed).
// This module is the pure part: the 66 books' slugs, the chapter's address, the one row the chooser lists and the sermon-reader row a tap opens. The Logos-side rules (where the row stands) are src/library/inLogos.ts.
import { bookOf } from '../data/books';
import type { LinkRow } from '../sermons/merge';
import { openSermonText } from '../sermons/sermonText';
import type { CatalogueEntry } from './catalogue';
import type { StudyPlace } from './types';

/** The row's name in the chooser, and the Verse view door's label is 'Commentary'. */
export const ENDURING_WORD_NAME = 'Enduring Word (David Guzik)';

/** The credit line the site asks to be kept with what is quoted from it; shown wherever its text is shown (the reader sheet). Never changed. */
export const ENDURING_WORD_CREDIT = '(c)1996-present The Enduring Word Bible Commentary by David Guzik - enduringword.com';

export const ENDURING_WORD_HOME = 'https://enduringword.com/';

/** The id the reader sheet knows this commentary by (OpenedText.source): not a source of the sermon index; the service is asked and, answering no text, the page opens on the web. */
export const ENDURING_WORD_SOURCE = 'enduring-word';

/** The resource of the row it stands as in the chooser: not a Logos Resource ID (it is a web page, 'web:' says so). */
export const ENDURING_WORD_RESOURCE = 'web:enduring-word';

/**
 * The slug of each book in the site's chapter addresses, by our book code. Read 2026-11-23 from the site's own table (the `slugs` of the `EWXref` resolver the site writes into every commentary page, by USFM code),
 * and each address of a chapter of it fetched: Psalms is singular ('psalm-73', 'psalms-73' is a 404), Song of Solomon is 'song-of-solomon', and a numbered book leads with the number ('1-john-2').
 */
export const ENDURING_WORD_SLUGS: Readonly<Record<string, string>> = {
  gen: 'genesis',
  exo: 'exodus',
  lev: 'leviticus',
  num: 'numbers',
  deu: 'deuteronomy',
  jos: 'joshua',
  jdg: 'judges',
  rut: 'ruth',
  '1sa': '1-samuel',
  '2sa': '2-samuel',
  '1ki': '1-kings',
  '2ki': '2-kings',
  '1ch': '1-chronicles',
  '2ch': '2-chronicles',
  ezr: 'ezra',
  neh: 'nehemiah',
  est: 'esther',
  job: 'job',
  psa: 'psalm',
  pro: 'proverbs',
  ecc: 'ecclesiastes',
  sng: 'song-of-solomon',
  isa: 'isaiah',
  jer: 'jeremiah',
  lam: 'lamentations',
  ezk: 'ezekiel',
  dan: 'daniel',
  hos: 'hosea',
  jol: 'joel',
  amo: 'amos',
  oba: 'obadiah',
  jon: 'jonah',
  mic: 'micah',
  nam: 'nahum',
  hab: 'habakkuk',
  zep: 'zephaniah',
  hag: 'haggai',
  zec: 'zechariah',
  mal: 'malachi',
  mat: 'matthew',
  mrk: 'mark',
  luk: 'luke',
  jhn: 'john',
  act: 'acts',
  rom: 'romans',
  '1co': '1-corinthians',
  '2co': '2-corinthians',
  gal: 'galatians',
  eph: 'ephesians',
  php: 'philippians',
  col: 'colossians',
  '1th': '1-thessalonians',
  '2th': '2-thessalonians',
  '1ti': '1-timothy',
  '2ti': '2-timothy',
  tit: 'titus',
  phm: 'philemon',
  heb: 'hebrews',
  jas: 'james',
  '1pe': '1-peter',
  '2pe': '2-peter',
  '1jn': '1-john',
  '2jn': '2-john',
  '3jn': '3-john',
  jud: 'jude',
  rev: 'revelation',
};

/** Whether the commentary has the book (a book of ours it names: the Apocrypha is not in it). */
export const hasEnduringWord = (book: string): boolean => ENDURING_WORD_SLUGS[book] !== undefined;

/**
 * The verse range a section heading names (mw-1l901so.2): the page's outline headings read '2. (4) Nicodemus answers...' or '3. (5-8) Jesus explains...', and the range is the first parenthesis after the heading's number,
 * as 'from-to' or the one verse ('4'); an en dash is a dash. undefined for a heading that names none.
 */
export function headingRange(heading: string): string | undefined {
  const m = /^\s*\d+\.\s*\(\s*(\d+)\s*(?:[-–—]\s*(\d+)\s*)?\)/.exec(heading);
  if (!m) return undefined;
  return m[2] === undefined ? m[1] : `${m[1]}-${m[2]}`;
}

/** The ranges of a page's outline headings, one for each heading in the page's order: heading N is the anchor `section-N` (the page's own numbering starts again in its parts, the ids do not). */
export const rangesOfHeadings = (headings: readonly string[]): (string | undefined)[] => headings.map(headingRange);

/** The section (its N, of `section-N`) whose range holds the verse; undefined where none does. The first that does wins, should two ranges meet. */
export function enduringWordSectionOf(ranges: readonly (string | undefined)[], verse: number): number | undefined {
  const at = ranges.findIndex((range) => {
    if (range === undefined) return false;
    const [from, to] = range.split('-').map(Number);
    return from !== undefined && verse >= from && verse <= (to ?? from);
  });
  return at < 0 ? undefined : at + 1;
}

/**
 * The outline of the chapters whose page's headings were read, by the page's slug ('john-3'): each section's verse range, in order (only the numbers, none of the commentary's words). A chapter not here opens at its top
 * (the page cannot be read from the app: the site sends no CORS headers). Add a chapter by `rangesOfHeadings` of its page's `h4#section-N` headings. PROVISIONAL: the chapters other than John 3 are still to be read.
 */
export const ENDURING_WORD_SECTIONS: Readonly<Record<string, readonly (string | undefined)[]>> = {
  'john-3': ['1-3', '4', '5-8', '9-13', '14-15', '16', '17-21', '22-24', '25-26', '27-30', '31-33', '34-36'],
};

/**
 * The address of a chapter's commentary: `https://enduringword.com/bible-commentary/john-3/`; undefined for a book it has none of. A one-chapter book is chapter 1 ('obadiah-1'). With a verse, the page opens at the
 * outline section whose range holds it (`#section-6`, the site has no anchor of a verse); where no section does, or the chapter's outline is not known, it opens at the chapter's top.
 */
export function enduringWordUrl(book: string, chapter: number, verse?: number): string | undefined {
  const slug = ENDURING_WORD_SLUGS[book];
  if (slug === undefined) return undefined;
  const url = `https://enduringword.com/bible-commentary/${slug}-${chapter}/`;
  const ranges = verse === undefined ? undefined : ENDURING_WORD_SECTIONS[`${slug}-${chapter}`];
  const section = ranges === undefined || verse === undefined ? undefined : enduringWordSectionOf(ranges, verse);
  return section === undefined ? url : `${url}#section-${section}`;
}

/** The row the chooser lists, in the place of a DGCB volume he does not have: a web page, so no Logos Resource ID. */
export const ENDURING_WORD_ENTRY: CatalogueEntry = {
  resource: ENDURING_WORD_RESOURCE,
  kind: 'commentary',
  title: 'Enduring Word Bible Commentary',
  short: ENDURING_WORD_NAME,
  author: 'David Guzik',
  lang: 'en',
  opens: 'verse',
  value: 'David Guzik’s commentary, read on the web at the chapter.',
  via: 'id',
};

/** Whether a catalogue row is this web commentary. */
export const isEnduringWord = (entry: Pick<CatalogueEntry, 'resource'>): boolean => entry.resource === ENDURING_WORD_RESOURCE;

/** The reader's row for the chapter of a place: its id is the page's slug ('john-3'), its title the chapter named, its address the section of the place's verse (enduringWordUrl). */
export function enduringWordRow(place: Pick<StudyPlace, 'book' | 'chapter'> & { verse?: number }): LinkRow | undefined {
  const url = enduringWordUrl(place.book, place.chapter, place.verse);
  const slug = ENDURING_WORD_SLUGS[place.book];
  if (url === undefined || slug === undefined) return undefined;
  const name = bookOf(place.book)?.name ?? slug;
  return { id: `${slug}-${place.chapter}`, source: ENDURING_WORD_SOURCE, title: `${name} ${place.chapter} · Enduring Word`, open: { url }, opensIn: 'web' };
}

/** Opens the chapter's commentary: in Lampas's web reader when it can get the page's words, else (the reader's own fall-back) in the browser. */
export function openEnduringWord(place: Pick<StudyPlace, 'book' | 'chapter'> & { verse?: number }): void {
  const row = enduringWordRow(place);
  if (row) openSermonText(row);
}
