import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const IDEAS: Record<string, 'solid' | 'frontier'> = {
  article: 'solid', noun: 'solid', verb: 'solid', 'mood-indicative': 'solid', 'tense-present': 'solid', 'tense-imperfect': 'solid',
  'voice-active': 'solid', 'person-1st': 'solid', 'person-2nd': 'solid', 'person-3rd': 'solid', 'number-singular': 'solid',
  'number-plural': 'solid', 'case-nominative': 'solid', 'case-genitive': 'solid', 'case-dative': 'frontier',
  'gender-masculine': 'solid', 'gender-feminine': 'solid',
};

// Puts his grammar levels in the app's own store through raw IndexedDB, as the app wrote them.
async function putLevels(page: Page) {
  const rows = Object.entries(IDEAS).map(([id, level]) => ({ id, level, since: Date.now(), how: 'marked' }));
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

async function expectFitsPhone(page: Page) {
  const fits = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    c: document.documentElement.clientWidth,
    top: document.documentElement.scrollTop,
    // the table itself needs no sideways scrolling at 390 px
    table: (() => {
      const box = document.querySelector('[data-testid="paradigm-table"]')?.parentElement;
      return box ? box.scrollWidth - box.clientWidth : 0;
    })(),
  }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  expect(fits.top).toBe(0);
  expect(fits.table).toBeLessThanOrEqual(0);
}

test('Paradigms: the list, a table in Study and Review mode, locked cells, at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page);
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  // reached from Settings, beside Review
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: /^Paradigms/ }).click();
  await expect(page.getByRole('heading', { name: 'Paradigms', level: 1 })).toBeVisible();
  const rows = page.locator('[data-paradigm]');
  await expect(rows).toHaveCount(4);
  await expect(page.locator('[data-paradigm="article"]').getByTestId('paradigm-available')).toHaveText('Available forms: 12 of 24');
  await expect(page.locator('[data-paradigm="eimi"]').getByTestId('paradigm-available')).toHaveText('Available forms: 24 of 36');
  for (const row of await rows.all()) expect((await row.boundingBox())?.height).toBeGreaterThanOrEqual(63.5);
  await expectFitsPhone(page);
  await shot(page, 'paradigms-list');

  // the article, in Study mode: available cells say reveal, locked cells show a lock
  await page.locator('[data-paradigm="article"]').click();
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
  await expect(page.getByTestId('table-available')).toHaveText('Available forms: 12 of 24');
  await expect(page.locator('[data-cell]')).toHaveCount(24);
  const hidden = page.locator('[data-cell][data-state="hidden"]');
  await expect(hidden).toHaveCount(12);
  await expect(page.locator('[data-cell][data-state="locked"]')).toHaveCount(12);
  for (const cell of await hidden.all()) expect((await cell.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await page.locator('[data-cell="Nominative Singular Masculine"]').click();
  await page.locator('[data-cell="Genitive Singular Feminine"]').click();
  await expect(page.locator('[data-cell="Nominative Singular Masculine"]')).toHaveText('ὁ');
  await expect(page.locator('[data-cell="Genitive Singular Feminine"]')).toHaveText('τῆς');
  const greek = await page.locator('[data-cell="Genitive Singular Feminine"]').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(greek).toBeGreaterThanOrEqual(20);
  await expectFitsPhone(page);
  await shot(page, 'paradigms-study');

  // Review mode: every available cell shows; the address keeps the mode across a reload
  await page.getByRole('button', { name: 'Review mode', exact: true }).click();
  await expect(page.locator('[data-cell][data-state="shown"]')).toHaveCount(12);
  await expect(page.locator('[data-cell][data-state="hidden"]')).toHaveCount(0);
  await expect(page.locator('[data-cell="Dative Singular Masculine"]')).toHaveText('τῷ');
  await expectFitsPhone(page);
  await shot(page, 'paradigms-review');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Study mode', exact: true })).toBeVisible();
  expect(page.url()).toContain('#/paradigms?t=article&mode=review');

  // the other three tables fit the phone, and Ask the tutor is a 48 px button inside the screen
  for (const [id, name, count] of [['noun-endings', 'Noun endings', 40], ['eimi', 'εἰμί', 36], ['verb-endings', 'Verb endings', 24]] as const) {
    await page.goto(`/#/paradigms?t=${id}&mode=review`);
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
    await expect(page.locator('[data-cell]')).toHaveCount(count);
    await expectFitsPhone(page);
    const ask = page.getByRole('button', { name: 'Ask the tutor', exact: true });
    await ask.scrollIntoViewIfNeeded();
    expect((await ask.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
    await shot(page, `paradigms-${id}`);
  }
});
