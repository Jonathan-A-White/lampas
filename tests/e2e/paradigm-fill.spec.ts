// Fill the table (mw-fnvjof.17.316), at 390x844: the Drill the other way round. 'Fill the table' empties the cells the filter shows and lays their forms, shuffled, as tiles under the table;
// a tap on a tile then on a cell (or a drag) places it: a right one stays, a wrong one goes back with a shake; Show fills the rest; the first slip puts the table in Review, due now.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

/** As tests/e2e/paradigm-drill.spec.ts: 12 cells of the article are his (nominative, genitive solid; dative frontier; masculine, feminine), 8 of them solid. */
const IDEAS: Record<string, 'solid' | 'frontier'> = {
  article: 'solid', noun: 'solid', 'number-singular': 'solid', 'number-plural': 'solid', 'case-nominative': 'solid', 'case-genitive': 'solid',
  'case-dative': 'frontier', 'gender-masculine': 'solid', 'gender-feminine': 'solid',
};

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

async function openArticle(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page);
  await page.goto('/#/paradigms?t=article');
  // a write behind Dexie's back is not seen by its live queries: the app starts afresh
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
}

const cells = (page: Page, state: string) => page.locator(`[data-cell][data-state="${state}"]`);
const tiles = (page: Page) => page.getByTestId('fill-tray').locator('[data-tile]');
const tile = (page: Page, form: string) => tiles(page).filter({ hasText: new RegExp(`^${form}$`) }).first();
const cell = (page: Page, place: string) => page.locator(`[data-cell="${place}"]`);
/** A real drag by hand, in steps: the mouse goes down on the tile, leaves it a little (the browser starts the drag only on a move after the press), then walks to the cell and lets go. */
async function drag(page: Page, from: Locator, to: Locator) {
  await from.scrollIntoViewIfNeeded();
  const a = (await from.boundingBox())!;
  const b = (await to.boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 8, a.y + a.height / 2 - 8, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}
const extent = (page: Page, name: string) => page.getByRole('group', { name: 'How much of a table', exact: true }).getByRole('button', { name, exact: true });

test('Fill the table empties the cells and lays the forms as tiles: a right tile stays, a wrong one goes back with a shake, a drag places, Show fills the rest', async ({ page }) => {
  await openArticle(page);
  await page.getByRole('button', { name: 'Fill the table', exact: true }).click();

  // twelve blanks, the twelve locked ones as they were, and twelve tiles in view, each a finger tall
  await expect(cells(page, 'empty')).toHaveCount(12);
  await expect(cells(page, 'locked')).toHaveCount(12);
  await expect(cells(page, 'shown')).toHaveCount(0);
  await expect(tiles(page)).toHaveCount(12);
  for (const t of await tiles(page).all()) {
    await expect(t).toBeInViewport();
    expect((await t.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  }
  for (const c of await cells(page, 'empty').all()) expect(await c.textContent()).toBe('');
  // shuffled: the tray is not the table's own order (nominative singular masculine ὁ first) for every try of a start
  const forms = await tiles(page).allTextContents();
  expect([...forms].sort()).toEqual(['ὁ', 'ἡ', 'τοῦ', 'τῆς', 'τῷ', 'τῇ', 'οἱ', 'αἱ', 'τῶν', 'τῶν', 'τοῖς', 'ταῖς'].sort());
  await expect(page.getByTestId('mode-help')).toContainText('tap a form below, then the cell it belongs to');
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'paradigm-fill-start');

  // a wrong tile: the cell shakes, the tile is still on the tray, no cell is filled
  await tile(page, 'ὁ').click();
  await expect(tile(page, 'ὁ')).toHaveAttribute('aria-pressed', 'true');
  await cell(page, 'Genitive Singular Masculine').click();
  await expect(cell(page, 'Genitive Singular Masculine')).toHaveAttribute('data-state', 'empty');
  await expect(tiles(page)).toHaveCount(12);
  await expect(page.getByTestId('mode-help')).toContainText('Not there');

  // a right tile stays
  await tile(page, 'τοῦ').click();
  await cell(page, 'Genitive Singular Masculine').click();
  await expect(cell(page, 'Genitive Singular Masculine')).toHaveAttribute('data-state', 'shown');
  await expect(cell(page, 'Genitive Singular Masculine')).toHaveAttribute('data-fill', 'placed');
  await expect(cell(page, 'Genitive Singular Masculine')).toHaveText('τοῦ');
  await expect(tiles(page)).toHaveCount(11);

  // a drag works too
  await drag(page, tile(page, 'ὁ'), cell(page, 'Nominative Singular Masculine'));
  await expect(cell(page, 'Nominative Singular Masculine')).toHaveText('ὁ');
  await expect(tiles(page)).toHaveCount(10);
  await expect(cells(page, 'empty')).toHaveCount(10);

  // Show fills the rest
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(cells(page, 'empty')).toHaveCount(0);
  await expect(cells(page, 'shown')).toHaveCount(12);
  await expect(page.getByTestId('fill-tray')).toHaveCount(0);
  await expect(page.getByTestId('fill-score')).toHaveText('2 of 12 placed, 10 shown');
  await shot(page, 'paradigm-fill-end');

  // Fill it again: twelve blanks and twelve tiles
  await page.getByRole('button', { name: 'Fill it again', exact: true }).click();
  await expect(cells(page, 'empty')).toHaveCount(12);
  await expect(tiles(page)).toHaveCount(12);

  // Stop filling: the table is the Drill's again
  await page.getByRole('button', { name: 'Stop filling', exact: true }).click();
  await expect(cells(page, 'empty')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Fill the table', exact: true })).toBeVisible();

  // the slip put the table in Review, due now
  await page.goto('/#/review');
  await expect(page.getByTestId('due-today')).toContainText('1 table');
});

test('the filter picks which cells are emptied: Solid only 8, Solid and frontier 12, Any 24', async ({ page }) => {
  await openArticle(page);
  const fill = page.getByRole('button', { name: 'Fill the table', exact: true });
  await extent(page, 'Solid only').click();
  await fill.click();
  await expect(cells(page, 'empty')).toHaveCount(8);
  await expect(tiles(page)).toHaveCount(8);
  // a change of the filter ends the run: the cells it emptied are no longer the ones shown
  await extent(page, 'Any').click();
  await expect(cells(page, 'empty')).toHaveCount(0);
  await fill.click();
  await expect(cells(page, 'empty')).toHaveCount(24);
  await expect(tiles(page)).toHaveCount(24);
  await expect(tiles(page).last()).toBeInViewport();
  await shot(page, 'paradigm-fill-any');
});
