import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { waitForDue } from './today-chip';

// A grammar flashcard in Review: the reference (1 John 1:n) is plain until Show reveals the answer, and then a link to the verse card with the asked word marked, while the card is still
// ungraded; closing the card returns to it with I knew it / Not yet still there (mw-5r3p30.924). The card's bound is the phone's screen, so the spec sets it.
test.use({ viewport: { width: 390, height: 844 } });

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

test('after Show the flashcard\'s reference opens the verse with the word marked, and closing leaves the card ungraded', async ({ page }) => {
  await openUnlocked(page);
  // a fixed random makes the idea's question the tap of a form (as grammar-drills.spec.ts), step 5 makes it a flashcard
  await page.addInitScript(() => {
    Math.random = () => 0.25;
  });
  await page.goto('/');
  await waitForDue(page);
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1' }]);
  await put(page, 'reviews', [{ kind: 'grammar', id: 'preposition', step: 5, rights: 3, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * 86_400_000, lapses: 0 }]);

  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  const prompt = page.getByTestId('grammar-prompt');
  await expect(prompt).toHaveAttribute('data-mode', 'flashcard');

  const ref = page.getByTestId('grammar-ref');
  await expect(ref).toHaveText(/^1 John 1:\d+$/);
  const reference = (await ref.innerText()).trim();
  await expect(ref.getByRole('link')).toHaveCount(0);

  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(page.getByTestId('grammar-answer')).not.toBeEmpty();
  const link = ref.getByRole('link', { name: reference });
  await expect(link).toBeVisible();
  expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);

  await link.click();
  const card = page.getByRole('dialog', { name: reference });
  await expect(card).toBeVisible();
  await expect(card.locator('[data-marked]').first()).toBeVisible();
  await shot(page, 'review-flashcard-reference');

  await card.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(card).toBeHidden();
  await expect(page.getByTestId('grammar-answer')).not.toBeEmpty();
  await expect(page.getByTestId('feedback')).toHaveText('');
  await expect(page.getByRole('button', { name: 'I knew it', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Not yet', exact: true })).toBeVisible();
});
