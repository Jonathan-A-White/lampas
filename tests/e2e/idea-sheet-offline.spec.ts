// tests/e2e/idea-sheet-offline.spec.ts — an idea sheet opened offline (mw-5r3p30.556): when the chapters beyond the goal's cannot be loaded, the sheet says the
// examples could not be looked for; it does not say that no word has the idea, as if the search had run.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

/** Puts the goal in the app's own store through raw IndexedDB, as the app wrote it. */
async function setGoal(page: Page, goal: string) {
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'goal', value });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    goal,
  );
}

test('offline, the Xi sheet says the examples could not be looked for, not that no word is spelt with it', async ({ page, context }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await setGoal(page, '1 John 1:1');
  await page.reload();
  await page.getByTestId('goal-strip').click();
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The Greek alphabet', exact: true }).click();
  const alphabet = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(alphabet.getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
  await expect(alphabet.getByTestId('idea-example').first()).toBeVisible();

  // the rest of 1 John is not on the phone: only the chapter already read is
  await page.route(/\/data\/(?!.*\/1\.json)[^/]+\/\d+\.json/, (route) => route.abort());
  await context.setOffline(true);
  await alphabet.getByRole('button', { name: 'About xi' }).click();
  const xi = page.getByRole('dialog', { name: 'Idea', exact: true }).last();
  await expect(xi.getByRole('heading', { name: 'Xi', exact: true })).toBeVisible();

  await expect(xi.getByTestId('idea-unreached')).toBeVisible();
  await expect(xi).toContainText('could not be looked for');
  await expect(xi).not.toContainText('is spelt with this');
  await expect(xi).not.toContainText('No word of');
  await shot(page, 'idea-sheet-offline');
});
