// A tap on a Greek word opens its paradigm (mw-irpgqi.1): the word sheet's Paradigm row opens the word's table at 390x844 with the word's own cell outlined (data-lit)
// and in view, a locked cell with its lock and its Needs line, and Back returns to the word sheet.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

/** Puts his grammar levels in the app's own store through raw IndexedDB, as the app wrote them. */
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

async function openWord(page: Page, verse: number, form: string) {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/#/?b=2jn&c=1&view=greek');
  await page.locator(`[data-verse="${verse}"]`).getByRole('button', { name: form, exact: true }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-word')).toHaveText(form);
  return sheet;
}

/** The lit cell sits inside the screen's scroll box, under the header and above its foot. */
async function expectLitInView(page: Page) {
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toBeInViewport({ ratio: 1 });
  const where = await page.evaluate(() => {
    const cell = document.querySelector('[data-lit]')!.getBoundingClientRect();
    const box = document.querySelector('.screen')!.getBoundingClientRect();
    return { top: cell.top - box.top, bottom: box.bottom - cell.bottom };
  });
  expect(where.top).toBeGreaterThanOrEqual(0);
  expect(where.bottom).toBeGreaterThanOrEqual(0);
}

test('ἀγαπῶ: Paradigm names Contract verbs, opens it with the cell of ἀγαπῶ outlined and in view, and Back returns to the word sheet', async ({ page }) => {
  const sheet = await openWord(page, 1, 'ἀγαπῶ');
  const row = sheet.getByTestId('sheet-paradigm');
  await expect(row).toContainText('Contract verbs');
  await row.getByRole('button', { name: 'Contract verbs' }).click();

  await expect(page.getByRole('heading', { name: 'Contract verbs', level: 1 })).toBeVisible();
  await expect(page.getByTestId('word-line')).toContainText('ἀγαπῶ');
  await expect(page.getByTestId('word-line')).toContainText('present');
  await expect(page.getByTestId('word-line')).toContainText('1st person singular');
  await expectLitInView(page);
  await expect(page.locator('[data-lit]')).toHaveAttribute('data-cell', /ἀγαπάω.*1st person singular/);
  await shot(page, 'word-paradigm');

  await page.getByRole('button', { name: '‹ Word' }).click();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('sheet-word')).toHaveText('ἀγαπῶ');
  await expect(page.getByRole('heading', { name: '2 John 1' })).toBeVisible();
});

test('a word far down a table: ἔσται is brought into view in εἰμί, and the phone’s Back returns to the word sheet', async ({ page }) => {
  const sheet = await openWord(page, 2, 'ἔσται');
  await sheet.getByTestId('sheet-paradigm').getByRole('button').click();
  await expect(page.getByRole('heading', { name: 'εἰμί', level: 1 })).toBeVisible();
  await expectLitInView(page);
  const scrolled = await page.evaluate(() => document.querySelector('.screen')!.scrollTop);
  expect(scrolled).toBeGreaterThan(0);
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, top: document.documentElement.scrollTop }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  expect(fits.top).toBe(0);

  await page.goBack();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('sheet-word')).toHaveText('ἔσται');
  await shot(page, 'word-paradigm-far');
});

test('a locked cell is lit with its lock and its Needs line, so the road from a word is never a dead end', async ({ page }) => {
  const sheet = await openWord(page, 1, 'ἀγαπῶ');
  await sheet.getByTestId('sheet-paradigm').getByRole('button').click();
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveAttribute('data-state', 'locked');
  await expect(lit).toHaveAttribute('aria-label', /locked\. Needs/);
  await expect(lit.locator('svg')).toBeVisible();
  const needs = page.getByTestId('lock-needs');
  await expect(needs).toBeVisible();
  await expect(needs).toContainText('Needs');
  await expect(needs).toBeInViewport();
  await shot(page, 'word-paradigm-locked');
});

test('an open cell is lit too, and the table keeps its mode when it is switched', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page, ['verb', 'mood-indicative', 'voice-active', 'person-1st', 'number-singular', 'tense-present', 'contract-verbs']);
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.goto('/#/?b=2jn&c=1&view=greek');
  await page.reload();
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'ἀγαπῶ', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-paradigm').getByRole('button').click();
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toHaveAttribute('data-state', 'hidden');
  await page.getByRole('button', { name: 'Review mode' }).click();
  await expect(page.locator('[data-lit]')).toHaveAttribute('data-state', 'shown');
  await expect(page.locator('[data-lit]')).toHaveText('ἀγαπῶ');
  await expect(page.getByTestId('word-line')).toBeVisible();
});

test('a conjunction has no Paradigm row', async ({ page }) => {
  const sheet = await openWord(page, 1, 'καὶ');
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('καί');
  await expect(sheet.getByTestId('sheet-paradigm')).toHaveCount(0);
});
