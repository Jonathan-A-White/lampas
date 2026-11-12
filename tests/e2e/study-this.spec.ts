// The 'Study this' row under a wrong answer (mw-indx1x6.6) at 390x844: the ending card of ἁμαρτία (accusative plural, 1 John 1) answered wrong in Review shows the row under the answer with a
// link to the table, the lesson and the word, each a full-width button clear of the floating ?, and Next still in view; the table link opens Noun endings on This word with the asked cell lit
// and reading ἁμαρτίας, and Back returns to the card and its row. See the table is not drawn beside the row: the row's table link is the same place.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { waitForDue } from './today-chip';

test.use({ viewport: { width: 390, height: 844 } });

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'reviews' | 'settings' | 'grammarLevels', rows: object[]) {
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

test('a wrong ending in Review shows Study this under the answer, clear of the tutor button, and its table link opens the asked cell', async ({ page }) => {
  await openUnlocked(page);
  // the seed of tests/e2e/see-table-this-word.spec.ts: with Case: accusative due and Noun endings open it draws "Fill in the ending: accusative plural of ἁμαρτία" from 1 John 1
  await page.addInitScript(() => {
    Math.random = () => 7 / 2 ** 32;
  });
  await page.goto('/');
  await waitForDue(page);
  await put(page, 'settings', [
    { key: 'goal', value: '1 John 1' },
    { key: 'paradigmsOpened', value: JSON.stringify(['noun-endings']) },
  ]);
  await put(page, 'reviews', [{ kind: 'grammar', id: 'case-accusative', step: 0, rights: 0, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);
  await put(
    page,
    'grammarLevels',
    ['noun', 'case-accusative', 'number-plural', 'gender-feminine'].map((id) => ({ id, level: 'solid', since: Date.now(), how: 'marked' })),
  );
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  const prompt = page.getByTestId('grammar-prompt');
  await expect(prompt).toHaveText('Fill in the ending: accusative plural of ἁμαρτία');
  const row = page.getByRole('group', { name: 'Study this', exact: true });
  await expect(row).toHaveCount(0);
  // any ending but the right one (ίας)
  await page.locator('[data-option]').filter({ hasNotText: /^ίας$/ }).first().click();
  await expect(page.getByTestId('feedback')).toContainText('Not quite.');

  await expect(row).toBeVisible();
  const links = row.getByRole('button');
  await expect(links).toHaveText(['Table: Noun endings', /^Lesson: /, 'Word: ἁμαρτία']);
  await expect(page.getByTestId('see-table')).toHaveCount(0);
  // every link is a thumb's height, inside the screen, and ends before the floating ? begins
  const door = await page.locator('[data-floating-tutor]').boundingBox();
  for (const link of await links.all()) {
    const box = (await link.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(door ? door.x : 390);
  }
  // what next is never below the fold: Next stays in view with the row drawn
  await expect(page.getByTestId('next')).toBeInViewport();
  await shot(page, 'study-this-review');

  await links.first().click();
  await expect(page.getByRole('heading', { name: 'Noun endings', level: 1 })).toBeVisible();
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toHaveText('ἁμαρτίας');
  await expect(lit).toHaveAttribute('data-cell', /accusative plural/i);
  await expect(lit).toBeInViewport();

  await page.goBack();
  await expect(prompt).toHaveText('Fill in the ending: accusative plural of ἁμαρτία');
  await expect(row).toBeVisible();

  // the word's card opens over the question and closes back to it
  await row.getByRole('button', { name: 'Word: ἁμαρτία' }).click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-word')).toHaveText('ἁμαρτία');
  await expect(sheet.getByTestId('sheet-word')).toBeInViewport();
  await shot(page, 'study-this-word');
});
