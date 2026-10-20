// tests/e2e/audio-bible-greek.spec.ts — in Greek view the Verse view offers no English audio (mw-5r3p30.653): with the Audio Bible on, Hebrews 13:25 in Greek
// shows no 'Listen in Audible' card, and the same verse in English still does.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ hasTouch: true });

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them. */
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

async function openHebrews1325(page: Page, view: 'greek' | 'english') {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { audioBible: 'word-of-promise' });
  await page.goto(`/#/?b=heb&c=13&v=25&view=${view}`);
  await page.reload();
  const region = page.getByRole('region', { name: 'Verse view' });
  await expect(region).toBeVisible();
  await region.getByRole('button', { name: 'Listen', exact: true }).click();
  await expect(region.getByText(/Tap Play to hear/)).toBeVisible();
  return region;
}

test('Greek view of Hebrews 13:25 shows no Listen in Audible card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const view = await openHebrews1325(page, 'greek');
  await expect(view.locator('[data-sheet-verse]')).toHaveAttribute('lang', 'el');
  await expect(view.locator('[data-audio-bible]')).toHaveCount(0);
  await expect(view.getByRole('link', { name: /Listen in Audible/ })).toHaveCount(0);
  await shot(page, 'audio-bible-greek-none');
});

test('English view of Hebrews 13:25 still shows the Listen in Audible card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const view = await openHebrews1325(page, 'english');
  await expect(view.locator('[data-audio-bible]')).toBeVisible();
  await expect(view.getByRole('link', { name: /^Listen in Audible/ })).toBeVisible();
});
