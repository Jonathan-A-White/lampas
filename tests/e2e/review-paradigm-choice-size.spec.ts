import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openGroup } from './settings-group';

// The four Greek forms of a table question in Review (a 'paradigm' card, mw-svw421.6) draw in the large Greek type, never smaller than the
// English question above them (mw-svw421.30: text-lg beat text-3xl in the built CSS and drew them at 18 px). Held at the phone's width.
test.use({ viewport: { width: 390, height: 844 } });

// Puts his grammar levels in the app's own store through raw IndexedDB, as the app wrote them.
async function putLevels(page: Page, ids: string[]) {
  const rows = ids.map((id) => ({ id, level: 'solid', since: Date.now(), how: 'marked' }));
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('grammarLevels', 'readwrite');
          for (const row of list) tx.objectStore('grammarLevels').put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    rows,
  );
}

test('a Greek form on a Review table question draws at 28 px or more', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page, ['article', 'noun', 'case-nominative', 'case-genitive', 'case-dative', 'case-accusative', 'gender-masculine', 'gender-feminine', 'gender-neuter', 'number-singular', 'number-plural']);
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Account');
  await page.getByRole('button', { name: /^Paradigms/ }).click();
  await page.locator('[data-paradigm="article"]').click();
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Drill this table' }).click();

  await page.goto('/#/review');
  await page.getByRole('button', { name: 'Start', exact: true }).click();

  const choices = page.locator('[data-option][lang="el"]');
  await expect(choices.first()).toBeVisible();
  expect(await choices.count()).toBeGreaterThan(1);
  for (const choice of await choices.all()) {
    const size = await choice.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(28);
  }
  await shot(page, 'paradigm-card');
});
