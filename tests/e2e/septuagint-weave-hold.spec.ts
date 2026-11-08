// A hold on Weave in a Septuagint chapter whose Weave draws nothing woven (Swete's Greek alone, no aligned English, mw-u2w5klk.300) does nothing: no "Greek word order" toast and the Weave's Order
// setting, which every other book is laid out by, is left as it was. Genesis 1 and Psalms 23 (Greek 22) at 390x844; a hold on Weave in Romans 8 still flips the order. The Septuagint's files are the
// fixtures in tests/fixtures/data-lxx, answered to the page by route as tests/e2e/septuagint.spec.ts does.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: readFileSync(`tests/fixtures/data-lxx/${path}`, 'utf8') });
  });
});

const HOLD_MS = 800;
const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });

/** Puts a setting in the app's store through raw IndexedDB, as the app wrote it. */
async function keep(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: k, value: v });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [key, value],
  );
}

async function septuagintOn(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await keep(page, 'weave', 'solid');
}

for (const chapter of [
  { name: 'Genesis 1', url: '/#/?b=gen&c=1' },
  { name: 'Psalms 23', url: '/#/?b=psa&c=23' },
]) {
  test(`a hold on Weave in ${chapter.name} (Septuagint On, Weave Solid) says nothing and leaves the Weave's order as it was`, async ({ page }) => {
    await septuagintOn(page);
    await page.goto(chapter.url);
    await page.reload();
    await expect(page.locator('[data-reader-subtitle]')).toBeVisible();
    await expect(choice(page, 'Weave')).toBeVisible();
    await choice(page, 'Weave').click();
    await expect(choice(page, 'Weave')).toHaveAttribute('aria-pressed', 'true');

    await holdFor(page, choice(page, 'Weave'), HOLD_MS);
    await page.clock.runFor(500);
    await page.waitForTimeout(300);
    await expect(page.locator('p[role="status"]')).toHaveCount(0);
    await expect(page.getByText('Greek word order')).toHaveCount(0);
    await expect(choice(page, 'Weave')).toHaveAttribute('aria-pressed', 'true');
    await shot(page, `septuagint-weave-hold-${chapter.name.replace(' ', '-').toLowerCase()}`);

    // Romans 8 is still in the English word order
    await page.goto('/#/?b=rom&c=8');
    await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
    await expect(page.locator('[data-verse="1"] [data-text]')).toHaveText(/^Therefore there is now no condemnation/);
  });
}

test('a hold on Weave in Romans 8 still flips the word order', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8&weave=solid');
  await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
  await holdFor(page, choice(page, 'Weave'), HOLD_MS);
  await expect(page.locator('p[role="status"]')).toHaveText('Greek word order');
  await expect(page.locator('[data-verse="1"] [data-text]')).toHaveText(/^no Therefore there is now condemnation/);
});
