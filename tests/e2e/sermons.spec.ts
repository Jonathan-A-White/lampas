// tests/e2e/sermons.spec.ts — Lampas sermons on the screen (mw-qtu3zvz.2, docs/sermons.md) at 390x844: the quiet 'Sermons · N' door in the tools line of the Verse view of Romans 5:8, the Sermons sheet (On this verse,
// In this chapter, each row 44 px with the preacher, the date and where it opens) and a row that is a plain link out. The data is the committed index (public/sermons): no sermon's page is fetched, and the spec
// holds that no request is made to the sites the rows point at. The last tests are mw-qtu3zvz.3's: the Sermons rows of Settings and his Logos sermon archives, In Logos, on the sheet.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { keepSettings } from './keep-settings';
import { openVerseView } from './verse-view';
import { openSettings } from './openSettings';
import { openGroup } from './settings-group';

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
  await expect(sheet.locator('h3').filter({ hasNotText: /^On the same theme$/ })).toHaveText(['On this verse', 'In this chapter']);
  // the rows of the passage's own groups: the sermons on the same theme come after them (the next test)
  const rows = sheet.locator('[data-sermons-part="here"] a[data-sermon-row], [data-sermons-part="chapter"] a[data-sermon-row]');
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

test('Romans 5:8 names its themes under the title, and the sheet has the sermons on the same theme, 12 at most', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet).toBeVisible();

  // the Themes line, under the title, as the module names the topic and its part
  const line = sheet.locator('[data-sermons-themes]');
  await expect(line).toBeVisible();
  await expect(line).toContainText('Love-Hatred: Of God');
  const title = await sheet.getByRole('heading', { level: 2 }).boundingBox();
  const lineBox = await line.boundingBox();
  expect(lineBox!.y).toBeGreaterThanOrEqual(title!.y + title!.height - 1);
  expect(await sheet.textContent()).not.toMatch(/Chain.Reference/i);

  // the sermons on the same theme come after In this chapter, headed by their topic, 12 rows at most
  await expect(sheet.locator('h3', { hasText: 'On the same theme' })).toBeVisible();
  const themed = sheet.locator('[data-sermons-part="theme"]');
  const rows = themed.locator('a[data-sermon-row]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(12);
  expect(await themed.locator('h4').count()).toBeGreaterThan(0);
  for (const heading of await themed.locator('h4').allTextContents()) expect(heading).toMatch(/^On \S/);
  for (let i = 0; i < count; i++) expect((await rows.nth(i).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  // none of them is a row of the passage groups
  const passage = await sheet.locator('[data-sermons-part="here"] a[data-sermon-row], [data-sermons-part="chapter"] a[data-sermon-row]').evaluateAll((all) => all.map((a) => a.getAttribute('href')));
  const hrefs = await rows.evaluateAll((all) => all.map((a) => a.getAttribute('href')));
  for (const href of hrefs) expect(passage).not.toContain(href);
  expect(new Set(hrefs).size).toBe(hrefs.length);
  // the shot shows the sermons on the same theme under the Themes line, which stays in the sheet's head
  await sheet.locator('h3', { hasText: 'On the same theme' }).scrollIntoViewIfNeeded();
  await shot(page, 'sermons-themes');
});

test('a theme list turned Off in Settings leaves no Themes line', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=study');
  const section = page.locator('[data-section="themes"]');
  await expect(section).toBeVisible();
  for (const name of ['Thompson Chain Topics', 'Torrey\'s New Topical Textbook']) {
    const group = section.getByRole('group', { name });
    await expect(group.getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
    await group.getByRole('button', { name: 'Off' }).click();
    await expect(group.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet.locator('h3').first()).toBeVisible();
  await page.waitForTimeout(500);
  await expect(sheet.locator('[data-sermons-themes]')).toHaveCount(0);
  await expect(sheet.locator('[data-sermons-part="theme"]')).toHaveCount(0);
});

/** Genesis 1's Sermons sheet, opened from the place line (the whole chapter). */
async function openGenesisOne(page: Page) {
  await page.locator('button[data-place-line]').click();
  await page.getByRole('region', { name: 'Verse view' }).getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Genesis 1' });
  await expect(sheet).toBeVisible();
  return sheet;
}

test('his Logos sermon archives start Off: Genesis 1 lists none of them (mw-qtu3zvz.12)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const sheet = await openGenesisOne(page);
  // the free sources answer, his archives do not
  await expect(sheet.locator('a[data-sermon-row]').first()).toBeVisible();
  await page.waitForTimeout(500);
  await expect(sheet.getByText('Who Is Man')).toHaveCount(0);
  await expect(sheet.locator('[data-sermon-credit]').filter({ hasText: /Greg Laurie|Greear|Heitzig/ })).toHaveCount(0);
});

test('with Greg Laurie On, Genesis 1 lists \'Who Is Man\', a link that opens in Logos (mw-qtu3zvz.12)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // the saved switch of the source (Settings > Study resources > Sermons is the next story)
  await keepSettings(page, { 'sermons.greg-laurie-logos': 'on' });
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const sheet = await openGenesisOne(page);
  const row = sheet.locator('a[data-sermon-row]').filter({ hasText: 'Who Is Man' });
  await expect(row).toHaveCount(1);
  await expect(row.locator('[data-sermon-meta]')).toContainText('Greg Laurie');
  await expect(row.locator('[data-sermon-meta]')).toContainText('Opens in Logos');
  await expect(row).toHaveAttribute('href', /^https:\/\/ref\.ly\/logosres\/LLS:GRGLRSRMNRCH\?art=YEAR\.1996\.6$/);
  await expect(sheet.locator('[data-sermon-credit]').filter({ hasText: 'Greg Laurie Sermon Archive' })).toBeVisible();
  // J. D. Greear and Skip Heitzig stay Off
  await expect(sheet.locator('[data-sermon-credit]').filter({ hasText: /Greear|Heitzig/ })).toHaveCount(0);
  await shot(page, 'sermons-logos');
});

