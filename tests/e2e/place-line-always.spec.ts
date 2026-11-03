// The place line ('John 5 · 45%', src/PlaceLine.tsx) at the foot of the Reader is there with the Immersive reader Off and On, in Scroll (mw-5r3p30.1028; his words, 2026-11-03: "the chapter thing at the bottom
// should be on whether immersive reader is there or not but no Maps"): with Off it is always under the text; with On it comes with the bars away, as it did. A tap on it opens the whole chapter in the Verse
// view. No Maps door is at the chapter's foot in either. 390x844.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

/** Puts a setting in the app's store through raw IndexedDB, as the app wrote it. */
async function keep(page: Page, key: string, value: string) {
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

async function openJohn5(page: Page, immersive: 'on' | 'off'): Promise<void> {
  await openUnlocked(page);
  await page.goto('/#/?b=jhn&c=5');
  await expect(page.getByRole('heading', { name: 'John 5', level: 1 })).toBeVisible();
  await keep(page, 'immersiveReader', immersive);
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
  await expect(page.locator('[data-verse="1"]')).toBeAttached();
}

const line = (page: Page) => page.locator('[data-place-line]');

test('Immersive Off: the place line stands under the text, whole and in view, and follows the scrolling', async ({ page }) => {
  await openJohn5(page, 'off');
  await expect(line(page)).toBeVisible();
  await expect(line(page)).toHaveText(/^John 5 · \d+%$/);
  const box = await page.locator('[data-reader]').boundingBox();
  const at = await line(page).boundingBox();
  expect(box && at && at.y).toBeGreaterThanOrEqual((box?.y ?? 0) + (box?.height ?? 0) - 1);
  expect((at?.y ?? 0) + (at?.height ?? 0)).toBeLessThanOrEqual(844);
  await page.locator('[data-reader]').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(line(page)).toHaveText('John 5 · 100%');
  // the bars stay: nothing of Immersive came with the line
  await expect(page.getByTestId('reader-chips')).toBeVisible();
  // the foot has the chapter buttons and no Maps door
  await expect(page.getByRole('navigation', { name: 'Chapters', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: /^Maps/ })).toHaveCount(0);
  await shot(page, 'place-line-always-off');
});

test('Immersive Off: a tap on the place line opens the whole chapter in the Verse view', async ({ page }) => {
  await openJohn5(page, 'off');
  await line(page).click();
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
});

test('Immersive On: the place line comes with the bars away, and no Maps door is at the foot', async ({ page }) => {
  await openJohn5(page, 'on');
  await page.locator('[data-reader]').evaluate((el) => {
    el.scrollTop = 1000;
  });
  await expect(line(page)).toBeVisible();
  await expect(line(page)).toHaveText(/^John 5 · \d+%$/);
  await page.locator('[data-reader]').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(page.getByRole('navigation', { name: 'Chapters', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: /^Maps/ })).toHaveCount(0);
  await shot(page, 'place-line-always-on');
});
