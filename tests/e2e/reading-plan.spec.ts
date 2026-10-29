import { expect, test, type Page } from '@playwright/test';
import { planOf } from '../../src/data/plans';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openToday, todayChip } from './today-chip';
import { leaveSettings, openGroup } from './settings-group';

// The listening plan in the Bible view (mw-umv8sp.5): the reading plan piece of Today (opened by the Reader's Today chip, which replaced the Plan chip in mw-1fwagb.6), Start a listening plan from Today and from Settings, and the marks in the chapter picker.
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

/** Today's reading plan piece (the Reader's Today chip opens Today). */
const plan = (page: Page) => page.getByRole('region', { name: 'Reading plan', exact: true });
const startPlan = (page: Page) => plan(page).getByRole('button', { name: 'Start a plan' });
const backToReader = async (page: Page) => {
  await leaveSettings(page);
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
};

test('with the plan on Today says what is next and how far, and Listen in Audible opens the send-off sheet', async ({ page }) => {
  await openWith(page, START_LEV_4);
  // the Reader has one Today chip in its slim row, and no Plan chip
  const today = todayChip(page);
  await expect(today).toBeVisible();
  await expect(page.getByTestId('plan-chip')).toHaveCount(0);
  const box = await today.boundingBox();
  const row = await page.getByTestId('reader-chips').boundingBox();
  expect(row?.height).toBeLessThanOrEqual(40);
  expect(box && row && box.y >= row.y - 0.5 && box.y + box.height <= row.y + row.height + 0.5).toBe(true);
  await shot(page, 'reading-plan-chip-390x844');

  await openToday(page);
  await expect(plan(page)).toContainText('Next: Leviticus 4');
  await expect(plan(page)).toContainText('93 of 1,189 chapters done');
  await plan(page).getByRole('link', { name: /^Listen in Audible/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Off to Audible: Leviticus 4' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Go', exact: true })).toBeVisible();
});

test('with the plan off Today invites her to start one, and so does Settings', async ({ page }) => {
  await openWith(page, []);
  await openToday(page);
  await expect(plan(page)).toContainText('No reading plan is started.');
  await startPlan(page).click();
  const sheet = page.getByRole('dialog', { name: 'Start a listening plan' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'The whole Bible' })).toBeVisible();
  await shot(page, 'reading-plan-start-390x844');
  await sheet.getByRole('button', { name: 'Not now' }).click();
  await expect(sheet).toHaveCount(0);

  await backToReader(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const entry = page.getByRole('button', { name: 'Start a listening plan' });
  await entry.scrollIntoViewIfNeeded();
  await entry.click();
  await expect(page.getByRole('dialog', { name: 'Start a listening plan' })).toBeVisible();
});

test('starting at Leviticus 1 counts Genesis and Exodus as done', async ({ page }) => {
  await openWith(page, []);
  await openToday(page);
  await startPlan(page).click();
  await page.getByRole('dialog', { name: 'Start a listening plan' }).getByRole('button', { name: 'The whole Bible' }).click();
  const picker = page.getByRole('dialog', { name: 'Where are you starting?' });
  await expect(picker).toBeVisible();
  await picker.getByRole('button', { name: /^Leviticus/ }).click();
  await picker.getByRole('button', { name: 'Chapter 1', exact: true }).click();
  await expect(picker).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Start a listening plan' })).toHaveCount(0);
  await expect(plan(page)).toContainText('Next: Leviticus 1');
  await expect(plan(page)).toContainText('90 of 1,189 chapters done');
});

