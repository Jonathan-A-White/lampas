import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { openUnlocked } from './unlocked';

// covers: src/reader/usePages.ts, src/reader/pageTurn.ts, src/reader/pageCurl.ts, src/reader/pageSnapshot.ts, src/Reader.tsx (the 60 fps page turn in Turn pages). The real clock proves the screen's own frame rate:
// requestAnimationFrame gaps are the browser's frames, which a faked clock (page.clock) does not time. It is a timing test: the rig's timing_tests
// leaves it out of every gate (MW_TIMING=skip) and runs it in the nightly timing job (mw-5r3p30.712).
// mw-5r3p30.621: a page turn in Turn pages holds 60 fps at 390x844. The page's own clock runs here (no page.clock.install: a faked clock times frames
// by its timers, not the screen's), and Chromium's performance trace of the turns is written to TRACE for a look in DevTools (Performance, Load profile).
// What the test holds the turn to is the screen's frames as the page sees them, by requestAnimationFrame: a frame more than ALLOWED_GAP_MS after the one
// before it is a dropped one, and at most DROPPED_ALLOWANCE of the frames of four turns may be dropped (a loaded test host stalls now and then). A first
// turn is made before the four, untimed: the first after the chapter opens makes the WebGL program and the pages' pictures if the phone has had no idle
// moment to make them ahead (src/reader/usePages.ts drawAhead), and on a phone he has read the page a while before he turns it.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const TRACE = 'test-results/turn-pages-trace/turns.json';
const ALLOWED_GAP_MS = 1000 / 60 + 9;
const DROPPED_ALLOWANCE = 0.05;

async function openMark12InPages(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'readingMode', value: 'pages' });
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
        };
      }),
  );
  await page.goto('/#/?b=mrk&c=12');
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await expect(page.locator('[data-place-line]')).toHaveText(/Page 1 of/);
}

/** From now on, the gaps between the screen's frames while a page turn is drawn, one list per turn. */
async function timeFrames(page: Page) {
  await page.evaluate(() => {
    const turns: number[][] = [];
    (window as unknown as { turnFrames: number[][] }).turnFrames = turns;
    let last = 0;
    const frame = (now: number) => {
      const on = document.querySelector('[data-page-turn]') !== null;
      if (on && last === 0) turns.push([]);
      if (on && last > 0) turns[turns.length - 1].push(now - last);
      last = on ? now : 0;
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

test('a page turn holds 60 fps at 390x844', async ({ page, browser }) => {
  await openMark12InPages(page);
  await timeFrames(page);
  const b = await page.locator('[data-reader]').boundingBox();
  if (!b) throw new Error('no reading box');
  const y = b.y + b.height / 2;
  mkdirSync('test-results/turn-pages-trace', { recursive: true });
  await browser.startTracing(page, { path: TRACE, screenshots: false, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'blink.user_timing'] });
  for (const share of [0.85, 0.85, 0.85, 0.15, 0.85]) {
    await page.touchscreen.tap(b.x + b.width * share, y);
    await expect(page.locator('[data-page-turn]')).toHaveCount(1);
    await expect(page.locator('[data-page-turn]')).toHaveCount(0);
  }
  await browser.stopTracing();
  const [, ...turns] = await page.evaluate(() => (window as unknown as { turnFrames: number[][] }).turnFrames);
  expect(turns).toHaveLength(4);
  const report = turns.map((gaps, n) => `turn ${n + 1}: ${gaps.length} frames, the gaps ${gaps.map((g) => Math.round(g)).join(' ')} ms`).join('; ');
  test.info().annotations.push({ type: 'frames', description: report });
  // a turn of about half a second at 60 fps is some 28 frames
  for (const gaps of turns) expect(gaps.length, report).toBeGreaterThanOrEqual(15);
  const frames = turns.flat();
  const dropped = frames.filter((gap) => gap > ALLOWED_GAP_MS);
  expect(dropped.length, report).toBeLessThanOrEqual(Math.floor(frames.length * DROPPED_ALLOWANCE));
});
