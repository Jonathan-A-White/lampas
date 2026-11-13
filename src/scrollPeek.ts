// src/scrollPeek.ts — the arithmetic of the peek of src/ScrollMore.tsx: how much wider than its own the gaps of a sideways row must be for a door to be cut by the edge.
/** The fade's width. */
export const FADE_PX = 20;
/** The least a door runs past the edge for the peek, beyond the fade's own width, so a piece of it still reads. */
const FADE_CLEAR = 16;
const CUT_MIN = FADE_PX + FADE_CLEAR;
/** The least of the cut door that stands inside the row. */
const SHOWN_MIN = 24;
/** The most the peek may widen the row's gaps. */
const MAX_EXTRA = 16;
/** The part of a scroll position that counts as the start or the end. */
export const SLOP = 1;


/** The least extra gap (0 to MAX_EXTRA) with which the first door past the edge is cut by FADE_PX + FADE_CLEAR or more with SHOWN_MIN inside; 0 when none does. `rights` and `lefts` are the doors' edges
 * in the row's content, with no extra gap, `width` the row's visible width. Door i has i gaps before it, so an extra of e moves it by i * e. */
export function peekExtra(lefts: number[], rights: number[], width: number): number {
  for (let extra = 0; extra <= MAX_EXTRA; extra++) {
    const cutAt = rights.findIndex((r, i) => r + i * extra > width + SLOP);
    if (cutAt === -1) return 0; // everything fits: no peek is wanted
    const left = lefts[cutAt] + cutAt * extra;
    const right = rights[cutAt] + cutAt * extra;
    if (right - width >= CUT_MIN && width - left >= SHOWN_MIN) return extra;
  }
  return 0;
}