test('the chapter picker marks only the next chapter, never a chapter done, in both testaments', async ({ page }) => {
  await openWith(page, [
    { key: 'audioBible', value: 'word-of-promise' },
    { key: 'readingPlan', value: 'on' },
    planState({ code: 'lev', chapter: 4 }, doneBeforeLeviticus(['lev.1', 'lev.2', 'lev.3'])),
  ]);
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
  await picker.getByRole('button', { name: /^Leviticus/ }).click();
  const grid = picker.getByRole('group', { name: 'Leviticus chapters' });
  // a chapter done looks like any other (mw-5r3p30.679): no check, no dimming
  await expect(grid.locator('[data-done]')).toHaveCount(0);
  await expect(grid).not.toContainText('✓');
  await expect(grid.locator('[data-chapter="1"]')).toHaveText('1');
  await expect(grid.locator('[data-chapter="1"]')).toHaveCSS('opacity', '1');
  await expect(grid.locator('[data-chapter="3"]')).toHaveCSS('opacity', '1');
  expect(await grid.locator('[data-chapter="1"]').evaluate((e) => getComputedStyle(e).color)).toBe(await grid.locator('[data-chapter="5"]').evaluate((e) => getComputedStyle(e).color));
  await expect(grid.locator('[data-chapter="4"]')).toHaveAttribute('data-next', '');
  await expect(grid.locator('[data-chapter="5"]')).not.toHaveAttribute('data-next', '');
  expect(await grid.locator('[data-chapter="1"]').boundingBox().then((b) => b?.height ?? 0)).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'reading-plan-picker-ot-390x844');

  // the New Testament grid: a plan started at Luke 15 has Matthew and Mark and Luke 1-14 done
  await putSettings(page, [planState({ code: 'luk', chapter: 15 }, [...doneBeforeLeviticus(), ...allBefore()])]);
  await page.reload();
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  await picker.getByRole('button', { name: /^Luke$/ }).click();
  const luke = picker.getByRole('group', { name: 'Luke chapters' });
  await expect(luke.locator('[data-chapter="14"]')).not.toHaveAttribute('data-done', '');
  await expect(luke).not.toContainText('✓');
  await expect(luke.locator('[data-chapter="14"]')).toHaveCSS('opacity', '1');
  await expect(luke.locator('[data-chapter="15"]')).toHaveAttribute('data-next', '');
  await expect(luke.locator('[data-chapter="16"]')).not.toHaveAttribute('data-next', '');
  await shot(page, 'reading-plan-picker-nt-390x844');
});

