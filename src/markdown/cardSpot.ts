// src/markdown/cardSpot.ts — where a reference card sits (ReferenceCard.tsx, mw-5r3p30.872): in the visible area of the window, whatever the card's text and wherever it opens
// (the tutor's answers, the Share sheet, the Verse lists).

export const MARGIN = 8;
export const GAP = 6;
export const WIDTH = 340;

/** Where the card sits in its layer: `top` from the layer's top, or `bottom` from the layer's foot (a card above its reference hangs from the reference, so it stays above it when its text arrives after the placing). */
export interface Spot {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
  maxHeight: number;
}

/** The lowest line of the window a card may reach, in the window's own coordinates: the foot of the visible area (window.visualViewport where the browser has one, which can be
 *  shorter than innerHeight under a system bar or a share sheet's own window) less `inset`, the navigation bar's floor (--lp-bar-inset: Android Chrome does not always report the bar). */
export function visibleBottom(inset = 0): number {
  const seen = window.visualViewport;
  return (seen ? Math.min(window.innerHeight, seen.offsetTop + seen.height) : window.innerHeight) - inset;
}

/** Where the card goes: below the reference when it fits, else above it, else on the roomier side with its text scrolling. `chrome` is the height of what must always show
 * (the heading and the footer). `layer` is the layer it is placed in (its top is the foot of the shell's bars, mw-5r3p30.644: the card does not go above it, and its `top` is counted
 * from it; its bottom is where a card above its reference hangs from). `inset` is the floor of the navigation bar under the visible area (visibleBottom). The card never reaches below
 * the visible area (mw-5r3p30.872): the one placing the tutor's cards, the Share sheet's and the Verse lists' share. */
export function spotFor(anchor: DOMRect, natural: number, layer: { top: number; bottom: number }, chrome: number, inset = 0): Spot {
  const vw = window.innerWidth;
  const vh = visibleBottom(inset);
  const floor = layer.top;
  const width = Math.min(WIDTH, vw - 2 * MARGIN);
  const left = Math.min(Math.max(anchor.left, MARGIN), vw - width - MARGIN);
  const below = vh - anchor.bottom - GAP - MARGIN;
  const above = anchor.top - floor - GAP - MARGIN;
  // a window so short that neither side has room for the card's heading and its Play and Open (a third of a phone's height, split-screen, mw-5r3p30.773): the card
  // takes the whole layer, over the reference, rather than be cut off at the window's foot
  if (Math.max(below, above) < chrome) return { top: MARGIN, left, width, maxHeight: Math.max(vh - floor - 2 * MARGIN, 0) };
  if (natural <= below || (natural > above && below >= above)) return { top: anchor.bottom + GAP - floor, left, width, maxHeight: Math.max(below, 0) };
  return { bottom: layer.bottom - (anchor.top - GAP), left, width, maxHeight: Math.max(above, 0) };
}
