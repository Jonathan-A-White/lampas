import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { planOf } from '../../src/data/plans';
import { EXCLUDED_RULES } from '../support/axe-excluded';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
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

/** What the app kept under a settings key, as saved (a plain text setting is not JSON). */
async function keptRaw(page: Page, key: string): Promise<string | undefined> {
  return page.evaluate(
    (k) =>
      new Promise<string | undefined>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const get = idb.transaction('settings', 'readonly').objectStore('settings').get(k);
          get.onsuccess = () => {
            idb.close();
            resolve(get.result?.value);
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
  await expect(page.getByRole('heading', { name: 'Today', exact: true, level: 1 })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Review', exact: true, level: 1 })).toBeVisible();
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

test('the tutor from Today knows the psalm he opened, and a screenshot is one tap away', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openToday(page);
  await piece(page, 'Psalms and Proverbs').getByRole('link', { name: startsWith(`Psalm ${TODAY.day}`) }).click();
  expect(await opened(page)).toHaveLength(1);

  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Today' });
  await expect(sheet).toBeVisible();
  // the picture buttons are there from the first turn, and the suggestions offer to talk about the reading and to send a screenshot
  await expect(sheet.getByRole('button', { name: 'Attach a picture' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Take a photo' })).toBeVisible();
  await expect(sheet.locator('[data-suggestion]').filter({ hasText: 'Talk about what I read' })).toBeVisible();

  // "Send a screenshot" opens the phone's picker at once and sends nothing
  const chooser = page.waitForEvent('filechooser');
  await sheet.locator('[data-suggestion]').filter({ hasText: 'Send a screenshot' }).click();
  await chooser;
  expect(fake.received).toHaveLength(0);
  await shot(page, 'today-ask-tutor');

  await sheet.locator('[data-suggestion]').filter({ hasText: 'Talk about what I read' }).click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);
  expect(fake.received).toHaveLength(1);
  const screen = fake.received[0].input.screen as { name: string; facts: { label: string; value: string }[] };
  expect(screen.name).toBe('Today');
  expect(screen.facts).toContainEqual({ label: 'Opened today', value: `Psalm ${TODAY.day}` });
});

// What he read today (mw-5r3p30.630): the plan keeps the day each chapter was marked, Today shows them above Next with a ticked box each, and a tick on Next marks it read.
const STARTS = (JSON.parse(readFileSync('src/resources/audibleStarts.json', 'utf8')) as { chapters: Record<string, number> }).chapters;
const PLAN_CHAPTERS = planOf('whole-bible')!.chapters();
const keyOf = (c: { code: string; chapter: number }) => `${c.code}.${c.chapter}`;
const INDEX_1PE_1 = PLAN_CHAPTERS.findIndex((c) => keyOf(c) === '1pe.1');
const BEFORE_1PE_1 = PLAN_CHAPTERS.slice(0, INDEX_1PE_1).map(keyOf);
/** the time to listen from the start of 1 Peter 1 to the start of 1 John 1, and five seconds more */
const TO_1_JOHN = STARTS['1jn.1'] - STARTS['1pe.1'] + 5_000;
const count = (done: number) => `${done.toLocaleString('en-US')} of ${PLAN_CHAPTERS.length.toLocaleString('en-US')} chapters done`;
/** the plan at 1 Peter 1 with a listening session open there that began long enough ago to have reached 1 John 1 (the page clock is held at FIXED, so the day does not move) */
const listeningAtPeter = [
  { key: 'readingPlan', value: 'on' },
  { key: 'audioBible', value: 'word-of-promise' },
  { key: STATE, value: JSON.stringify({ planId: 'whole-bible', start: { code: '1pe', chapter: 1 }, done: BEFORE_1PE_1, session: { code: '1pe', chapter: 1, startedAt: FIXED - TO_1_JOHN } }) },
];
const readToday = (page: Page) => piece(page, 'Reading plan').getByTestId('plan-read-today').locator('[data-run-name]');

test('Read today names what he marked read today, a tick on Next marks the next chapter, and an untick takes it back', async ({ page }) => {
  await openToday(page, listeningAtPeter);
  // back from Audible: he listened through 2 Peter 3 and is in 1 John 1
  const sheet = page.getByRole('dialog', { name: 'Where did you get to?' });
  await sheet.getByRole('button', { name: 'Stopped in: 1 John 1' }).click();
  await expect(sheet).toHaveCount(0);

  const plan = piece(page, 'Reading plan');
  await expect(readToday(page)).toHaveText(['1 Peter 1-5', '2 Peter 1-3']);
  for (const box of await plan.getByTestId('plan-read-today').getByRole('checkbox').all()) await expect(box).toHaveAttribute('aria-checked', 'true');
  await expect(plan.getByTestId('plan-read-today').getByRole('checkbox', { name: 'Read today: 1 Peter 1-5', exact: true })).toBeVisible();
  await expect(plan.getByTestId('plan-place')).toContainText('Next: 1 John 1');
  await expect(plan.getByTestId('plan-place')).toContainText(count(INDEX_1PE_1 + 8));
  await shot(page, 'today-plan-read');

  // a tick on Next: 1 John 1 is read today and Next moves on, the count one more
  const nextBox = plan.getByRole('checkbox', { name: 'Mark 1 John 1 read', exact: true });
  await expect(nextBox).toHaveAttribute('aria-checked', 'false');
  const size = await nextBox.boundingBox();
  expect(size?.height).toBeGreaterThanOrEqual(43.5);
  expect(size?.width).toBeGreaterThanOrEqual(43.5);
  await nextBox.click();
  await expect(readToday(page)).toHaveText(['1 Peter 1-5', '2 Peter 1-3', '1 John 1']);
  await expect(plan.getByTestId('plan-place')).toContainText('Next: 1 John 2');
  await expect(plan.getByTestId('plan-place')).toContainText(count(INDEX_1PE_1 + 9));
  const kept1 = (await kept(page, STATE)) as { done: string[]; doneOn: Record<string, string> };
  expect(kept1.done).toContain('1jn.1');
  expect(kept1.doneOn['1jn.1']).toBe(TODAY.iso);
  expect(Object.keys(kept1.doneOn)).toHaveLength(9);
  await shot(page, 'today-plan-ticked');

  // an untick in Read today: 1 John 1 leaves it and is Next again
  await plan.getByRole('checkbox', { name: 'Read today: 1 John 1', exact: true }).click();
  await expect(readToday(page)).toHaveText(['1 Peter 1-5', '2 Peter 1-3']);
  await expect(plan.getByTestId('plan-place')).toContainText('Next: 1 John 1');
  await expect(plan.getByTestId('plan-place')).toContainText(count(INDEX_1PE_1 + 8));
  // the new boxes each have their name: axe finds no WCAG 2.1 A or AA violation on the plan piece with both kinds of box drawn
  await nextBox.click();
  await expect(readToday(page)).toHaveText(['1 Peter 1-5', '2 Peter 1-3', '1 John 1']);
  const found = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).disableRules([...EXCLUDED_RULES]).include('[aria-label="Reading plan"]').analyze();
  expect(found.violations.map((v) => v.id)).toEqual([]);
  await plan.getByRole('checkbox', { name: 'Read today: 1 John 1', exact: true }).click();

  // Undo puts the tick back
  await page.getByTestId('plan-moved').getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(plan.getByTestId('plan-place')).toContainText('Next: 1 John 2');
  await expect(readToday(page)).toHaveText(['1 Peter 1-5', '2 Peter 1-3', '1 John 1']);

  // the next day starts with nothing read and Next where it was
  await page.clock.setFixedTime(FIXED + DAY_MS);
  await page.reload();
  await expect(plan.getByTestId('plan-place')).toContainText('Next: 1 John 2');
  await expect(plan.getByTestId('plan-read-today')).toHaveCount(0);
  await expect(plan.getByTestId('plan-place')).toContainText(count(INDEX_1PE_1 + 9));
});

test('several ticks on Next make a range, and an untick of the range takes all its chapters back', async ({ page }) => {
  await openToday(page, [{ key: 'readingPlan', value: 'on' }, { key: STATE, value: JSON.stringify({ planId: 'whole-bible', start: { code: '1jn', chapter: 1 }, done: PLAN_CHAPTERS.slice(0, INDEX_1PE_1 + 8).map(keyOf) }) }]);
  const plan = piece(page, 'Reading plan');
  await expect(plan.getByTestId('plan-read-today')).toHaveCount(0);
  // chapters done before today are not read today
  await plan.getByRole('checkbox', { name: 'Mark 1 John 1 read', exact: true }).click();
  await plan.getByRole('checkbox', { name: 'Mark 1 John 2 read', exact: true }).click();
  await expect(readToday(page)).toHaveText(['1 John 1-2']);
  await expect(plan.getByTestId('plan-place')).toContainText('Next: 1 John 3');
  await plan.getByRole('checkbox', { name: 'Read today: 1 John 1-2', exact: true }).click();
  await expect(plan.getByTestId('plan-read-today')).toHaveCount(0);
  await expect(plan.getByTestId('plan-place')).toContainText('Next: 1 John 1');
});

test('the tutor from Today is told the chapters read today', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openToday(page, [{ key: 'readingPlan', value: 'on' }, { key: STATE, value: JSON.stringify({ planId: 'whole-bible', start: { code: '1jn', chapter: 1 }, done: PLAN_CHAPTERS.slice(0, INDEX_1PE_1 + 8).map(keyOf) }) }]);
  await piece(page, 'Reading plan').getByRole('checkbox', { name: 'Mark 1 John 1 read', exact: true }).click();
  await expect(readToday(page)).toHaveText(['1 John 1']);
  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Today' });
  await sheet.locator('[data-suggestion]').filter({ hasText: 'Talk about what I read' }).click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);
  const screen = fake.received[0].input.screen as { facts: { label: string; value: string }[] };
  expect(screen.facts).toContainEqual({ label: 'Read today', value: '1 John 1' });
  expect(screen.facts).toContainEqual({ label: 'Reading plan', value: 'Next: 1 John 2' });
});

const TWO = [
  { id: 'LLS:20.10.1', title: 'Morning and Evening' },
  { id: 'LLS:20.10.2', title: 'My Utmost for His Highest' },
];

test('with Which devotional on Random, Another picks a different devotional for the day, keeps Random, and holds across a reload', async ({ page }) => {
  await openToday(page, [
    { key: 'devotional', value: 'random' },
    { key: 'devotionalDraw', value: TWO.map((d) => d.id).join(',') },
  ]);
  const card = piece(page, 'Devotional');
  const link = card.getByRole('link');
  await expect(link).toBeVisible();
  const titleOf = async () => (await link.innerText()).split('\n')[0];
  const before = await titleOf();
  const another = card.getByRole('button', { name: 'Another' });
  await expect(another).toBeVisible();
  const size = await another.boundingBox();
  expect(size?.height).toBeGreaterThanOrEqual(43.5);
  await another.click();
  await expect.poll(titleOf).not.toBe(before);
  const after = await titleOf();
  expect(TWO.map((d) => d.title)).toContain(after);
  expect(await keptRaw(page, 'devotional')).toBe('random');
  await shot(page, 'today-another');
  // it holds across a reload and a return to Today
  await page.reload();
  await expect(card.getByRole('link')).toContainText(after);
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await page.goto('/#/today');
  await expect(card.getByRole('link')).toContainText(after);
  await expect(card.getByRole('button', { name: 'Another' })).toBeVisible();
  expect(await keptRaw(page, 'devotional')).toBe('random');
  // it is the day's alone: tapping again goes back to the other one
  await card.getByRole('button', { name: 'Another' }).click();
  await expect.poll(titleOf).toBe(before);
});

test('with a fixed devotional chosen, Today shows no Another', async ({ page }) => {
  await openToday(page, [{ key: 'devotional', value: 'LLS:20.10.2' }]);
  const card = piece(page, 'Devotional');
  await expect(card).toContainText('My Utmost for His Highest');
  await expect(card.getByRole('button', { name: 'Another' })).toHaveCount(0);
});

test('the tutor\'s "pick a different devotional" with Which devotional on Random re-draws today\'s and keeps Random', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: { answer: "Done: I drew another devotional for today.", words: [], settings_changes: [{ key: 'todaysDevotional', value: 'another' }] },
  };
  await routePostern(page, fake);
  await openToday(page, [
    { key: 'devotional', value: 'random' },
    { key: 'devotionalDraw', value: TWO.map((d) => d.id).join(',') },
  ]);
  const card = piece(page, 'Devotional');
  const link = card.getByRole('link');
  await expect(link).toBeVisible();
  const titleOf = async () => (await link.innerText()).split('\n')[0];
  const before = await titleOf();

  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Today' });
  await expect(sheet).toBeVisible();
  await sheet.locator('[data-suggestion]').filter({ hasText: 'Talk about what I read' }).click();
  await expect(sheet.getByText("Done: I drew another devotional for today.")).toBeVisible();
  expect(fake.received[0].input.settings).toMatchObject({ devotional: 'random' });

  // today's devotional changed on the card, and Which devotional is still Random
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect.poll(titleOf).not.toBe(before);
  expect(TWO.map((d) => d.title)).toContain(await titleOf());
  expect(await keptRaw(page, 'devotional')).toBe('random');
  await shot(page, 'today-tutor-another');
});

test("Settings > Daily shows Today's devotional with Another only while Which devotional is Random, and Another keeps Random", async ({ page }) => {
  await openToday(page, [
    { key: 'devotional', value: 'random' },
    { key: 'devotionalDraw', value: TWO.map((d) => d.id).join(',') },
  ]);
  const title = async () => (await page.getByRole('region', { name: 'Devotional', exact: true }).getByRole('link').innerText()).split('\n')[0];
  const before = await title();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const row = page.getByRole('group', { name: "Today's devotional" });
  await expect(row).toBeVisible();
  await expect(row).toContainText(before);
  const another = row.getByRole('button', { name: 'Another devotional for today' });
  expect((await another.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await another.click();
  await expect(row).not.toContainText(before);
  expect(await keptRaw(page, 'devotional')).toBe('random');
  await shot(page, 'settings-todays-devotional');
  // with a named devotional the row is not drawn
  await page.getByRole('combobox', { name: 'Which devotional' }).selectOption('LLS:20.10.2');
  await expect(page.getByRole('group', { name: "Today's devotional" })).toHaveCount(0);
});
