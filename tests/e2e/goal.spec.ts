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

// The page never scrolls and never grows wider than the window.
async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

/** A control a thumb can hit: 48 px tall and inside the window's width. */
async function expectThumbSized(target: Locator) {
  const box = await target.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(47.5);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
}

/** Opens the app once (the first open seeds his words), saves the goal and the levels, and loads the page again. */
async function openWithGoal(page: Page, goal: string) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  // the first open seeds the words, the schedule and the levels; wait for the last of them
  await expect.poll(() => seeded(page)).toBe(true);
  const now = Date.now();
  await put(page, 'settings', [{ key: 'goal', value: goal }]);
  await put(page, 'grammarLevels', [
    { id: 'alphabet', level: 'solid', since: now, how: 'marked' },
    { id: 'breathings', level: 'solid', since: now, how: 'marked' },
    { id: 'accents', level: 'solid', since: now, how: 'marked' },
    { id: 'noun', level: 'frontier', since: now, how: 'sheet' },
  ]);
  // the app watches its own writes, not a raw one: load it again so it reads them
  await page.reload();
}

test('the strip under the Reader header is one line beside Due and opens the Goal screen', async ({ page }) => {
  await openWithGoal(page, '1 John 1:1');
  const strip = page.getByTestId('goal-strip');
  await expect(strip).toHaveText(/^Goal: 1 John 1:1 · \d+ of 16 words · \d+ of 30 ideas$/);
  const box = await strip.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(47.5);
  expect(box?.height).toBeLessThan(60);
  // the whole line shows: it is not cut short
  expect(await strip.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  // beside Due: the two strips sit one above the other under the header
  const due = page.getByRole('button', { name: /^Due: \d+$/ });
  await expect(due).toBeVisible();
  const dueBox = await due.boundingBox();
  expect(Math.abs((dueBox?.y ?? 0) + (dueBox?.height ?? 0) - (box?.y ?? 0))).toBeLessThanOrEqual(1);
  await expectFitsPhone(page);
  await shot(page, 'goal-strip');

  await strip.click();
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
});

test('no goal, no strip', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => seeded(page)).toBe(true);
  await expect(page.getByTestId('goal-strip')).toHaveCount(0);
});

test('the Goal screen: two bars that fit, the lists, Learn next, Next words and Read it, and a reload keeps it', async ({ page }) => {
  await openWithGoal(page, '1 John 1:1');
  await page.goto('/#/goal');
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  for (const name of ['Change', 'Place me']) await expectThumbSized(page.getByRole('button', { name }));
  await expectThumbSized(page.getByTestId('learn-next'));
  await expect(page.getByTestId('learn-next')).toHaveText('Learn next: The article · Your first words');
  await expect(page.getByTestId('words-legend')).toHaveText(/^Solid \d+ · Frontier \d+ · Not yet \d+$/);
  await expect(page.getByTestId('ideas-legend')).toHaveText('Solid 3 · Frontier 1 · Not yet 26');
  await expect(page.getByText('Solid when both are full.')).toBeVisible();
  for (const bar of ['words-bar', 'ideas-bar']) {
    const box = await page.getByTestId(bar).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  }
  const chips = page.getByTestId('next-word');
  expect(await chips.count()).toBeLessThanOrEqual(3);
  for (let i = 0; i < (await chips.count()); i += 1) await expectThumbSized(chips.nth(i));
  await expectFitsPhone(page);

  // a bar opens the list behind it
  await page.getByTestId('ideas-bar').click();
  await expect(page.getByTestId('ideas-list').locator('[data-level="solid"]')).toContainText('The Greek alphabet');
  await expectFitsPhone(page);
  await page.getByTestId('ideas-bar').click();
  await expect(page.getByTestId('ideas-list')).toHaveCount(0);

  // Learn next opens its sheet; Got it moves the ideas bar
  await page.getByTestId('learn-next').click();
  const sheet = page.getByRole('dialog', { name: 'Idea' });
  await expect(sheet.getByRole('heading', { name: 'The article' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Got it' }).click();
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByTestId('ideas-legend')).toHaveText('Solid 3 · Frontier 2 · Not yet 25');

  // a reload keeps the screen
  await page.reload();
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');

  await shot(page, 'goal');

  await page.getByRole('button', { name: 'Read it' }).scrollIntoViewIfNeeded();
  await expectThumbSized(page.getByRole('button', { name: 'Read it' }));
  await page.getByRole('button', { name: 'Read it' }).click();
  await expect(page.getByRole('heading', { name: '1 John 1', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"][data-selected="true"]')).toBeVisible();
});

test('Learn next names the letters that are not solid yet, not the whole alphabet', async ({ page }) => {
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
  const next = page.getByTestId('learn-next');
  await expect(next).toHaveText('Learn next: ξ and ψ · The Greek letters');
  await expectThumbSized(next);
  expect(await next.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expectFitsPhone(page);
  await shot(page, 'goal-letters');

  // a tap opens the sheet of the first weak letter
  await next.click();
  await expect(page.getByRole('dialog', { name: 'Idea' }).getByRole('heading', { name: 'Xi' })).toBeVisible();
});
