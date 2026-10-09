// src/resources/logosBible.ts — an Old Testament chapter in Logos, in the Bible he chose (Settings > Bible in Logos). Lampas has no Old Testament
// text, so the chapter picker opens the chapter in his own Logos library: the Logos app's own scheme first (`logosres:<Bible>;ref=Bible.<book><chapter>`),
// with the https ref.ly address as the fallback, opened only when the phone cannot open the scheme (openApp.ts armFallback). docs/resources.md has the sources.
import { otBookOf } from '../data/otBooks';

/** His Bible in Logos to start with: the Legacy Standard Bible (vault plans/lampas-logos-library-2026-10-08.csv). */
export const DEFAULT_LOGOS_BIBLE = 'LLS:LGCYSTNDRDBBLSB';

/** The short list in Settings: `id` is the Resource ID Logos prints (the library listing); the order is the order shown. */
export const COMMON_BIBLES: readonly { id: string; name: string }[] = [
  { id: DEFAULT_LOGOS_BIBLE, name: 'LSB (Legacy Standard Bible)' },
  { id: 'LLS:1.0.710', name: 'ESV (English Standard Version)' },
  { id: 'LLS:1.0.71', name: 'NASB95 (New American Standard Bible, 1995)' },
  { id: 'LLS:NIV2011', name: 'NIV (New International Version, 2011)' },
  { id: 'LLS:1.0.30', name: 'NKJV (New King James Version)' },
  { id: 'LLS:CSB', name: 'CSB (Christian Standard Bible)' },
  { id: 'LLS:1.0.171', name: 'NLT (New Living Translation)' },
  { id: 'LLS:KJV1900', name: 'KJV (King James Version, 1900)' },
  { id: 'LLS:LEB', name: 'LEB (Lexham English Bible)' },
];

/** What a typed Resource ID may be: `LLS:` and then letters, digits, dots, dashes or underscores (as in the library listing). */
export const isResourceId = (text: string): boolean => /^LLS:[A-Za-z0-9._-]+$/.test(text.trim());

/** The Bible's name in the scheme: the Resource ID without `LLS:`, in lower case (`LLS:LGCYSTNDRDBBLSB` is `lgcystndrdbblsb`). */
const schemeName = (resourceId: string): string => resourceId.trim().replace(/^LLS:/i, '').toLowerCase();

/** The link that opens chapter `chapter` of the Old Testament book `code` in the Bible `resourceId`; undefined for a book or chapter that does not exist. */
export function chapterLink(code: string, chapter: number, resourceId: string): { url: string; fallback: string } | undefined {
  const book = otBookOf(code);
  if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) return undefined;
  const bible = schemeName(resourceId);
  const ref = `Bible.${book.logos}${chapter}`;
  return { url: `logosres:${bible};ref=${ref}`, fallback: `https://ref.ly/logosres/${encodeURIComponent(bible)}?ref=${ref}` };
}

/** The New Testament books' abbreviations in a Logos reference (Logos' own list, https://www.logos.com/bible-book-abbreviations, written like the Old Testament's in
 *  data/otBooks.ts; UNVERIFIED on a device, docs/resources.md), by our book code. */
const NT_LOGOS: Readonly<Record<string, string>> = {
  mat: 'Mt', mrk: 'Mk', luk: 'Lk', jhn: 'Jn', act: 'Ac', rom: 'Ro', '1co': '1Co', '2co': '2Co', gal: 'Ga', eph: 'Eph', php: 'Php', col: 'Col', '1th': '1Th', '2th': '2Th',
  '1ti': '1Ti', '2ti': '2Ti', tit: 'Tit', phm: 'Phm', heb: 'Heb', jas: 'Jas', '1pe': '1Pe', '2pe': '2Pe', '1jn': '1Jn', '2jn': '2Jn', '3jn': '3Jn', jud: 'Jud', rev: 'Re',
};

/** The link that opens a New Testament chapter, or one verse of it, in the Bible `resourceId` in Logos (the chapter link's form, `Bible.Ro8.31`); undefined for a book
 *  that is not one of the 27 or a chapter or verse below 1. The tutor's verse links use it (src/resources/tutorLinks.ts). */
export function verseLink(code: string, chapter: number, verse: number | undefined, resourceId: string): { url: string; fallback: string } | undefined {
  const book = NT_LOGOS[code];
  if (!book || !Number.isInteger(chapter) || chapter < 1) return undefined;
  if (verse !== undefined && (!Number.isInteger(verse) || verse < 1)) return undefined;
  const bible = schemeName(resourceId);
  const ref = `Bible.${book}${chapter}${verse === undefined ? '' : `.${verse}`}`;
  return { url: `logosres:${bible};ref=${ref}`, fallback: `https://ref.ly/logosres/${encodeURIComponent(bible)}?ref=${ref}` };
}
