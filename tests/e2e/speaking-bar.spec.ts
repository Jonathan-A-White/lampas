import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, isSpeaking, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The speaking bar (bsv-kit/speech, drawn by src/speech/SpeakingBarSlot.tsx) over a verse at phone width. The engine is bsv-kit's honest fake: a slow
// reader (300 ms a word) keeps a verse on the bar long enough to look at. The shots are written by the spec (shots/ is not committed).
async function openRomans8(page: Page) {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 300 });
  await page.goto('/');
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
}

const bar = (page: Page) => page.getByRole('region', { name: 'Speaking', exact: true });

test('Listen on a verse shows the bar above the Talk bar, 44 px buttons, over no text and clear of the Ask the tutor button', async ({ page }) => {
  await openRomans8(page);
  await page.locator('[data-verse="3"]').getByRole('button', { name: 'Hear the verse', exact: true }).click();
  await expect(bar(page)).toBeVisible();
  await expect(bar(page).getByRole('button')).toHaveText(['Pause', 'Restart', 'Stop']);

  const box = await bar(page).boundingBox();
  const talk = await page.locator('[data-talk-bar]').boundingBox();
  const main = await page.locator('[data-reader]').boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  // in flow, between the reading box and the Talk bar: it covers no text
  expect(box && main && main.y + main.height <= box.y + 1).toBe(true);
  expect(box && talk && box.y + box.height <= talk.y + 1).toBe(true);
  for (const name of ['Pause', 'Restart', 'Stop']) {
    const b = await bar(page).getByRole('button', { name, exact: true }).boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(43.5);
    expect(b?.width).toBeGreaterThanOrEqual(43.5);
    expect(b && b.x >= 0 && b.x + b.width <= 390).toBe(true);
  }
  // the round Ask the tutor button rides above the bar, not over its buttons
  const ask = await page.locator('[data-ask-tutor]').boundingBox();
  expect(ask && box && ask.y + ask.height <= box.y + 1).toBe(true);
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
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await expect(bar(page).getByRole('button')).toHaveText(['Resume', 'Restart', 'Stop']);
  expect(await isSpeaking(page)).toBe(false);
  const box = await bar(page).boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844).toBe(true);
  // the round Ask the tutor button rides above it here too
  const ask = await page.locator('[data-ask-tutor]').boundingBox();
  expect(ask && box && ask.y + ask.height <= box.y + 1).toBe(true);
  await shot(page, 'speaking-bar-settings');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await expect(bar(page).getByRole('button')).toHaveText(['Resume', 'Restart', 'Stop']);
  await bar(page).getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(bar(page).getByRole('button')).toHaveText(['Pause', 'Restart', 'Stop']);
  await expect.poll(() => isSpeaking(page)).toBe(true);
});
