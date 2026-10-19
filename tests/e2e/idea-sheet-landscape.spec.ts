// tests/e2e/idea-sheet-landscape.spec.ts — the idea sheet turned sideways, 844x390 (mw-5r3p30.450, mw-5r3p30.483): its main content keeps at least half the
// sheet's height, the first Examples row and its speaker show without a drag, and the omicron sheet's 'How it sounds' line is in view above the slider.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

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

/** The Goal chip, the grammar ideas bar, then 'The Greek alphabet': its idea sheet is open at the first place. */
async function openAlphabet(page: Page): Promise<Locator> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
  await page.reload();
  await page.getByTestId('goal-strip').click();
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The Greek alphabet', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Idea' });
  await expect(sheet.getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
  await expect(sheet.getByTestId('idea-example').first()).toBeVisible();
  return sheet;
}

/** The box of the sheet that scrolls its text: the nearest scrolling ancestor of the 'What it is' line. */
const textBox = (sheet: Locator) => sheet.getByTestId('idea-what').locator('xpath=ancestor::div[contains(@class,"overflow-y-auto")][1]');

test('the alphabet sheet sideways shows its first Examples row and its speaker without a drag, and its text keeps over half the sheet', async ({ page }) => {
  const sheet = await openAlphabet(page);
  const first = sheet.getByTestId('idea-example').first();
  await expect(first).toBeInViewport({ ratio: 1 });
  await expect(first.locator('xpath=following-sibling::*[1]')).toBeInViewport({ ratio: 1 });
  const dialog = await sheet.boundingBox();
  const text = await textBox(sheet).boundingBox();
  expect((text?.height ?? 0) / (dialog?.height ?? 1)).toBeGreaterThanOrEqual(0.5);
  await shot(page, 'idea-sheet-landscape');
});

test('the omicron sheet sideways shows the sound above the slider', async ({ page }) => {
  const sheet = await openAlphabet(page);
  await sheet.getByRole('button', { name: 'About omicron' }).click();
  // the omicron sheet opens over the alphabet's: the topmost Idea dialog is the one he reads
  const top = page.getByRole('dialog', { name: 'Idea' }).last();
  await expect(top.getByRole('heading', { name: 'Omicron' })).toBeVisible();
  await shot(page, 'idea-sheet-landscape-omicron');
  const sound = top.getByTestId('idea-text');
  await expect(sound).toContainText('sounds like');
  await expect(top.getByRole('heading', { name: 'How it sounds', exact: true })).toBeInViewport({ ratio: 1 });
  await expect(sound).toBeInViewport({ ratio: 1 });
  const slider = await top.getByRole('slider', { name: 'Your level' }).boundingBox();
  const line = await sound.boundingBox();
  // sideways the sound stands at the top of the column at the right, above the slider (mw-5r3p30.483)
  expect((line?.y ?? 0) + (line?.height ?? 0)).toBeLessThanOrEqual((slider?.y ?? 0) + 0.5);
  const dialog = await top.boundingBox();
  const text = await textBox(top).boundingBox();
  expect((text?.height ?? 0) / (dialog?.height ?? 1)).toBeGreaterThanOrEqual(0.5);
});
