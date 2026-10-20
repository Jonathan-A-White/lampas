import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Settings > Grammar approach marks Next the lesson the Goal's Learn next opens (mw-86e9r1.24): before, the badge stayed on the first letter while
// Learn next had moved on to The singular.

// his phone: 390x844 and touch, in both projects
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

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

// Whether the first open has finished seeding (the last seed leaves its flag in the meta store).
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

/** The title of the lesson Settings > Grammar approach marks Next, once the list is drawn. */
async function settingsNext(page: Page): Promise<string> {
  await page.goto('/#/settings');
  const next = page.locator('[data-approach-lessons] li:has([data-next]) [data-lesson-title]');
  await expect(next).toHaveCount(1);
  return (await next.textContent()) ?? '';
}

test('the Next badge in Settings > Grammar approach sits on the lesson the Goal names in Learn next, as he learns idea after idea', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => seeded(page)).toBe(true);
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
  await page.reload();

  const learnNext = page.getByTestId('learn-next');
  const named: string[] = [];
  // Learn next / Mark known without a drill / Done, twelve times: the foundations, the two marks the verse shows and the noun, then the singular (Got it is now the slider's Learning
  // stop, and while an idea is Learning the Goal names it instead of Learn next, mw-i7xe0n.6)
  for (let step = 0; step < 12; step += 1) {
    await page.goto('/#/goal');
    await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
    const title = ((await learnNext.textContent()) ?? '').replace(/^Learn next: /, '');
    named.push(title);
    expect(await settingsNext(page), `after ${step} ideas`).toBe(title);
    if (step === 11) break;
    await page.goto('/#/goal');
    await learnNext.click();
    const sheet = page.getByRole('dialog', { name: 'Idea', exact: true });
    await expect(sheet.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await sheet.getByRole('button', { name: 'Mark known without a drill' }).click();
    await expect(sheet.getByTestId('idea-level')).toHaveText(/^Solid since today/);
    await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  }
  expect(named[0]).toBe('The Greek alphabet');
  expect(named[11]).toBe('The singular');

  // the shot shows the badge on The singular
  await page.goto('/#/settings');
  await page.locator('[data-approach-lessons] li:has([data-next])').evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await expect(page.locator('[data-approach-lessons] li:has([data-next]) [data-lesson-title]')).toHaveText('The singular');
  await shot(page, 'approach-next');
});
