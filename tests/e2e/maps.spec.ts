// tests/e2e/maps.spec.ts — Lampas maps on the screen (mw-zbjgn3r.2, docs/maps.md) at 390x844: the quiet 'Maps · N' door on the Verse view of Genesis 10:19 and at the foot of a chapter, the Maps sheet
// (Events, Regions, Videos, each row 44 px with its period) and the map opened in the app with its credit and links. The picture is Playwright's own (a route on biblemapper.com): no live fetch.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

const PICTURE = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#e8dcc0"/><circle cx="400" cy="250" r="120" fill="#7a9e7e"/><text x="400" y="260" font-size="40" text-anchor="middle">Sodom</text></svg>`;

/** Every picture of biblemapper.com is the stub; nothing is fetched from the site. */
async function stubPictures(page: Page): Promise<string[]> {
  const asked: string[] = [];
  await page.route(/^https:\/\/biblemapper\.com\//, (route) => {
    asked.push(route.request().url());
    return route.fulfill({ contentType: 'image/svg+xml', body: PICTURE });
  });
  return asked;
}

test('Genesis 10:19 has Maps · 6; the sheet groups the maps; a map opens with its credit and zooms', async ({ page }) => {
  await openUnlocked(page);
  const asked = await stubPictures(page);
  await page.goto('/#/?b=gen&c=10');
  await expect(page.locator('[data-verse="19"]')).toBeVisible();

  const view = await openVerseView(page, 19);
  const door = view.getByRole('button', { name: 'Maps · 6', exact: true });
  await expect(door).toBeVisible();
  expect((await door.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'maps-verse-view');
  expect(asked).toEqual([]);

  await door.click();
  const sheet = page.getByRole('dialog', { name: 'Maps for Genesis 10:19' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('group').evaluateAll((groups) => groups.map((g) => g.getAttribute('aria-label')))).resolves.toEqual(['Events', 'Regions']);
  const rows = sheet.locator('[data-map-row]');
  expect(await rows.count()).toBe(6);
  for (let i = 0; i < 6; i++) expect((await rows.nth(i).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  const sodom = sheet.getByRole('button', { name: /Sodom and Gomorrah Are Destroyed/ });
  await expect(sodom.locator('[data-map-period]')).toHaveText('2100 to 2090 BC');
  await shot(page, 'maps-sheet');
  expect(asked, 'nothing is fetched until a map is opened').toEqual([]);

  await sodom.click();
  const map = page.getByRole('dialog', { name: 'Sodom and Gomorrah Are Destroyed' });
  await expect(map).toBeVisible();
  const picture = map.locator('img');
  await expect(picture).toBeVisible();
  await expect.poll(async () => picture.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(asked.length).toBe(1);
  await expect(map.locator('[data-map-credit]')).toHaveText('Map by David P. Barrett, biblemapper.com');
  await expect(map.getByRole('link', { name: 'biblemapper.com' })).toHaveAttribute('href', 'https://biblemapper.com');
  await expect(map.getByRole('link', { name: 'About this map' })).toHaveAttribute('href', /^https:\/\/biblemapper\.com\/blog\//);
  await expect(map.getByRole('link', { name: 'Full size' })).toHaveAttribute('href', /^https:\/\/biblemapper\.com\/blog\//);
  await expect(map.getByRole('link', { name: 'All maps for Genesis 10 at Bible Mapper' })).toHaveAttribute('href', 'https://biblemapper.com/blog/mapfinder/?ref=Genesis%2010');
  await shot(page, 'maps-map');

  // a tap toggles the picture between the width of its box and twice it, panned by scrolling the box
  const box = map.locator('[data-map-box]');
  const fit = (await picture.boundingBox())?.width ?? 0;
  await map.getByRole('button', { name: 'Zoom the map in' }).click();
  await expect.poll(async () => (await picture.boundingBox())?.width ?? 0).toBeGreaterThan(fit * 1.9);
  expect(await box.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  await map.getByRole('button', { name: 'Fit the map to the width' }).click();
  await expect.poll(async () => (await picture.boundingBox())?.width ?? 0).toBeLessThan(fit * 1.1);

  // Back: the map, then the sheet, then the verse
  await page.goBack();
  await expect(map).toBeHidden();
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(view).toBeVisible();
});

test('a failed picture says the map needs the internet and keeps its links', async ({ page }) => {
  await openUnlocked(page);
  await page.route(/^https:\/\/biblemapper\.com\//, (route) => route.abort());
  await page.goto('/#/?b=gen&c=10');
  const view = await openVerseView(page, 19);
  await view.getByRole('button', { name: 'Maps · 6', exact: true }).click();
  await page.getByRole('dialog', { name: 'Maps for Genesis 10:19' }).getByRole('button', { name: /Ararat/ }).click();
  const map = page.getByRole('dialog', { name: 'Ararat' });
  await expect(map.getByText('The map needs the internet')).toBeVisible();
  await expect(map.getByRole('link', { name: 'About this map' })).toBeVisible();
  await expect(map.getByRole('link', { name: 'biblemapper.com' })).toBeVisible();
});

test('the foot of a chapter has the door, the New Testament too', async ({ page }) => {
  await openUnlocked(page);
  await stubPictures(page);
  await page.goto('/#/?b=gen&c=10');
  const door = page.locator('[data-reader]').getByRole('button', { name: 'Maps · 6', exact: true });
  await door.scrollIntoViewIfNeeded();
  await expect(door).toBeVisible();
  await shot(page, 'maps-chapter-foot');
  await door.click();
  await expect(page.getByRole('dialog', { name: 'Maps for Genesis 10' })).toBeVisible();
  await page.goBack();

  await page.goto('/#/?b=act&c=27');
  const nt = page.locator('[data-reader]').getByRole('button', { name: /^Maps · \d+$/ });
  await nt.scrollIntoViewIfNeeded();
  await expect(nt).toBeVisible();
  await expect(page.locator('[data-verse] button', { hasText: /^Maps/ })).toHaveCount(0);
});
