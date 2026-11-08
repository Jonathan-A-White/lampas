// src/reader/split/splitSize.ts — the Reader split's divider as pure maths (docs/design/reader-split.md D4, as the Governor changed it on 2026-11-06: "Do a, but allow for dynamic sizes
// (not just 3 fixed ones)"). The dock has no fixed sizes: the divider rests wherever he lets go, between a smallest size (its handle row and two text lines, or the body's own
// minimum a caller passes, and the foot the phone keeps clear) and a largest (the passage above keeps two lines). A drag past the smallest by CLOSE_DISTANCE closes.
// The size is kept as a fraction of the box, so a box that turns or grows keeps it (the bounds are worked out again from the box). PROVISIONAL, the Governor to confirm: the bounds, Half as
// the first opening, the tenth of a step and the 80 px. Sideways and wide the same sums run on the box's width.
import { CLOSE_DISTANCE } from '../../ui/sheetDrag';

export { CLOSE_DISTANCE };

/** The dock's handle row, the divider: 44 px, the sheets' own. */
export const HANDLE_ROW = 44;
/** One line of text, for the bounds: the Reader's 44 px line. */
export const TEXT_LINE = 44;
/** Lines of text the dock keeps at its smallest, and the passage keeps at the dock's largest. */
export const DOCK_LINES = 2;
export const PASSAGE_LINES = 2;
/** The fraction of the box the dock opens at the first time: Half. */
export const FIRST_FRACTION = 0.5;
/** An arrow key or the Larger split / Smaller split button moves the divider by this much of the box. */
export const KEY_STEP = 0.1;

export interface Bounds {
  min: number;
  max: number;
}

/** Which way the box runs: 'column' the passage above the dock (the divider moves up and down), 'row' side by side (it moves left and right). */
export type Axis = 'column' | 'row';

/**
 * The smallest and largest size, in px along the box's axis. `box` is the box's length, `body` the least the dock's body needs (default two text lines; a map passes its credit row's),
 * `foot` the room the phone's bar keeps clear at the dock's foot. In a box too small for both ends the largest gives way to the smallest.
 */
export function boundsOf({ box, body = 0, foot = 0 }: { box: number; body?: number; foot?: number }): Bounds {
  const min = HANDLE_ROW + Math.max(DOCK_LINES * TEXT_LINE, body) + foot;
  return { min, max: Math.max(min, box - PASSAGE_LINES * TEXT_LINE) };
}

export const clampSize = (size: number, bounds: Bounds): number => Math.min(bounds.max, Math.max(bounds.min, size));

/** The size as a fraction of the box, to keep. */
export const fractionOf = (size: number, box: number): number => (box > 0 ? Math.round((size / box) * 10_000) / 10_000 : FIRST_FRACTION);

/** The size a kept fraction makes in this box, inside the bounds. */
export const sizeOf = (fraction: number, box: number, bounds: Bounds): number => clampSize(fraction * box, bounds);

/** Where a drag lets go: the size it rests at (no snapping, only the bounds), and whether it was pulled past the smallest size by CLOSE_DISTANCE, which closes. */
export function dragTo(raw: number, bounds: Bounds): { size: number; close: boolean } {
  return { size: clampSize(raw, bounds), close: bounds.min - raw >= CLOSE_DISTANCE };
}

/** The size one tenth of the box larger (`by` 1) or smaller (-1), inside the bounds. */
export const stepSize = (size: number, box: number, bounds: Bounds, by: 1 | -1): number => clampSize(size + by * KEY_STEP * box, bounds);

/** What a key does to the divider: the size it makes, or null for a key that is not its own. Up and Down move a divider that runs across (the column), Left and Right one that runs up and down (the row);
 * the key that makes the dock larger is the one that points away from it. Home goes to the smallest size and End to the largest. */
export function keyedSize(key: string, size: number, box: number, bounds: Bounds, axis: Axis): number | null {
  if (key === 'Home') return bounds.min;
  if (key === 'End') return bounds.max;
  const [larger, smaller] = axis === 'column' ? ['ArrowUp', 'ArrowDown'] : ['ArrowLeft', 'ArrowRight'];
  if (key === larger) return stepSize(size, box, bounds, 1);
  if (key === smaller) return stepSize(size, box, bounds, -1);
  return null;
}
