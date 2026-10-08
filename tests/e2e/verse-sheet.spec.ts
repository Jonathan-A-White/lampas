import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 360, height: 780 };

/** Taps verse 22's number and checks the panel under it: the reference heading, the verse's text in its own box, and Read in reach. */
async function checkPanel(page: Page, view: 'greek' | 'english', name: string): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto(`/#/?c=8&view=${view}`);
  await page.getByRole('button', { name: 'Verse 22', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Reading check' });
  await expect(panel.getByRole('heading', { name: 'Romans 8:22' })).toBeVisible();
  const verse = panel.locator('[data-sheet-verse]');
  await expect(verse).toBeVisible();
  await expect(verse).toHaveAttribute('lang', view === 'greek' ? 'grc' : 'en');
  expect(((await verse.textContent()) ?? '').length).toBeGreaterThan(30);
  // the heading and Read are both on the screen at once; a verse too long for that scrolls in its own box (max-h)
  const read = await panel.getByRole('button', { name: 'Read', exact: true }).boundingBox();
  const head = await panel.getByRole('heading', { name: 'Romans 8:22' }).boundingBox();
  if (!read || !head) throw new Error('the panel is not on the page');
  expect(head.y).toBeGreaterThanOrEqual(0);
  expect(read.y + read.height).toBeLessThanOrEqual(VIEWPORT.height);
  const box = await verse.boundingBox();
  if (!box) throw new Error('no verse box');
  expect(box.height).toBeLessThanOrEqual(210);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, name);
}

test('the Greek view panel under verse 22 shows Romans 8:22 and its Greek above Read, at 360 px', async ({ page }) => {
  await checkPanel(page, 'greek', 'verse-sheet-greek');
});

test('the English view panel under verse 22 shows Romans 8:22 and its English above Read, at 360 px', async ({ page }) => {
  await checkPanel(page, 'english', 'verse-sheet-english');
});