test('the Developer row resets the plan, and Start a listening plan runs again', async ({ page }) => {
  await openWith(page, [...START_LEV_4, { key: 'developerMode', value: 'on' }]);
  await openToday(page);
  await expect(plan(page)).toContainText('Next: Leviticus 4');
  await backToReader(page);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Developer');
  const reset = page.getByRole('button', { name: 'Reset the listening plan, for the demo' });
  await reset.scrollIntoViewIfNeeded();
  expect((await reset.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'reading-plan-developer-reset-390x844');
  await reset.click();

  // the group's page, then the Settings home, then the Reader
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await openToday(page);
  await expect(plan(page)).toContainText('No reading plan is started.');
  await startPlan(page).click();
  await page.getByRole('dialog', { name: 'Start a listening plan' }).getByRole('button', { name: 'The whole Bible' }).click();
  const picker = page.getByRole('dialog', { name: 'Where are you starting?' });
  await picker.getByRole('button', { name: /^Leviticus/ }).click();
  await picker.getByRole('button', { name: 'Chapter 1', exact: true }).click();
  await expect(plan(page)).toContainText('Next: Leviticus 1');
  await expect(plan(page)).toContainText('90 of 1,189 chapters done');
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

test('a reader with no Greek activity sees the Today chip alone', async ({ page }) => {
  // a new install: no words, nothing due, no goal (mw-5r3p30.385)
  await openWith(page, START_LEV_4, { empty: true });
  await expect(todayChip(page)).toBeVisible();
  await expect(page.getByRole('button', { name: /^Due:/ })).toHaveCount(0);
  await expect(page.getByTestId('plan-chip')).toHaveCount(0);
  await expect(page.getByTestId('goal-strip')).toHaveCount(0);
  // the only other chips a new install can have are the 'New 3' of the chapter's unmet words (src/NewWordsStrip.tsx) and the 'Variants, 15 shown' of the places the manuscripts differ (src/reader/VariantChip.tsx, mw-9ji6ek0.5); Today adds none
  const names = await page.getByTestId('reader-chips').getByRole('button').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
  expect(names.filter((name) => !name?.match(/^New \d+ words$/) && !name?.match(/^Variants, \d+ shown$/) && !name?.startsWith('Today'))).toEqual([]);
});

test('a reader with Greek activity sees the Greek chips and the Today chip, and no Due or Plan chip', async ({ page }) => {
  // his word list (nine words due, new words) and a goal
  await openWith(page, [...START_LEV_4, { key: 'goal', value: '1 John 1:1' }]);
  await expect(todayChip(page)).toBeVisible();
  await expect(page.getByTestId('goal-strip')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Due:/ })).toHaveCount(0);
  await expect(page.getByTestId('plan-chip')).toHaveCount(0);
});

for (const size of [
  { width: 360, height: 780 },
  { width: 390, height: 844 },
]) {
  test(`every chip has an accessible name and none is cut off at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openWith(page, [...START_LEV_4, { key: 'goal', value: '1 John 1:1' }]);
    await expect(todayChip(page)).toBeVisible();
    await expect(page.getByTestId('goal-strip')).toBeVisible();
    const row = page.getByTestId('reader-chips');
    const chips = row.getByRole('button');
    expect(await chips.count()).toBeGreaterThanOrEqual(2);
    for (const handle of await chips.elementHandles()) expect(((await handle.getAttribute('aria-label')) ?? '').length).toBeGreaterThan(0);
    // no chip is cut: the row scrolls sideways when the chips outgrow the phone (mw-5r3p30.617), and the page never does
    for (const clipped of await chips.evaluateAll((els) => els.filter((el) => el.scrollWidth > el.clientWidth).map((el) => el.getAttribute('aria-label')))) expect(clipped).toBeNull();
    const page_ = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(page_.scrollWidth).toBeLessThanOrEqual(page_.clientWidth);
    await shot(page, `reading-plan-chips-${size.width}x${size.height}`);
  });
}

// He can set where he is (mw-5r3p30.623): a tap on the plan's place on Today offers "I'm at <the Reader's chapter>" and "Pick a place".
const PETER_2 = [
  { key: 'audioBible', value: 'word-of-promise' },
  { key: 'readingPlan', value: 'on' },
  planState(
    { code: '1pe', chapter: 2 },
    planOf('whole-bible')!
      .chapters()
      .slice(0, planOf('whole-bible')!.chapters().findIndex((c) => c.code === '1pe' && c.chapter === 2))
      .map((c) => `${c.code}.${c.chapter}`),
  ),
];
const place = (page: Page) => plan(page).getByTestId('plan-place');
const whereSheet = (page: Page) => page.getByRole('dialog', { name: 'Where are you in the plan?' });

test("with 1 John 2 open and the plan at 1 Peter 2, I'm at 1 John 2 moves the plan to 1 John 3, and Undo puts it back", async ({ page }) => {
  await openWith(page, PETER_2);
  await page.goto('/#/?b=1jn&c=2');
  await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();
  await openToday(page);
  await expect(plan(page)).toContainText('Next: 1 Peter 2');
  await place(page).click();
  await expect(whereSheet(page)).toBeVisible();
  await shot(page, 'reading-plan-place-390x844');
  await whereSheet(page).getByRole('button', { name: "I'm at 1 John 2" }).click();
  await expect(whereSheet(page)).toHaveCount(0);
  // 1 John 2 is the chapter he is reading now, so it counts as done and the next is the one after it
  await expect(plan(page)).toContainText('Next: 1 John 3');
  const moved = plan(page).locator('xpath=..').getByTestId('plan-moved');
  await expect(moved).toBeVisible();
  await shot(page, 'reading-plan-place-moved-390x844');
  await moved.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(plan(page)).toContainText('Next: 1 Peter 2');
  await expect(moved).toHaveCount(0);
});

test('Pick a place, Psalms 23, Set here: the plan and the picker marks show Psalms 23 and what was done stays done', async ({ page }) => {
  await openWith(page, PETER_2);
  await openToday(page);
  await place(page).click();
  await whereSheet(page).getByRole('button', { name: 'Pick a place' }).click();
  const picker = page.getByRole('dialog', { name: 'Pick a place' });
  await picker.getByRole('button', { name: /^Psalms/ }).click();
  await shot(page, 'reading-plan-place-picker-390x844');
  await picker.getByRole('button', { name: 'Chapter 23', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Set your place' });
  await expect(confirm.getByRole('heading', { name: 'Psalms 23' })).toBeVisible();
  await shot(page, 'reading-plan-place-confirm-390x844');
  await confirm.getByRole('button', { name: 'Set here' }).click();
  await expect(plan(page)).toContainText('Next: Psalms 23');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // the Reader's chapter picker reads the same store
  await backToReader(page);
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  const chooser = page.getByRole('dialog', { name: 'Choose a chapter' });
  await chooser.getByRole('button', { name: /^Psalms/ }).click();
  const grid = chooser.getByRole('group', { name: 'Psalms chapters' });
  await expect(grid.locator('[data-chapter="23"]')).toHaveAttribute('data-next', '');
  await expect(grid.locator('[data-chapter="22"]')).not.toHaveAttribute('data-done', '');
  await expect(grid.locator('[data-chapter="24"]')).not.toHaveAttribute('data-done', '');
  await expect(grid).not.toContainText('✓');
});

test("the place picker takes a typed 'Ps 23'", async ({ page }) => {
  await openWith(page, PETER_2);
  await openToday(page);
  await place(page).click();
  await whereSheet(page).getByRole('button', { name: 'Pick a place' }).click();
  const picker = page.getByRole('dialog', { name: 'Pick a place' });
  await picker.getByRole('searchbox', { name: 'Search books' }).fill('Ps 23');
  await picker.getByRole('button', { name: 'Go to Psalms 23' }).click();
  const confirm = page.getByRole('dialog', { name: 'Set your place' });
  await expect(confirm.getByRole('heading', { name: 'Psalms 23' })).toBeVisible();
  await confirm.getByRole('button', { name: 'Set here' }).click();
  await expect(plan(page)).toContainText('Next: Psalms 23');
});
