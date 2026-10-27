// Learn and Drill on a paradigm table, and How much of a table (mw-irpgqi.2), at 390x844: Learn shows every cell of the extent filled; Drill shows them
// blank; a tap on a blank shows the form with Had it / Missed beside it; after the last, 'N of M' and Drill the missed again, which asks only the missed.
// The extent setting shows in Settings and in the table's header switch, and a change in one shows in the other; the old addresses still open.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openGroup } from './settings-group';

test.use({ viewport: { width: 390, height: 844 } });

/** As tests/e2e/paradigms.spec.ts: 12 cells of the article are his (nominative, genitive solid; dative frontier; accusative not yet; masculine, feminine; the neuter not yet). */
const IDEAS: Record<string, 'solid' | 'frontier'> = {
  article: 'solid', noun: 'solid', 'number-singular': 'solid', 'number-plural': 'solid', 'case-nominative': 'solid', 'case-genitive': 'solid',
  'case-dative': 'frontier', 'gender-masculine': 'solid', 'gender-feminine': 'solid',
};

async function putLevels(page: Page, ideas: Record<string, 'solid' | 'frontier'> = IDEAS) {
  const rows = Object.entries(ideas).map(([id, level]) => ({ id, level, since: Date.now(), how: 'marked' }));
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
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, top: document.documentElement.scrollTop }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  expect(fits.top).toBe(0);
}

async function openArticle(page: Page, query = '') {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page);
  await page.goto(`/#/paradigms?t=article${query}`);
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
}

const mode = (page: Page, name: string) => page.getByRole('group', { name: 'Mode', exact: true }).getByRole('button', { name, exact: true });
const extent = (page: Page, name: string) => page.getByRole('group', { name: 'How much of a table', exact: true }).getByRole('button', { name, exact: true });
const cells = (page: Page, state: string) => page.locator(`[data-cell][data-state="${state}"]`);

