// src/reader/poetryText.ts — when a verse is drawn in poetry lines (mw-5r3p30.1164, docs/data.md 'Poetry lines').
import type { Verse } from '../data/chapter';
import { hebrewLinesOf, poetryLinesOf, type PoetryLineSpan } from '../data/poetry';
import type { WovenVerse } from '../data/weave';
import type { ReaderView } from '../data/repositories';

/**
 * The lines a verse is drawn in, or null when it is drawn as running text. In the English view they are the table's (`Verse.l`), and in a Weave too (mw-5r3p30.1165): its Hebrew or Greek words stand in the places of their English chunks, so the lines
 * still start at the chunks they name, unless the weave is laid out in the source's own order (`order`, its chunks no longer stand where the marks name them). In the Hebrew view they are the verse's `hl`, broken at its accents (hebrewLinesOf);
 * the Greek tab's are none. `poetry` is the caller's say that this is a place for them (a card is not), and a verse shown still, as on a card, is never in lines.
 */
export function linesShown(verse: Verse, view: ReaderView, woven: WovenVerse | null | undefined, poetry?: boolean, still?: boolean): PoetryLineSpan[] | null {
  if (!poetry || still) return null;
  if (view === 'greek') return hebrewLinesOf(verse);
  return woven?.order !== undefined ? null : poetryLinesOf(verse);
}

/** True when `verse` is drawn in lines in `view` (in a weave laid out in its source's order it is not): what a caller that puts its verse number inside the first line asks. */
export const isPoetryShown = (verse: Verse, view: ReaderView, woven: WovenVerse | null | undefined, poetry = true): boolean => linesShown(verse, view, woven, poetry) !== null;
