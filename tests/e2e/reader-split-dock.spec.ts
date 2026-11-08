import { expect, test, type Page } from '@playwright/test';
import { drag } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The Reader split, S1 (mw-5r3p30.1129.1, docs/design/reader-split.md as the Governor changed D4: "Do a, but allow for dynamic sizes (not just 3 fixed ones)"): a dock
// below the passage whose handle row is the divider. It drags to any height and rests where it is let go; it clamps to a smallest and a largest size; pulled down past the
// smallest by 80 px it says Let go to close and closes; its size is kept as a fraction of the box, so a reload and a turn of the phone keep it. There is no door to the
// split yet (S2 brings the map, mw-5r3p30.1130 a text): the spec opens it the way a Builder does, by keeping the setting readerSplit On, as the app writes it.
// A phone-width layout claim: 390x844, with touch; the sideways case sets its own viewport.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// drag (tests/support/gesture.ts) times the finger on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them. */
async function keep(page: Page, values: Record<string, string>) {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
}

/** What the store holds under a key, as the app wrote it. */
const kept = (page: Page, key: string) =>
  page.evaluate(
    (k) =>
      new Promise<string | undefined>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction('settings').objectStore('settings').get(k);
          req.onsuccess = () => {
            db.close();
            resolve((req.result as { value: string } | undefined)?.value);
          };
          req.onerror = () => reject(req.error);
        };
      }),
    key,
  );

async function openSplit(page: Page, settings: Record<string, string> = {}) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { readerSplit: 'on', ...settings });
  await page.goto('/#/?b=mrk&c=12');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(dock(page)).toBeVisible();
}

const dock = (page: Page) => page.locator('[data-dock]');
const handle = (page: Page) => page.locator('[data-dock-handle]');
const box = async (page: Page) => (await page.locator('[data-reader-box]').boundingBox())!;
const dockBox = async (page: Page) => (await dock(page).boundingBox())!;
const passageTop = (page: Page) => page.evaluate(() => (document.querySelector('[data-reader]') as HTMLElement).scrollTop);
/** The least and most the dock is allowed, as the divider says. */
const limits = async (page: Page) => {
  const bar = page.getByRole('separator', { name: 'Split size' });
  return { min: Number(await bar.getAttribute('aria-valuemin')), max: Number(await bar.getAttribute('aria-valuemax')) };
};

/** Drags the handle row so that the dock is `height` tall (a finger up makes the dock larger). */
async function dragTo(page: Page, height: number, options: { whileDown?: () => Promise<void> } = {}) {
  const row = (await handle(page).boundingBox())!;
  const reader = await box(page);
  const x = row.x + row.width * 0.25; // the row's own surface, clear of the pill and of Close
  const from = row.y + row.height / 2;
  const to = reader.y + reader.height - height + row.height / 2;
  await drag(page, [x, from], [x, to], { steps: 8, ms: 240, ...options });
}

test('the dock stands below the passage at Half, its handle row 44 px with a title and Close, and the passage scrolls on its own', async ({ page }) => {
  await openSplit(page);
  const reader = await box(page);
  const chips = (await page.getByTestId('reader-chips').boundingBox())!;
  expect(reader.y).toBeGreaterThanOrEqual(chips.y + chips.height - 1);
  expect(reader.y + reader.height).toBeGreaterThan(844 - 10);

  const at = await dockBox(page);
  expect(Math.abs(at.height - reader.height / 2)).toBeLessThanOrEqual(10);
  expect(at.y + at.height).toBeGreaterThan(reader.y + reader.height - 2);
  const row = (await handle(page).boundingBox())!;
  expect(row.height).toBe(44);
  expect(Math.abs(row.y - at.y)).toBeLessThanOrEqual(1);
  await expect(handle(page).getByText('Split', { exact: true })).toBeVisible();
  await expect(handle(page).getByRole('button', { name: 'Close', exact: true })).toBeVisible();

  // the passage keeps the other half and scrolls on its own
  const passage = (await page.locator('[data-reader]').boundingBox())!;
  expect(Math.abs(passage.height - reader.height / 2)).toBeLessThanOrEqual(10);
  expect(passage.y + passage.height).toBeLessThanOrEqual(at.y + 1);
  await page.evaluate(() => ((document.querySelector('[data-reader]') as HTMLElement).scrollTop += 300));
  expect(await passageTop(page)).toBeGreaterThan(250);
  expect(await dockBox(page)).toEqual(at);
  await shot(page, 'reader-split-dock');
});

