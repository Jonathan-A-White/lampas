// tests/support/two-finger.ts — what the two suites share about the tutor door's gesture (src/tutor/door.ts): where the two fingers land, and how long a click after the tap is dropped.
// features/steps/open-tutor.ts sends them as touch events to the document (jsdom); tests/e2e/open-tutor.ts sends them to the browser (Playwright, through CDP).
import { CLICK_GUARD_MS } from '../../src/tutor/door';

/** The two fingers of a two-finger tap: apart, as a thumb and a finger are, and well inside the 16 px slop of the tap (they do not move). */
export const TWO_FINGERS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 150, y: 450 },
  { x: 240, y: 460 },
];

/** The app drops a click that comes within this of a two-finger tap that opened the tutor (the click a phone may send after it). */
export { CLICK_GUARD_MS };

/** How long still to wait, from `tappedAt` (a performance.now() reading), before a click is a click again. */
export const guardLeftMs = (tappedAt: number, now: number): number => Math.max(0, CLICK_GUARD_MS + 25 - (now - tappedAt));
