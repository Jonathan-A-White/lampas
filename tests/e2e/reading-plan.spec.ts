import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The listening plan in the Bible view (mw-umv8sp.5): the Plan chip in the Reader's row, Start a listening plan from the chip and from Settings, and the marks in the chapter picker.
test.use({ viewport: { width: 390, height: 844 } });

const STATE = 'readingPlanState';

/** Puts rows in the app's own settings store through raw IndexedDB, as the app wrote them. */
async function putSettings(page: Page, rows: { key: string; value: string }[]) {
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          for (const row of list) tx.objectStore('settings').put(row);
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

/** The plan's state as a phone stores it: started at `code` `chapter`, with `done` chapter keys. */
const planState = (start: { code: string; chapter: number }, done: string[]) => ({
  key: STATE,
  value: JSON.stringify({ planId: 'whole-bible', start, done }),
});

/** Genesis 1 to Exodus 40 (90 chapters) as done keys. */
function doneBeforeLeviticus(extra: string[] = []): string[] {
  const keys: string[] = [];
  for (let c = 1; c <= 50; c++) keys.push(`gen.${c}`);
  for (let c = 1; c <= 40; c++) keys.push(`exo.${c}`);
  return [...keys, ...extra];
}

/** Opens the Reader, then puts `rows` in the store and reloads so the app reads them. */
async function openWith(page: Page, rows: { key: string; value: string }[], options: { empty?: boolean } = {}) {
  await openUnlocked(page, options);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putSettings(page, rows);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
}

const START_LEV_4 = [
  { key: 'audioBible', value: 'word-of-promise' },
  { key: 'readingPlan', value: 'on' },
  planState({ code: 'lev', chapter: 4 }, doneBeforeLeviticus(['lev.1', 'lev.2', 'lev.3'])),
];

const chip = (page: Page) => page.getByTestId('plan-chip');

test('with the plan on the chip says what is next and how far, and a tap opens the send-off sheet', async ({ page }) => {
  await openWith(page, START_LEV_4);
  await expect(chip(page)).toContainText('Next: Leviticus 4');
  await expect(chip(page)).toContainText('93 of 1,189');
  await expect(chip(page)).toHaveAccessibleName('Next: Leviticus 4, 93 of 1,189 chapters done');
  const box = await chip(page).boundingBox();
  const row = await page.getByTestId('reader-chips').boundingBox();
  expect(row?.height).toBeLessThanOrEqual(40);
  expect(box && row && box.y >= row.y - 0.5 && box.y + box.height <= row.y + row.height + 0.5).toBe(true);
  await shot(page, 'reading-plan-chip-390x844');

  await chip(page).click();
  const sheet = page.getByRole('dialog', { name: 'Off to Audible: Leviticus 4' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Go' })).toBeVisible();
});

test('with the plan off the chip invites her to start one, and so does Settings', async ({ page }) => {
  await openWith(page, []);
  await expect(chip(page)).toHaveText('Listen through the Bible');
  await chip(page).click();
  const sheet = page.getByRole('dialog', { name: 'Start a listening plan' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'The whole Bible' })).toBeVisible();
  await shot(page, 'reading-plan-start-390x844');
  await sheet.getByRole('button', { name: 'Not now' }).click();
  await expect(sheet).toHaveCount(0);

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  const entry = page.getByRole('button', { name: 'Start a listening plan' });
  await entry.scrollIntoViewIfNeeded();
  await entry.click();
  await expect(page.getByRole('dialog', { name: 'Start a listening plan' })).toBeVisible();
});

test('starting at Leviticus 1 counts Genesis and Exodus as done', async ({ page }) => {
  await openWith(page, []);
  await chip(page).click();
  await page.getByRole('dialog', { name: 'Start a listening plan' }).getByRole('button', { name: 'The whole Bible' }).click();
  const picker = page.getByRole('dialog', { name: 'Where are you starting?' });
  await expect(picker).toBeVisible();
  await picker.getByRole('button', { name: /^Leviticus/ }).click();
  await picker.getByRole('button', { name: 'Chapter 1', exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Start a listening plan' })).toHaveCount(0);
  await expect(chip(page)).toContainText('Next: Leviticus 1');
  await expect(chip(page)).toContainText('90 of 1,189');
});

test('the chapter picker marks done chapters and the next, in both testaments', async ({ page }) => {
  await openWith(page, [
    { key: 'audioBible', value: 'word-of-promise' },
    { key: 'readingPlan', value: 'on' },
    planState({ code: 'lev', chapter: 4 }, doneBeforeLeviticus(['lev.1', 'lev.2', 'lev.3'])),
  ]);
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
  await picker.getByRole('button', { name: /^Leviticus/ }).click();
  const grid = picker.getByRole('group', { name: 'Leviticus chapters' });
  await expect(grid.locator('[data-done]')).toHaveCount(3);
  await expect(grid.locator('[data-chapter="1"]')).toHaveAttribute('data-done', '');
  await expect(grid.locator('[data-chapter="3"]')).toHaveAttribute('data-done', '');
  await expect(grid.locator('[data-chapter="4"]')).toHaveAttribute('data-next', '');
  await expect(grid.locator('[data-chapter="5"]')).not.toHaveAttribute('data-next', '');
  await expect(grid.locator('[data-chapter="5"]')).not.toHaveAttribute('data-done', '');
  expect(await grid.locator('[data-chapter="1"]').boundingBox().then((b) => b?.height ?? 0)).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'reading-plan-picker-ot-390x844');

  // the New Testament grid: a plan started at Luke 15 has Matthew and Mark and Luke 1-14 done
  await putSettings(page, [planState({ code: 'luk', chapter: 15 }, [...doneBeforeLeviticus(), ...allBefore()])]);
  await page.reload();
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  await picker.getByRole('button', { name: /^Luke$/ }).click();
  const luke = picker.getByRole('group', { name: 'Luke chapters' });
  await expect(luke.locator('[data-chapter="14"]')).toHaveAttribute('data-done', '');
  await expect(luke.locator('[data-chapter="15"]')).toHaveAttribute('data-next', '');
  await expect(luke.locator('[data-chapter="16"]')).not.toHaveAttribute('data-next', '');
  await shot(page, 'reading-plan-picker-nt-390x844');
});

test('the Developer row resets the plan, and Start a listening plan runs again', async ({ page }) => {
  await openWith(page, [...START_LEV_4, { key: 'developerMode', value: 'on' }]);
  await expect(chip(page)).toContainText('Next: Leviticus 4');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  const reset = page.getByRole('button', { name: 'Reset the listening plan, for the demo' });
  await reset.scrollIntoViewIfNeeded();
  expect((await reset.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'reading-plan-developer-reset-390x844');
  await reset.click();

  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(chip(page)).toHaveText('Listen through the Bible');
  await chip(page).click();
  await page.getByRole('dialog', { name: 'Start a listening plan' }).getByRole('button', { name: 'The whole Bible' }).click();
  const picker = page.getByRole('dialog', { name: 'Where are you starting?' });
  await picker.getByRole('button', { name: /^Leviticus/ }).click();
  await picker.getByRole('button', { name: 'Chapter 1', exact: true }).click();
  await expect(chip(page)).toContainText('Next: Leviticus 1');
  await expect(chip(page)).toContainText('90 of 1,189');
});

/** Every chapter key from Leviticus 1 to Luke 14 (the rest of the Old Testament, Matthew, Mark and Luke 1-14), for a plan started at Luke 15. */
function allBefore(): string[] {
  const ot: Record<string, number> = {
    lev: 27, num: 36, deu: 34, jos: 24, jdg: 21, rut: 4, '1sa': 31, '2sa': 24, '1ki': 22, '2ki': 25, '1ch': 29, '2ch': 36, ezr: 10, neh: 13, est: 10, job: 42, psa: 150, pro: 31, ecc: 12,
    sng: 8, isa: 66, jer: 52, lam: 5, ezk: 48, dan: 12, hos: 14, jol: 3, amo: 9, oba: 1, jon: 4, mic: 7, nam: 3, hab: 3, zep: 3, hag: 2, zec: 14, mal: 4, mat: 28, mrk: 16,
  };
  const keys: string[] = [];
  for (const [code, n] of Object.entries(ot)) for (let c = 1; c <= n; c++) keys.push(`${code}.${c}`);
  for (let c = 1; c <= 14; c++) keys.push(`luk.${c}`);
  return keys;
}

test('a reader with no Greek activity sees the Plan chip alone', async ({ page }) => {
  // a new install: no words, nothing due, no goal (mw-5r3p30.385)
  await openWith(page, START_LEV_4, { empty: true });
  await expect(chip(page)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Due:/ })).toHaveCount(0);
  await expect(page.getByTestId('goal-strip')).toHaveCount(0);
  // the only other chip a new install can have is the 'New 3' of the chapter's unmet words, which the Reader always showed (src/NewWordsStrip.tsx); the plan adds none
  const names = await page.getByTestId('reader-chips').getByRole('button').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
  expect(names.filter((name) => !name?.startsWith('New words') && !name?.startsWith('Next: Leviticus 4'))).toEqual([]);
});

test('a reader with Greek activity sees the Greek chips and the Plan chip', async ({ page }) => {
  // his word list (nine words due, new words) and a goal
  await openWith(page, [...START_LEV_4, { key: 'goal', value: '1 John 1:1' }]);
  await expect(page.getByRole('button', { name: /^Due: \d+$/ })).toBeVisible();
  await expect(page.getByTestId('goal-strip')).toBeVisible();
  await expect(chip(page)).toBeVisible();
});

for (const size of [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
]) {
  test(`every chip has an accessible name and none is cut off at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openWith(page, [...START_LEV_4, { key: 'goal', value: '1 John 1:1' }]);
    await expect(page.getByRole('button', { name: /^Due: \d+$/ })).toBeVisible();
    await expect(page.getByTestId('goal-strip')).toBeVisible();
    const row = page.getByTestId('reader-chips');
    const chips = row.getByRole('button');
    expect(await chips.count()).toBeGreaterThanOrEqual(3);
    for (const handle of await chips.elementHandles()) expect(((await handle.getAttribute('aria-label')) ?? '').length).toBeGreaterThan(0);
    // no chip is cut: the row scrolls sideways when the chips outgrow the phone (mw-5r3p30.617), and the page never does
    for (const clipped of await chips.evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth).map((el) => el.getAttribute('aria-label')))) expect(clipped).toBeNull();
    const page_ = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(page_.scrollWidth).toBeLessThanOrEqual(page_.clientWidth);
    await shot(page, `reading-plan-chips-${size.width}x${size.height}`);
  });
}
