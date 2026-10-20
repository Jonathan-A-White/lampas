import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The teach tiles of the idea sheet (mw-5r3p30.232): the alphabet's 24 tiles are at least 44 px and none is cut off, on a phone held upright and on its side.

/** Puts a row in the app's own settings store through raw IndexedDB, as the app wrote it. */
async function putSetting(page: Page, row: { key: string; value: string }) {
  await page.evaluate(
    (r) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          tx.objectStore('settings').put(r);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    row,
  );
}

const seeded = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => resolve(false);
        open.onsuccess = () => {
          const idb = open.result;
          if (!idb.objectStoreNames.contains('meta')) {
            idb.close();
            return resolve(false);
          }
          const get = idb.transaction('meta').objectStore('meta').get('grammarLevelsSeeded');
          get.onsuccess = () => {
            idb.close();
            resolve(get.result !== undefined);
          };
          get.onerror = () => {
            idb.close();
            resolve(false);
          };
        };
      }),
  );

async function opensIdea(page: Page, title: string) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => seeded(page)).toBe(true);
  await putSetting(page, { key: 'goal', value: '1 John 1:1' });
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: title }).click();
  const sheet = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('teach-tiles')).toBeVisible();
  return sheet;
}

for (const [name, size] of [['upright', { width: 390, height: 844 }], ['sideways', { width: 844, height: 390 }]] as const) {
  test(`the alphabet's 24 tiles are four across, at least 44 px, and none is cut off, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    const sheet = await opensIdea(page, 'The Greek alphabet');
    const tiles = sheet.getByTestId('teach-tile');
    await expect(tiles).toHaveCount(24);
    const box = await sheet.getByTestId('teach-tiles').boundingBox();
    const rows = new Set<number>();
    for (const tile of await tiles.all()) {
      await tile.scrollIntoViewIfNeeded();
      const b = await tile.boundingBox();
      expect(b?.width, 'tile width').toBeGreaterThanOrEqual(44);
      expect(b?.height, 'tile height').toBeGreaterThanOrEqual(44);
      expect((b?.x ?? 0) + (b?.width ?? 0), 'tile right edge').toBeLessThanOrEqual(size.width);
      expect(b?.x ?? 0, 'tile left edge').toBeGreaterThanOrEqual(0);
      expect((b?.x ?? 0) + (b?.width ?? 0), 'inside the grid').toBeLessThanOrEqual((box?.x ?? 0) + (box?.width ?? 0) + 0.5);
      rows.add(await tile.evaluate((el) => Math.round(el.getBoundingClientRect().top - (el.parentElement?.getBoundingClientRect().top ?? 0))));
      // what is on a tile is not clipped either
      expect(await tile.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'tile content fits').toBe(true);
      for (const control of await tile.getByRole('button').all()) {
        const c = await control.boundingBox();
        expect(c?.height, 'control height').toBeGreaterThanOrEqual(43.5);
        expect((c?.x ?? 0) + (c?.width ?? 0), 'control right edge').toBeLessThanOrEqual(size.width);
      }
    }
    expect(rows.size, 'rows of tiles, four across').toBe(6);
    const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    expect(fits.w).toBeLessThanOrEqual(fits.c);
    await shot(page, `teach-tiles-alphabet-${name}`);
  });
}

test('the breathing marks sheet shows its two tiles with an example word to hear, at a phone width', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const sheet = await opensIdea(page, 'Breathing marks');
  await expect(sheet.getByTestId('teach-tile')).toHaveCount(2);
  for (const tile of await sheet.getByTestId('teach-tile').all()) {
    const b = await tile.boundingBox();
    expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(390);
  }
  for (const word of ['ἅγιος', 'ἀγάπη']) {
    const play = sheet.getByRole('button', { name: `Hear ${word}` });
    expect((await play.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  }
  await shot(page, 'teach-tiles-breathings');
});
