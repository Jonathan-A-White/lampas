// Settings > Old Testament in Greek (Septuagint) and the Reader on Genesis 1 (mw-u2w5klk.11) at 390x844: turn the setting on, open Genesis 1, and the Greek stands with Brenton's English under verse 1,
// the title is still Genesis 1 with its edition under it, the chips row is there and Back returns to Settings. public/data-lxx ships no book yet, so the Septuagint's files are the fixtures in
// tests/fixtures/data-lxx, answered to the page by route (the chapters are built from tests/fixtures/lxx by scripts/data-build-lxx.ts).
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: readFileSync(`tests/fixtures/data-lxx/${path}`, 'utf8') });
  });
});

const LABEL = 'Old Testament in Greek (Septuagint)';

async function turnOn(page: Page): Promise<void> {
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: LABEL, exact: true });
  await expect(row).toBeVisible();
  // off to start
  await expect(row.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
}

test('the setting is under How much Greek?, found by a search, and turned on it opens Genesis 1 in the Greek with Brenton under it', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  await expect(page.getByText('Swete’s Greek with Brenton’s English; the Hebrew when off.')).toBeVisible();
  await page.getByRole('searchbox').fill('Septuagint');
  await expect(page.getByText(LABEL, { exact: true }).first()).toBeVisible();
  await page.getByRole('searchbox').fill('');

  await turnOn(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button')).toHaveText(['English', 'Greek']);
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();

  const verse = page.locator('[data-verse="1"]');
  await expect(verse.locator('[data-word="0"]')).toHaveText('ΕΝ');
  await expect(verse.locator('[data-lxx-english]')).toHaveText('In the beginning God made the heaven and the earth.');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Genesis 1');
  await expect(page.locator('[data-reader-subtitle]')).toHaveText('Septuagint (Swete) · Brenton (LXX2012)');
  await expect(page.getByTestId('reader-chips')).toBeVisible();

  // nothing runs off the side of the phone
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
  await shot(page, 'septuagint-reader');

  // Back: the gear opens Settings and Back returns to the chapter
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page.locator('[data-verse="1"] [data-lxx-english]')).toBeVisible();
});

test('Psalms 23 names both numberings and a book that is not shipped says so', async ({ page }) => {
  await openUnlocked(page);
  await turnOn(page);
  await page.goto('/#/?b=psa&c=23');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Psalms 23 (Greek 22)');
  await expect(page.locator('[data-verse="1"] [data-verse-number]')).toHaveText('1 (22:1)');
  await page.goto('/#/?b=isa&c=1');
  await expect(page.locator('[data-septuagint-not-ready]')).toHaveText('The Septuagint of Isaiah is not ready yet; this is the Hebrew.');
});
