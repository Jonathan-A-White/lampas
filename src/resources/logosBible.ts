// src/resources/logosBible.ts — an Old Testament chapter in Logos, in the Bible he chose (Settings > Bible in Logos). Lampas has no Old Testament
// text, so the chapter picker opens the chapter in his own Logos library: the Logos app's own scheme first (`logosres:<Bible>;ref=Bible.<book><chapter>`),
// with the https ref.ly address as the fallback, opened only when the phone cannot open the scheme (openApp.ts armFallback). docs/resources.md has the sources.
import { CANON } from '../data/canon';
import { otBookOf } from '../data/books';
import { entriesOf } from './catalogue';
import { resourceLink } from './logosRes';
import type { LogosPart } from './types';

export type { LogosPart };

/** The short list in Settings: `id` is the Resource ID Logos prints (the library listing); the order is the order shown. A view over the catalogue's Bibles named by id (catalogue.ts), each as 'LSB (Legacy Standard Bible)'. */
export const COMMON_BIBLES: readonly { id: string; name: string }[] = entriesOf('bible')
  .filter((e) => e.via === 'id')
  .map((e) => ({ id: e.resource, name: `${e.short} (${e.title})` }));

/** His Bible in Logos to start with: the one the catalogue pins, the Legacy Standard Bible (vault plans/lampas-logos-library-2026-10-08.csv). */
export const DEFAULT_LOGOS_BIBLE: string = (() => {
  const pinned = entriesOf('bible').find((e) => e.via === 'id' && e.starts === 'pinned');
  if (!pinned) throw new Error('The catalogue pins no Bible: one Bible named by id in data/logos/catalogue-rules.json has starts "pinned"');
  return pinned.resource;
})();

/** The Bible the Apocrypha starts in: his New Revised Standard Version, the widest-used scholarly English Bible with the Apocrypha in his library (PROVISIONAL, the Governor to confirm; mw-5r3p30.889).
 *  The Legacy Standard Bible, the New Testament's start, has none. */
export const DEFAULT_APOCRYPHA_BIBLE = 'LLS:1.0.50';

/** The Bibles a part's picker offers: those of the catalogue that hold the part (their `parts`), in the catalogue's order. */
export const biblesFor = (part: LogosPart): readonly { id: string; name: string }[] =>
  entriesOf('bible')
    .filter((e) => e.via === 'id' && e.parts?.includes(part))
    .map((e) => ({ id: e.resource, name: `${e.short} (${e.title})` }));

/** Whether the Bible holds the part: what the catalogue says of a Bible it lists; true for a Resource ID it does not list (he typed it, so it is as he typed it). */
export const bibleHolds = (resourceId: string, part: LogosPart): boolean => {
  const entry = entriesOf('bible').find((e) => e.resource === resourceId);
  return entry?.parts === undefined || entry.parts.includes(part);
};

/** What a typed Resource ID may be: `LLS:` and then letters, digits, dots, dashes or underscores (as in the library listing). */
export const isResourceId = (text: string): boolean => /^LLS:[A-Za-z0-9._-]+$/.test(text.trim());

/** The Bible's name in the scheme: the Resource ID without `LLS:`, in lower case (`LLS:LGCYSTNDRDBBLSB` is `lgcystndrdbblsb`). */
export const schemeName = (resourceId: string): string => resourceId.trim().replace(/^LLS:/i, '').toLowerCase();

/** The link that opens chapter `chapter` of the Old Testament book `code` in the Bible `resourceId`; undefined for a book or chapter that does not exist. */
export function chapterLink(code: string, chapter: number, resourceId: string): { url: string; fallback: string } | undefined {
  const book = otBookOf(code);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return undefined;
  const bible = schemeName(resourceId);
  const ref = `Bible.${book.logos}${chapter}`;
  return resourceLink(bible, `ref=${ref}`);
}

/** The books of the Apocrypha by our code (three characters, never a code of the canon's 66), with the abbreviation Logos' list gives each in a reference (UNVERIFIED on a device, docs/resources.md).
 *  Lampas holds no text of them and parses no reference to them yet; a link to one opens in his Apocrypha Bible (partOf, bibleFor). */
const APOCRYPHA_LOGOS: Readonly<Record<string, string>> = {
  tob: 'Tob',
  jdt: 'Jdt',
  wis: 'Wis',
  sir: 'Sir',
  bar: 'Bar',
  '1ma': '1Ma',
  '2ma': '2Ma',
  '1es': '1Es',
  '2es': '2Es',
  man: 'PrMan',
};

/** His Bible in Logos for each part (Settings > Bible in Logos). */
export type LogosBibles = Record<LogosPart, string>;

/** The parts in the order Settings lists them, with the setting each Bible is kept in: the New Testament's is the one `logosBible` always was, so what he chose before still holds. */
export const LOGOS_PARTS: readonly { part: LogosPart; label: string; key: string }[] = [
  { part: 'nt', label: 'New Testament', key: 'logosBible' },
  { part: 'ot', label: 'Old Testament', key: 'logosBibleOt' },
  { part: 'apocrypha', label: 'Apocrypha', key: 'logosBibleApocrypha' },
];

/** The part of the canon a book is in, by our code: the Apocrypha's, the Old Testament's, else the New Testament's (what a code that is none of them has always been given). */
export const partOf = (code: string): LogosPart => (code in APOCRYPHA_LOGOS ? 'apocrypha' : otBookOf(code) ? 'ot' : 'nt');

/** The Bible in Logos a place in the book `code` opens in: that of the book's part. */
export const bibleFor = (code: string, bibles: LogosBibles): string => bibles[partOf(code)];

/** The New Testament books' abbreviations in a Logos reference (Logos' own list, https://www.logos.com/bible-book-abbreviations, written like the Old Testament's in
 *  data/otBooks.ts; UNVERIFIED on a device, docs/resources.md), by our book code: the canon's (data/canon.ts). */
const NT_LOGOS: Readonly<Record<string, string>> = Object.fromEntries(CANON.filter((b) => b.lang === 'grc').map((b) => [b.code, b.logos]));

/** The link that opens a chapter, or one verse of it, of any book of the Bible (the 27 above, the 39 of data/otBooks.ts) in the Bible `resourceId` in Logos (the
 *  chapter link's form, `Bible.Ro8.31`); undefined for a book that is in neither list or a chapter or verse below 1. The tutor's verse links use it
 *  (src/resources/tutorLinks.ts). */
export function verseLink(code: string, chapter: number, verse: number | undefined, resourceId: string): { url: string; fallback: string } | undefined {
  const ref = bibleRef(code, chapter, verse);
  return ref ? resourceLink(schemeName(resourceId), `ref=${ref}`) : undefined;
}

/** A place as a Logos reference (`Bible.Ro8.31`, `Bible.Ro8` for a whole chapter), for a book of either Testament or of the Apocrypha by our code; undefined for a book that is in none of the lists
 *  or a chapter or verse below 1. A commentary of his library opens at it too (src/resources/works.ts). */
export function bibleRef(code: string, chapter: number, verse?: number): string | undefined {
  const book = NT_LOGOS[code] ?? otBookOf(code)?.logos ?? APOCRYPHA_LOGOS[code];
  if (!book || !Number.isInteger(chapter) || chapter < 1) return undefined;
  if (verse !== undefined && (!Number.isInteger(verse) || verse < 1)) return undefined;
  return `Bible.${book}${chapter}${verse === undefined ? '' : `.${verse}`}`;
}
