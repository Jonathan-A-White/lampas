// A word's own paradigm (mw-irpgqi.4) at 390x844: from the word sheet's Paradigm row, the table's switch This word | The pattern lays the table with the forms of the word's
// lemma that the New Testament uses (ἀγαπάω's own, not the model verb's), marks a cell the text lacks 'not in the NT', opens a form where the text first uses it, and the Drill
// asks only the cells that have a form.
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

const CONTRACT_IDEAS = ['verb', 'mood-indicative', 'voice-active', 'person-1st', 'person-2nd', 'person-3rd', 'number-singular', 'number-plural', 'tense-present', 'contract-verbs'];

/** Opens the Reader at `book` `chapter` with the contract-verb ideas his, taps `form` in `verse`, and opens its table from the word sheet. */
async function openTableOf(page: Page, book: string, chapter: number, verse: number, form: string, ideas: string[] = CONTRACT_IDEAS) {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page, ideas);
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.goto(`/#/?b=${book}&c=${chapter}&view=greek`);
  await page.reload();
  await page.locator(`[data-verse="${verse}"]`).getByRole('button', { name: form, exact: true }).first().click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-paradigm').getByRole('button').click();
}

const forms = (page: Page) => page.getByRole('group', { name: 'Forms', exact: true });
const cellTexts = (page: Page) => page.locator('[data-cell]').allInnerTexts();

test('ἀγαπῶ: Paradigm, This word lays ἀγαπάω’s own forms in Contract verbs, in its own row, and The pattern gives the model verbs back', async ({ page }) => {
  await openTableOf(page, '2jn', 1, 1, 'ἀγαπῶ');
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  // the pattern first: the three model verbs, 18 cells
  await expect(page.locator('[data-cell]')).toHaveCount(18);
  await expect(forms(page).getByRole('button', { name: 'The pattern' })).toHaveAttribute('aria-pressed', 'true');

  await forms(page).getByRole('button', { name: 'This word' }).click();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-cell]')).toHaveCount(6);
  expect(await cellTexts(page)).toEqual(['ἀγαπῶ', 'ἀγαπᾷς', 'ἀγαπᾷ', 'ἀγαπῶμεν', 'ἀγαπᾶτε', 'ἀγαπῶσιν']);
  await expect(page.locator('[data-lit]')).toHaveText('ἀγαπῶ');
  await expect(page.getByRole('rowheader', { name: '1st person singular' })).toBeVisible();
  await expect(page.getByText('ποιῶ')).toHaveCount(0);
  await expect(page.getByTestId('table-available')).toHaveText('Available forms: 6 of 6');
  await shot(page, 'word-own-paradigm');

  await forms(page).getByRole('button', { name: 'The pattern' }).click();
  await expect(page.locator('[data-cell]')).toHaveCount(18);
  await expect(page.getByText('ποιῶ', { exact: true })).toBeVisible();
});

test('a tap on a form says where the text first uses it, keeps the pattern’s form beside, and opens the Reader there', async ({ page }) => {
  await openTableOf(page, '2jn', 1, 1, 'ἀγαπῶ');
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  await forms(page).getByRole('button', { name: 'This word' }).click();
  await page.locator('[data-cell*="2nd person plural"]').click();
  const note = page.getByTestId('own-note');
  await expect(note).toContainText('ἀγαπᾶτε');
  await expect(note).toContainText('present active indicative, 2nd person plural');
  await expect(note).toContainText('Luke 6:32');
  await expect(note).toContainText('In the pattern: ἀγαπᾶτε');
  await shot(page, 'word-own-paradigm-form');

  await note.getByTestId('own-open').click();
  await expect(page.getByRole('heading', { name: 'Luke 6' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Contract verbs', level: 1 })).toBeVisible();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');
});

test('a cell the text lacks says not in the NT, and no cell holds a form that is not the verb’s own', async ({ page }) => {
  // τηρῶμεν (1 John 2:3) is a subjunctive: its table is The subjunctive, laid with τηρέω’s forms
  await openTableOf(page, '1jn', 2, 3, 'τηρῶμεν', []);
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  await page.getByRole('group', { name: 'How much of a table', exact: true }).getByRole('button', { name: 'Any' }).click();
  await forms(page).getByRole('button', { name: 'This word' }).click();
  const absent = page.locator('[data-state="absent"]');
  expect(await absent.count()).toBeGreaterThan(5);
  await expect(absent.first()).toHaveText('not in the NT');
  await expect(absent.first()).toHaveAttribute('aria-label', /: not in the NT$/);
  const texts = await cellTexts(page);
  for (const text of texts) expect(text === 'not in the NT' || text.startsWith('τηρ'), text).toBe(true);
  expect(texts.some((text) => text === 'τηρῶμεν')).toBe(true);
  await expect(page.locator('[data-lit]')).toHaveText('τηρῶμεν');
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'word-own-paradigm-absent');
});

test('Drill on This word asks only the cells that have a form', async ({ page }) => {
  await openTableOf(page, '2jn', 1, 1, 'ἀγαπῶ');
  await forms(page).getByRole('button', { name: 'This word' }).click();
  await expect(page.getByTestId('mode-help')).toContainText('Drill: tap a blank cell');
  const blanks = page.locator('[data-state="hidden"]');
  await expect(blanks).toHaveCount(6);
  await blanks.nth(1).click();
  await expect(page.locator('[data-open]')).toHaveText('ἀγαπᾷς');
  await expect(page.getByTestId('grade-row')).toContainText('John 21:15');
  await page.getByRole('button', { name: 'Had it' }).click();
  await expect(page.locator('[data-grade="had"]')).toHaveCount(1);
  await expect(blanks).toHaveCount(5);
});

test('Drill on a verb that lacks forms marks those cells and never asks them', async ({ page }) => {
  await openTableOf(page, '1jn', 2, 3, 'τηρῶμεν', []);
  await page.getByRole('group', { name: 'How much of a table', exact: true }).getByRole('button', { name: 'Any' }).click();
  await forms(page).getByRole('button', { name: 'This word' }).click();
  const absent = await page.locator('[data-state="absent"]').count();
  const total = await page.locator('[data-cell]').count();
  expect(absent).toBeGreaterThan(0);
  expect(await page.locator('[data-state="hidden"]').count()).toBe(total - absent);
  // the blank cells are exactly the ones with a form: τηρῶμεν, τηρῇ…
  expect(total - absent).toBeLessThan(6);
});
