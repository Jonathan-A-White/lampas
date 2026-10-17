// tests/unit/e2e-hold-pause.test.ts — a loaded host cannot make holdFor throw 'Cannot fast-forward to the past' (mw-5r3p30.486).
// holdFor pauses the page clock a margin ahead of the page's now; on a loaded host the pause arrives after the margin has gone and
// Playwright refuses to pause in the past. tests/support/hold.ts pauseNow reads the page's time again with a wider margin.
import type { Page } from '@playwright/test';
import { describe, expect, it } from 'vitest';
import { pauseNow } from '../support/hold';

const PAST = new Error('clock.pauseAt: Error: Cannot fast-forward to the past');

/** A page whose clock is at `now` and refuses a pause that is not ahead of it; `lateBy` is how far a loaded host moves the clock
 * between the spec reading the page's time and Playwright pausing it. */
function fakePage(now: number, lateBy: (attempt: number) => number) {
  const asked: number[] = [];
  let attempt = 0;
  const page = {
    evaluate: async () => now,
    clock: {
      pauseAt: async (at: Date) => {
        asked.push(at.getTime() - now);
        const clockNow = now + lateBy(attempt++);
        if (at.getTime() <= clockNow) throw PAST;
      },
    },
  };
  return { page: page as unknown as Page, asked };
}

describe('pausing the page clock before a hold', () => {
  it('pauses at once on a quiet host', async () => {
    const { page, asked } = fakePage(1000, () => 0);
    await pauseNow(page);
    expect(asked).toEqual([50]);
  });

  it('reads the page time again with a wider margin when the first pause lands in the past', async () => {
    const { page, asked } = fakePage(1000, (attempt) => (attempt === 0 ? 120 : 0));
    await pauseNow(page);
    expect(asked).toEqual([50, 250]);
  });

  it('gives up with the error when even the widest margin lands in the past', async () => {
    const { page, asked } = fakePage(1000, () => 5000);
    await expect(pauseNow(page)).rejects.toBe(PAST);
    expect(asked).toEqual([50, 250, 1000]);
  });

  it('does not hide another error', async () => {
    const page = { evaluate: async () => 0, clock: { pauseAt: async () => { throw new Error('page closed'); } } } as unknown as Page;
    await expect(pauseNow(page)).rejects.toThrow('page closed');
  });
});