test('the divider drags to any height and rests there, clamps to its smallest and largest, and closes when pulled well past the smallest', async ({ page }) => {
  await openSplit(page);
  const reader = await box(page);
  const { min, max } = await limits(page);
  expect(min).toBeGreaterThanOrEqual(44 + 2 * 44);
  expect(Math.abs(max - (reader.height - 2 * 44))).toBeLessThanOrEqual(2);

  // two heights that are neither a third, a half nor two thirds of the box: no snapping
  for (const fraction of [0.27, 0.59]) {
    const height = reader.height * fraction;
    await dragTo(page, height);
    await expect.poll(async () => Math.abs((await dockBox(page)).height - height), { message: `rests at ${fraction}` }).toBeLessThanOrEqual(2);
  }

  // past the largest, the dock clamps to it, and under the smallest (short of the close distance) to the smallest
  await dragTo(page, reader.height - 10);
  await expect.poll(async () => Math.abs((await dockBox(page)).height - max)).toBeLessThanOrEqual(2);
  await dragTo(page, min - 40);
  await expect.poll(async () => Math.abs((await dockBox(page)).height - min)).toBeLessThanOrEqual(2);
  await expect(dock(page)).toBeVisible();

  // pulled down past the smallest size by 80 px the row says what letting go does, and letting go closes with the passage where it was
  await dragTo(page, 0.5 * reader.height);
  await page.evaluate(() => ((document.querySelector('[data-reader]') as HTMLElement).scrollTop += 300));
  const scrolled = await passageTop(page);
  await dragTo(page, min - 90, {
    whileDown: async () => {
      await expect(handle(page).getByText('Let go to close', { exact: true })).toBeVisible();
      await shot(page, 'reader-split-closing');
    },
  });
  await expect(dock(page)).toHaveCount(0);
  expect(await passageTop(page)).toBe(scrolled);
});

test('Close closes the dock; a reload keeps it open at the size he left it, as a fraction of the box', async ({ page }) => {
  await openSplit(page);
  const reader = await box(page);
  const height = reader.height * 0.41;
  await dragTo(page, height);
  await expect.poll(async () => Math.abs((await dockBox(page)).height - height)).toBeLessThanOrEqual(2);

  // the store holds a fraction between the bounds, not small | half | large
  await expect.poll(() => kept(page, 'splitSize')).toBeDefined();
  const saved = Number(await kept(page, 'splitSize'));
  expect(saved).toBeGreaterThan(0.2);
  expect(saved).toBeLessThan(0.9);
  expect(Math.abs(saved - 0.41)).toBeLessThan(0.01);
  expect(await kept(page, 'readerSplit')).toBe('on');

  await page.reload();
  await expect(dock(page)).toBeVisible();
  await expect.poll(async () => Math.abs((await dockBox(page)).height - height)).toBeLessThanOrEqual(2);

  // Close closes it, and the next opening is at that height
  await handle(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dock(page)).toHaveCount(0);
  await expect.poll(() => kept(page, 'readerSplit')).toBe('off');
  await keep(page, { readerSplit: 'on' });
  await page.reload();
  await expect(dock(page)).toBeVisible();
  await expect.poll(async () => Math.abs((await dockBox(page)).height - height)).toBeLessThanOrEqual(2);
});

test('turning the phone keeps the fraction: sideways the dock stands at the right and has the same share of the width', async ({ page }) => {
  await openSplit(page, { splitSize: '0.4' });
  const portrait = await box(page);
  await expect.poll(async () => Math.abs((await dockBox(page)).height / portrait.height - 0.4)).toBeLessThan(0.01);

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(dock(page)).toBeVisible();
  const sideways = await box(page);
  await expect.poll(async () => Math.abs((await dockBox(page)).width / sideways.width - 0.4)).toBeLessThan(0.01);
  const at = await dockBox(page);
  const passage = (await page.locator('[data-reader]').boundingBox())!;
  expect(at.x).toBeGreaterThan(passage.x);
  expect(passage.x + passage.width).toBeLessThanOrEqual(at.x + 1);
  expect(Math.abs(at.height - sideways.height)).toBeLessThanOrEqual(2);
  await shot(page, 'reader-split-sideways');

  await page.setViewportSize({ width: 390, height: 844 });
  const back = await box(page);
  await expect.poll(async () => Math.abs((await dockBox(page)).height / back.height - 0.4)).toBeLessThan(0.01);
});
