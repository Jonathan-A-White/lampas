import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The Reader's top (mw-5r3p30.119): Due, Goal, the tip and New words are one slim row of chips under the header, so the text starts high.
test.use({ viewport: { width: 412, height: 915 } });

/** Puts rows in one of the app's stores through raw IndexedDB, as the app wrote them. */
async function put(page: Page, store: string, rows: object[]) {
  await page.evaluate(
    ([name, list]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(name as string, 'readwrite');
          for (const row of list as object[]) tx.objectStore(name as string).put(row);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, rows] as const,
  );
}

const seeded = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => resolve(false);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('meta')) {
            db.close();
            return resolve(false);
          }
          const get = db.transaction('meta').objectStore('meta').get('grammarLevelsSeeded');
          get.onsuccess = () => {
            db.close();
            resolve(get.result !== undefined);
          };
          get.onerror = () => {
            db.close();
            resolve(false);
          };
        };
      }),
  );

/** The screenshot's state: nine words due (the seed's), the goal 1 John 1:1, the chapter's new words. */
async function openWithEverything(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => seeded(page)).toBe(true);
  // the first open leaves his nine learning words due: the screenshot's Due 9
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
}

test('with Due 9, a goal and new words the chips are one slim row and the text starts high', async ({ page }) => {
  await openWithEverything(page);
  const due = page.getByRole('button', { name: 'Due: 9' });
  const goal = page.getByTestId('goal-strip');
  const news = page.getByTestId('new-words');
  await expect(due).toHaveText('Due 9');
  await expect(goal).toHaveText(/^Goal \d+\/16$/);
  await expect(goal).toHaveAccessibleName(/^Goal: 1 John 1:1, \d+ of 16 words, \d+ of 30 ideas$/);
  await expect(news).toHaveText(/^New \d+$/);
  await expect(news).toHaveAccessibleName(/^New words: \d+$/);

  const row = page.getByTestId('reader-chips');
  const rowBox = await row.boundingBox();
  expect(rowBox?.height).toBeLessThanOrEqual(40);
  // the three chips share the one row
  for (const chip of [due, goal, news]) {
    const box = await chip.boundingBox();
    expect(box && rowBox && box.y >= rowBox.y - 0.5 && box.y + box.height <= rowBox.y + rowBox.height + 0.5).toBe(true);
  }
  // the first line of reading text starts at most 130 px from the top (it was about 300)
  // (the first thing in the reading box: the section heading when the verse has one, else the verse)
  const top = await page.evaluate(() => document.querySelector('[data-reader] h2, [data-reader] [data-verse]')?.getBoundingClientRect().top ?? -1);
  expect(top).toBeGreaterThan(0);
  expect(top).toBeLessThanOrEqual(130);
  await shot(page, 'reader-top');
});

test('the header keeps 44 px tap targets', async ({ page }) => {
  await openWithEverything(page);
  for (const name of ['Settings']) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
  }
});
