// src/resources/enduringWord.ts — Enduring Word (David Guzik's Bible commentary on the web, https://enduringword.com, mw-1l901so): a commentary for whoever has no DGCB volume of the book in Logos. Lampas only LINKS
// and opens the chapter's page; nothing of its text is in the bundle (its permissions page: "No permission is needed to link to resources"; what is quoted carries the credit line below and may not be changed).
// This module is the pure part: the 66 books' slugs, the chapter's address, the one row the chooser lists and the sermon-reader row a tap opens. The Logos-side rules (where the row stands) are src/library/inLogos.ts.
import { bookOf } from '../data/books';
import type { LinkRow } from '../sermons/merge';
import { openSermonText } from '../sermons/sermonText';
import type { CatalogueEntry } from './catalogue';
import type { StudyPlace } from './types';
import sectionTable from './enduringWordSections.json' with { type: 'json' };

/** The row's name in the chooser, and the Verse view door's label is 'Commentary'. */
export const ENDURING_WORD_NAME = 'Enduring Word (David Guzik)';

/** The credit line the site asks to be kept with what is quoted from it; shown wherever its text is shown (the reader sheet). Never changed. */
export const ENDURING_WORD_CREDIT = '(c)1996-present The Enduring Word Bible Commentary by David Guzik - enduringword.com';

/** What the reader says when the words of a chapter's commentary cannot be had (the page opens on the web), and what Hands-free says of it (mw-1l901so.1, .3). */
export const NO_COMMENTARY_NOTICE = 'Lampas could not get the words of this commentary, so it opens on the web.';

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

/** A heading that names verses: its number, then a parenthesis of a verse or a range ('4', '5-8', '4-5a'), each end perhaps with its chapter ('15:1-12', '35-9:1'); an en dash is a dash. */
const RANGE_HEADING = /^\s*\d+\.\s*\(\s*(?:(\d+):)?(\d+)[a-f]?\s*(?:[-–—]\s*(?:(\d+):)?(\d+)[a-f]?\s*)?\)/;

/**
 * The verses of a chapter that a section heading names (mw-1l901so.2): the page's outline headings read '2. (4) Nicodemus answers...' or '3. (5-8) Jesus explains...', and the range is the first parenthesis after the
 * heading's number, as 'from-to' or the one verse ('4'); a part of a verse ('14b') counts as the verse. Some headings name chapters (mw-1l901so.7: a page of several chapters, '(15:1-12)', and a section running into
 * the next chapter, '(35-9:1)'): of those only `chapter`'s verses count, from verse 1 where the section began before it and open-ended ('35-') where it runs on past it; an end with no chapter of its own is the
 * start's, and a start with none is `chapter`. undefined for a heading that names no verse of the chapter (and, `chapter` not given, for one that names a chapter).
 */
export function headingRange(heading: string, chapter?: number): string | undefined {
  const m = RANGE_HEADING.exec(heading);
  if (!m) return undefined;
  const [, startsIn, from = '', endsIn, to] = m;
  if (startsIn === undefined && endsIn === undefined) return to === undefined ? from : `${from}-${to}`;
  if (chapter === undefined) return undefined;
  // '35-9:1' starts in the chapter before the one it ends in
  const unnamed = endsIn === undefined || chapter < Number(endsIn) ? chapter : Number(endsIn) - (Number(from) > Number(to) ? 1 : 0);
  const first = startsIn === undefined ? unnamed : Number(startsIn);
  const last = endsIn === undefined ? first : Number(endsIn);
  if (chapter < first || chapter > last) return undefined;
  const begin = chapter === first ? from : '1';
  if (chapter < last) return `${begin}-`;
  const end = to ?? from;
  return begin === end ? begin : `${begin}-${end}`;
}

/** The ranges of a page's outline headings in a chapter, one for each heading in the page's order: heading N is the anchor `section-N` (the page's own numbering starts again in its parts, the ids do not). */
export const rangesOfHeadings = (headings: readonly string[], chapter?: number): (string | undefined)[] => headings.map((heading) => headingRange(heading, chapter));

/** The section (its N, of `section-N`) whose range holds the verse; undefined where none does. The first that does wins, should two ranges meet. */
export function enduringWordSectionOf(ranges: readonly (string | undefined)[], verse: number): number | undefined {
  const at = ranges.findIndex((range) => {
    if (range === undefined) return false;
    const [from, to] = range.split('-');
    // '35-' runs to the chapter's end
    return verse >= Number(from) && verse <= (to === '' ? Infinity : Number(to ?? from));
  });
  return at < 0 ? undefined : at + 1;
}

/**
 * The outline of every chapter page that has one, by the page's slug ('john-3'): each section's verse range, in order (only the numbers, none of the commentary's words); a heading that names no verses holds its
 * place, the ids counting it. Written by `npm run ew:sections` (scripts/enduring-word-sections.ts), which reads the pages because the app cannot (the site sends no CORS headers). A chapter not here, one whose
 * page has no outline, opens at its top.
 */
export const ENDURING_WORD_SECTIONS: Readonly<Record<string, readonly (string | undefined)[]>> = Object.fromEntries(
  Object.entries(sectionTable as Readonly<Record<string, string>>).map(([page, ranges]) => [page, ranges.split(',').map((range) => range || undefined)]),
);

/**
 * The address of a chapter's commentary: `https://enduringword.com/bible-commentary/john-3/`; undefined for a book it has none of. A one-chapter book is chapter 1 ('obadiah-1'). With a verse, the page opens at the
 * outline section whose range holds it (`#section-6`, the site has no anchor of a verse); where no section does, or the chapter has no outline, it opens at the chapter's top.
 */
export function enduringWordUrl(book: string, chapter: number, verse?: number): string | undefined {
  const slug = ENDURING_WORD_SLUGS[book];
  if (slug === undefined) return undefined;
  const url = `https://enduringword.com/bible-commentary/${slug}-${chapter}/`;
  const ranges = verse === undefined ? undefined : ENDURING_WORD_SECTIONS[`${slug}-${chapter}`];
  const section = ranges === undefined || verse === undefined ? undefined : enduringWordSectionOf(ranges, verse);
  return section === undefined ? url : `${url}#section-${section}`;
}

/** The section a commentary's address names (`…/john-3/#section-6` is 6); undefined for the chapter's top. */
export function sectionOfUrl(url: string): number | undefined {
  const m = /#section-(\d+)$/.exec(url);
  return m ? Number(m[1]) : undefined;
}

/**
 * The paragraph (its index) where section N starts in the words the reader holds of a chapter: the Nth paragraph that is an outline heading (`6. (16) God's gift`, one that names verses), in the page's order as the
 * ids section-N are. undefined where the words have no such heading (the reader starts at the top then).
 */
export function sectionStart(paragraphs: readonly string[], section: number): number | undefined {
  let seen = 0;
  for (let i = 0; i < paragraphs.length; i += 1) {
    if (!RANGE_HEADING.test(paragraphs[i] ?? '')) continue;
    seen += 1;
    if (seen === section) return i;
  }
  return undefined;
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
