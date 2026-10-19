import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Today (#/today, mw-1fwagb.5): the day's pieces in one list, each a tap into the drill or Logos, with a box he ticks himself, and every piece shown only while the settings it rests on are On.
test.use({ viewport: { width: 390, height: 844 } });

// The page clock starts at the real now and is held there (a date written in a spec goes stale, tests/unit/e2e-clock-is-now.test.ts); what the day should hold is worked out here from its day of the month.
const FIXED = Date.now();
const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const two = (n: number) => String(n).padStart(2, '0');
const dateOf = (at: number) => {
  const d = new Date(at);
  return { day: d.getDate(), month: MONTHS[d.getMonth()], iso: `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}` };
};
const TODAY = dateOf(FIXED);
/** The month of Psalms and Proverbs: on day N, Psalms N, N+30, N+60, N+90 and N+120 (those up to 150), then Proverbs N. */
const readingsOn = (day: number): string[] => [
  ...[0, 30, 60, 90, 120].map((n) => day + n).filter((n) => n <= 150).map((n) => `Psalm ${n}`),
  ...(day <= 31 ? [`Proverbs ${day}`] : []),
];
const startsWith = (name: string) => new RegExp(`^${name}(?!\\d)`);

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

/** What the app kept under a settings key, parsed. */
async function kept(page: Page, key: string): Promise<unknown> {
  return page.evaluate(
    (k) =>
      new Promise<unknown>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const get = idb.transaction('settings', 'readonly').objectStore('settings').get(k);
          get.onsuccess = () => {
            idb.close();
            resolve(get.result ? JSON.parse(get.result.value) : undefined);
          };
          get.onerror = () => reject(get.error);
        };
      }),
    key,
  );
}

/** A tap on a link to an app stays in the page and is recorded (headless Chromium stops at an app scheme); window.open is recorded and answers like a tab that opened. */
async function recordAppLinks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { __opened: string[]; __tabs: string[] };
    w.__opened = [];
    w.__tabs = [];
    window.addEventListener(
      'click',
      (e) => {
        const link = (e.target as Element).closest('a');
        if (link && !/^https?:/.test(link.href)) {
          e.preventDefault();
          w.__opened.push(link.href);
        }
      },
      true,
    );
    window.open = ((url?: string | URL) => {
      w.__tabs.push(String(url));
      return {} as Window;
    }) as typeof window.open;
  });
}

const opened = (page: Page) => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);

/** Opens Today at the phone's fixed date (the date is set once the app is up, so the licence check still sees the real clock). */
async function openToday(page: Page, rows: { key: string; value: string }[] = [], options: { fixed?: boolean } = { fixed: true }) {
  await recordAppLinks(page);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  if (rows.length > 0) await putSettings(page, rows);
  if (options.fixed) await page.clock.setFixedTime(FIXED);
  await page.goto('/#/today');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today', level: 1 })).toBeVisible();
}

const piece = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const boxes = (page: Page) => page.getByRole('checkbox');

test('Today lists the four pieces by default, and the Psalms and Proverbs are those of the date', async ({ page }) => {
  await openToday(page);
  for (const name of ['Review', 'Reading plan', 'Psalms and Proverbs', 'Devotional']) await expect(piece(page, name)).toBeVisible();

  const psalms = piece(page, 'Psalms and Proverbs');
  await expect(psalms.locator('[data-piece]')).toHaveText(readingsOn(TODAY.day).map((name) => `${name}Open in Logos`));
  await expect(piece(page, 'Reading plan').getByRole('button', { name: 'Start a plan' })).toBeVisible();
  await expect(piece(page, 'Devotional')).toContainText('Morning and Evening');
  await expect(piece(page, 'Review')).toContainText(/\d+ due|Nothing due/);
  // a box for each piece: Review, plan, the passages, devotional
  await expect(boxes(page)).toHaveCount(3 + readingsOn(TODAY.day).length);
  for (const box of await boxes(page).all()) {
    const size = await box.boundingBox();
    expect(size?.height).toBeGreaterThanOrEqual(43.5);
    expect(size?.width).toBeGreaterThanOrEqual(43.5);
  }
  await shot(page, 'today');
});

