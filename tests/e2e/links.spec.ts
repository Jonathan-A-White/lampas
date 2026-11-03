import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 360, height: 780 };

async function open(page: Page, hash: string): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto(`/${hash}`);
}

test('a reference link opens the Reader on Romans 8 with verse 28 brought to the top, no Verse view', async ({ page }) => {
  await open(page, '#/?ref=Romans%208:28');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '28');
  await expect(page.locator('[data-verse="28"]')).not.toHaveAttribute('data-selected', 'true');
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  await expect(page.locator('[data-link-notice]')).toHaveCount(0);
  // the address is the plain reader address now (the chapter, no verse): a reload keeps the place the way the Reader keeps any
  await expect.poll(() => page.evaluate(() => window.location.hash)).toMatch(/^#\/\?b=rom&c=8(&view=\w+)?(&weave=[\w+]+)?$/);
  expect(await page.evaluate(() => window.location.hash)).not.toContain('ref=');
  await shot(page, 'links-reference');
});

test('a reference past the end opens the nearest place with a one-line notice', async ({ page }) => {
  await open(page, '#/?ref=1Jn.9.9');
  await expect(page.getByRole('heading', { name: '1 John 5', level: 1 })).toBeVisible();
  const notice = page.locator('[data-link-notice]');
  await expect(notice).toContainText('“1 John 9:9” is not in Lampas; showing 1 John 5.');
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'links-notice');
});

test('a Strong’s link opens the word sheet of νόμος', async ({ page }) => {
  await open(page, '#/?word=G3551');
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-word')).toHaveText('νόμος');
  await expect(sheet.getByTestId('sheet-gloss')).toHaveText('law');
  await shot(page, 'links-word');
});

test('the web+lampas: form the browser hands over opens the same verse', async ({ page }) => {
  await open(page, `#/?ref=${encodeURIComponent('web+lampas:Rom.8.28')}`);
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-brought-verse', '28');
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
});

test('Copy in the Verse view puts the verse, its reference and the https link on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, '#/?b=rom&c=8&v=28');
  const panel = page.getByRole('region', { name: 'Verse view' });
  await panel.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(panel.getByText('Copied', { exact: true })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toContain('— Romans 8:28 (MSB)');
  expect(copied.split('\n').at(-1)).toBe('https://lampas.allmymind.org/#/?ref=Rom.8.28');
  await shot(page, 'links-copy');
});

test('Copy link on the word sheet puts the https link of the word on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await open(page, '#/?word=G3551');
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByRole('button', { name: 'Copy link' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('https://lampas.allmymind.org/#/?word=G3551');
});
