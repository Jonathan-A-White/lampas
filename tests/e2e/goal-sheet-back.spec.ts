import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Puts rows in the app's own store through raw IndexedDB, as the app wrote them.
async function put(page: Page, store: 'settings' | 'grammarLevels', rows: object[]) {
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

// Whether the topmost element at the top centre of the dialog is inside it (toBeVisible does not look at what is on top).
const onTop = (dialog: Locator) =>
  dialog.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + 4);
    return hit !== null && el.contains(hit);
  });

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

test('Back from a word tapped on the letter sheet opened by Learn next shows the letter sheet again, and a second Back shows the Goal screen (mw-5r3p30.378)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => seeded(page)).toBe(true);
  const now = Date.now();
  const letters = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu omicron pi rho sigma tau upsilon phi chi omega'.split(' ');
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
  await put(page, 'grammarLevels', [
    ...letters.map((name) => ({ id: `letter-${name}`, level: 'solid', since: now, how: 'inferred' })),
    { id: 'breathings', level: 'solid', since: now, how: 'marked' },
    { id: 'accents', level: 'solid', since: now, how: 'marked' },
  ]);
  await page.reload();
  await page.goto('/#/goal');
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  await page.getByTestId('learn-next').click();
  const idea = page.getByRole('dialog', { name: 'Idea' });
  const word = page.getByRole('dialog', { name: 'Word' });
  await expect(idea.getByRole('heading', { name: 'Xi' })).toBeVisible();

  await idea.getByTestId('idea-example').first().click();
  await expect(word).toBeVisible();

  // one Back: the word sheet goes and the letter sheet is still there
  await page.goBack();
  await expect(word).toBeHidden();
  await expect(idea.getByRole('heading', { name: 'Xi' })).toBeVisible();
  await expect(page.getByTestId('goal-title')).toBeVisible();

  // a second Back closes the letter sheet and leaves the Goal screen
  await page.goBack();
  await expect(idea).toBeHidden();
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  await expect(page).toHaveURL(/#\/goal/);
  await shot(page, 'goal-letter-back');
});

test('Back pops one sheet at a time down a stack of idea sheet, a tile\'s letter sheet and an example word (mw-5r3p30.378)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => seeded(page)).toBe(true);
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
  await page.reload();
  await page.goto('/#/goal');
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  await page.getByTestId('learn-next').click();
  const ideas = page.getByRole('dialog', { name: 'Idea' });
  const word = page.getByRole('dialog', { name: 'Word' });
  await expect(ideas).toHaveCount(1);
  await ideas.first().getByRole('button', { name: /^About / }).first().click();
  await expect(ideas).toHaveCount(2);
  await ideas.nth(1).getByTestId('idea-example').first().click();
  await expect(word).toBeVisible();
  await expect.poll(() => onTop(word)).toBe(true);

  await page.goBack();
  await expect(word).toBeHidden();
  await expect(ideas).toHaveCount(2);
  await page.goBack();
  await expect(ideas).toHaveCount(1);
  await page.goBack();
  await expect(ideas).toHaveCount(0);
  await expect(page.getByTestId('goal-title')).toBeVisible();
  await expect(page).toHaveURL(/#\/goal/);
});


test('The word sheet opened from the Xi letter sheet is the topmost thing on the screen, before and after the Back that leaves Xi open (mw-5r3p30.566)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => seeded(page)).toBe(true);
  const now = Date.now();
  const letters = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu omicron pi rho sigma tau upsilon phi chi omega'.split(' ');
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
  await put(page, 'grammarLevels', [
    ...letters.map((name) => ({ id: `letter-${name}`, level: 'solid', since: now, how: 'inferred' })),
    { id: 'breathings', level: 'solid', since: now, how: 'marked' },
    { id: 'accents', level: 'solid', since: now, how: 'marked' },
  ]);
  await page.reload();
  await page.goto('/#/goal');
  await page.getByTestId('learn-next').click();
  const idea = page.getByRole('dialog', { name: 'Idea' });
  const word = page.getByRole('dialog', { name: 'Word' });
  await expect(idea.getByRole('heading', { name: 'Xi' })).toBeVisible();

  await idea.getByTestId('idea-example').first().click();
  await expect(word).toBeVisible();
  await expect.poll(() => onTop(word)).toBe(true);

  // Back closes the word sheet and leaves Xi; Xi is then the topmost sheet
  await page.goBack();
  await expect(word).toBeHidden();
  await expect.poll(() => onTop(idea)).toBe(true);

  // tapping the same example again still puts its word sheet on top
  await idea.getByTestId('idea-example').first().click();
  await expect(word).toBeVisible();
  await expect.poll(() => onTop(word)).toBe(true);
  await shot(page, 'goal-letter-word-on-top');
});
