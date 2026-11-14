// tests/e2e/hands-free.spec.ts — Hands-free (mw-rl10piw.5) at 390 x 844: Settings > Listening > Reading voices has Hands-free as its first row, Off to start; a three-finger tap on the
// Reader turns it On (the touches come through the browser, one touchstart a finger, as a phone's do) and a small microphone mark named 'Hands-free is on' stands at the top right, in the
// shell's top strip: it overlaps no button of the Reader's header and no verse text. Shots: the Reader with the mark, and the Settings row. The speech and the wake lock are the browser's own
// (headless Chromium has none worth asserting on: tests/unit/hands-free-switch.test.tsx and features/hands-free.feature hold the speech and the lock).
import { expect, test, type Page } from '@playwright/test';
import { appReady } from './app-ready';
import { openGroup } from './settings-group';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

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
  expect(markBox.width).toBeGreaterThan(20);
  expect(markBox.x + markBox.width).toBeLessThanOrEqual(390);
  expect(markBox.y).toBeGreaterThanOrEqual(0);
  const buttons = page.locator('header button:visible, header a:visible');
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i += 1) {
    const box = (await buttons.nth(i).boundingBox()) as Box | null;
    if (box) expect(overlaps(markBox, box), `the mark covers the header's button ${i}`).toBe(false);
  }
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
