// tests/unit/reference-card-spot.test.ts — where a reference card is placed keeps it inside the visible area (mw-5r3p30.872): a visualViewport shorter than innerHeight
// (a system bar, a share sheet's own window) and the navigation bar's floor both pull the card's foot up.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spotFor, visibleBottom } from '../../src/markdown/cardSpot';

const rect = (top: number, bottom: number): DOMRect => ({ top, bottom, left: 16, right: 374, width: 358, height: bottom - top, x: 16, y: top, toJSON: () => ({}) });
const LAYER = { top: 0, bottom: 800 };

beforeEach(() => {
  vi.stubGlobal('innerHeight', 800);
  vi.stubGlobal('innerWidth', 390);
});
afterEach(() => vi.unstubAllGlobals());

const seen = (height: number, offsetTop = 0) => vi.stubGlobal('visualViewport', { height, offsetTop });

describe('visibleBottom', () => {
  it('is innerHeight where the browser has no visualViewport, less the inset', () => {
    vi.stubGlobal('visualViewport', undefined);
    expect(visibleBottom()).toBe(800);
    expect(visibleBottom(48)).toBe(752);
  });

  it('is the foot of the visualViewport when that is shorter than innerHeight', () => {
    seen(500);
    expect(visibleBottom()).toBe(500);
    seen(500, 20);
    expect(visibleBottom(48)).toBe(472);
  });
});

describe('spotFor', () => {
  it('keeps a card below its reference inside a visible height shorter than innerHeight', () => {
    seen(500);
    const spot = spotFor(rect(100, 140), 700, LAYER, 120);
    expect(spot.top).toBe(146);
    expect((spot.top ?? 0) + spot.maxHeight).toBeLessThanOrEqual(500);
  });

  it('keeps it above the navigation bar when the bar is not reported', () => {
    const spot = spotFor(rect(100, 140), 700, LAYER, 120, 48);
    expect((spot.top ?? 0) + spot.maxHeight).toBeLessThanOrEqual(800 - 48);
  });

  it('hangs a card above its reference from the reference, so it stays above when its text arrives', () => {
    const spot = spotFor(rect(500, 540), 300, LAYER, 120, 48);
    expect(spot.top).toBeUndefined();
    expect(spot.bottom).toBe(800 - (500 - 6));
    expect(spot.maxHeight).toBe(500 - 6 - 8);
  });

  it('takes the whole visible layer when neither side has room for its heading and foot', () => {
    seen(300);
    const spot = spotFor(rect(120, 160), 700, LAYER, 200, 48);
    expect(spot.top).toBe(8);
    expect(spot.top! + spot.maxHeight).toBeLessThanOrEqual(300 - 48);
  });
});
