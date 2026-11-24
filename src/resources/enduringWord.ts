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

/** The address of a chapter's commentary: `https://enduringword.com/bible-commentary/john-3/`; undefined for a book it has none of. A one-chapter book is chapter 1 ('obadiah-1'). */
export function enduringWordUrl(book: string, chapter: number): string | undefined {
  const slug = ENDURING_WORD_SLUGS[book];
  return slug === undefined ? undefined : `https://enduringword.com/bible-commentary/${slug}-${chapter}/`;
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

/** The reader's row for the chapter of a place: its id is the page's slug ('john-3'), its title the chapter named. */
export function enduringWordRow(place: Pick<StudyPlace, 'book' | 'chapter'>): LinkRow | undefined {
  const url = enduringWordUrl(place.book, place.chapter);
  const slug = ENDURING_WORD_SLUGS[place.book];
  if (url === undefined || slug === undefined) return undefined;
  const name = bookOf(place.book)?.name ?? slug;
  return { id: `${slug}-${place.chapter}`, source: ENDURING_WORD_SOURCE, title: `${name} ${place.chapter} · Enduring Word`, open: { url }, opensIn: 'web' };
}

/** Opens the chapter's commentary: in Lampas's web reader when it can get the page's words, else (the reader's own fall-back) in the browser. */
export function openEnduringWord(place: Pick<StudyPlace, 'book' | 'chapter'>): void {
  const row = enduringWordRow(place);
  if (row) openSermonText(row);
}
