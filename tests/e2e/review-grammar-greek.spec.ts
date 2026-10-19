import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { waitForDue } from './today-chip';

// The Greek words in a question's sentence ('Which fits? ___ ἦν ἐκεῖνος τὸ φῶς', mw-86e9r1.31) are marked Greek and drawn in the Greek face at the size of the choices,
// the English around them in the normal type.

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'reviews' | 'settings', rows: object[]) {
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

test('the Greek words of a Movable letters prompt are lang grc, in the Greek face, at the size of the choices', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await waitForDue(page);
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
  await put(page, 'reviews', [{ kind: 'grammar', id: 'movable-letters', step: 0, rights: 0, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start' }).click();

  const prompt = page.getByTestId('grammar-prompt');
  await expect(prompt).toHaveAttribute('data-idea', 'movable-letters');
  await expect(prompt).toContainText('Which fits?');

  const spans = prompt.locator('[lang="grc"]');
  expect(await spans.count()).toBeGreaterThan(0);
  const face = (el: Element) => getComputedStyle(el).fontFamily;
  const size = (el: Element) => parseFloat(getComputedStyle(el).fontSize);
  const choice = page.locator('[data-option]').first();
  const choiceFace = await choice.evaluate(face);
  const choiceSize = await choice.evaluate(size);
  expect(choiceSize).toBeGreaterThanOrEqual(28);
  for (const span of await spans.all()) {
    expect(await span.evaluate(face)).toBe(choiceFace);
    expect(await span.evaluate(size)).toBe(choiceSize);
  }
  // the English around the Greek stays in the normal type
  expect(await prompt.evaluate(face)).not.toBe(choiceFace);
  expect(await prompt.evaluate(size)).toBeLessThan(choiceSize);
  await shot(page, 'review-grammar-greek');
});
