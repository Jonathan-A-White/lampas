// Ask the tutor on every paradigm screen (mw-irpgqi.3), at 390x844: the Paradigms list and a table both have the Ask the tutor button, a tap opens the Talk
// sheet over the screen (no Reader in between), and the request the mill receives names the table, the mode, the cell in focus with its form and parse and the
// word he came from. The talk is kept per table: leaving and coming back finds it, and the next table has its own.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

/** As tests/e2e/paradigm-drill.spec.ts: 12 cells of the article are his. */
const IDEAS: Record<string, 'solid' | 'frontier'> = {
  article: 'solid', noun: 'solid', 'number-singular': 'solid', 'number-plural': 'solid', 'case-nominative': 'solid', 'case-genitive': 'solid',
  'case-dative': 'frontier', 'gender-masculine': 'solid', 'gender-feminine': 'solid',
};

async function putLevels(page: Page, ideas: Record<string, 'solid' | 'frontier'>) {
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

async function start(page: Page): Promise<FakePostern> {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await putLevels(page, IDEAS);
  return fake;
}

const ask = (page: Page) => page.getByRole('button', { name: 'Ask the tutor', exact: true });
const sheetOf = (page: Page) => page.getByRole('dialog', { name: 'Ask the tutor: Paradigms', exact: true });

interface Sent {
  reference: string;
  question: string;
  focus?: { kind: string; table: string; mode?: string; revealed: string[]; cell?: { form?: string; parse: string }; word?: { form: string; parse: string } };
  screen?: { name: string; facts: { label: string; value: string }[] };
}
const sent = (fake: FakePostern): Sent[] => fake.received.map((r) => r.input as unknown as Sent);

test('Drill: a tap on a cell, then Ask the tutor, opens the sheet over the table and the request names the table, the mode and the cell with its form and parse', async ({ page }) => {
  const fake = await start(page);
  await page.goto('/#/paradigms?t=article&mode=drill');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();

  await page.locator('[data-cell="Genitive Singular Feminine"]').click();
  await expect(page.locator('[data-cell="Genitive Singular Feminine"]')).toHaveText('τῆς');
  await ask(page).scrollIntoViewIfNeeded();
  await ask(page).click();

  // the sheet opens over the table: no Reader, the table is still the page
  const sheet = sheetOf(page);
  await expect(sheet).toBeVisible();
  expect(page.url()).toContain('#/paradigms?t=article');
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);
  await shot(page, 'paradigm-tutor-sheet');

  expect(fake.received).toHaveLength(1);
  const [request] = sent(fake);
  expect(request.question).toContain('The article');
  expect(request.focus).toMatchObject({
    kind: 'paradigm',
    table: 'The article',
    mode: 'drill',
    cell: { form: 'τῆς', parse: 'Genitive Singular Feminine' },
  });
  expect(request.focus?.revealed).toEqual(['Genitive Singular Feminine: τῆς']);
  expect(request.focus?.word).toBeUndefined();
  expect(request.screen?.name).toBe('Paradigms');
  expect(request.screen?.facts).toContainEqual({ label: 'Table', value: 'The article' });
  expect(request.screen?.facts).toContainEqual({ label: 'Mode', value: 'Drill' });
  expect(request.screen?.facts).toContainEqual({ label: 'Cell in focus', value: 'Genitive Singular Feminine: τῆς' });
});

test('from a word: the request also names the word he came from, and the cell in focus is the word’s own', async ({ page }) => {
  const fake = await start(page);
  await page.goto('/#/?b=2jn&c=1&view=greek');
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'ἀγαπῶ', exact: true }).first().click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-paradigm').getByRole('button', { name: 'Contract verbs' }).click();
  await expect(page.getByRole('heading', { name: 'Contract verbs', level: 1 })).toBeVisible();

  await ask(page).scrollIntoViewIfNeeded();
  await ask(page).click();
  await expect(sheetOf(page)).toBeVisible();
  await expect(sheetOf(page).locator('[data-turn]')).toHaveCount(1);

  const [request] = sent(fake);
  expect(request.focus?.table).toBe('Contract verbs');
  expect(request.focus?.word?.form).toBe('ἀγαπῶ');
  expect(request.focus?.word?.parse).toContain('1st person singular');
  expect(request.focus?.cell?.parse).toMatch(/1st person singular/);
  expect(request.screen?.facts.find((f) => f.label === 'Word he came from')?.value).toContain('ἀγαπῶ');
});

test('the Paradigms list has Ask the tutor too, and its context names the list', async ({ page }) => {
  const fake = await start(page);
  await page.goto('/#/paradigms');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Paradigms', exact: true, level: 1 })).toBeVisible();
  const button = ask(page);
  await button.scrollIntoViewIfNeeded();
  expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await button.click();
  const sheet = sheetOf(page);
  await expect(sheet).toBeVisible();
  await sheet.locator('[data-suggestion]').first().click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);

  const [request] = sent(fake);
  expect(request.screen?.name).toBe('Paradigms');
  expect(request.screen?.facts).toContainEqual({ label: 'Showing', value: 'The list of the paradigm tables' });
  expect(request.focus).toBeUndefined();
  await shot(page, 'paradigm-list-tutor');
});

test('leaving and reopening the same table’s tutor shows the same talk, and another table has its own', async ({ page }) => {
  const fake = await start(page);
  await page.goto('/#/paradigms?t=article&mode=learn');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
  await ask(page).scrollIntoViewIfNeeded();
  await ask(page).click();
  await expect(sheetOf(page).locator('[data-turn]')).toHaveCount(1);
  const said = await sheetOf(page).locator('[data-turn]').first().textContent();
  expect(fake.received).toHaveLength(1);

  // leave: Done on the sheet, then the list, then the table again
  await sheetOf(page).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheetOf(page)).toHaveCount(0);
  await page.getByRole('button', { name: '‹ Paradigms' }).click();
  await expect(page.getByRole('heading', { name: 'Paradigms', exact: true, level: 1 })).toBeVisible();
  await page.goto('/#/paradigms?t=article&mode=learn');
  await expect(page.getByRole('heading', { name: 'The article', level: 1 })).toBeVisible();
  await ask(page).scrollIntoViewIfNeeded();
  await ask(page).click();
  await expect(sheetOf(page).locator('[data-turn]')).toHaveCount(1);
  expect(await sheetOf(page).locator('[data-turn]').first().textContent()).toBe(said);
  // the same talk: no second question went to the mill
  expect(fake.received).toHaveLength(1);

  // another table is another talk
  await sheetOf(page).getByRole('button', { name: 'Done', exact: true }).click();
  await page.goto('/#/paradigms?t=noun-endings&mode=learn');
  await expect(page.getByRole('heading', { name: 'Noun endings', level: 1 })).toBeVisible();
  await ask(page).scrollIntoViewIfNeeded();
  await ask(page).click();
  await expect(sheetOf(page).locator('[data-turn]')).toHaveCount(1);
  expect(fake.received).toHaveLength(2);
  expect(sent(fake)[1].focus?.table).toBe('Noun endings');
});
