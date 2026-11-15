// src/reader/poetryText.ts — when a verse is drawn in poetry lines (mw-5r3p30.1164, docs/data.md 'Poetry lines').
import type { Verse } from '../data/chapter';
import { poetryLinesOf, type PoetryLineSpan } from '../data/poetry';
import type { WovenVerse } from '../data/weave';
import type { ReaderView } from '../data/repositories';

/**
 * The lines a verse is drawn in, or null when it is drawn as running text. Lines are the English view's alone (the Greek and the Hebrew run in their own order, and a weave puts the Greek words among the English
 * ones, so its chunks no longer stand where the table's line marks name them); `poetry` is the caller's say that this is a place for them (a card is not), and a verse shown still, as on a card, is never in lines.
 */
export function linesShown(verse: Verse, view: ReaderView, woven: WovenVerse | null | undefined, poetry?: boolean, still?: boolean): PoetryLineSpan[] | null {
  if (!poetry || still || view !== 'english' || woven) return null;
  return poetryLinesOf(verse);
}

/** True when `verse` is drawn in lines in `view` with no weave: what a caller that puts its verse number inside the first line asks. */
export const isPoetryShown = (verse: Verse, view: ReaderView, woven: WovenVerse | null | undefined, poetry = true): boolean => linesShown(verse, view, woven, poetry) !== null;
