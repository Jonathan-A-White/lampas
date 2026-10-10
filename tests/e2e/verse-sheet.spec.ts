import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

const VIEWPORT = { width: 360, height: 780 };

/** Taps verse 22's number and checks the Verse view: the reference heading, the verse big in its own language, the hold bar in reach. */
async function checkView(page: Page, view: 'greek' | 'english', name: string): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto(`/#/?c=8&view=${view}`);
  const line = page.locator('[data-verse="22"] [data-text]');
  const lineSize = await line.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  const screen = await openVerseView(page, 22);
  await expect(screen.getByRole('heading', { name: 'Romans 8:22' })).toBeVisible();
  const verse = screen.locator('[data-sheet-verse]');
  await expect(verse).toBeVisible();
  await expect(verse).toHaveAttribute('lang', view === 'greek' ? 'grc' : 'en');
  expect(((await verse.textContent()) ?? '').length).toBeGreaterThan(30);
  // big: set larger than the Reader's own line
  expect(await verse.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(lineSize);
  // the heading, the verse and the foot's one control (Listen's Play button) are on the screen at once
  const bar = await screen.locator('[data-verse-bar] button').boundingBox();
  const head = await screen.getByRole('heading', { name: 'Romans 8:22' }).boundingBox();
  if (!bar || !head) throw new Error('the Verse view is not on the page');
  expect(head.y).toBeGreaterThanOrEqual(0);
  expect(bar.y + bar.height).toBeLessThanOrEqual(VIEWPORT.height);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, name);
}

test('the Greek view of the Verse view on verse 22 shows Romans 8:22 big, with its Play button, at 360 px', async ({ page }) => {
  await checkView(page, 'greek', 'verse-sheet-greek');
});

test('the English view of the Verse view on verse 22 shows Romans 8:22 big, with its Play button, at 360 px', async ({ page }) => {
  await checkView(page, 'english', 'verse-sheet-english');
});
