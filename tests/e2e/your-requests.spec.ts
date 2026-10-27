// tests/e2e/your-requests.spec.ts — Your requests (mw-vy3ghg.5) at phone width, upright (390x844) and sideways (844x390): six requests, one in each
// state (Sent, Filed, Being built, Adopted in a version with its link, Declined with the reason, Now a setting), the statuses the fake Postern's mill
// sealed to the phone's key. Every line is readable inside the phone, the link is a thumb tall, nothing scrolls sideways; ends with a shot of each.
// Settings > Your requests opens the screen. jsdom has no layout, so every size and place is proven here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked, SEED_PUBLIC_KEY } from './unlocked';
import { SETTLE_MS } from '../../src/ui/settle';
import { pageTime, tapTwice } from '../support/gesture';

const VIEWPORTS = [
  { name: 'portrait', width: 390, height: 844 },
  { name: 'landscape', width: 844, height: 390 },
];
const COMMIT_URL = 'https://github.com/Jonathan-A-White/lampas/commit/0123456789abcdef0123456789abcdef01234567';

// `<date>` stands for the date the status was set (the locale writes it: it ends in a year)
const REQUESTS = [
  { summary: 'Let me hear the Greek at half speed in one tap', line: 'Sent to the factory · <date>' },
  { summary: 'A sepia reading theme for the evening', line: 'Filed as a story · <date>, waiting its turn' },
  { summary: 'Read the chapter to me while I walk', line: 'Being built · since <date>' },
  { summary: 'Show the verse number big beside the verse', line: 'Adopted in 0.1.86 · <date>' },
  { summary: 'Add the Old Testament in Hebrew with a tutor', line: 'Declined · <date>: outside what this app is for' },
  { summary: 'Make the Greek text larger than Largest', line: 'Now a setting: Settings > Appearance > Text size · <date>' },
];
const lineMatching = (line: string): RegExp => new RegExp(`^${line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('<date>', '.+?\\d{4}')}$`);


const txidOf = (index: number): string => `direct:${String(index + 1).repeat(64)}`;

