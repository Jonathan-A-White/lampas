// A Septuagint word's own paradigm (mw-u2w5klk.289) at 390x844: Genesis 1 in the Septuagint, ἀόρατος in verse 2 (a feminine nominative singular), its sheet's Paradigm row, Adjective endings, This word: the
// table lays the forms of ἀόρατος found in the Septuagint with the New Testament's, each cell saying which, the form he tapped outlined, and no 'not in the NT' for a form the Septuagint has.
// public/data-lxx ships no chapter yet, so the Septuagint's files are the fixtures in tests/fixtures/data-lxx (Genesis 1:2's ἀόρατος read as a feminine, as the derivation has it) and the lemma's file
// is the real one the build made, with the Septuagint's forms laid under lxx as the build lays them from a shipped chapter (scripts/build-lemma-forms.mjs).
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const NOUN_IDEAS = ['noun', 'declension-1', 'declension-2', 'case-nominative', 'gender-masculine', 'gender-feminine', 'gender-neuter', 'number-singular', 'number-plural', 'case-genitive', 'case-dative', 'case-accusative', 'case-vocative'];
const ADJECTIVE_IDEAS = ['adjective', 'declension-2', 'case-nominative', 'gender-masculine', 'number-singular', 'declension-1', 'gender-feminine', 'gender-neuter', 'number-plural', 'case-genitive', 'case-dative', 'case-accusative', 'case-vocative', 'declension-3'];

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

test.beforeEach(async ({ page }) => {
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    let body = readFileSync(`tests/fixtures/data-lxx/${path}`, 'utf8');
    if (path === 'gen/1.json') {
      // the derivation reads Gen 1:2's ἀόρατος as a feminine nominative singular (ἡ δὲ γῆ ἦν ἀόρατος); the fixture has the masculine
      const chapter = JSON.parse(body) as { parse: Record<string, string>; verses: { n: number; g: { t: string; p: string }[] }[] };
      chapter.parse['A-NSF'] = 'adjective, nominative singular feminine';
      for (const word of chapter.verses.find((v) => v.n === 2)!.g) if (word.t === 'ἀόρατος') word.p = 'A-NSF';
      body = JSON.stringify(chapter);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
  // the real lemma file (the New Testament's four forms of ἀόρατος) with the Septuagint's forms of it laid under lxx, as the build lays them
  await page.route('**/lemma-forms/*', async (route) => {
    const response = await route.fetch();
    // a Septuagint comma lemma ('ὕδωρ, ὕδατος') has no file of its own: the build folds its forms into ὕδωρ's (mw-u2w5klk.297)
    const file = (await response.json().catch(() => undefined)) as { l: string; f: unknown[]; lxx?: unknown[] } | undefined;
    if (!file) return route.fulfill({ response });
    if (file.l === 'ὕδωρ') file.lxx = [['ὕδατος', 'N-GSN', 1, 'gen', 1, 2]];
    else file.lxx = [['ἀόρατος', 'A-NSF', 1, 'gen', 1, 2]];
    return route.fulfill({ response, json: file });
  });
});

const forms = (page: Page) => page.getByRole('group', { name: 'Forms', exact: true });

async function openTable(page: Page, verse = 2, word = 'ἀόρατος', ideas = ADJECTIVE_IDEAS, heading = 'Adjective endings') {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page, ideas);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/?b=gen&c=1&view=greek');
  await page.reload();
  await page.locator(`[data-verse="${verse}"]`).getByRole('button', { name: word, exact: true }).first().click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-paradigm').getByRole('button').click();
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
}

test('Genesis 1:2 ἀόρατος: This word lays the Septuagint’s form and the New Testament’s, each saying where, the tapped form outlined', async ({ page }) => {
  await openTable(page);
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  await forms(page).getByRole('button', { name: 'This word' }).click();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');

  // the form he tapped has its cell, outlined, and the line above the table no longer says the table lacks it
  await expect(page.getByTestId('word-lit')).toHaveText('Its form is outlined in the table.');
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toContainText('ἀόρατος');
  await expect(lit.locator('[data-found]')).toHaveText('in the Septuagint');

  // the New Testament's forms are there, found in the NT; no cell says 'not in the NT' for a form the Septuagint has, and an empty one names both texts
  const found = page.locator('[data-found]');
  await expect(found).toHaveText(['in the Septuagint', 'in the NT', 'in the NT', 'in the NT', 'in the NT']);
  const texts = await page.locator('[data-cell]').allInnerTexts();
  expect(texts.filter((t) => t === 'not in the NT')).toHaveLength(0);
  expect(texts.filter((t) => t === 'not in the Septuagint or NT').length).toBeGreaterThan(0);
  await expect(page.getByText('The table has no cell for this form yet.')).toHaveCount(0);

  // the tapped form's note says where the Septuagint uses it and opens the Reader there
  await expect(page.getByTestId('own-note')).toContainText('Used once in the Septuagint, first at Genesis 1:2.');
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'septuagint-own-paradigm');
});

test('Genesis 1:1 ΑΡΧΗ, a word Swete prints in capitals: This word outlines the dative singular cell ἀρχῇ, never "no cell for this form yet"', async ({ page }) => {
  await openTable(page, 1, 'ΑΡΧΗ', NOUN_IDEAS, 'Noun endings');
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  await forms(page).getByRole('button', { name: 'This word' }).click();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');

  // the capitals have no accent: the form is matched to the one the lemma's file has for the same parsing, ἀρχῇ
  await expect(page.getByTestId('word-lit')).toHaveText('Its form is outlined in the table.');
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toContainText('ἀρχῇ');
  await expect(page.getByText('The table has no cell for this form yet.')).toHaveCount(0);
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'septuagint-own-paradigm-capitals');
});

test('Genesis 1:2 ὕδατος, a word whose Septuagint lemma has a comma (ὕδωρ, ὕδατος): This word is there and its cell is outlined, with the New Testament’s ὕδωρ forms laid too', async ({ page }) => {
  await openTable(page, 2, 'ὕδατος.', [...NOUN_IDEAS, 'declension-3'], 'The third declension');
  await page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name: 'Learn', exact: true }).click();
  await forms(page).getByRole('button', { name: 'This word' }).click();
  await expect(forms(page).getByRole('button', { name: 'This word' })).toHaveAttribute('aria-pressed', 'true');

  // the form he tapped has its own cell, outlined, found in the Septuagint and the New Testament both
  await expect(page.getByTestId('word-lit')).toHaveText('Its form is outlined in the table.');
  const lit = page.locator('[data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toContainText('ὕδατος');
  await expect(lit.locator('[data-found]')).toHaveText('in the Septuagint and NT');
  // the other forms the New Testament has of ὕδωρ are in the table, found in the NT
  await expect(page.locator('[data-found]').filter({ hasText: /^in the NT$/ }).first()).toBeVisible();
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'septuagint-own-paradigm-comma-lemma');
});
