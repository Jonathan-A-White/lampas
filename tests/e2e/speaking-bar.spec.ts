import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, isSpeaking, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The bounds below are the phone's screen, so the spec sets it (the chromium project is 1280 wide).
const PHONE = { width: 390, height: 844 };
test.use({ viewport: PHONE });

// The speaking bar (voice-kit/speech, drawn by src/speech/SpeakingBarSlot.tsx) over a verse at phone width. The engine is voice-kit's honest fake: a slow
// reader (300 ms a word) keeps a verse on the bar long enough to look at. The shots are written by the spec (shots/ is not committed).
async function openRomans8(page: Page) {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 300 });
  await page.goto('/');
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
}

const bar = (page: Page) => page.getByRole('region', { name: 'Speaking', exact: true });

test('Listen on a verse shows the bar at the foot, 44 px buttons, over no text and clear of the floating ?', async ({ page }) => {
  await openRomans8(page);
  await page.locator('[data-verse="3"]').getByRole('button', { name: 'Hear the verse', exact: true }).click();
  await expect(bar(page)).toBeVisible();
  await expect(bar(page).getByRole('button')).toHaveText(['Pause', 'Restart', 'Stop']);

  const box = await bar(page).boundingBox();
  const main = await page.locator('[data-reader]').boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= PHONE.width).toBe(true);
  // in flow, under the reading box: it covers no text (no Talk bar is under it any more, mw-5r3p30.882)
  expect(box && main && main.y + main.height <= box.y + 1).toBe(true);
  for (const name of ['Pause', 'Restart', 'Stop']) {
    const b = await bar(page).getByRole('button', { name, exact: true }).boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(43.5);
    expect(b?.width).toBeGreaterThanOrEqual(43.5);
    expect(b && b.x >= 0 && b.x + b.width <= PHONE.width).toBe(true);
  }
  // the floating ? is drawn once and covers none of the bar's buttons
  await expect(page.locator('[data-floating-tutor]')).toHaveCount(1);
  const ask = await page.locator('[data-floating-tutor]').boundingBox();
  expect(ask).not.toBeNull();
  for (const name of ['Pause', 'Restart', 'Stop']) {
    const b = await bar(page).getByRole('button', { name, exact: true }).boundingBox();
    const apart = !ask || !b || ask.x + ask.width <= b.x || b.x + b.width <= ask.x || ask.y + ask.height <= b.y || b.y + b.height <= ask.y;
    expect(apart).toBe(true);
  }
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'speaking-bar');
});

test('Pause, Resume from the same sentence, Restart and Stop on a verse of two sentences; Listen stops at the verse end', async ({ page }) => {
  await openRomans8(page);
  await page.locator('[data-verse="3"]').getByRole('button', { name: 'Hear the verse', exact: true }).click();
  await expect(bar(page)).toBeVisible();
  await expect.poll(async () => (await spoken(page)).filter((e) => e.outcome === 'ended').length, { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  await bar(page).getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(bar(page).getByRole('button')).toHaveText(['Resume', 'Restart', 'Stop']);
  expect(await isSpeaking(page)).toBe(false);
  const before = (await spoken(page)).length;
  await bar(page).getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(bar(page).getByRole('button')).toHaveText(['Pause', 'Restart', 'Stop']);
  const all = await spoken(page);
  const resumed = all.slice(before).map((e) => e.text);
  // the second sentence only: the first was heard
  expect(resumed).toHaveLength(1);
  expect(resumed[0]).not.toBe(all[0].text);
  await bar(page).getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(bar(page)).toBeVisible();
  // played out to its end the verse stops there: no bar, and verse 4 was never spoken
  await expect(bar(page)).toHaveCount(0, { timeout: 30_000 });
  const texts = (await spoken(page)).map((e) => e.text).join(' ');
  expect(texts).not.toContain('so that the righteous standard of the law');
  await expect(page.locator('[data-reading]')).toHaveCount(0);
});

test('Leaving the reader pauses the reading; the bar offers Resume on Settings and back on the reader', async ({ page }) => {
  await openRomans8(page);
  await page.locator('[data-verse="3"]').getByRole('button', { name: 'Hear the verse', exact: true }).click();
  await expect(bar(page)).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();
  await expect(bar(page).getByRole('button')).toHaveText(['Resume', 'Restart', 'Stop']);
  expect(await isSpeaking(page)).toBe(false);
  const box = await bar(page).boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= PHONE.width && box.y + box.height <= PHONE.height).toBe(true);
  // the floating ? is on this screen too and covers none of the bar's buttons
  const ask = await page.locator('[data-floating-tutor]').boundingBox();
  expect(ask).not.toBeNull();
  for (const name of ['Resume', 'Restart', 'Stop']) {
    const b = await bar(page).getByRole('button', { name, exact: true }).boundingBox();
    expect(!ask || !b || ask.x + ask.width <= b.x || b.x + b.width <= ask.x || ask.y + ask.height <= b.y || b.y + b.height <= ask.y).toBe(true);
  }
  await shot(page, 'speaking-bar-settings');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await expect(bar(page).getByRole('button')).toHaveText(['Resume', 'Restart', 'Stop']);
  await bar(page).getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(bar(page).getByRole('button')).toHaveText(['Pause', 'Restart', 'Stop']);
  await expect.poll(() => isSpeaking(page)).toBe(true);
});
