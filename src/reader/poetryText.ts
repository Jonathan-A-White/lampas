// src/reader/poetryText.ts — when a verse is drawn in poetry lines (mw-5r3p30.1164, docs/data.md 'Poetry lines').
import type { Verse } from '../data/chapter';
import { hebrewLinesOf, poetryLinesOf, type PoetryLineSpan } from '../data/poetry';
import type { WovenVerse } from '../data/weave';
import type { ReaderView } from '../data/repositories';

/**
 * The lines a verse is drawn in, or null when it is drawn as running text. In the English view they are the table's (`Verse.l`), and in a Weave too (mw-5r3p30.1165): its Hebrew or Greek words stand in the places of their English chunks, so the lines
 * still start at the chunks they name, in the source's own order (`order`) its chunks no longer stand where the marks name them, so it takes the source's lines (`hl`) at the chunks they fall in (sourceLinesOf, mw-5r3p30.1195). In the Hebrew view they are the verse's `hl`, broken at its accents (hebrewLinesOf);
 * the Greek tab's are none. `poetry` is the caller's say that this is a place for them (a card is not), and a verse shown still, as on a card, is never in lines.
 */
export function linesShown(verse: Verse, view: ReaderView, woven: WovenVerse | null | undefined, poetry?: boolean, still?: boolean): PoetryLineSpan[] | null {
  if (!poetry || still) return null;
  if (view === 'greek') return hebrewLinesOf(verse);
  return woven?.order !== undefined ? sourceLinesOf(verse, woven.order) : poetryLinesOf(verse);
}

/**
 * The lines of a Weave laid out in the source's own order (mw-5r3p30.1195): the source's lines, `Verse.hl` (the Hebrew's accents, the Greek's borrowed breaks), each starting at the first chunk of `order` that stands at or after
 * the line's first source word, so `from` is a chunk index as in the English lines. A chunk stands where its first source word does, and one with no source word of its own behind the chunk before it (chunkOrder). A line whose
 * place is the line before's (a chunk renders words of two lines) is not a break. Null when the verse has no such lines or fewer than two are left.
 */
function sourceLinesOf(verse: Verse, order: readonly number[]): PoetryLineSpan[] | null {
  const lines = hebrewLinesOf(verse);
  if (!lines || order.length === 0) return null;
  let place = -1;
  const at = verse.e.map((chunk) => (place = chunk.g.length ? Math.min(...chunk.g) : place));
  const out: PoetryLineSpan[] = [];
  let taken = -1;
  lines.forEach((line, k) => {
    const p = k === 0 ? 0 : order.findIndex((chunk, pos) => pos > taken && at[chunk] >= line.from);
    if (p < 0 || (k > 0 && p <= taken)) return;
    // the first line takes the chunks that stand ahead of it
    taken = k === 0 ? 0 : p;
    out.push({ ...line, from: order[k === 0 ? 0 : p] });
  });
  return out.length > 1 ? out : null;
}

/** True when `verse` is drawn in lines in `view` (a weave in its source's order has the source's lines, none when the verse has none): what a caller that puts its verse number inside the first line asks. */
export const isPoetryShown = (verse: Verse, view: ReaderView, woven: WovenVerse | null | undefined, poetry = true): boolean => linesShown(verse, view, woven, poetry) !== null;
