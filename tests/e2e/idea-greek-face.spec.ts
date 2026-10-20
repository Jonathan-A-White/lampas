// tests/e2e/idea-greek-face.spec.ts — the Greek of a lesson is drawn in the Greek face (Gentium Plus), not the UI sans (mw-86e9r1.38): in the idea sheet
// of "The preposition περί", opened by the Goal's Learn next, the heading and the lesson's phrases (περὶ τοῦ υἱοῦ ...) are lang el in font-greek.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { neededIdeas } from './needed-ideas';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

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

const family = (el: Locator) => el.evaluate((node) => getComputedStyle(node).fontFamily);

test('the Greek of the περί lesson, its heading and its phrases, is set in Gentium Plus', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => seeded(page)).toBe(true);
  // everything the goal needs is solid but the περί lesson, so Learn next opens it
  const now = Date.now();
  const rest = (await neededIdeas('1 John 1:1')).filter((id) => id !== 'preposition-peri');
  await put(page, 'settings', [{ key: 'goal', value: '1 John 1:1' }]);
  await put(page, 'grammarLevels', rest.map((id) => ({ id, level: 'solid', since: now, how: 'marked' })));
  await page.reload();
  await page.goto('/#/goal');
  await expect(page.getByTestId('goal-title')).toHaveText('Read 1 John 1:1');
  await page.getByTestId('learn-next').click();

  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  const heading = idea.getByRole('heading', { level: 2 });
  await expect(heading).toContainText('The preposition περί');
  const greekInHeading = heading.locator('[lang="el"]');
  await expect(greekInHeading).toHaveText('περί');
  expect(await family(greekInHeading)).toContain('Gentium Plus');

  // the lesson's phrases, in What it is, How to spot it and the table
  for (const [part, testId] of [['What it is', 'idea-what'], ['How to spot it', 'idea-spot']] as const) {
    const spans = idea.getByTestId(testId).locator('[lang="el"]');
    expect(await spans.count(), part).toBeGreaterThan(0);
    for (const span of await spans.all()) expect(await family(span), `${part}: ${await span.textContent()}`).toContain('Gentium Plus');
  }
  const phrase = idea.getByTestId('idea-spot').locator('[lang="el"]', { hasText: 'περὶ τοῦ υἱοῦ' });
  await expect(phrase).toHaveCount(1);
  expect(await family(phrase)).toContain('Gentium Plus');

  // no run of Greek in the sheet's text is left in the UI sans
  const bare = await idea.evaluate((root) => {
    const greek = /[Ͱ-Ͽἀ-῿]/;
    const found: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || !greek.test(node.textContent ?? '') || el.closest('[lang="el"]') || el.closest('[aria-label]')) continue;
      found.push(`${el.tagName}: ${(node.textContent ?? '').trim()}`);
    }
    return found;
  });
  expect(bare).toEqual([]);
  await shot(page, 'idea-greek-face');
});
