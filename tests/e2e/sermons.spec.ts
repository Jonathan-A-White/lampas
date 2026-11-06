// tests/e2e/sermons.spec.ts — Lampas sermons on the screen (mw-qtu3zvz.2, docs/sermons.md) at 390x844: the quiet 'Sermons · N' door in the tools line of the Verse view of Romans 5:8, the Sermons sheet (On this verse,
// In this chapter, each row 44 px with the preacher, the date and where it opens) and a row that is a plain link out. The data is the committed index (public/sermons): no sermon's page is fetched, and the spec
// holds that no request is made to the sites the rows point at.
import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

const SITES = /^https:\/\/(www\.)?(ccel\.org|archive\.org|spurgeongems\.org)\//;

test('Romans 5:8 has Sermons · N; the sheet groups the sermons; a row is a link out and nothing is fetched until it is tapped', async ({ page, context }) => {
  await openUnlocked(page);
  const asked: string[] = [];
  await page.route(SITES, (route) => {
    asked.push(route.request().url());
    return route.abort();
  });
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();

  const view = await openVerseView(page, 8);
  const door = view.getByRole('button', { name: /^Sermons · \d+$/ });
  await expect(door).toBeVisible();
  expect((await door.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  const count = Number(/\d+$/.exec((await door.textContent()) ?? '')?.[0]);
  expect(count).toBeGreaterThan(1);
  // the door follows the Maps door in the tools line
  const tools = await view.getByRole('group', { name: 'Tools' }).getByRole('button').allTextContents();
  const maps = tools.findIndex((t) => /^Maps\b/.test(t.trim()));
  if (maps >= 0) expect(tools.findIndex((t) => /^Sermons\b/.test(t.trim()))).toBeGreaterThan(maps);
  await shot(page, 'sermons-door');

  await door.click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('h3')).toHaveText(['On this verse', 'In this chapter']);
  const rows = sheet.locator('a[data-sermon-row]');
  expect(await rows.count()).toBe(count);
  for (let i = 0; i < count; i++) expect((await rows.nth(i).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  const first = rows.first();
  await expect(first.locator('[data-sermon-title]')).toHaveText('Love\'s Commendation');
  await expect(first.locator('[data-sermon-meta]')).toContainText('Charles H. Spurgeon');
  await expect(first.locator('[data-sermon-meta]')).toContainText('Opens on the web');
  await expect(first).toHaveAttribute('href', /^https:\/\/ccel\.org\/ccel\/spurgeon\//);
  await expect(first).toHaveAttribute('target', '_blank');
  await expect(sheet.locator('[data-sermon-credit]').first()).toContainText('Christian Classics Ethereal Library');
  await shot(page, 'sermons-sheet');
  expect(asked, 'nothing is fetched until a row is opened').toEqual([]);

  // offline the rows stay and say so
  await context.setOffline(true);
  await expect(first.locator('[data-sermon-meta]')).toContainText('Needs the internet');
  expect(await rows.count()).toBe(count);
  await context.setOffline(false);
  await expect(first.locator('[data-sermon-meta]')).toContainText('Opens on the web');

  // Back: the sheet, then the verse
  await page.goBack();
  await expect(sheet).toBeHidden();
  await expect(view).toBeVisible();
});

test('the place line opens the whole chapter, and its sheet is headed with the chapter alone', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  await page.locator('button[data-place-line]').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('h3')).toHaveText(['In this chapter']);
});

test('a chapter with no sermons in the index has no door', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=2jn&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const view = await openVerseView(page, 1);
  await page.waitForTimeout(500);
  await expect(view.getByRole('button', { name: /^Sermons/ })).toHaveCount(0);
});
