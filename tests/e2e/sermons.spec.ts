// tests/e2e/sermons.spec.ts — Lampas sermons on the screen (mw-qtu3zvz.2, docs/sermons.md) at 390x844: the quiet 'Sermons · N' door in the tools line of the Verse view of Romans 5:8, the Sermons sheet (On this verse,
// In this chapter, each row 44 px with the preacher, the date and where it opens) and a row that is a plain link out. The data is the committed index (public/sermons): no sermon's page is fetched, and the spec
// holds that no request is made to the sites the rows point at. The tests after them are mw-qtu3zvz.3's: the Sermons rows of Settings and his Logos sermon archives, In Logos, on the sheet.
// The last are mw-qtu3zvz.5's: the sheet online. The sermon index service is stubbed with page.route (the live one answers only once its VPS door is up); every other test has it refuse, so a live service never changes a count.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { keepSettings } from './keep-settings';
import { keepImport } from './keep-import';
import { openVerseView } from './verse-view';
import { openSettings } from './openSettings';
import { openGroup } from './settings-group';

test.use({ viewport: { width: 390, height: 844 } });

/** The sermon index service the build asks (src/config.ts SERMONS_URL, default). */
const SERVICE = 'https://sermons.allmymind.org';
/** The service allows the app's origin; the stub allows any, as a preview server's origin is not the real one's. */
const CORS = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };

// the service is refused unless a test serves it: the counts above are the bundled index's
test.beforeEach(async ({ page }) => {
  await page.route(`${SERVICE}/**`, (route) => route.abort());
});

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
  // no label of the line ends in the module's stray comma before the ' · ' (mw-qtu3zvz.51)
  expect(await line.textContent()).not.toMatch(/[,;:] ·|[,;:]\s*$/);
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
  // the saved switch of the source (Settings > Study resources > Sermons is the next story); the archive is his: his Library import holds it (mw-qtu3zvz.94)
  await keepImport(page);
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

test('with Spurgeon\'s My Sermon Notes On, Genesis 19 lists \'Genesis 19:15\', a link that opens his book in Logos (mw-qtu3zvz.18)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=19');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await keepImport(page);
  await keepSettings(page, { 'sermons.spurgeon-sermon-notes-logos': 'on' });
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.locator('button[data-place-line]').click();
  await page.getByRole('region', { name: 'Verse view' }).getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Genesis 19' });
  await expect(sheet).toBeVisible();
  const row = sheet.locator('a[data-sermon-row]').filter({ hasText: 'Genesis 19:15' });
  await expect(row).toHaveCount(1);
  await expect(row.locator('[data-sermon-meta]')).toContainText('Charles H. Spurgeon');
  await expect(row.locator('[data-sermon-meta]')).toContainText('Opens in Logos');
  await expect(row).toHaveAttribute('href', 'https://ref.ly/logosres/LLS:MYSRMNOTES01?off=14522');
  await expect(sheet.locator('[data-sermon-credit]').filter({ hasText: 'Charles H. Spurgeon, My Sermon Notes' })).toBeVisible();
  await shot(page, 'sermons-notes');
});

test('with no Library import kept, an archive switched On is still not offered: Genesis 19 lists no \'Genesis 19:15\' (mw-qtu3zvz.94)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=19');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await keepImport(page, []);
  await keepSettings(page, { 'sermons.spurgeon-sermon-notes-logos': 'on' });
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.locator('button[data-place-line]').click();
  await page.getByRole('region', { name: 'Verse view' }).getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Genesis 19' });
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('a[data-sermon-row]').first()).toBeVisible();
  await page.waitForTimeout(500);
  await expect(sheet.getByText('Genesis 19:15')).toHaveCount(0);
  await expect(sheet.locator('[data-sermon-credit]').filter({ hasText: 'My Sermon Notes' })).toHaveCount(0);
});

