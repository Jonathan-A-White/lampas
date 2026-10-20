// tests/e2e/position-sounds.spec.ts — a sound that changes by position is taught as a rule and drilled on a real word (mw-5r3p30.646, 390x844): the ευ sheet says when it is
// v and when f, with a word and its respelling for each, and its drill asks the sound of the marked ευ in a word, never of ευ alone.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** Puts rows in the app's own store through raw IndexedDB, as the app wrote them. */
async function put(page: Page, store: 'settings', rows: object[]) {
  await page.evaluate(
    ([name, list]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction(name as string, 'readwrite');
          for (const row of list as object[]) tx.objectStore(name as string).put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, rows] as const,
  );
}

test('the ευ sheet says when it is v and when f, and its drill asks the marked ευ in a word', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
  await page.reload();
  await page.goto('/#/goal');
  await page.reload();
  // the sheet of a pair is reached from the whole path, where every idea is a node
  await page.getByRole('button', { name: 'See the whole path' }).click();
  await expect(page.getByTestId('graph-world')).toBeAttached();
  await page.locator('[data-idea="diphthong-eu"]').dispatchEvent('click');

  const sheet = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(sheet.getByRole('heading', { name: 'The vowel pair ευ' })).toBeVisible();
  const sounds = sheet.getByTestId('idea-text');
  await expect(sounds).toContainText('depends on the letter after it');
  await expect(sounds).toContainText('εὐαγγέλιον is “ev-an-GHE-lee-on”');
  await expect(sounds).toContainText('εὐχαριστῶ is “ef-kha-ree-STO”');
  await sounds.scrollIntoViewIfNeeded();
  await expect(sounds).toBeInViewport();
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'position-sounds-sheet');

  // I know it starts Drill it: the sound of the marked pair in a word
  const slider = sheet.getByRole('slider', { name: 'Your level' });
  await slider.focus();
  await page.keyboard.press('End');
  const drill = page.getByRole('dialog', { name: 'Drill it' });
  await expect(drill.getByTestId('drill-step')).toHaveText(/^Step 1 of \d+$/);
  await expect(drill.getByTestId('grammar-prompt')).toHaveText('What sound does the marked ευ make in this word?');
  // whatever accent or breathing the word carries, the marked letters are ε then υ
  const marked = await drill.getByTestId('grammar-form').locator('[data-marked]').innerText();
  expect(marked.normalize('NFD').replace(/\p{M}/gu, '')).toBe('ευ');
  const options = drill.locator('[data-option]');
  expect(await options.count()).toBe(4);
  const texts = await options.allInnerTexts();
  expect(texts.some((t) => t.startsWith('ev,'))).toBe(true);
  expect(texts.some((t) => t.startsWith('ef,'))).toBe(true);
  for (const option of await options.all()) {
    const box = await option.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(-0.5);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390.5);
  }
  await shot(page, 'position-sounds-drill');
});
