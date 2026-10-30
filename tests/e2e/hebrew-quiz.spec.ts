// Quiz me on a Hebrew verse (mw-gdcyf98.21) at 390x844: the Verse view of Jonah 1:1 offers Quiz me from the Hebrew dial's Curious up and Diagram at any dial, and a due Hebrew idea is asked in Review as a
// question of four Hebrew words, each a thumb-sized tap, right to left in the bundled Hebrew face.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { waitForDue } from './today-chip';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

/** Puts rows in the app's own store through raw IndexedDB, as the app wrote them. */
async function put(page: Page, store: 'reviews' | 'settings', rows: object[]): Promise<void> {
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

test('Jonah 1:1 offers Quiz me at Curious and Diagram, and Diagram alone of the two at Hebrew 0', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=jon&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await put(page, 'settings', [{ key: 'hebrewInterest', value: '1' }]);
  await page.reload();
  const view = await openVerseView(page, 1);
  const actions = view.getByRole('group', { name: 'Actions' });
  await expect(actions.getByRole('button', { name: 'Quiz me', exact: true })).toBeVisible();
  await expect(actions.getByRole('button', { name: 'Diagram', exact: true })).toBeVisible();
  expect((await actions.getByRole('button', { name: 'Quiz me', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  await actions.getByRole('button', { name: 'Quiz me', exact: true }).click();
  await expect(view.getByRole('button', { name: 'Start the quiz', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '‹ Reader' }).click();
  await put(page, 'settings', [{ key: 'hebrewInterest', value: '0' }]);
  await page.reload();
  const english = await openVerseView(page, 1);
  await expect(english.getByRole('button', { name: 'Quiz me', exact: true })).toHaveCount(0);
  await expect(english.getByRole('button', { name: 'Diagram', exact: true })).toBeVisible();
});

test('a due Hebrew idea is asked in Review as four Hebrew words, right to left', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await waitForDue(page);
  await put(page, 'reviews', [{ kind: 'grammar', id: 'he-article', step: 0, rights: 0, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  const prompt = page.getByTestId('grammar-prompt');
  await expect(prompt).toHaveAttribute('data-idea', 'he-article');
  await expect(prompt).toHaveText('Tap a word that shows the Hebrew article');
  const options = page.locator('[data-option]');
  await expect(options).toHaveCount(4);
  for (const option of await options.all()) {
    await expect(option).toHaveAttribute('lang', 'he');
    await expect(option).toHaveAttribute('dir', 'rtl');
    expect(await option.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Noto Serif Hebrew');
    const box = (await option.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(43.5);
    expect(box.width).toBeGreaterThanOrEqual(43.5);
  }
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
  await shot(page, 'hebrew-quiz');
});
