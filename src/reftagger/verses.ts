// src/reftagger/verses.ts — the small file of a chapter's English that the blog's popup shows (mw-5r3p30.1088): its shape, the translation it names and how it is made from a chapter. Pure, and
// with no import of the app's config (a build-time global), so scripts/verses-build.ts can run it and the popup's script carries only this much (passage.ts reads verses out of it).

/** A chapter's English as its small file holds it: `t` is the translation ('msb' the New Testament's, 'bsb' the Old's, as englishSource.ts translationOf says), `v` each verse's text by its number. */
export interface ChapterVerses {
  t: 'msb' | 'bsb';
  v: Record<string, string>;
}

/** The translations by name. englishSource.ts TRANSLATION_NAME holds the same two (that module is the app's, heavier than the blog's script should carry; tests/unit/reftagger-passage.test.ts holds them equal). */
const NAMES: Record<string, string> = { msb: 'Majority Standard Bible', bsb: 'Berean Standard Bible' };

/** The name of the translation a small file's text is from, or null for a file that says none we know. */
export function translationName(file: unknown): string | null {
  const t = (file as { t?: unknown } | null)?.t;
  return typeof t === 'string' && Object.prototype.hasOwnProperty.call(NAMES, t) ? NAMES[t] : null;
}

/** One verse as the popup shows it. */
export interface ShownVerse {
  n: number;
  text: string;
}

export const spaced = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** The small file of a chapter (scripts/verses-build.ts writes it): each verse's English runs in order, joined. The translation is the caller's (the Old Testament's is the Berean Standard Bible's). */
export function plainVerses(chapter: { verses: { n: number; e: { t: string }[] }[] }, t: ChapterVerses['t'] = 'msb'): ChapterVerses {
  const v: Record<string, string> = {};
  for (const verse of chapter.verses) {
    const text = spaced(verse.e.map((c) => c.t).join(' '));
    if (text) v[String(verse.n)] = text;
  }
  return { t, v };
}
