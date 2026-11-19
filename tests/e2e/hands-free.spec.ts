// tests/e2e/hands-free.spec.ts — Hands-free (mw-rl10piw.5) at 390 x 844: Settings > Listening > Reading voices has Hands-free as its first row, Off to start; a three-finger tap on the
// Reader turns it On (the touches come through the browser, one touchstart a finger, as a phone's do) and a small microphone mark named 'Hands-free is on' stands at the top right, in the
// shell's top strip: it covers no word of the Reader's header and no verse text and takes no room: the first verse sits where it did (mw-rl10piw.24). Shots: the Reader with the mark, and the Settings row. The speech and the wake lock are the browser's own
// (headless Chromium has none worth asserting on: tests/unit/hands-free-switch.test.tsx and features/hands-free.feature hold the speech and the lock). The wake word is the kit's fake
// (tests/support/honest-fakes.ts honestWake): tests/e2e/hands-free-loop.spec.ts is the listening.
import { expect, test, type Page } from '@playwright/test';
import { appReady } from './app-ready';
import { openGroup } from './settings-group';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { honestWake } from '../support/honest-fakes';
import { setDisplayMode } from './installed';

test.use({ viewport: { width: 390, height: 844 } });

const FINGERS = [
  { x: 120, y: 520 },
  { x: 200, y: 540 },
  { x: 280, y: 530 },
];

/** Three fingers on the page one after another, lifted together: what the browser sends for a three-finger tap. */
async function threeFingers(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const points = FINGERS.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 }));
    for (let n = 1; n <= points.length; n += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points.slice(0, n) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}