test('Drill: the cells of the extent are blank, a tap shows the form with Had it / Missed, the last grade shows N of M, and Drill the missed again asks only the missed', async ({ page }) => {
  await openArticle(page);
  await expect(mode(page, 'Drill')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('table-available')).toHaveText('Available forms: 12 of 24');
  await expect(cells(page, 'hidden')).toHaveCount(12);
  await expect(cells(page, 'locked')).toHaveCount(12);
  await expect(cells(page, 'shown')).toHaveCount(0);
  for (const cell of await cells(page, 'hidden').all()) {
    expect((await cell.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
    expect(await cell.textContent()).toBe('');
  }
  await expectFitsPhone(page);
  await shot(page, 'paradigm-drill-blank');

  // a tap on a blank: the form, and Had it / Missed right under its row, each a finger tall and in view
  const first = page.locator('[data-cell="Genitive Singular Feminine"]');
  await first.click();
  await expect(first).toHaveAttribute('data-state', 'shown');
  await expect(first).toHaveText('τῆς');
  const grade = page.getByTestId('grade-row');
  await expect(grade).toBeVisible();
  await expect(grade).toContainText('Genitive singular feminine of the article');
  for (const name of ['Had it', 'Missed']) {
    const button = grade.getByRole('button', { name, exact: true });
    await expect(button).toBeInViewport();
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  }
  const cellBox = await first.boundingBox();
  const gradeBox = await grade.boundingBox();
  expect((gradeBox?.y ?? 0) - ((cellBox?.y ?? 0) + (cellBox?.height ?? 0))).toBeLessThan(40);
  await shot(page, 'paradigm-drill-open');
  await grade.getByRole('button', { name: 'Missed', exact: true }).click();
  await expect(first).toHaveAttribute('data-grade', 'missed');
  await expect(page.getByTestId('grade-row')).toHaveCount(0);

  // the other eleven, each had
  const rest = await cells(page, 'hidden').evaluateAll((els) => els.map((el) => el.getAttribute('data-cell') ?? ''));
  expect(rest).toHaveLength(11);
  for (const place of rest) {
    await page.locator(`[data-cell="${place}"]`).click();
    await page.getByTestId('grade-row').getByRole('button', { name: 'Had it', exact: true }).click();
    await expect(page.locator(`[data-cell="${place}"]`)).toHaveAttribute('data-grade', 'had');
  }
  const score = page.getByTestId('drill-score');
  await expect(score).toHaveText('11 of 12');
  await expect(score).toBeInViewport();
  await expectFitsPhone(page);
  await shot(page, 'paradigm-drill-score');

  // Drill the missed again: the one missed cell is blank, the eleven stay shown
  await page.getByRole('button', { name: 'Drill the missed again', exact: true }).click();
  await expect(cells(page, 'hidden')).toHaveCount(1);
  await expect(first).toHaveAttribute('data-state', 'hidden');
  await expect(cells(page, 'shown')).toHaveCount(11);
  await expect(page.getByTestId('drill-score')).toHaveCount(0);
  await first.click();
  await page.getByTestId('grade-row').getByRole('button', { name: 'Had it', exact: true }).click();
  await expect(page.getByTestId('drill-score')).toHaveText('1 of 1');
  await expect(page.getByRole('button', { name: 'Drill the missed again', exact: true })).toHaveCount(0);

  // the miss put the table in Review, due now
  await page.goto('/#/review');
  await expect(page.getByTestId('due-today')).toContainText('1 table');
});

test('Learn shows every cell of the extent filled, and the mode is kept in the address', async ({ page }) => {
  await openArticle(page);
  await mode(page, 'Learn').click();
  await expect(mode(page, 'Learn')).toHaveAttribute('aria-pressed', 'true');
  await expect(cells(page, 'shown')).toHaveCount(12);
  await expect(cells(page, 'hidden')).toHaveCount(0);
  await expect(page.locator('[data-cell="Dative Singular Masculine"]')).toHaveText('τῷ');
  await expect(page.getByTestId('mode-help')).toHaveText('Learn: every available form is shown.');
  expect(page.url()).toContain('mode=learn');
  await expectFitsPhone(page);
  await shot(page, 'paradigm-learn');
  await page.reload();
  await expect(mode(page, 'Learn')).toHaveAttribute('aria-pressed', 'true');
});

test('the old addresses still open: mode=study is Drill and mode=review is Learn', async ({ page }) => {
  await openArticle(page, '&mode=study');
  await expect(mode(page, 'Drill')).toHaveAttribute('aria-pressed', 'true');
  await expect(cells(page, 'hidden')).toHaveCount(12);
  await page.goto('/#/paradigms?t=article&mode=review');
  await expect(mode(page, 'Learn')).toHaveAttribute('aria-pressed', 'true');
  await expect(cells(page, 'shown')).toHaveCount(12);
});

test('How much of a table: the header switch and Settings show one setting; Any fills the locked cells in Learn, Solid only hides the frontier ones', async ({ page }) => {
  await openArticle(page, '&mode=learn');
  const header = page.getByRole('group', { name: 'How much of a table', exact: true });
  await expect(header).toBeVisible();
  expect(await header.evaluate((el) => el.closest('header') !== null)).toBe(true);
  await expect(extent(page, 'Solid and frontier')).toHaveAttribute('aria-pressed', 'true');
  for (const name of ['Any', 'Solid and frontier', 'Solid only']) {
    const button = extent(page, name);
    expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    expect(((await button.boundingBox())?.x ?? 0) + ((await button.boundingBox())?.width ?? 0)).toBeLessThanOrEqual(390);
  }

  // Any: every cell filled, the twelve not yet marked so, each with its Needs on a tap
  await extent(page, 'Any').click();
  await expect(extent(page, 'Any')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('table-available')).toHaveText('All 24 forms shown, 12 available');
  await expect(cells(page, 'shown')).toHaveCount(24);
  await expect(cells(page, 'locked')).toHaveCount(0);
  await expect(page.locator('[data-cell][data-standing="notYet"]')).toHaveCount(12);
  const notYet = page.locator('[data-cell="Accusative Singular Masculine"]');
  await expect(notYet).toHaveText('τόν');
  await notYet.click();
  await expect(page.getByTestId('lock-needs')).toContainText('Needs the accusative case');
  await expectFitsPhone(page);
  await shot(page, 'paradigm-learn-any');

  // Solid only: the four dative (frontier) cells are hidden, the not-yet ones locked, the eight solid ones shown
  await extent(page, 'Solid only').click();
  await expect(page.getByTestId('table-available')).toHaveText('Solid forms: 8 of 24');
  await expect(cells(page, 'shown')).toHaveCount(8);
  await expect(cells(page, 'outside')).toHaveCount(4);
  await expect(cells(page, 'locked')).toHaveCount(12);
  await expect(page.locator('[data-cell]')).toHaveCount(24);
  await shot(page, 'paradigm-learn-solid');

  // the same setting in Settings > Greek, and a change there shows in the header
  await page.getByRole('button', { name: '‹ Paradigms', exact: true }).click();
  await expect(page.locator('[data-paradigm="article"]').getByTestId('paradigm-available')).toHaveText('Solid forms: 8 of 24');
  await page.goto('/#/settings');
  await openGroup(page, 'Learning');
  const row = page.getByRole('group', { name: 'How much of a table', exact: true });
  await row.scrollIntoViewIfNeeded();
  await expect(row.getByRole('button', { name: 'Solid only', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const tops: number[] = [];
  for (const name of ['Any', 'Solid and frontier', 'Solid only']) {
    const b = await row.getByRole('button', { name, exact: true }).boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(47.5);
    tops.push(Math.round(b?.y ?? 0));
  }
  // one line of three chips at phone width
  expect(new Set(tops).size).toBe(1);
  await shot(page, 'paradigm-extent-setting');
  await row.getByRole('button', { name: 'Solid and frontier', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Solid and frontier', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/paradigms?t=article&mode=learn');
  await expect(extent(page, 'Solid and frontier')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('table-available')).toHaveText('Available forms: 12 of 24');
});
