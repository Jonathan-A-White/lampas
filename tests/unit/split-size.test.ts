// The Reader split's divider (docs/design/reader-split.md D4, as the Governor changed it): no three fixed sizes; the divider rests wherever he lets go, between a
// smallest and a largest size, and a drag past the smallest by CLOSE_DISTANCE closes. The size is kept as a fraction of the box, so turning the phone keeps it.
// The maths is pure (src/reader/split/splitSize.ts); the picture is tests/e2e/reader-split-dock.spec.ts.
import { describe, expect, it } from 'vitest';
import {
  CLOSE_DISTANCE,
  FIRST_FRACTION,
  HANDLE_ROW,
  KEY_STEP,
  TEXT_LINE,
  boundsOf,
  clampSize,
  dragTo,
  fractionOf,
  keyedSize,
  sizeOf,
  stepSize,
} from '../../src/reader/split/splitSize';

const BOX = 748; // the box under the chips at 390x844

describe('the bounds', () => {
  it('are the handle row plus two text lines, and the box less two lines of the passage', () => {
    expect(boundsOf({ box: BOX })).toEqual({ min: HANDLE_ROW + 2 * TEXT_LINE, max: BOX - 2 * TEXT_LINE });
  });

  it('give way to a body that needs more than two lines (a map\'s credit row), and add the foot the phone keeps clear', () => {
    expect(boundsOf({ box: BOX, body: 200 }).min).toBe(HANDLE_ROW + 200);
    expect(boundsOf({ box: BOX, body: 10 }).min).toBe(HANDLE_ROW + 2 * TEXT_LINE);
    expect(boundsOf({ box: BOX, foot: 48 }).min).toBe(HANDLE_ROW + 2 * TEXT_LINE + 48);
  });

  it('never put the largest below the smallest, in a box too small for both', () => {
    const bounds = boundsOf({ box: 150 });
    expect(bounds.max).toBeGreaterThanOrEqual(bounds.min);
  });
});

describe('the size', () => {
  const bounds = boundsOf({ box: BOX });

  it('opens at Half the first time', () => {
    expect(FIRST_FRACTION).toBe(0.5);
    expect(sizeOf(FIRST_FRACTION, BOX, bounds)).toBe(374);
  });

  it('clamps to the bounds and to nothing else: no snapping to a third, a half or two thirds', () => {
    expect(clampSize(10, bounds)).toBe(bounds.min);
    expect(clampSize(9999, bounds)).toBe(bounds.max);
    for (const size of [201, 263.5, 317, 421, 555]) expect(clampSize(size, bounds)).toBe(size);
  });

  it('is kept as a fraction of the box, so a box that turns keeps it', () => {
    const fraction = fractionOf(263, BOX);
    expect(fraction).toBeCloseTo(0.3516, 3);
    expect(sizeOf(fraction, 390, boundsOf({ box: 390 }))).toBeCloseTo(0.3516 * 390, 0);
    expect(sizeOf(fraction, BOX, bounds)).toBeCloseTo(263, 0);
  });

  it('keeps a saved fraction inside the bounds of a box too small for it', () => {
    const small = boundsOf({ box: 300 });
    expect(sizeOf(0.9, 300, small)).toBe(small.max);
    expect(sizeOf(0.01, 300, small)).toBe(small.min);
  });
});

describe('a drag', () => {
  const bounds = boundsOf({ box: BOX });

  it('rests where it is let go, within the bounds', () => {
    expect(dragTo(300, bounds)).toEqual({ size: 300, close: false });
    expect(dragTo(bounds.max + 100, bounds)).toEqual({ size: bounds.max, close: false });
  });

  it('rests at the smallest size when let go below it, short of the close distance', () => {
    expect(dragTo(bounds.min - 1, bounds)).toEqual({ size: bounds.min, close: false });
    expect(dragTo(bounds.min - (CLOSE_DISTANCE - 1), bounds)).toEqual({ size: bounds.min, close: false });
  });

  it('closes when pulled past the smallest size by the close distance', () => {
    expect(CLOSE_DISTANCE).toBe(80);
    expect(dragTo(bounds.min - CLOSE_DISTANCE, bounds).close).toBe(true);
    expect(dragTo(0, bounds).close).toBe(true);
  });
});

describe('the keyboard and the buttons', () => {
  const bounds = boundsOf({ box: BOX });

  it('step by a tenth of the box, and stop at the bounds', () => {
    expect(KEY_STEP).toBe(0.1);
    expect(stepSize(374, BOX, bounds, 1)).toBeCloseTo(374 + 74.8, 5);
    expect(stepSize(374, BOX, bounds, -1)).toBeCloseTo(374 - 74.8, 5);
    expect(stepSize(bounds.max - 10, BOX, bounds, 1)).toBe(bounds.max);
    expect(stepSize(bounds.min + 10, BOX, bounds, -1)).toBe(bounds.min);
  });

  it('move the divider with the arrows of its axis, and Home and End go to the bounds', () => {
    expect(keyedSize('ArrowUp', 374, BOX, bounds, 'column')).toBeGreaterThan(374);
    expect(keyedSize('ArrowDown', 374, BOX, bounds, 'column')).toBeLessThan(374);
    expect(keyedSize('ArrowLeft', 374, BOX, bounds, 'row')).toBeGreaterThan(374);
    expect(keyedSize('ArrowRight', 374, BOX, bounds, 'row')).toBeLessThan(374);
    expect(keyedSize('ArrowLeft', 374, BOX, bounds, 'column')).toBeNull();
    expect(keyedSize('Home', 374, BOX, bounds, 'column')).toBe(bounds.min);
    expect(keyedSize('End', 374, BOX, bounds, 'row')).toBe(bounds.max);
    expect(keyedSize('a', 374, BOX, bounds, 'column')).toBeNull();
  });
});
