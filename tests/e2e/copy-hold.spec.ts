import { expect, test, type Page } from '@playwright/test';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlicensed, openUnlocked } from './unlocked';

// A long press on a verse number, a section heading or the place line copies the verse, its passage or the chapter at once (mw-9txn0x1.2), in the 'When you copy' format,
// and says 'Copied Colossians 3:1' for a moment; the text is never selected and the phone's callout menu never rises. A phone-width claim: 390x844, with touch.
// A verse number's hold is the tutor's (hold to talk) on a licensed phone, so the number is held on a phone with no licence.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.clock.install();
});

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());
const selection = (page: Page) => page.evaluate(() => window.getSelection()?.toString() ?? '');

async function keep(page: Page, values: Record<string, string>) {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
}

test('a hold on a verse number copies the verse, says so for a moment and selects nothing', async ({ page }) => {
  await openUnlicensed(page);
  await page.goto('/#/?b=col&c=3');
  await expect(page.getByRole('heading', { name: 'Colossians 3', level: 1 })).toBeVisible();
  const number = page.locator('[data-verse="1"] [data-verse-number]');
  await expect(number).toBeVisible();
  await expect(number).toHaveCSS('user-select', 'none');
  await holdFor(page, number, 650);
  await expect(page.getByRole('status').filter({ hasText: 'Copied Colossians 3:1' })).toBeVisible();
  const text = await clipboard(page);
  expect(text).toContain('Therefore, since you have been raised with Christ');
  expect(text).toContain('— Colossians 3:1 (MSB)');
  expect(text.split('\n').at(-1)).toBe('https://lampas.allmymind.org/#/?ref=Col.3.1');
  expect(await selection(page)).toBe('');
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  await shot(page, 'copy-hold');
  await page.clock.runFor(2600);
  await expect(page.getByRole('status').filter({ hasText: 'Copied Colossians 3:1' })).toHaveCount(0);
});

test('a tap on the number still opens the Verse view and copies nothing', async ({ page }) => {
  await openUnlicensed(page);
  await page.goto('/#/?b=col&c=3');
  await expect(page.getByRole('heading', { name: 'Colossians 3', level: 1 })).toBeVisible();
  await page.evaluate(() => navigator.clipboard.writeText('left alone'));
  await holdFor(page, page.locator('[data-verse="1"] [data-verse-number]'), 50);
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  expect(await clipboard(page)).toBe('left alone');
});

test('a hold on a section heading copies its passage', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=col&c=3');
  const heading = page.locator('[data-reader] [data-heading]').first();
  await expect(heading).toBeVisible();
  await holdFor(page, heading.getByRole('button'), 650);
  await expect(page.getByRole('status').filter({ hasText: /^Copied Colossians 3:\d+-\d+$/ })).toBeVisible();
  const text = await clipboard(page);
  expect(text).toContain('1 Therefore, since you have been raised with Christ');
  expect(text).toMatch(/— Colossians 3:1-\d+ \(MSB\)/);
  expect(await selection(page)).toBe('');
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
});

test('a hold on the place line copies the whole chapter', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=col&c=3');
  await expect(page.getByRole('heading', { name: 'Colossians 3', level: 1 })).toBeVisible();
  await keep(page, { readingMode: 'pages' });
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  const line = page.locator('[data-place-line]');
  await expect(line).toBeVisible();
  await holdFor(page, line, 650);
  await expect(page.getByRole('status').filter({ hasText: 'Copied Colossians 3' })).toBeVisible();
  const text = await clipboard(page);
  expect(text.split('\n')).toContain('— Colossians 3 (MSB)');
  expect(await selection(page)).toBe('');
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
});
