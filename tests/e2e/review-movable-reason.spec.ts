import { expect, test, type Page } from '@playwright/test';
import { MOVABLE } from '../../src/data/grammar/questions';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// A miss on a Movable letters card in Review says why (mw-86e9r1.30): 'Not quite. It is οὐκ.' and, under it, the one-line reason; a right answer has no such line.

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

/** Opens Review with Movable letters due and answers its first card; `right` says whether to tap the right choice or a wrong one. Returns the card's question. */
async function answerFirstCard(page: Page, right: boolean) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Due: \d+$/ })).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
  await put(page, 'reviews', [{ kind: 'grammar', id: 'movable-letters', step: 0, rights: 0, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);
  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start' }).click();

  const prompt = page.getByTestId('grammar-prompt');
  await expect(prompt).toHaveAttribute('data-idea', 'movable-letters');
  const asked = await prompt.innerText();
  const question = MOVABLE.find((m) => m.prompt === asked);
  expect(question, 'the card is one of the Movable letters questions').toBeDefined();
  const options = page.locator('[data-option]');
  const texts = await options.allInnerTexts();
  const at = texts.findIndex((t) => (t === question!.right) === right);
  expect(at).toBeGreaterThanOrEqual(0);
  await options.nth(at).click();
  return question!;
}

test('a miss on a Movable letters card shows the one-line reason under the answer', async ({ page }) => {
  const question = await answerFirstCard(page, false);
  await expect(page.getByTestId('feedback')).toHaveText(`Not quite. It is ${question.right}.`);
  const line = page.getByTestId('rule-line');
  await expect(line).toBeVisible();
  await expect(line).toHaveText(question.reason);
  await shot(page, 'review-movable-reason');
});

test('a right answer on a Movable letters card shows no reason line', async ({ page }) => {
  await answerFirstCard(page, true);
  await expect(page.getByTestId('feedback')).toHaveText('Right.');
  await expect(page.getByTestId('rule-line')).toHaveCount(0);
});