test('a tick is his alone: opening a link does not tick, and a tick survives a reload and stays on its date', async ({ page }) => {
  await openToday(page);
  const first = piece(page, 'Psalms and Proverbs').getByRole('checkbox', { name: `Done: Psalm ${TODAY.day}`, exact: true });
  await expect(first).toHaveAttribute('aria-checked', 'false');

  await piece(page, 'Psalms and Proverbs').getByRole('link', { name: startsWith(`Psalm ${TODAY.day}`) }).click();
  await expect(first).toHaveAttribute('aria-checked', 'false');
  expect(await kept(page, 'dailyDone')).toEqual({ [TODAY.iso]: { ticked: [], opened: [`psa.${TODAY.day}`] } });

  await first.click();
  await expect(first).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(first).toHaveAttribute('aria-checked', 'true');
  expect(await kept(page, 'dailyDone')).toEqual({ [TODAY.iso]: { ticked: [`psa.${TODAY.day}`], opened: [`psa.${TODAY.day}`] } });

  // the next local day starts with nothing ticked
  await page.clock.setFixedTime(FIXED + DAY_MS);
  await page.reload();
  const tomorrow = readingsOn(dateOf(FIXED + DAY_MS).day)[0];
  await expect(piece(page, 'Psalms and Proverbs').getByRole('checkbox', { name: `Done: ${tomorrow}`, exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(piece(page, 'Psalms and Proverbs').getByRole('checkbox', { checked: true })).toHaveCount(0);
});

test('a tap on a passage hands Logos a logosres: link', async ({ page }) => {
  await openToday(page);
  await piece(page, 'Psalms and Proverbs').getByRole('link', { name: startsWith(`Proverbs ${TODAY.day}`) }).click();
  await piece(page, 'Devotional').getByRole('link', { name: /Morning and Evening/ }).click();
  expect(await opened(page)).toEqual([`logosres:lgcystndrdbblsb;ref=Bible.Pr${TODAY.day}`, `logosres:LLS:20.10.1;ref=DayOfYear.${TODAY.month}_${TODAY.day}`]);
  expect(await kept(page, 'dailyDone')).toEqual({ [TODAY.iso]: { ticked: [], opened: [`pro.${TODAY.day}`, 'devotional'] } });
});

test('Review opens Review', async ({ page }) => {
  await openToday(page);
  await piece(page, 'Review').getByRole('button', { name: /due|Nothing due/ }).click();
  await expect(page.getByRole('heading', { name: 'Review', level: 1 })).toBeVisible();
});

test('switching Psalms and Proverbs off in Settings takes it off Today', async ({ page }) => {
  await openToday(page);
  await page.goto('/#/settings?setting=dailyPsalms');
  const row = page.locator('[data-setting="dailyPsalms"]');
  await row.getByRole('button', { name: 'Off', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/today');
  await expect(piece(page, 'Review')).toBeVisible();
  await expect(piece(page, 'Psalms and Proverbs')).toHaveCount(0);
});

test('with Tick boxes off Today has no boxes, only a plain list of links', async ({ page }) => {
  await openToday(page, [{ key: 'dailyTicks', value: 'off' }]);
  await expect(piece(page, 'Psalms and Proverbs')).toBeVisible();
  await expect(boxes(page)).toHaveCount(0);
  await expect(piece(page, 'Psalms and Proverbs').getByRole('link')).toHaveCount(readingsOn(TODAY.day).length);
});

test('each piece rests on its own switch: Devotional off and Review off take them away', async ({ page }) => {
  await openToday(page, [{ key: 'dailyDevotional', value: 'off' }]);
  await expect(piece(page, 'Devotional')).toHaveCount(0);
  await expect(piece(page, 'Review')).toBeVisible();

  await putSettings(page, [{ key: 'dailyReview', value: 'off' }]);
  await page.reload();
  await expect(piece(page, 'Reading plan')).toBeVisible();
  await expect(piece(page, 'Review')).toHaveCount(0);
  await expect(piece(page, 'Devotional')).toHaveCount(0);
});

const STATE = 'readingPlanState';
const planAt = (code: string, chapter: number) => ({ key: STATE, value: JSON.stringify({ planId: 'whole-bible', start: { code, chapter }, done: [] }) });

test('the plan row offers Read in Logos only with Logos on and Listen in Audible only with an Audio Bible', async ({ page }) => {
  await openToday(page, [{ key: 'readingPlan', value: 'on' }, planAt('gen', 1)]);
  const plan = piece(page, 'Reading plan');
  await expect(plan).toContainText('Next: Genesis 1');
  // neither is on: nothing to open, and the way to turn them on
  await expect(plan.getByRole('link')).toHaveCount(0);
  await expect(plan.getByRole('button', { name: 'Turn on Logos to read it' })).toBeVisible();

  await putSettings(page, [{ key: 'resource.logos', value: 'on' }]);
  await page.reload();
  await expect(plan.getByRole('link', { name: 'Read in Logos' })).toBeVisible();
  await expect(plan.getByRole('link', { name: /Listen in Audible/ })).toHaveCount(0);
  await plan.getByRole('link', { name: 'Read in Logos' }).click();
  expect(await opened(page)).toEqual(['logosres:lgcystndrdbblsb;ref=Bible.Ge1']);

  await putSettings(page, [{ key: 'audioBible', value: 'word-of-promise' }]);
  await page.reload();
  await expect(plan.getByRole('link', { name: /Listen in Audible/ })).toBeVisible();
  await shot(page, 'today-plan');
});

test('with everything off Today explains what it could hold, with a link to each row, and says it once', async ({ page }) => {
  const off = ['dailyReview', 'dailyPlan', 'dailyPsalms', 'dailyDevotional'].map((key) => ({ key, value: 'off' }));
  await openToday(page, off);
  const explained = page.getByTestId('today-explained');
  await expect(explained).toBeVisible();
  for (const name of ['Review', 'Reading plan', 'Psalms and Proverbs', 'Devotional']) await expect(explained.getByRole('button', { name: `Turn on ${name} in Settings` })).toBeVisible();
  await expect(boxes(page)).toHaveCount(0);
  await shot(page, 'today-explained');

  // the link goes to the row that turns it on; he changes it, and the explanation is not shown again
  await explained.getByRole('button', { name: 'Turn on Review in Settings' }).click();
  const row = page.locator('[data-setting="dailyReview"]');
  await expect(row).toHaveAttribute('data-highlighted', '');
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await row.getByRole('button', { name: 'Off', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/#/today');
  await expect(page.getByTestId('today-empty')).toBeVisible();
  await expect(page.getByTestId('today-explained')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Choose in Settings' })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('today-empty')).toBeVisible();
  await expect(page.getByTestId('today-explained')).toHaveCount(0);
});
