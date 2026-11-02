// src/handwriting/padFrame.ts — where the letters stand on the Write it pad (mw-5r3p30.958): the line drawn across it (WritingPad), how tall a letter is on it, and the faint model a Hebrew
// card draws under it (GlyphStrokes `line`) are all fixed here, so the card can tell the checker (recognizer.ts `capHeight`, `baseline`) what the eye sees. A vav and a final nun are the same
// stem but for how far it reaches below the line, and only a checker that knows the line can tell them apart; tracing the model is then always right, because the model stands on that line at that size.
import type { Variant } from './templates';

/** How far down the pad (a share of its height inside the border) the line the letters stand on is drawn. */
export const LINE_AT = 0.72;
/** The pad's border in pixels (WritingPad's border-2): ink is measured from the border box. */
const BORDER = 2;
/** How tall a letter is, one design unit (templates: from its top at 0 to the line at 1), as a share of the pad's height inside the border. */
const UNIT_SHARE = 0.4;
/** How wide, in design units, the area the model is fitted to is: wider than any letter, narrower than any pad. */
const SPAN = 2;

/** What the checker is told about a pad `height` pixels tall (its border box): how tall a letter is and the y of the line, in the pad's own pixels; none for a pad that has no height. */
export function frameOfPad(height: number): { capHeight: number; baseline: number } | undefined {
  const inner = height - 2 * BORDER;
  if (!(inner > 0)) return undefined;
  return { capHeight: UNIT_SHARE * inner, baseline: BORDER + LINE_AT * inner };
}

/**
 * The viewBox that sets a letter on the pad's line at the pad's letter height when the svg fills the pad (inset-0, w-full h-full): the pad's height is `1 / UNIT_SHARE` design units, the line
 * (design y 1) is `LINE_AT` of the way down it, and the letter is centred across. The svg scales it by the height alone while the pad is at least `SPAN` units wide.
 */
export function viewBoxOnLine(variant: Variant): string {
  const xs = variant.flat().map((p) => p[0]);
  const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
  const height = 1 / UNIT_SHARE;
  return `${middle - SPAN / 2} ${1 - LINE_AT * height} ${SPAN} ${height}`;
}
