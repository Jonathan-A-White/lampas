// The 48 px floor under the foot of the page applies only where the phone's bar can cover it (mw-njqj1b0).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { barOverlapsPage, readBarFloor, type BarReading } from '../../src/layout/barFloor';

const installed: BarReading = { displayMode: 'standalone', inset: 0, gap: 0 };

describe('barOverlapsPage', () => {
  it('is true for the installed app whose window is the whole screen and which reports no inset (three-button navigation)', () => {
    expect(barOverlapsPage(installed)).toBe(true);
    expect(barOverlapsPage({ ...installed, displayMode: 'minimal-ui' })).toBe(true);
  });

  it('is false in a browser tab, where the browser\'s own bars sit outside the page', () => {
    expect(barOverlapsPage({ ...installed, displayMode: 'browser' })).toBe(false);
  });

  it('is false in fullscreen, where the system bars are hidden', () => {
    expect(barOverlapsPage({ ...installed, displayMode: 'fullscreen' })).toBe(false);
  });

  it('is false when the phone reports an inset: its own word is used as it is', () => {
    expect(barOverlapsPage({ ...installed, inset: 24 })).toBe(false);
  });

  it('is false when the window is shorter than the screen, the bar being outside it; a gap of 2 px or less is rounding', () => {
    expect(barOverlapsPage({ ...installed, gap: 48 })).toBe(false);
    expect(barOverlapsPage({ ...installed, gap: 3 })).toBe(false);
    expect(barOverlapsPage({ ...installed, gap: 2 })).toBe(true);
    expect(barOverlapsPage({ ...installed, gap: 1 })).toBe(true);
  });
});

describe('readBarFloor', () => {
  it('sets data-bar-overlap on <html> only when a bar can cover the page', () => {
    const win = (standalone: boolean, screenHeight: number) =>
      ({
        document,
        screen: { height: screenHeight },
        innerHeight: 800,
        matchMedia: (q: string) => ({ matches: q === `(display-mode: ${standalone ? 'standalone' : 'browser'})` }),
      }) as unknown as Window;
    document.documentElement.removeAttribute('data-bar-checked');
    readBarFloor(win(true, 800));
    expect(document.documentElement.hasAttribute('data-bar-overlap')).toBe(true);
    readBarFloor(win(true, 848));
    expect(document.documentElement.hasAttribute('data-bar-overlap')).toBe(false);
    readBarFloor(win(false, 800));
    expect(document.documentElement.hasAttribute('data-bar-overlap')).toBe(false);
  });
});

describe('the CSS floor', () => {
  const css = readFileSync('src/index.css', 'utf8');

  it('is 0 unless <html> carries data-bar-overlap, and 48 px when it does', () => {
    expect(css).toMatch(/--lp-bar-floor:\s*0px/);
    expect(css).toMatch(/:root\[data-bar-overlap\]\s*\{\s*--lp-bar-floor:\s*48px/);
  });

  it('is what both bottom insets stand on, under the phone\'s reported inset', () => {
    expect(css).toMatch(/--lp-bar-inset:\s*max\(env\(safe-area-inset-bottom\),\s*var\(--lp-bar-floor\)\)/);
    expect(css).toMatch(/--lp-end-inset:\s*max\(env\(safe-area-inset-bottom\),\s*var\(--lp-bar-floor\)\)/);
  });
});
