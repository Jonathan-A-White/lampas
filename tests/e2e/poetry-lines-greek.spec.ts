// A verse of poetry in the Greek tab (mw-5r3p30.1166, docs/data.md 'Poetry lines'): the New Testament's Greek is broken at the word each English line starts at (Luke 1:46-55, the Magnificat, the lead-in apart), and
// a Septuagint Psalm where its Hebrew verse breaks (Psalm 23, Greek 22), by proportion. Light and dark, at 390x844. public/data-lxx ships no chapter in the gate: the Psalm is the fixture of tests/fixtures/data-lxx.
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

const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });
const linesOf = (page: Page, verse: number) => page.locator(`[data-verse="${verse}"] [data-line]`);
const noSideways = async (page: Page): Promise<void> => {
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
};

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`${scheme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
    });

    test('Luke 1:46-55 in Greek: the lead-in apart, then a line at the word each English line starts at', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/?b=luk&c=1');
      await expect(page.locator('[data-verse="46"]')).toBeVisible();
      await choice(page, 'Greek').click();
      await expect(choice(page, 'Greek')).toHaveAttribute('aria-pressed', 'true');
      const first = linesOf(page, 46);
      await expect(first).toHaveCount(2);
      await expect(first.nth(0)).toHaveAttribute('data-indent', '0');
      await expect(first.nth(0)).toContainText('εἶπεν Μαριάμ');
      await expect(first.nth(1)).toContainText('Μεγαλύνει');
      await expect(linesOf(page, 51)).toHaveCount(3);
      await expect(linesOf(page, 47)).toHaveCount(0);
      await noSideways(page);
      await page.locator('[data-verse="46"]').scrollIntoViewIfNeeded();
      await shot(page, `poetry-greek-luke-1-${scheme}`);
    });

    test('Psalm 23 (Greek 22) in the Septuagint: each verse in the two lines its Hebrew verse has', async ({ page }) => {
      await openUnlocked(page);
      await page.goto('/#/settings');
      const septuagint = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
      await septuagint.getByRole('button', { name: 'On', exact: true }).click();
      await expect(septuagint.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
      await page.goto('/#/?b=psa&c=23');
      await page.reload();
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      await choice(page, 'Greek').click();
      await expect(choice(page, 'Greek')).toHaveAttribute('aria-pressed', 'true');
      for (const n of [1, 2, 3]) await expect(linesOf(page, n)).toHaveCount(2);
      await expect(linesOf(page, 2).nth(0)).toContainText('κατεσκήνωσεν');
      await expect(linesOf(page, 2).nth(1)).toContainText('ἐπὶ ὕδατος');
      await noSideways(page);
      await shot(page, `poetry-greek-psalm-23-lxx-${scheme}`);
    });
  });
}
