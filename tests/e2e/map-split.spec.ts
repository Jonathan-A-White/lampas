import { expect, test, type Page } from '@playwright/test';
import { drag } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

// The Reader split, S2 (mw-5r3p30.1129.2, docs/design/reader-split.md, docs/maps.md 'Split'): a map's handle row has Split beside Close; tapping it closes the map, the Maps sheet and the
// Verse view and shows the Reader with the map docked below the passage (the dock S1 made, mw-5r3p30.1129.1), the passage and the picture each scrolling on their own. Back never closes
// the split; Close does; a word tap opens its sheet over both panes; a reload keeps the same map (setting splitMap). The picture is Playwright's own (a route on biblemapper.com).
test.use({ viewport: { width: 390, height: 844 } });

const PICTURE = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#e8dcc0"/><circle cx="400" cy="250" r="120" fill="#7a9e7e"/><text x="400" y="260" font-size="40" text-anchor="middle">Siddim</text></svg>`;
const TITLE = 'The Battle at the Valley of Siddim';

async function stubPictures(page: Page): Promise<void> {
  await page.route(/^https:\/\/biblemapper\.com\//, (route) => route.fulfill({ contentType: 'image/svg+xml', body: PICTURE }));
}

const dock = (page: Page) => page.locator('[data-dock]');
const passageTop = (page: Page) => page.evaluate(() => (document.querySelector('[data-reader]') as HTMLElement).scrollTop);

/** Genesis 14, the Verse view of verse 15, its Maps door (Maps · 7 in the data of 2026-11-08, the story said 6), the battle's map, and a tap on its Split. */
async function splitTheBattle(page: Page) {
  await openUnlocked(page);
  await stubPictures(page);
  await page.goto('/#/?b=gen&c=14');
  await expect(page.locator('[data-verse="15"]')).toBeAttached();
  const view = await openVerseView(page, 15);
  await view.getByRole('button', { name: /^Maps · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Maps for Genesis 14:15' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: new RegExp(TITLE) }).click();
  const map = page.getByRole('dialog', { name: TITLE });
  await expect(map).toBeVisible();
  const handle = map.getByTestId('maps-handle');
  const split = handle.getByRole('button', { name: 'Split', exact: true });
  const close = handle.getByRole('button', { name: 'Close', exact: true });
  await expect(split).toBeVisible();
  await expect(close).toBeVisible();
  // Split stands beside Close, left of it, and both are 44 px targets
  const [s, c] = [(await split.boundingBox())!, (await close.boundingBox())!];
  expect(s.x + s.width).toBeLessThanOrEqual(c.x + 1);
  expect(s.height).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'map-split-button');
  await split.click();
  return { view, sheet, map };
}

test('Split on a map closes the map, the Maps sheet and the Verse view and docks the map below the passage at the size the dock opens at', async ({ page }) => {
  const { view, sheet, map } = await splitTheBattle(page);
  await expect(map).toBeHidden();
  await expect(sheet).toBeHidden();
  await expect(view).toBeHidden();
  await expect(dock(page)).toBeVisible();
  // the verse view's entry and both sheets' entries are gone: the address is the chapter's alone
  await expect.poll(() => page.evaluate(() => window.location.hash)).not.toContain('verse=');

  // the dock's handle row: the map's title at the left, Close at the right, no Link
  const handle = page.locator('[data-dock-handle]');
  await expect(handle.locator('[data-dock-title]')).toHaveText(TITLE);
  await expect(handle.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  await expect(handle.getByRole('button', { name: /^Link/ })).toHaveCount(0);
  const [row, title, close] = [(await handle.boundingBox())!, (await handle.locator('[data-dock-title]').boundingBox())!, (await handle.getByRole('button', { name: 'Close', exact: true }).boundingBox())!];
  expect(title.x).toBeLessThan(row.x + row.width / 2);
  expect(close.x).toBeGreaterThan(row.x + row.width / 2);

  // the picture is wholly visible in the dock, at the size S1 opens at (Half)
  const reader = (await page.locator('[data-reader-box]').boundingBox())!;
  const at = (await dock(page).boundingBox())!;
  expect(Math.abs(at.height - reader.height / 2)).toBeLessThanOrEqual(10);
  const picture = dock(page).locator('img');
  await expect(picture).toBeVisible();
  await expect.poll(async () => picture.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const body = (await page.locator('[data-dock-body]').boundingBox())!;
  const img = (await picture.boundingBox())!;
  expect(img.y).toBeGreaterThanOrEqual(body.y - 1);
  expect(img.y + img.height).toBeLessThanOrEqual(body.y + body.height + 1);
  expect(img.x).toBeGreaterThanOrEqual(at.x - 1);
  expect(img.x + img.width).toBeLessThanOrEqual(at.x + at.width + 1);
  await expect(dock(page).locator('[data-map-credit]')).toHaveText('Map by David P. Barrett, biblemapper.com');

  // verse 15 is within the passage's box
  const passage = (await page.locator('[data-reader]').boundingBox())!;
  const v = (await page.locator('[data-verse="15"]').boundingBox())!;
  expect(v.y).toBeGreaterThanOrEqual(passage.y - 1);
  expect(v.y + v.height).toBeLessThanOrEqual(passage.y + passage.height + 1);
  await shot(page, 'map-split');
});

test('the passage scrolls apart from the picture; a tap on the picture zooms it to twice the box and the box pans, the passage unmoved', async ({ page }) => {
  await splitTheBattle(page);
  const picture = dock(page).locator('img');
  await expect(picture).toBeVisible();
  const at = (await dock(page).boundingBox())!;
  const fit = (await picture.boundingBox())!;

  const before = await passageTop(page);
  await page.evaluate(() => ((document.querySelector('[data-reader]') as HTMLElement).scrollTop += 300));
  expect(Math.abs((await passageTop(page)) - before)).toBeGreaterThan(100);
  expect(await dock(page).boundingBox()).toEqual(at);
  expect(await picture.boundingBox()).toEqual(fit);

  // a tap zooms to twice the box's width; scrolling the box pans it, the passage's scrollTop unchanged
  const top = await passageTop(page);
  const box = dock(page).locator('[data-map-box]');
  await dock(page).getByRole('button', { name: 'Zoom the map in' }).click();
  await expect.poll(async () => (await picture.boundingBox())?.width ?? 0).toBeGreaterThan(fit.width * 1.9);
  const wide = (await box.boundingBox())!;
  expect((await picture.boundingBox())!.width).toBeGreaterThan(wide.width * 1.9);
  expect(wide.height).toBeLessThanOrEqual(fit.height + 6);
  expect(await box.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await box.evaluate((el) => el.scrollTo({ left: 120 }));
  expect(await box.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50);
  expect(await passageTop(page)).toBe(top);
  expect(await dock(page).boundingBox()).toEqual(at);
  await dock(page).getByRole('button', { name: 'Fit the map to the width' }).click();
  await expect.poll(async () => (await picture.boundingBox())?.width ?? 0).toBeLessThan(fit.width * 1.1);
});

test('Close closes the split at the same verse; Back with the split open does not close it', async ({ page }) => {
  await splitTheBattle(page);
  await expect(dock(page)).toBeVisible();

  // a verse opened from the passage and closed with Back leaves the split as it was
  await page.getByRole('button', { name: 'Verse 3', exact: true }).click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  await page.goBack();
  await expect(view).toBeHidden();
  await expect(dock(page)).toBeVisible();
  await expect(dock(page).locator('[data-dock-title]')).toHaveText(TITLE);

  // Close closes it; the passage stays at the same verse, and the address is the chapter's
  // (the round ? may stand over Close at some heights, which he hides with a double tap: the key is the same button)
  const close = page.locator('[data-dock-handle]').getByRole('button', { name: 'Close', exact: true });
  await close.focus();
  await page.keyboard.press('Enter');
  await expect(dock(page)).toHaveCount(0);
  await expect(page.locator('[data-verse="15"]')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Genesis 14', level: 1 })).toBeVisible();
});

test('a word tap opens the word sheet over both panes and closing it leaves the split; the place line is not drawn while the dock is open', async ({ page }) => {
  await splitTheBattle(page);
  await expect(dock(page).locator('img')).toBeVisible();
  await expect(page.locator('[data-place-line]')).toHaveCount(0);

  await page.locator('[data-verse="15"] [data-chunk]').first().click();
  const sheet = page.getByRole('dialog').first();
  await expect(sheet).toBeVisible();
  // over both panes: the sheet reaches from above the passage's box to the foot
  const panes = (await page.locator('[data-reader-box]').boundingBox())!;
  const at = (await sheet.boundingBox())!;
  expect(at.y + at.height).toBeGreaterThan(panes.y + panes.height - 2);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(dock(page)).toBeVisible();
  await expect(dock(page).locator('img')).toBeVisible();
  await expect(page.locator('[data-place-line]')).toHaveCount(0);
});

test('a reload keeps the same map in the dock (setting splitMap)', async ({ page }) => {
  await splitTheBattle(page);
  await expect(dock(page).locator('[data-dock-title]')).toHaveText(TITLE);
  await page.reload();
  await expect(dock(page)).toBeVisible();
  await expect(dock(page).locator('[data-dock-title]')).toHaveText(TITLE);
  await expect(dock(page).locator('img')).toBeVisible();
  await expect.poll(async () => dock(page).locator('img').evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

// The Reader split, S3 (mw-5r3p30.1129.3, docs/design/reader-split.md 'On moving chapter'): the dock follows the chapter, and stands beside the passage sideways and wide.
// The specs below open the dock the way the app keeps it (the settings readerSplit, splitMap and splitSize, through raw IndexedDB, as reader-split-dock.spec.ts does), then move.

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

const BATTLE = 'gen|14|biblemapper|BattleAtValleyOfSiddim';

/** The dock open on `at` ('gen', 14), holding `map`, with the picture stubbed. */
async function openDocked(page: Page, settings: Record<string, string>, at: { book: string; chapter: number; heading: string }) {
  await openUnlocked(page);
  await stubPictures(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { readerSplit: 'on', ...settings });
  await page.goto(`/#/?b=${at.book}&c=${at.chapter}`);
  await page.reload();
  await expect(page.getByRole('heading', { name: at.heading, level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeAttached();
  await expect(dock(page)).toBeVisible();
}

const title = (page: Page) => dock(page).locator('[data-dock-title]');
const reading = (page: Page) => page.locator('[data-reader-box]');
/** Scrolls the passage to its foot, where the chapter buttons are, and presses one. */
async function turnChapter(page: Page, name: string) {
  await page.locator('[data-reader]').evaluate((el) => (el.scrollTop = el.scrollHeight));
  await page.getByRole('navigation', { name: 'Chapters', exact: true }).getByRole('button', { name }).click();
}

test('the next chapter keeps the split and its size; the map is the chapter’s first when the chapter lacks it, and the one he had when the chapter has it', async ({ page }) => {
  await splitTheBattle(page);
  await expect(title(page)).toHaveText(TITLE);
  const at = (await dock(page).boundingBox())!;

  // Genesis 15 does not carry the battle's map: its first in the Maps sheet's order (Events first) is the World of the Patriarchs
  await turnChapter(page, 'Genesis 15 ›');
  await expect(page.getByRole('heading', { name: 'Genesis 15', level: 1 })).toBeVisible();
  await expect(dock(page)).toBeVisible();
  await expect(title(page)).toHaveText('The World of the Patriarchs');
  await expect(dock(page).locator('img')).toBeVisible();
  await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.height - at.height)).toBeLessThanOrEqual(2);
  await expect(dock(page).locator('[data-map-credit]')).toHaveText('Map by David P. Barrett, biblemapper.com');
  // the map's links are the new chapter's
  await expect(dock(page).getByRole('link', { name: /All maps for Genesis 15 at Bible Mapper/ })).toBeAttached();

  // and back, the chapter has the battle's map again
  await turnChapter(page, '‹ Genesis 14');
  await expect(page.getByRole('heading', { name: 'Genesis 14', level: 1 })).toBeVisible();
  await expect(title(page)).toHaveText(TITLE);
});

test('a map the next chapter also covers stays; a reload on that chapter keeps the same map and size', async ({ page }) => {
  await openDocked(page, { splitMap: 'gen|15|biblemapper|PatriarchsInCanaan', splitSize: '0.37' }, { book: 'gen', chapter: 15, heading: 'Genesis 15' });
  await expect(title(page)).toHaveText('Patriarchs in Canaan');
  const reader = (await reading(page).boundingBox())!;
  await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.height - reader.height * 0.37)).toBeLessThanOrEqual(2);

  await turnChapter(page, 'Genesis 16 ›');
  await expect(page.getByRole('heading', { name: 'Genesis 16', level: 1 })).toBeVisible();
  await expect(title(page)).toHaveText('Patriarchs in Canaan');
  await expect(dock(page).locator('img')).toBeVisible();
  await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.height - reader.height * 0.37)).toBeLessThanOrEqual(2);

  await page.reload();
  await expect(dock(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Genesis 16', level: 1 })).toBeVisible();
  await expect(title(page)).toHaveText('Patriarchs in Canaan');
  await expect(dock(page).locator('img')).toBeVisible();
  await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.height - reader.height * 0.37)).toBeLessThanOrEqual(2);
});

test('a chapter with no map keeps the split: the row reads No map for it over an empty body, no picture is fetched, the dock keeps its size', async ({ page }) => {
  // Nahum 2 is a chapter biblemapper.json has no maps for (Nahum 1 and 3 have)
  await openDocked(page, { splitMap: BATTLE, splitSize: '0.45' }, { book: 'nam', chapter: 1, heading: 'Nahum 1' });
  await expect(dock(page).locator('img')).toBeVisible();
  const at = (await dock(page).boundingBox())!;
  const asked: string[] = [];
  page.on('request', (request) => {
    if (/^https:\/\/biblemapper\.com\//.test(request.url())) asked.push(request.url());
  });

  await turnChapter(page, 'Nahum 2 ›');
  await expect(page.getByRole('heading', { name: 'Nahum 2', level: 1 })).toBeVisible();
  await expect(dock(page)).toBeVisible();
  await expect(title(page)).toHaveText('No map for Nahum 2');
  await expect(page.locator('[data-dock-body]')).toBeEmpty();
  await expect(dock(page).locator('img')).toHaveCount(0);
  expect(asked).toEqual([]);
  await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.height - at.height)).toBeLessThanOrEqual(2);
  await shot(page, 'map-split-no-map');

  // a reload keeps the split on the chapter with no map, and the next chapter brings a map back
  await page.reload();
  await expect(title(page)).toHaveText('No map for Nahum 2');
  await turnChapter(page, 'Nahum 3 ›');
  await expect(page.getByRole('heading', { name: 'Nahum 3', level: 1 })).toBeVisible();
  await expect(dock(page).locator('img')).toBeVisible();
  await expect(title(page)).not.toHaveText(/^No map/);
  await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.height - at.height)).toBeLessThanOrEqual(2);
});

test.describe('beside the passage', () => {
  // the finger needs the page's clock, installed before the page opens (tests/support/gesture.ts)
  test.use({ hasTouch: true });
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
  });

  const limits = async (page: Page) => {
    const bar = page.getByRole('separator', { name: 'Split size' });
    return { min: Number(await bar.getAttribute('aria-valuemin')), max: Number(await bar.getAttribute('aria-valuemax')) };
  };
  const widthOf = async (page: Page) => (await dock(page).boundingBox())!.width;

  /** A drag along the handle row that leaves the dock `width` wide (a finger moving left makes it wider). */
  async function dragWidth(page: Page, width: number, options: { whileDown?: () => Promise<void> } = {}) {
    const row = (await page.locator('[data-dock-handle]').boundingBox())!;
    const now = await widthOf(page);
    const from: [number, number] = [row.x + 24, row.y + row.height / 2];
    await drag(page, from, [from[0] + (now - width), from[1]], { steps: 8, ms: 240, ...options });
  }

  test('sideways at 844x390 the dock stands at the right, its handle row at its top; its width is a fraction, and the fraction is kept turning the phone and reloading', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await openDocked(page, { splitMap: BATTLE }, { book: 'gen', chapter: 14, heading: 'Genesis 14' });
    const box = (await reading(page).boundingBox())!;
    const at = (await dock(page).boundingBox())!;
    const passage = (await page.locator('[data-reader]').boundingBox())!;
    // the passage at the left, the dock at the right, the box's whole height; the handle row at the dock's top
    expect(at.x).toBeGreaterThan(passage.x);
    expect(passage.x + passage.width).toBeLessThanOrEqual(at.x + 1);
    expect(Math.abs(at.x + at.width - (box.x + box.width))).toBeLessThanOrEqual(2);
    expect(Math.abs(at.height - box.height)).toBeLessThanOrEqual(2);
    const row = (await page.locator('[data-dock-handle]').boundingBox())!;
    expect(Math.abs(row.y - at.y)).toBeLessThanOrEqual(1);
    expect(row.height).toBe(44);
    expect(Math.abs(row.x - at.x)).toBeLessThanOrEqual(2);
    await expect(title(page)).toHaveText(TITLE);
    // Half to start
    expect(Math.abs(at.width - box.width / 2)).toBeLessThanOrEqual(10);
    await shot(page, 'map-split-sideways');

    // two widths that are not a third, a half or two thirds of the box rest within 2 px of where the finger let go
    const { min, max } = await limits(page);
    expect(min).toBeLessThan(at.width);
    expect(max).toBeGreaterThan(at.width);
    for (const fraction of [0.31, 0.58]) {
      const width = box.width * fraction;
      expect(width).toBeGreaterThan(min);
      expect(width).toBeLessThan(max);
      await dragWidth(page, width);
      await expect.poll(async () => Math.abs((await widthOf(page)) - width), { message: `rests at ${fraction}` }).toBeLessThanOrEqual(2);
    }

    // the share is kept turning the phone, and a reload keeps the split, the map and the width
    await page.setViewportSize({ width: 390, height: 844 });
    const portrait = (await reading(page).boundingBox())!;
    await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.height / portrait.height - 0.58)).toBeLessThan(0.012);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect.poll(async () => Math.abs((await widthOf(page)) - box.width * 0.58)).toBeLessThanOrEqual(2);
    await page.reload();
    await expect(dock(page)).toBeVisible();
    await expect(title(page)).toHaveText(TITLE);
    await expect(dock(page).locator('img')).toBeVisible();
    await expect.poll(async () => Math.abs((await widthOf(page)) - box.width * 0.58)).toBeLessThanOrEqual(2);

    // a drag to the right past the smallest width by 80 px closes it
    const smallest = (await limits(page)).min;
    await dragWidth(page, smallest - 90, {
      whileDown: async () => {
        await expect(page.locator('[data-dock-handle]').getByText('Let go to close', { exact: true })).toBeVisible();
      },
    });
    await expect(dock(page)).toHaveCount(0);
  });

  test('wide at 1280x800 is the same by the box’s shape: the dock at the right, a width that rests where the divider is let go, a reload keeps it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openDocked(page, { splitMap: BATTLE }, { book: 'gen', chapter: 14, heading: 'Genesis 14' });
    const box = (await reading(page).boundingBox())!;
    const at = (await dock(page).boundingBox())!;
    const passage = (await page.locator('[data-reader]').boundingBox())!;
    expect(at.x).toBeGreaterThan(passage.x);
    expect(passage.x + passage.width).toBeLessThanOrEqual(at.x + 1);
    expect(Math.abs(at.height - box.height)).toBeLessThanOrEqual(2);
    expect(Math.abs(at.width - box.width / 2)).toBeLessThanOrEqual(10);
    const row = (await page.locator('[data-dock-handle]').boundingBox())!;
    expect(Math.abs(row.y - at.y)).toBeLessThanOrEqual(1);
    await expect(title(page)).toHaveText(TITLE);
    await expect(dock(page).locator('img')).toBeVisible();
    await shot(page, 'map-split-wide');

    for (const fraction of [0.29, 0.63]) {
      const width = box.width * fraction;
      await dragWidth(page, width);
      await expect.poll(async () => Math.abs((await widthOf(page)) - width), { message: `rests at ${fraction}` }).toBeLessThanOrEqual(2);
    }
    await page.reload();
    await expect(dock(page)).toBeVisible();
    await expect(title(page)).toHaveText(TITLE);
    await expect.poll(async () => Math.abs((await widthOf(page)) - box.width * 0.63)).toBeLessThanOrEqual(2);

    const smallest = (await limits(page)).min;
    await dragWidth(page, smallest - 90);
    await expect(dock(page)).toHaveCount(0);
  });

  test('a chapter move beside the passage keeps the split, the width and the map’s place at the right', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await openDocked(page, { splitMap: BATTLE, splitSize: '0.4' }, { book: 'gen', chapter: 14, heading: 'Genesis 14' });
    const box = (await reading(page).boundingBox())!;
    await turnChapter(page, 'Genesis 15 ›');
    await expect(page.getByRole('heading', { name: 'Genesis 15', level: 1 })).toBeVisible();
    await expect(title(page)).toHaveText('The World of the Patriarchs');
    await expect.poll(async () => Math.abs((await widthOf(page)) - box.width * 0.4)).toBeLessThanOrEqual(2);
  });
});
