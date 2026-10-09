import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 360, height: 780 };

async function open(page: Page, hash: string): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto(`/${hash}`);
}

test('a reference link opens Romans 8 with verse 28 selected', async ({ page }) => {
  await open(page, '#/?ref=Romans%208:28');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="28"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.getByRole('region', { name: 'Reading check' }).getByRole('heading', { name: 'Romans 8:28' })).toBeVisible();
  await expect(page.locator('[data-link-notice]')).toHaveCount(0);
  // the address is the plain reader address now, so Back and a reload keep the place
  await expect.poll(() => page.evaluate(() => window.location.hash)).toMatch(/^#\/\?b=rom&c=8(&view=\w+)?(&weave=[\w+]+)?&v=28$/);
  expect(await page.evaluate(() => window.location.hash)).not.toContain('ref=');
  await shot(page, 'links-reference');
});

test('a reference past the end opens the nearest place with a one-line notice', async ({ page }) => {
  await open(page, '#/?ref=1Jn.9.9');
  await expect(page.getByRole('heading', { name: '1 John 5', level: 1 })).toBeVisible();
  const notice = page.locator('[data-link-notice]');
  await expect(notice).toContainText('“1Jn.9.9” is not in Lampas; showing 1 John 5.');
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'links-notice');
});

test('a Strong’s link opens the word sheet of νόμος', async ({ page }) => {
  await open(page, '#/?word=G3551');
  const sheet = page.getByRole('dialog', { name: 'Word' });
  await expect(sheet.getByTestId('sheet-word')).toHaveText('νόμος');
  await expect(sheet.getByTestId('sheet-gloss')).toHaveText('law');
  await shot(page, 'links-word');
});

test('the web+lampas: form the browser hands over opens the same verse', async ({ page }) => {
  await open(page, `#/?ref=${encodeURIComponent('web+lampas:Rom.8.28')}`);
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="28"]')).toHaveAttribute('data-selected', 'true');
});

test('Copy link on a verse panel puts the https link on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, '#/?ref=Rom.8.28');
  const panel = page.getByRole('region', { name: 'Reading check' });
  await panel.getByRole('button', { name: 'Copy link' }).click();
  await expect(panel.getByText('Link copied')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://lampas.allmymind.org/#/?ref=Rom.8.28');
  await shot(page, 'links-copy');
});

test('Copy link on the word sheet puts the https link of the word on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, '#/?word=G3551');
  await page.getByRole('dialog', { name: 'Word' }).getByRole('button', { name: 'Copy link' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://lampas.allmymind.org/#/?word=G3551');
});