const overlaps = (a: Box, b: Box): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('a three-finger tap turns Hands-free on, the mic mark stands clear of the header and the text, and Settings has the row', async ({ page }) => {
  // Hands-free On listens for the wake word (mw-rl10piw.6): the kit's fake wake stands for it, as a headless browser has no microphone to give it
  await honestWake(page);
  await openUnlocked(page);
  await page.goto('/');
  await appReady(page);
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  const mark = page.getByRole('img', { name: 'Hands-free is on', exact: true });
  await expect(mark).toHaveCount(0);

  await threeFingers(page);
  await expect(mark).toBeVisible();

  // clear of the Reader's header buttons and of every verse the screen shows
  const markBox = (await mark.boundingBox()) as Box;
  expect(markBox.width).toBeGreaterThanOrEqual(16);
  expect(markBox.x + markBox.width).toBeLessThanOrEqual(390);
  expect(markBox.y).toBeGreaterThanOrEqual(0);
  // the mark is drawn over the top-right corner and its button is a small tap box (mw-rl10piw.43: a tap opens 'What you can say'); what must stay clear is what the eye sees: a button with words, and the icon of an icon-only button
  const tap = (await page.locator('[data-hands-free-mark]').boundingBox()) as Box;
  expect(tap.width).toBeLessThanOrEqual(32);
  expect(tap.height).toBeLessThanOrEqual(32);
  // what the eye sees of each header button: its words (the text's own boxes) and its icons (not the padding of its tap box)
  const seen = await page.evaluate(() => {
    const out: { x: number; y: number; width: number; height: number }[] = [];
    for (const button of document.querySelectorAll('header button, header a')) {
      const rects: DOMRect[] = [...button.querySelectorAll('svg, img')].map((el) => el.getBoundingClientRect());
      const walk = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      for (let node = walk.nextNode(); node; node = walk.nextNode()) {
        if (!(node.textContent ?? '').trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        rects.push(range.getBoundingClientRect());
      }
      for (const r of rects) if (r.width > 0 && r.height > 0) out.push({ x: r.x, y: r.y, width: r.width, height: r.height });
    }
    return out;
  });
  expect(seen.length).toBeGreaterThan(0);
  for (const box of seen) expect(overlaps(markBox, box), `the mark covers a word or an icon of the header at ${JSON.stringify(box)}`).toBe(false);
  const verses = page.locator('[data-verse]:visible');
  const shown = await verses.count();
  expect(shown).toBeGreaterThan(0);
  for (let i = 0; i < shown; i += 1) {
    const box = (await verses.nth(i).boundingBox()) as Box | null;
    if (box) expect(overlaps(markBox, box), `the mark covers verse ${i}`).toBe(false);
  }
  await shot(page, 'hands-free-reader');

  // Settings: Hands-free is the first row of Reading voices, and it shows On
  await page.goto('/#/settings');
  await openGroup(page, 'Listening');
  const row = page.locator('[data-section="voices"] [data-setting]').first();
  await expect(row).toHaveAttribute('data-setting', 'handsFree');
  const group = page.getByRole('group', { name: 'Hands-free', exact: true });
  await group.scrollIntoViewIfNeeded();
  await expect(group.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(mark).toBeVisible();
  for (const name of ['On', 'Off']) {
    const box = await group.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
  }
  await shot(page, 'hands-free-settings');

  // Off in Settings takes the mark away; it stays Off after a reload
  await group.getByRole('button', { name: 'Off', exact: true }).click();
  await expect(mark).toHaveCount(0);
  await page.reload();
  // the page of the group is in the address: a reload comes back to it
  await expect(page.getByRole('heading', { name: 'Listening', exact: true, level: 1 })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Hands-free', exact: true }).getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

// mw-rl10piw.24: the mark takes no room in the page, so turning Hands-free On or Off moves nothing: the first verse's top is the same with it Off and On, upright and sideways.
for (const size of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`turning Hands-free on moves nothing: the first verse stays put at ${size.width} x ${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await honestWake(page);
    await openUnlocked(page);
    await page.goto('/');
    await appReady(page);
    const first = page.locator('[data-verse]').first();
    await expect(first).toBeVisible();
    const top = async (): Promise<number> => ((await first.boundingBox()) as Box).y;
    const before = await top();
    await threeFingers(page);
    const mark = page.getByRole('img', { name: 'Hands-free is on', exact: true });
    await expect(mark).toBeVisible();
    await page.waitForTimeout(300); // a real-time wait: a window in which nothing must move
    expect(await top()).toBe(before);
    const markBox = (await mark.boundingBox()) as Box;
    expect(markBox.x + markBox.width).toBeLessThanOrEqual(size.width);
    await shot(page, `hands-free-no-jump-${size.width}`);
    await threeFingers(page);
    await expect(mark).toHaveCount(0);
    await page.waitForTimeout(300); // a real-time wait: a window in which nothing must move
    expect(await top()).toBe(before);
  });
}

// mw-5r3p30.1212: the mark stands in the Reader's header row at the header's right edge in every display mode, whatever top inset the phone reports (a notch or a camera cutout in full screen
// moves the header down by the inset: the mark, fixed at top 0, was left alone in the strip above it) and is the size --bk-handsfree-size sets (1 rem), cut by no edge.
const DISPLAYS = [
  { mode: 'browser', top: 0 },
  { mode: 'fullscreen', top: 0 },
  { mode: 'fullscreen', top: 40 },
  { mode: 'standalone', top: 32 },
] as const;
for (const display of DISPLAYS) {
  test(`the mic mark stands in the header row of Hebrews 12 at 1080 x 2340 in ${display.mode} with a top inset of ${display.top} px`, async ({ page }) => {
    await page.setViewportSize({ width: 1080, height: 2340 });
    await setDisplayMode(page, display.mode);
    if (display.top > 0) {
      const session = await page.context().newCDPSession(page);
      await session.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: display.top, left: 0, bottom: 0, right: 0 } });
    }
    await honestWake(page);
    await openUnlocked(page);
    await page.goto('/#/?b=heb&c=12');
    await appReady(page);
    await expect(page.getByRole('heading', { name: 'Hebrews 12', level: 1 })).toBeVisible();
    await threeFingers(page);
    const mark = page.getByRole('img', { name: 'Hands-free is on', exact: true });
    await expect(mark).toBeVisible();
    const markBox = (await mark.boundingBox()) as Box;
    const tap = (await page.locator('[data-hands-free-mark]').boundingBox()) as Box;
    const header = (await page.locator('header').first().boundingBox()) as Box;
    const inside = (inner: Box, outer: Box): boolean =>
      inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.x + inner.width <= outer.x + outer.width + 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;
    expect(inside(markBox, header), `the mark ${JSON.stringify(markBox)} is not inside the header row ${JSON.stringify(header)}`).toBe(true);
    expect(inside(tap, header), `the tap box ${JSON.stringify(tap)} is not inside the header row ${JSON.stringify(header)}`).toBe(true);
    expect(inside(markBox, { x: 0, y: 0, width: 1080, height: 2340 })).toBe(true);
    // the size --bk-handsfree-size sets: 1 rem, the dot the kit draws
    const sized = await page.evaluate(() => {
      const el = document.querySelector('[data-hands-free-mark]') as HTMLElement;
      return { rem: parseFloat(getComputedStyle(document.documentElement).fontSize), size: parseFloat(getComputedStyle(el).getPropertyValue('--bk-handsfree-size')) || 0 };
    });
    expect(sized.size).toBeGreaterThan(0);
    expect(markBox.width).toBeCloseTo(sized.rem, 0);
    await shot(page, `hands-free-header-row-${display.mode}-${display.top}`);
  });
}
