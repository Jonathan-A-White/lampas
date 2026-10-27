// The Hebrew paradigm tables (mw-gdcyf98.13) at 390x844: with Hebrew chosen on the Paradigms list's Greek | Hebrew segment the four tables are listed; each table is drawn right to left (its row labels at the
// right), every pointed form whole in one line inside its own cell at Normal, Large and Largest, with no sideways scroll; and the word sheet of וַיְהִי in Jonah 1:1 has the Paradigm row, which opens the qal verb with
// the word's cell outlined and in view.
import { expect, test, type Page } from '@playwright/test';
import { paradigmsIn } from '../../src/data/paradigms';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const HEBREW = paradigmsIn('hbo').map((table) => table.id);
const SIZES = { Normal: 1, Large: 1.25, Largest: 1.5 } as const;
const IDEAS = ['he-root', 'he-qal', 'he-perfect', 'he-imperfect', 'he-imperative', 'he-person-gender-number', 'he-number', 'he-gender', 'he-pronoun-personal', 'he-suffix-pronominal', 'he-article', 'he-vowel-patach', 'he-vowel-qamats', 'he-vowel-segol', 'he-dagesh'];

// Puts the Hebrew grammar levels in the app's own store through raw IndexedDB, as the app wrote them.
async function putLevels(page: Page): Promise<void> {
  const rows = IDEAS.map((id) => ({ id, level: 'solid', since: Date.now(), how: 'marked' }));
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

async function openSolid(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page);
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

/** What is wrong with the Hebrew tables drawn now: a form that wraps, runs out of its cell or is cut at the table's edge, and a table that scrolls sideways or is not right to left. */
async function misfits(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const bad: string[] = [];
    for (const table of Array.from(document.querySelectorAll<HTMLElement>('[data-testid="paradigm-table"]'))) {
      const box = table.parentElement as HTMLElement;
      const edge = box.getBoundingClientRect();
      if (table.getAttribute('dir') !== 'rtl') bad.push('table is not right to left');
      if (box.scrollWidth > box.clientWidth) bad.push(`table scrolls sideways by ${box.scrollWidth - box.clientWidth}px`);
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth) bad.push('the page scrolls sideways');
      // the row labels are the column at the right, the first column of forms beside them
      const label = table.querySelector<HTMLElement>('tbody th[scope="row"]');
      const first = table.querySelector<HTMLElement>('tbody td [data-cell]');
      if (label && first && label.getBoundingClientRect().left < first.getBoundingClientRect().left) bad.push('the row labels are not at the right');
      for (const cell of Array.from(table.querySelectorAll<HTMLElement>('[data-cell][data-state="shown"][lang="he"]'))) {
        const td = cell.closest('td') as HTMLElement;
        const range = document.createRange();
        range.selectNodeContents(cell);
        const text = range.getBoundingClientRect();
        const own = td.getBoundingClientRect();
        const name = `${cell.dataset.cell} (${cell.textContent})`;
        if (cell.scrollWidth > cell.clientWidth) bad.push(`${name} runs out of its cell`);
        if (text.left < own.left - 0.5 || text.right > own.right + 0.5) bad.push(`${name} lies outside its cell`);
        if (text.right > edge.right + 0.5 || text.left < edge.left - 0.5) bad.push(`${name} is cut at the table edge`);
        if (new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top))).size > 1) bad.push(`${name} wraps`);
      }
    }
    return bad;
  });
}

test('with Hebrew chosen on the segment the list holds the four tables, each fits right to left at every text size', async ({ page }) => {
  await openSolid(page);
  await page.goto('/#/paradigms');
  const segment = page.getByTestId('source-segment');
  await expect(segment).toBeVisible();
  await segment.getByRole('button', { name: 'Hebrew', exact: true }).click();
  await expect(page.locator('[data-paradigm]')).toHaveCount(4);
  // the list is grouped by tier (Nouns, Pronouns, Verbs), so the order is the tiers'
  expect(await page.locator('[data-paradigm]').evaluateAll((els) => els.map((el) => el.getAttribute('data-paradigm')))).toEqual(['he-noun-suffixes', 'he-article', 'he-pronouns-personal', 'he-qal-strong']);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await shot(page, 'hebrew-paradigms-list');
  const found: string[] = [];
  for (const [size, scale] of Object.entries(SIZES)) {
    for (const id of HEBREW) {
      await page.goto(`/#/paradigms?t=${id}&mode=learn`);
      await page.evaluate((value) => document.documentElement.style.setProperty('--lp-scale', String(value)), scale);
      await expect(page.locator('[data-cell][data-state="shown"]').first()).toBeVisible();
      for (const problem of await misfits(page)) found.push(`${id} at ${size}: ${problem}`);
    }
  }
  expect(found).toEqual([]);
  await page.goto('/#/paradigms?t=he-qal-strong&mode=learn');
  await expect(page.locator('[data-cell="Perfect 3rd masculine Singular"]')).toHaveText('קָטַל');
  await shot(page, 'hebrew-paradigms-qal');
});

test("the sheet of וַיְהִי in Jonah 1:1 has the Paradigm row, which opens the qal verb on the word's cell", async ({ page }) => {
  await openSolid(page);
  await page.goto('/#/?b=jon&c=1');
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Hebrew', exact: true }).click();
  await page.locator('[data-verse="1"] [data-word="0"]').click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-parse')).toHaveText('Conjunctive waw | Verb - Qal - Consecutive imperfect - third person masculine singular');
  const row = sheet.getByTestId('sheet-paradigm');
  await expect(row).toBeVisible();
  const button = row.getByRole('button', { name: 'The qal verb', exact: true });
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  // the whole sheet, Paradigm row included, is on the screen
  const dialog = (await sheet.boundingBox())!;
  expect(dialog.y).toBeGreaterThanOrEqual(0);
  expect(dialog.y + dialog.height).toBeLessThanOrEqual(844 + 0.5);
  await shot(page, 'hebrew-paradigm-row');
  await button.click();
  await expect(page.getByRole('heading', { name: 'The qal verb', level: 1 })).toBeVisible();
  const lit = page.locator('[data-cell][data-lit]');
  await expect(lit).toHaveCount(1);
  await expect(lit).toHaveAttribute('data-cell', 'Imperfect 3rd masculine Singular');
  await expect(lit).toBeInViewport();
  await expect(page.getByTestId('word-line')).toContainText('Verb - Qal - Consecutive imperfect');
  await shot(page, 'hebrew-paradigm-lit');
});