// Puts the requests in the app's own store through raw IndexedDB, as the app wrote them.
async function seed(page: Page, summaries: string[] = REQUESTS.map((r) => r.summary)): Promise<void> {
  const rows = summaries.map((summary, i) => ({ txid: txidOf(i), kind: 'tutor-ask', summary, app_version: '0.1.80', sentAt: Date.now() - (summaries.length - i) * 86_400_000, status: 'sent' }));
  await page.evaluate(
    (list) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('requests', 'readwrite');
          for (const row of list) tx.objectStore('requests').put(row);
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

// Puts rows of any kind in the store, newest last (a day apart); a tutor-ask keeps its words as the summary, the rest as the text.
async function seedKinds(page: Page, rows: { kind: string; words: string; said?: string }[]): Promise<void> {
  const list = rows.map(({ kind, words, said }, i) => ({
    txid: txidOf(i),
    kind,
    ...(kind === 'tutor-ask' ? { summary: words, ...(said ? { words: said } : {}) } : { text: words }),
    app_version: '0.1.80',
    sentAt: Date.now() - (rows.length - i) * 86_400_000,
    status: 'sent',
  }));
  await page.evaluate(
    (put) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('requests', 'readwrite');
          for (const row of put) tx.objectStore('requests').put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    list,
  );
}

// Puts rows in the store as the app writes them: newest last, a day apart; `words` is his own words of a tutor-ask.
async function seedRows(page: Page, rows: { kind: string; summary?: string; words?: string; text?: string }[]): Promise<void> {
  const list = rows.map((row, i) => ({ txid: txidOf(i), ...row, app_version: '0.1.80', sentAt: Date.now() - (rows.length - i) * 86_400_000, status: 'sent' }));
  await page.evaluate(
    (put) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('requests', 'readwrite');
          for (const row of put) tx.objectStore('requests').put(row);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    list,
  );
}

const status = (index: number, plain: Record<string, unknown>) =>
  ({ kind: 'request-status', request: txidOf(index), bead: `mw-x.${index}`, ts: 1_790_000_000_000 + index * 1000, ...plain }) as Record<string, unknown>;

for (const { name, width, height } of VIEWPORTS) {
  test(`every status of a request reads in full at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const fake = makeFakePostern();
    await routePostern(page, fake);
    await openUnlocked(page);
    await page.goto('/#/requests');
    await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
    await seed(page);
    fake.sendStatus(SEED_PUBLIC_KEY, status(1, { status: 'filed' }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(2, { status: 'building' }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(3, { status: 'landed', version: '0.1.86', commit: '0123456789abcdef0123456789abcdef01234567', url: COMMIT_URL }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(4, { status: 'declined', reason: 'outside what this app is for' }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(5, { status: 'adopted-as-setting', setting: 'Settings > Appearance > Text size' }));
    await page.reload();

    for (const { summary, line } of REQUESTS) {
      const row = page.locator('[data-request]', { hasText: summary });
      await expect(row.locator('[data-request-status]')).toHaveText(lineMatching(line));
      await row.scrollIntoViewIfNeeded();
      const box = await row.boundingBox();
      expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    }
    const link = page.getByRole('link', { name: lineMatching('Adopted in 0.1.86 · <date>') });
    await expect(link).toHaveAttribute('href', COMMIT_URL);
    await link.scrollIntoViewIfNeeded();
    expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    await expect(page.locator('[data-request]').first()).toContainText('Make the Greek text larger'); // the newest first
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    await page.locator('.screen').first().evaluate((el) => (el.scrollTop = 0));
    await shot(page, `your-requests-${name}`);
  });
}

// Every request is a button (mw-5r3p30.794): folded it shows three lines of his words (the tutor's summary for an ask kept before the phone kept his words),
// a tap opens the whole of it in place (his words, the tutor's summary, the kind, the sent date, the status with the date it was set, the bead) and a
// second tap folds it; a 400-character string with no break in it never scrolls the screen sideways, folded or open; the Adopted link inside a row
// opens the commit and does not open the row.
for (const { name, width, height } of VIEWPORTS) {
  test(`a tap on any request opens it in full and a second tap folds it at ${width}x${height}`, async ({ page, context }) => {
    await page.setViewportSize({ width, height });
    const fake = makeFakePostern();
    await routePostern(page, fake);
    await openUnlocked(page);
    await page.goto('/#/requests');
    await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
    const long = 'Let me hear the Greek at half speed and then at full speed, '.repeat(7).slice(0, 400).trim();
    const unbroken = 'W'.repeat(400);
    const short = 'Add a sepia theme';
    const summary = 'He wants the Greek at half speed, then full speed.';
    await seedRows(page, [
      { kind: 'tutor-ask', summary, words: long }, // 0: asked after this version, filed
      { kind: 'tutor-ask', summary: long }, // 1: asked before it: the summary only
      { kind: 'tutor-ask', summary: short, words: short }, // 2: short, sent
      { kind: 'tutor-ask', summary: unbroken }, // 3
      { kind: 'book', text: 'Guzik on Romans' }, // 4
      { kind: 'tutor-ask', summary: 'Show the verse number big', words: 'Make the verse numbers bigger please' }, // 5: landed
    ]);
    fake.sendStatus(SEED_PUBLIC_KEY, status(0, { status: 'filed' }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(5, { status: 'landed', version: '0.1.86', commit: '0123456789abcdef0123456789abcdef01234567', url: COMMIT_URL }));
    await page.reload();

    const rows = page.locator('[data-request]');
    await expect(rows).toHaveCount(6);
    const toggles = page.locator('[data-request-toggle]');
    await expect(toggles).toHaveCount(6);
    for (let i = 0; i < 6; i++) await expect(toggles.nth(i)).toHaveAttribute('aria-expanded', 'false');
    for (const button of await page.getByRole('button', { name: /./ }).all()) expect(await button.evaluate((el) => el.querySelector('a') === null)).toBe(true); // no link inside a button
    const sideways = (): Promise<boolean> => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const dateOf = (ms: number): Promise<string> => page.evaluate((t) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }), ms);

    // his words, folded at three lines, open in full with the summary, the kind, the date sent, the status with its date and the bead
    const withWords = page.locator('[data-request]', { has: page.locator('[data-request-toggle]', { hasText: 'Let me hear the Greek at half speed' }) }).filter({ hasText: 'Filed' });
    await expect(withWords).toHaveCount(1);
    const wordsBox = withWords.locator('[data-request-words]');
    const toggle = withWords.locator('[data-request-toggle]');
    const folded = (await wordsBox.boundingBox())?.height ?? 0;
    expect(await wordsBox.evaluate((el) => el.scrollHeight > el.clientHeight + 1)).toBe(true); // the cut hides some
    await expect(withWords.locator('[data-request-detail]')).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect((await wordsBox.boundingBox())?.height ?? 0).toBeGreaterThan(folded + 20);
    expect(await wordsBox.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true); // all of it shows
    await expect(wordsBox).toHaveText(long);
    const detail = withWords.locator('[data-request-detail]');
    await expect(detail).toContainText(summary);
    await expect(withWords).toContainText('Asked the tutor');
    await expect(withWords).toContainText(await dateOf(Date.now() - 6 * 86_400_000)); // sent
    await expect(detail).toContainText(await dateOf(1_790_000_000_000)); // the status set
    await expect(withWords.locator('[data-request-status]')).toHaveText(lineMatching('Filed as a story · <date>, waiting its turn'));
    await expect(detail).toContainText('mw-x.0');
    expect(await sideways()).toBe(false);
    await shot(page, `your-requests-open-${name}`);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(detail).toHaveCount(0);
    expect((await wordsBox.boundingBox())?.height ?? 0).toBeCloseTo(folded, 0);

    // a request kept before the phone kept his words: the summary, in full when opened, with no summary line of its own
    const old = page.locator('[data-request]', { has: page.locator('[data-request-words]', { hasText: long }) }).filter({ hasNotText: summary }).first();
    await old.locator('[data-request-toggle]').click();
    await expect(old.locator('[data-request-words]')).toHaveText(long);
    expect(await old.locator('[data-request-words]').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await expect(old.locator('[data-request-detail]')).not.toContainText('The tutor');
    await old.locator('[data-request-toggle]').click();
    await expect(old.locator('[data-request-toggle]')).toHaveAttribute('aria-expanded', 'false');

    // a short one opens too, and a book shows its text
    const small = page.locator('[data-request]', { hasText: short });
    await small.locator('[data-request-toggle]').click();
    await expect(small.locator('[data-request-toggle]')).toHaveAttribute('aria-expanded', 'true');
    await small.locator('[data-request-toggle]').click();
    const book = page.locator('[data-request]', { hasText: 'Guzik on Romans' });
    await book.locator('[data-request-toggle]').click();
    await expect(book.locator('[data-request-words]')).toHaveText('Guzik on Romans');
    await expect(book).toContainText('Book');

    // 400 characters with no break never scroll the screen sideways
    const wide = page.locator('[data-request]', { hasText: unbroken }).locator('[data-request-toggle]');
    expect(await sideways()).toBe(false);
    await wide.click();
    await expect(wide).toHaveAttribute('aria-expanded', 'true');
    expect(await sideways()).toBe(false);
    expect((await wide.boundingBox())?.width ?? 0).toBeLessThanOrEqual(width);

    // the link of a landed request opens the commit in a tab and leaves the row folded
    const landed = page.locator('[data-request]', { hasText: 'Make the verse numbers bigger' });
    await context.route('https://github.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
    const link = landed.getByRole('link', { name: 'Adopted in 0.1.86' });
    await link.scrollIntoViewIfNeeded();
    const opened = context.waitForEvent('page');
    await link.click();
    await opened;
    await expect(landed.locator('[data-request-toggle]')).toHaveAttribute('aria-expanded', 'false');
    await landed.locator('[data-request-toggle]').click();
    await expect(landed.locator('[data-request-detail]')).toContainText('0.1.86');
  });
}

// Thirty requests (mw-rfjjzd.15): grouped by kind with counts, the newest first within a group, the library request one row, a search field over 20 rows that
// filters by words and counts what is shown; the field is a thumb tall and nothing scrolls sideways.
test('thirty requests are grouped by kind, counted and searchable at 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/requests');
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  const rows = [
    ...Array.from({ length: 14 }, (_, i) => ({ kind: 'book', words: i === 3 ? 'Guzik on Romans' : `Commentary number ${i + 1}` })),
    { kind: 'library', words: 'My Logos library: 198 of 4597 books' },
    ...Array.from({ length: 10 }, (_, i) => ({ kind: 'tutor-ask', words: `Idea number ${i + 1} for the Greek`, ...(i === 6 ? { said: 'Could the Greek have a sepia evening theme?' } : {}) })),
    ...Array.from({ length: 5 }, (_, i) => ({ kind: 'approach', words: `Approach number ${i + 1}` })),
  ];
  await seedKinds(page, rows);
  await page.reload();

  const headers = page.locator('[data-request-group] > h2');
  await expect(headers).toHaveText(['Approaches or programmes (5)', 'Asked the tutor (10)', 'Your Logos library (1)', 'Books (14)']);
  expect(await page.locator('[data-request]').count()).toBe(30);
  const books = page.locator('[data-request-group="book"] [data-request]');
  await expect(books.first()).toContainText('Commentary number 14'); // the newest first within a group
  await expect(books.last()).toContainText('Commentary number 1');
  await expect(page.locator('[data-request-group="library"] [data-request]')).toHaveCount(1);
  await expect(page.locator('[data-request-group="library"] [data-request]')).toContainText('198 of 4597 books');

  // a row of each kind opens in full: the book's title, the library line, an approach's text
  for (const [kind, words] of [['book', 'Guzik on Romans'], ['library', 'My Logos library: 198 of 4597 books'], ['approach', 'Approach number 2']] as const) {
    const opened = page.locator(`[data-request-group="${kind}"] [data-request]`, { hasText: words });
    await opened.locator('[data-request-toggle]').click();
    await expect(opened.locator('[data-request-words]')).toHaveText(words);
    expect(await opened.locator('[data-request-words]').evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    await opened.locator('[data-request-toggle]').click();
  }

  const field = page.getByRole('searchbox', { name: 'Search your requests' });
  await expect(field).toHaveAttribute('placeholder', 'Search 30 requests');
  expect((await field.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(47.5);
  const sideways = (): Promise<boolean> => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(await sideways()).toBe(false);
  await page.locator('.screen').first().evaluate((el) => (el.scrollTop = 0));
  await shot(page, 'your-requests-30-grouped');

  await field.fill('guzik romans');
  await expect(page.locator('[data-request]')).toHaveCount(1);
  await expect(headers).toHaveText(['Books (1)']);
  await expect(page.getByText('1 of 30 shown')).toBeVisible();
  await shot(page, 'your-requests-30-search');

  await field.fill('number 1');
  await expect(headers).toHaveText(['Approaches or programmes (1)', 'Asked the tutor (2)', 'Books (6)']); // 1; 1 and 10; 1 and 10 to 14
  await field.fill('sepia evening'); // only in his own words, not in the summary
  await expect(page.locator('[data-request]')).toHaveCount(1);
  await expect(page.locator('[data-request]')).toContainText('Could the Greek have a sepia evening theme?');
  await field.fill('zzzz');
  await expect(page.getByText('No request matches')).toBeVisible();
  await expect(page.locator('[data-request]')).toHaveCount(0);
  await field.fill('');
  await expect(page.locator('[data-request]')).toHaveCount(30);
});

// A status filter (mw-5r3p30.795): chips All, Waiting (sent, filed, building), Adopted (landed, adopted as a setting) and Declined, each with its count, always shown;
// a chip with no rows says so; the search narrows within the chip; the chips wrap and never scroll the screen sideways.
for (const { width, height } of VIEWPORTS) {
  test(`the status chips filter Your requests and count them at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const fake = makeFakePostern();
    await routePostern(page, fake);
    await openUnlocked(page);
    await page.goto('/#/requests');
    await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
    const rows = Array.from({ length: 8 }, (_, i) => ({ kind: 'tutor-ask', summary: `Idea number ${i + 1} for the Greek` }));
    await seedRows(page, rows);
    // 0 sent, 1 filed, 2 building, 3 landed, 4 declined, 5 adopted as a setting, 6 and 7 sent
    fake.sendStatus(SEED_PUBLIC_KEY, status(1, { status: 'filed' }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(2, { status: 'building' }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(3, { status: 'landed', version: '0.1.86', commit: '0123456789abcdef0123456789abcdef01234567', url: COMMIT_URL }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(4, { status: 'declined', reason: 'outside what this app is for' }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(5, { status: 'adopted-as-setting', setting: 'Settings > Appearance > Text size' }));
    await page.reload();

    const chips = page.getByRole('group', { name: 'Status' });
    await expect(chips).toBeVisible();
    const chip = (label: string) => chips.getByRole('button', { name: label });
    await expect(chips.getByRole('button')).toHaveText(['All (8)', 'Waiting (5)', 'Adopted (2)', 'Declined (1)']);
    await expect(chip('All (8)')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-request]')).toHaveCount(8);
    const sideways = (): Promise<boolean> => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(await sideways()).toBe(false);
    const box = await chips.boundingBox();
    expect((box?.x ?? -1) + (box?.width ?? 0)).toBeLessThanOrEqual(width);
    for (const button of await chips.getByRole('button').all()) expect((await button.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(47.5);

    await chip('Declined (1)').click();
    await expect(chip('Declined (1)')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-request]')).toHaveCount(1);
    await expect(page.locator('[data-request-status]')).toHaveText(lineMatching('Declined · <date>: outside what this app is for'));
    await expect(page.locator('[data-request-group] > h2')).toHaveText(['Asked the tutor (1)']);
    await shot(page, `your-requests-declined-${width}`);

    await chip('Waiting (5)').click();
    await expect(page.locator('[data-request]')).toHaveCount(5);
    await expect(page.locator('[data-request-status]')).toHaveText(['Sent to the factory · <date>', 'Sent to the factory · <date>', 'Being built · since <date>', 'Filed as a story · <date>, waiting its turn', 'Sent to the factory · <date>'].map(lineMatching));
    await expect(page.locator('[data-request-group] > h2')).toHaveText(['Asked the tutor (5)']);

    await chip('Adopted (2)').click();
    await expect(page.locator('[data-request]')).toHaveCount(2);
    await expect(page.locator('[data-request-status]')).toHaveText(['Now a setting: Settings > Appearance > Text size · <date>', 'Adopted in 0.1.86 · <date>'].map(lineMatching));

    await chip('All (8)').click();
    await expect(page.locator('[data-request]')).toHaveCount(8);
    expect(await sideways()).toBe(false);
  });
}

test('a chip with no rows says so, and the search narrows only the chip at 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/requests');
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  const rows = Array.from({ length: 24 }, (_, i) => ({ kind: 'tutor-ask', summary: i < 3 ? `Sepia theme number ${i + 1}` : `Idea number ${i + 1} for the Greek` }));
  await seedRows(page, rows);
  // 0 and 1 landed, 2 filed; the rest sent; none declined
  fake.sendStatus(SEED_PUBLIC_KEY, status(0, { status: 'landed', version: '0.1.86', commit: '0123456789abcdef0123456789abcdef01234567', url: COMMIT_URL }));
  fake.sendStatus(SEED_PUBLIC_KEY, status(1, { status: 'landed', version: '0.1.87', commit: '0123456789abcdef0123456789abcdef01234567', url: COMMIT_URL }));
  fake.sendStatus(SEED_PUBLIC_KEY, status(2, { status: 'filed' }));
  await page.reload();

  const chips = page.getByRole('group', { name: 'Status' });
  await expect(chips.getByRole('button')).toHaveText(['All (24)', 'Waiting (22)', 'Adopted (2)', 'Declined (0)']);
  const field = page.getByRole('searchbox', { name: 'Search your requests' });
  await chips.getByRole('button', { name: 'Waiting (22)' }).click();
  await expect(field).toHaveAttribute('placeholder', 'Search 22 requests');
  await field.fill('sepia');
  await expect(page.locator('[data-request]')).toHaveCount(1); // only the filed one: the landed ones are Adopted
  await expect(page.getByText('1 of 22 shown')).toBeVisible();
  await chips.getByRole('button', { name: 'Adopted (2)' }).click();
  await expect(field).toHaveValue('sepia'); // the search is kept across chips
  await expect(page.locator('[data-request]')).toHaveCount(2);
  await expect(page.getByText('2 of 2 shown')).toBeVisible();
  await chips.getByRole('button', { name: 'All (24)' }).click();
  await expect(page.locator('[data-request]')).toHaveCount(3);
  await field.fill('');

  // no row declined: the chip stays, with its count 0, and says so
  await chips.getByRole('button', { name: 'Declined (0)' }).click();
  await expect(page.getByText('Nothing declined')).toBeVisible();
  await expect(page.locator('[data-request]')).toHaveCount(0);
  await expect(page.getByText('No request matches')).toHaveCount(0);
  await shot(page, 'your-requests-nothing-declined');
});

test('Settings has a Your requests row that opens the screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/settings?group=account');
  const row = page.getByRole('button', { name: /^Your requests/ });
  await row.scrollIntoViewIfNeeded();
  expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await row.click();
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  await expect(page.locator('[data-requests-empty]')).toBeVisible();
});

test('from About the back button reads ‹ About and returns there; a double tap on it stops on the screen before', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/about');
  await page.getByRole('button', { name: /^Your requests/ }).click();
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: '‹ About' })).toBeVisible();
  await page.getByRole('button', { name: '‹ About' }).click();
  await expect(page).toHaveURL(/#\/about$/);

  // Settings: a double tap on the row adds one history entry, a double tap on the back button stops on the Settings page it came from (its own ‹ Settings sits at the same spot)
  await page.goto('/#/settings?group=account');
  const before = await page.evaluate(() => history.length);
  await page.getByRole('button', { name: /^Your requests/ }).dblclick();
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  expect(await page.evaluate(() => history.length)).toBe(before + 1);
  await page.getByRole('button', { name: '‹ Settings' }).dblclick();
  await expect(page.getByRole('heading', { name: 'Account', exact: true, level: 1 })).toBeVisible();
  await expect(page).toHaveURL(/#\/settings\?group=account$/);
  await shot(page, 'your-requests-back-from-settings');
});

// A thumb's double tap on the Adopted link opens one GitHub tab, not two (mw-5r3p30.457): the second tap of a double tap falls inside the settle
// moment (src/ui/tapGuard.ts swallows taps after a link that leaves the app is tapped), put back here as on his phone (openUnlocked starts it at 0).
test('a double tap on the Adopted link opens one tab', async ({ page, context }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS)); // after openUnlocked's '0'
  await page.goto('/#/requests');
  await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
  await seed(page);
  fake.sendStatus(SEED_PUBLIC_KEY, status(3, { status: 'landed', version: '0.1.86', commit: '0123456789abcdef0123456789abcdef01234567', url: COMMIT_URL }));
  await page.reload();
  const link = page.getByRole('link', { name: lineMatching('Adopted in 0.1.86 · <date>') });
  await expect(link).toHaveAttribute('href', COMMIT_URL);
  await link.scrollIntoViewIfNeeded();
  await pageTime(page, SETTLE_MS + 100);

  // GitHub is not reached from the test: its tab is answered with nothing
  await context.route('https://github.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '' }));
  const opened: string[] = [];
  context.on('page', (tab) => opened.push(tab.url()));
  await tapTwice(page, link, 120);
  await expect.poll(() => opened.length).toBeGreaterThan(0);
  await pageTime(page, SETTLE_MS + 100);
  await page.waitForTimeout(500); // a second tab, if any, has opened by now
  expect(opened).toHaveLength(1);

  // two taps further apart than the moment are two taps, so the guard holds back no deliberate one
  await tapTwice(page, link, SETTLE_MS + 100);
  await expect.poll(() => opened.length).toBe(3);
});