test('Settings > Study resources > Sermons has a row for each bundled source, the Logos archives Off, and a source turned Off leaves its sermons out (mw-qtu3zvz.3)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=study');
  await expect(page.locator('[data-section="sermons"]')).toBeVisible();
  await keepImport(page); // his import holds the archives, so their rows are drawn (mw-qtu3zvz.94)
  const section = page.locator('[data-section="sermons"]');
  await expect(section).toBeVisible();
  const on = async (name: string, value: 'On' | 'Off') => expect(section.getByRole('group', { name, exact: true }).getByRole('button', { name: value, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await on('Spurgeon\'s sermons (CCEL)', 'On');
  await on('Matthew Henry\'s sermons', 'On');
  await on('Greg Laurie\'s sermons', 'Off');
  // his batch 2 books (mw-qtu3zvz.18)
  for (const name of ['Spurgeon\'s My Sermon Notes', 'John Wesley\'s sermons', 'George Whitefield\'s sermons', 'D. L. Moody\'s sermons']) await on(name, 'Off');
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
  await keepImport(page); // his import holds the archives (mw-qtu3zvz.94)
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

/** The service's answers, the examples of the sermon-index repository's docs/api.md (tests/fixtures/sermons) given the id of a bundled Spurgeon row (104, Romans 5:8) and a row the bundle lacks. */
async function serveService(page: Page, { down = false }: { down?: boolean } = {}): Promise<{ asked: string[] }> {
  const asked: string[] = [];
  await page.route(`${SERVICE}/**`, async (route) => {
    const url = new URL(route.request().url());
    asked.push(`${url.pathname}${url.search}`);
    if (down) return route.abort();
    const json = (body: unknown) => route.fulfill({ status: 200, headers: CORS, body: JSON.stringify(body) });
    const sermon = (id: string, title: string, ref: string, address: string) => ({ source: 'spurgeon-ccel', id, title, preacher: 'C. H. Spurgeon', date: null, url: address, alt_url: null, kind: 'link', ref, role: 'text', width: 1 });
    if (url.pathname === '/v1/sources') {
      return json({
        rows: [
          { id: 'spurgeon-ccel', name: 'Spurgeon', kind: 'sermons', licence: 'x', credit: 'x', homepage: 'https://ccel.org/ccel/spurgeon', on_by_default: true, rows: 1 },
          { id: 'newbie-sermons', name: 'Newbie\'s sermons (a source the bundle lacks)', kind: 'sermons', licence: 'x', credit: 'The Newbie Collection', homepage: 'https://newbie.example', on_by_default: false, rows: 1 },
        ],
      });
    }
    if (url.pathname === '/v1/search') {
      return json({
        q: url.searchParams.get('q'),
        rows: [
          { kind: 'sermon', source: 'spurgeon-ccel', id: '37', title: 'Law and Grace', ref: 'Rom.5.20', url: 'https://ccel.org/ccel/spurgeon/sermons01/sermons01.xxxvi.html', rank: 0.6 },
          { kind: 'theme', source: 'themes-demo', id: 'atonement', title: 'Atonement', ref: null, url: null, rank: 0.2 },
        ],
      });
    }
    if (url.pathname === '/v1/sermons' && url.searchParams.get('tier') === 'theme-only') {
      return json({ ref: 'Gen.1.1-Rev.22.21', passage: null, theme: { total: 1, rows: [{ ...sermon('1191', 'For Whom Did Christ Die?', 'Rom.5.6', 'https://ccel.org/ccel/spurgeon/sermons20/sermons20.viii_1.html'), theme: { source: 'themes-demo', topic: 'atonement', label: 'Atonement', part: null, part_label: null } }] } });
    }
    return json({
      ref: 'Rom.5',
      total: 2,
      rows: [sermon('104', 'Love\'s Commendation, Revised', 'Rom.5.8', 'https://ccel.org/ccel/spurgeon/sermons02/revised.html'), sermon('9999', 'Reigning Grace, Newly Found', 'Rom.5.21', 'https://ccel.org/ccel/spurgeon/sermons06/new.html')],
    });
  });
  return { asked };
}

test('online: the sheet shows the bundled rows, then the service\'s newest, and says \'Latest from the index · N new\' (mw-qtu3zvz.5)', async ({ page }) => {
  await openUnlocked(page);
  const { asked } = await serveService(page);
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet).toBeVisible();
  const line = sheet.locator('[data-sermons-latest]');
  await expect(line).toHaveText('Latest from the index · 1 new');
  // the service's row of the same source and id wins: the newer title and address
  const revised = sheet.locator('a[data-sermon-row]').filter({ hasText: 'Love\'s Commendation, Revised' });
  await expect(revised).toHaveCount(1);
  await expect(revised).toHaveAttribute('href', 'https://ccel.org/ccel/spurgeon/sermons02/revised.html');
  await expect(sheet.getByText("Love's Commendation", { exact: true })).toHaveCount(0);
  // a row the bundle lacks is under its group (In this chapter: Romans 5:21)
  await expect(sheet.locator('[data-sermons-part="chapter"] a[data-sermon-row]').filter({ hasText: 'Reigning Grace, Newly Found' })).toHaveCount(1);
  // the line sits under the title
  const title = await sheet.getByRole('heading', { level: 2 }).boundingBox();
  expect((await line.boundingBox())!.y).toBeGreaterThanOrEqual(title!.y + title!.height - 1);
  // asked once for the chapter, by the sources that are On, with nothing of his
  // (the theme tier, tier=theme-only, is a second ask, for the notes' direct themes: mw-qtu3zvz.59.2)
  const sermons = asked.filter((a) => a.startsWith('/v1/sermons') && !a.includes('tier=theme-only'));
  expect(sermons).toHaveLength(1);
  expect(sermons[0]).toMatch(/^\/v1\/sermons\?ref=rom\.5&source=[a-z,-]*spurgeon-ccel[a-z,-]*&limit=200$/);
  expect(sermons[0]).not.toContain('newbie-sermons');
  await shot(page, 'sermons-online');
});

test('online: a search is answered by the service alone, a sermon opens where it lives and a theme lists its sermons in the sheet (mw-qtu3zvz.5)', async ({ page }) => {
  await openUnlocked(page);
  const { asked } = await serveService(page);
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  const field = sheet.getByRole('searchbox', { name: 'Search sermons and themes' });
  await expect(field).toBeEnabled();
  expect((await field.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await field.fill('grace');
  const found = sheet.getByRole('group', { name: 'Found' });
  const law = found.locator('a[data-sermon-row]').filter({ hasText: 'Law and Grace' });
  await expect(law).toHaveAttribute('href', 'https://ccel.org/ccel/spurgeon/sermons01/sermons01.xxxvi.html');
  expect(asked.filter((a) => a.startsWith('/v1/search'))).toEqual(['/v1/search?q=grace']);
  await found.getByRole('button', { name: /Atonement/ }).click();
  await expect(found.locator('[data-found-theme] a[data-sermon-row]')).toHaveText(/For Whom Did Christ Die\?/);
  for (const row of await found.locator('a[data-sermon-row], button').all()) expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await found.scrollIntoViewIfNeeded();
  await shot(page, 'sermons-search');
});

test('online: a source the bundle lacks gets an Off row in Settings the first time it is seen (mw-qtu3zvz.5)', async ({ page }) => {
  await openUnlocked(page);
  await serveService(page);
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet.locator('[data-sermons-latest]')).toBeVisible();
  // its rows are not asked for while it is Off, and its credit is not on the sheet
  await expect(sheet.locator('[data-sermon-credit]').filter({ hasText: 'Newbie' })).toHaveCount(0);
  await page.goto('/#/settings?group=study');
  const section = page.locator('[data-section="sermons"]');
  await expect(section).toBeVisible();
  const group = section.getByRole('group', { name: 'Newbie\'s sermons', exact: true });
  await expect(group.getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect((await group.getByRole('button', { name: 'On', exact: true }).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await group.scrollIntoViewIfNeeded();
  await shot(page, 'sermons-online-source');
});

test('online: when the service cannot be reached the bundled rows stand, the sheet says Offline within 2 seconds and the search is greyed (mw-qtu3zvz.5)', async ({ page }) => {
  await openUnlocked(page);
  await serveService(page, { down: true });
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  const opened = performance.now();
  await expect(sheet.locator('[data-sermons-latest]')).toHaveText('Offline: the bundled index', { timeout: 2000 }); // the window is the rule itself: the sheet says Offline within 2 s (docs/sermons.md 'When online')
  expect(performance.now() - opened).toBeLessThan(2500);
  const field = sheet.getByRole('searchbox', { name: 'Search sermons and themes' });
  await expect(field).toBeDisabled();
  await expect(field).toHaveAttribute('placeholder', 'Needs the internet');
  await expect(sheet.locator('[data-sermons-part="here"] a[data-sermon-row]').first()).toBeVisible();
});

// mw-qtu3zvz.16: Settings > Study resources > Sermons > Open web sermons in (This browser | Firefox); with Firefox on Android a web row's link is the Firefox intent, its https address the fallback.
const ANDROID_UA = 'Mozilla/5.0 (Linux; Android 16; SM-S938B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';

async function webRows(page: Page) {
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet).toBeVisible();
  const rows = sheet.locator('[data-sermons-part="here"] a[data-sermon-row], [data-sermons-part="chapter"] a[data-sermon-row]');
  await expect(rows.first()).toBeVisible();
  return { sheet, rows };
}

test('Open web sermons in is This browser to start, Firefox is kept across a reload, and off Android a row stays an https link (mw-qtu3zvz.16)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=study');
  const section = page.locator('[data-section="sermons"]');
  await expect(section).toBeVisible();
  const row = section.getByRole('group', { name: 'Open web sermons in', exact: true });
  await expect(row.getByRole('button', { name: 'This browser', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await row.getByRole('button', { name: 'Firefox', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Firefox', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'sermons-open-web-setting');
  await page.reload();
  await expect(section.getByRole('group', { name: 'Open web sermons in', exact: true }).getByRole('button', { name: 'Firefox', exact: true })).toHaveAttribute('aria-pressed', 'true');
  // this is not an Android phone: the choice does nothing
  const { rows } = await webRows(page);
  expect(await rows.first().getAttribute('href')).toMatch(/^https:\/\//);
});

test.describe('on an Android phone', () => {
  test.use({ userAgent: ANDROID_UA });

  test('with Firefox chosen a web row is the Firefox intent with its https address as the fallback; with This browser it is the https link (mw-qtu3zvz.16)', async ({ page }) => {
    await openUnlocked(page);
    let { sheet, rows } = await webRows(page);
    expect(await rows.first().getAttribute('href')).toMatch(/^https:\/\//);
    await keepSettings(page, { sermonsOpenWeb: 'firefox' });
    ({ sheet, rows } = await webRows(page));
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const href = (await rows.nth(i).getAttribute('href')) ?? '';
      expect(href).toMatch(/^intent:\/\/[^#]+#Intent;scheme=https;package=org\.mozilla\.firefox;S\.browser_fallback_url=https%3A%2F%2F[^;]+;end$/);
      expect(decodeURIComponent(href.split('S.browser_fallback_url=')[1].replace(/;end$/, ''))).toMatch(/^https:\/\//);
    }
    // the source credit's home page link goes the same way
    expect(await sheet.locator('[data-sermon-credit] a').first().getAttribute('href')).toMatch(/^intent:\/\//);
    await shot(page, 'sermons-open-web-firefox');
  });
});
