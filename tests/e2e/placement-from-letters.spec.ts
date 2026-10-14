import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// 'Start from the letters' on the placement tells the truth about what he already has (mw-86e9r1.19), at a phone's width.
test.use({ viewport: { width: 390, height: 844 } });

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
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

/** The grammar levels table as it stands, through raw IndexedDB. */
const levelRows = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const all = idb.transaction('grammarLevels', 'readonly').objectStore('grammarLevels').getAll();
          all.onsuccess = () => {
            idb.close();
            resolve(all.result);
          };
          all.onerror = () => reject(all.error);
        };
      }),
  );

async function openGoal(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
  await page.goto('/#/goal');
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
}

/** The counts a legend line reads: 'Solid 1 · Frontier 0 · Not yet 34'. */
const countsOf = (text: string): number[] => (text.match(/\d+/g) ?? []).map(Number);

test('Start from the letters keeps what he has: the card says it, and Back to the goal agrees', async ({ page }) => {
  await openGoal(page);
  // mark The Greek alphabet known without a drill on Learn next
  await page.getByTestId('learn-next').click();
  const sheet = page.getByRole('dialog', { name: 'Idea' });
  await expect(sheet.getByRole('heading', { name: 'The Greek alphabet' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Mark known without a drill' }).click();
  await sheet.getByRole('button', { name: 'Done' }).click();
  const legend = page.getByTestId('ideas-legend');
  await expect(legend).toHaveText(/^Solid 1 · Frontier 0 · Not yet \d+$/);
  const goalCounts = countsOf((await legend.textContent()) ?? '');
  await expect(page.getByTestId('learn-next')).toHaveText('Learn next: Pairs of vowels · Saying words aloud');
  const before = await levelRows(page);
  expect(before.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Place me' }).click();
  await page.getByRole('button', { name: 'Start from the letters' }).click();

  const where = page.getByTestId('where');
  await expect(where).toBeVisible();
  const [solid, frontier, notYet, untested] = countsOf((await where.textContent()) ?? '');
  expect(solid).toBe(1);
  // the Goal screen counts an idea with no level as not yet
  expect([solid, frontier, notYet + untested]).toEqual(goalCounts);
  await expect(page.getByTestId('from-letters')).toHaveText('Already solid: The Greek alphabet. Learn next on the Goal screen opens Pairs of vowels.');
  await expect(page.locator('[data-idea="alphabet"]')).toHaveAttribute('data-level', 'solid');
  expect(await levelRows(page)).toEqual(before);
  await shot(page, 'placement-from-letters-progress');

  await page.getByRole('button', { name: 'Back to the goal' }).click();
  await expect(page.getByTestId('ideas-legend')).toHaveText(`Solid ${goalCounts[0]} · Frontier ${goalCounts[1]} · Not yet ${goalCounts[2]}`);
  await expect(page.getByTestId('learn-next')).toHaveText('Learn next: Pairs of vowels · Saying words aloud');
});

test('Start from the letters for a total beginner starts at The Greek alphabet, and writes nothing', async ({ page }) => {
  await openGoal(page);
  const ideas = page.getByTestId('ideas-legend');
  await expect(ideas).toHaveText(/^Solid 0 · /);
  const goalCounts = countsOf((await ideas.textContent()) ?? '');
  expect(await levelRows(page)).toEqual([]);

  await page.getByRole('button', { name: 'Place me' }).click();
  await page.getByRole('button', { name: 'Start from the letters' }).click();

  const where = page.getByTestId('where');
  await expect(where).toBeVisible();
  const [solid, frontier, notYet, untested] = countsOf((await where.textContent()) ?? '');
  expect(solid).toBe(0);
  expect([solid, frontier, notYet + untested]).toEqual(goalCounts);
  await expect(where).toContainText('solid 0');
  await expect(page.getByTestId('from-letters')).toHaveText('You start with The Greek alphabet. Learn next on the Goal screen opens it.');
  expect(await levelRows(page)).toEqual([]);
  await shot(page, 'placement-from-letters-beginner');

  await page.getByRole('button', { name: 'Back to the goal' }).click();
  await expect(page.getByTestId('learn-next')).toHaveText(/^Learn next: The Greek alphabet/);
});