// Under a filed request that has waited more than 7 days one quiet line says so (mw-5r3p30.796); a fresh filed one, and every other status, has none.
for (const { name, width, height } of VIEWPORTS) {
  test(`a filed request older than 7 days says Still in the queue at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const fake = makeFakePostern();
    await routePostern(page, fake);
    await openUnlocked(page);
    await page.goto('/#/requests');
    await expect(page.getByRole('heading', { name: 'Your requests', level: 1 })).toBeVisible();
    await seed(page, ['Waited a fortnight', 'Filed yesterday', 'Being built for a fortnight']);
    const DAY = 86_400_000;
    fake.sendStatus(SEED_PUBLIC_KEY, status(0, { status: 'filed', ts: Date.now() - 14 * DAY }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(1, { status: 'filed', ts: Date.now() - DAY }));
    fake.sendStatus(SEED_PUBLIC_KEY, status(2, { status: 'building', ts: Date.now() - 14 * DAY }));
    await page.reload();

    const old = page.locator('[data-request]', { hasText: 'Waited a fortnight' });
    await expect(old.locator('[data-request-status]')).toHaveText(lineMatching('Filed as a story · <date>, waiting its turn'));
    await expect(old.locator('[data-request-queue]')).toHaveText('Still in the queue');
    await expect(page.locator('[data-request]', { hasText: 'Filed yesterday' }).locator('[data-request-queue]')).toHaveCount(0);
    await expect(page.locator('[data-request]', { hasText: 'Being built for a fortnight' }).locator('[data-request-queue]')).toHaveCount(0);
    await expect(page.locator('[data-request-queue]')).toHaveCount(1);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    await shot(page, `your-requests-queue-${name}`);
  });
}
