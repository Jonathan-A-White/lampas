import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test('Settings > Grammar approach at phone width: the one path, the ladder, with no choice to make, and a phone that saved BMA Tutor reads as it', async ({ page }) => {
  await openUnlocked(page);
  // an old phone: the saved choice is the BMA Tutor path, which is no longer listed
  await page.goto('/#/settings');
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'grammarApproach', value: 'bma-tutor' });
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();

  await expect(page.locator('[data-approach-method]')).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Grammar approach' })).toHaveCount(0);
  await expect(page.locator('[data-approach-credit]')).toHaveCount(0);
  await expect(page.locator('[data-next]')).toHaveCount(1);
  await expect(page.locator('[data-approach-lessons] [data-lesson-title]').first()).toHaveText('The Greek alphabet');
  expect(await page.locator('[data-approach-method]').evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  // nothing makes the page wider than the phone
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  const ask = page.getByRole('button', { name: 'Ask for another approach' });
  await expect(ask).toBeVisible();
  const box = await ask.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(47.5);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);

  // the screen scrolls in its own box: bring the section to the top so the shot shows it
  await page.getByRole('heading', { name: 'Grammar approach', level: 2 }).evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await shot(page, 'grammar-approach');
});
