// src/resources/logosBible.ts — an Old Testament chapter in Logos, in the Bible he chose (Settings > Bible in Logos). Lampas has no Old Testament
// text, so the chapter picker opens the chapter in his own Logos library: the Logos app's own scheme first (`logosres:<Bible>;ref=Bible.<book><chapter>`),
// with the https ref.ly address as the fallback, opened only when the phone cannot open the scheme (openApp.ts armFallback). docs/resources.md has the sources.
import { CANON } from '../data/canon';
import { otBookOf } from '../data/books';
import { entriesOf } from './catalogue';
import { resourceLink } from './logosRes';

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

/** A place as a Logos reference (`Bible.Ro8.31`, `Bible.Ro8` for a whole chapter), for a book of either Testament by our code; undefined for a book that is in neither list
 *  or a chapter or verse below 1. A commentary of his library opens at it too (src/resources/works.ts). */
export function bibleRef(code: string, chapter: number, verse?: number): string | undefined {
  const book = NT_LOGOS[code] ?? otBookOf(code)?.logos;
  if (!book || !Number.isInteger(chapter) || chapter < 1) return undefined;
  if (verse !== undefined && (!Number.isInteger(verse) || verse < 1)) return undefined;
  return `Bible.${book}${chapter}${verse === undefined ? '' : `.${verse}`}`;
}
