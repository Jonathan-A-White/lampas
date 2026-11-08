import { expect, test, type Page } from '@playwright/test';
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
