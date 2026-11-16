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


/** The least a door runs past the edge when the strict CUT_MIN cannot be had (the fade's own width: the door still does not end near the edge). */
const PAST_MIN = FADE_PX;
/** The most the peek may widen the gaps when MAX_EXTRA is not enough, as a last resort before narrowing. */
const MAX_WIDE = 32;

/** How far a door's cut falls short: 0 when SHOWN_MIN stands inside the row and `past` runs beyond the edge. */
function shortfall(left: number, right: number, width: number, past: number): number {
  return Math.max(0, SHOWN_MIN - (width - left)) + Math.max(0, past - (right - width));
}

/** The extras to try, in the order of preference: the plain gaps widened by 0 to MAX_EXTRA, then narrowed by up to half their own width, then widened further to MAX_WIDE. */
function candidates(gap: number): number[] {
  const list: number[] = [];
  for (let e = 0; e <= MAX_EXTRA; e++) list.push(e);
  for (let e = -1; e >= -Math.floor(gap / 2); e--) list.push(e);
  for (let e = MAX_EXTRA + 1; e <= MAX_WIDE; e++) list.push(e);
  return list;
}

/** The extra gap with which the first door past the edge is cut by CUT_MIN beyond it (else PAST_MIN) with SHOWN_MIN inside; 0 when everything fits. Of the extras it tries (widening 0 to MAX_EXTRA,
 * then narrowing the row's own `gap`, then widening further) it takes the first that does, and when none does the one that falls shortest: a row that overflows never falls back to 0 with no cue
 * (mw-fnvjof.17.121). `rights` and `lefts` are the doors' edges in the row's content, with no extra gap, `width` the row's visible width, `gap` its own gap. Door i has i gaps before it, so an extra of e moves it by i * e. */
export function peekExtra(lefts: number[], rights: number[], width: number, gap = 0): number {
  if (!rights.some((r) => r > width + SLOP)) return 0; // everything fits: no peek is wanted
  const list = candidates(gap);
  let best = 0;
  let bestShort = Infinity;
  for (const past of [CUT_MIN, PAST_MIN]) {
    for (const extra of list) {
      const cutAt = rights.findIndex((r, i) => r + i * extra > width + SLOP);
      if (cutAt === -1) continue; // narrowed so far that all fit: not a peek
      const short = shortfall(lefts[cutAt] + cutAt * extra, rights[cutAt] + cutAt * extra, width, past);
      if (short === 0) return extra;
      if (short < bestShort) {
        best = extra;
        bestShort = short;
      }
    }
  }
  return best;
}