test('Settings > Study resources > Sermons has a row for each bundled source, the Logos archives Off, and a source turned Off leaves its sermons out (mw-qtu3zvz.3)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=study');
  const section = page.locator('[data-section="sermons"]');
  await expect(section).toBeVisible();
  const on = async (name: string, value: 'On' | 'Off') => expect(section.getByRole('group', { name, exact: true }).getByRole('button', { name: value, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await on('Spurgeon\'s sermons (CCEL)', 'On');
  await on('Matthew Henry\'s sermons', 'On');
  await on('Greg Laurie\'s sermons', 'Off');
  await shot(page, 'sermons-settings');

  // Spurgeon Off: the sermons of Romans 5:8 are Henry's alone (or none), and none is Spurgeon's
  const spurgeon = section.getByRole('group', { name: 'Spurgeon\'s sermons (CCEL)', exact: true });
  await spurgeon.getByRole('button', { name: 'Off', exact: true }).click();
  await on('Spurgeon\'s sermons (CCEL)', 'Off');
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await page.waitForTimeout(500);
  await expect(view.getByRole('button', { name: /^Sermons/ })).toHaveCount(0);
});

test('with Logos On, his Pinned and On sermon archives are the In Logos group of the Sermons sheet, each a 44 px link into Logos at the verse (mw-qtu3zvz.3)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // Logos On, then one archive On and one Pinned from the Library's own Sermons page
  await openSettings(page);
  await openGroup(page, 'Study resources');
  const logos = page.getByRole('region', { name: 'Study resources' }).getByRole('switch', { name: 'Logos', exact: true });
  if ((await logos.getAttribute('aria-checked')) !== 'true') await logos.click();
  await expect(logos).toHaveAttribute('aria-checked', 'true');
  await page.goto('/#/library?kind=sermons');
  await expect(page.getByRole('heading', { name: 'Sermons', level: 1 })).toBeVisible();
  const choose = async (name: string, step: 'On' | 'Pin') => {
    const group = page.getByRole('radiogroup', { name, exact: true });
    await group.getByRole('radio', { name: step, exact: true }).click();
    await expect(group.getByRole('radio', { name: step, exact: true })).toHaveAttribute('aria-checked', 'true');
  };
  await choose('Greg Laurie Sermon Archive', 'On');
  await choose('J. D. Greear Sermon Archive', 'Pin');

  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet).toBeVisible();
  const group = sheet.getByRole('group', { name: 'In Logos', exact: true });
  await expect(group).toBeVisible();
  // after the bundled groups
  const heads = await sheet.locator('h3').allTextContents();
  expect(heads.at(-1)).toBe('In Logos');
  const rows = group.locator('a[data-archive-row]');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator('[data-sermon-title]')).toHaveText('J. D. Greear Sermon Archive');
  await expect(rows.nth(1).locator('[data-sermon-title]')).toHaveText('Greg Laurie Sermon Archive');
  for (let i = 0; i < 2; i++) {
    expect((await rows.nth(i).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    await expect(rows.nth(i).locator('[data-sermon-meta]')).toHaveText('Opens in Logos');
    await expect(rows.nth(i)).toHaveAttribute('href', /^logosres:LLS:[A-Z0-9.]+;ref=Bible\.Ro5\.8$/);
    await expect(rows.nth(i)).toHaveAttribute('data-fallback', /^https:\/\/ref\.ly\/logosres\/LLS%3A[A-Z0-9.]+\?ref=Bible\.Ro5\.8$/);
  }
  await group.scrollIntoViewIfNeeded();
  await shot(page, 'sermons-in-logos');
});
