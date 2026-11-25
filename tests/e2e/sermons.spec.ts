// tests/e2e/sermons.spec.ts — Lampas sermons on the screen (mw-qtu3zvz.2, docs/sermons.md) at 390x844: the quiet 'Sermons · N' door in the tools line of the Verse view of Romans 5:8, the Sermons sheet (On this verse,
// In this chapter, each row 44 px with the preacher, the date and where it opens) and a row that is a plain link out. The data is the committed index (public/sermons): no sermon's page is fetched, and the spec
// holds that no request is made to the sites the rows point at. The tests after them are mw-qtu3zvz.3's, as mw-qtu3zvz.92 left them: the one list of sermon sources behind Settings > Study resources > Sermons, and his Logos sermon books, In Logos, on the sheet
// (tests/e2e/sermon-sources.spec.ts holds the list itself at 120 sources).
// The last are mw-qtu3zvz.5's: the sheet online. The sermon index service is stubbed with page.route (the live one answers only once its VPS door is up); every other test has it refuse, so a live service never changes a count.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LOGOS_RESOURCES } from '../../src/data/logosSermonResources';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { keepSettings } from './keep-settings';
import { EVERY_LOGOS_SERMON, keepImport } from './keep-import';
import { openVerseView } from './verse-view';
import { turnLogosOn } from './settings-group';
import { afterFrames } from '../support/settled';

test.use({ viewport: { width: 390, height: 844 } });

/** Frames the page draws before a spec that expects a sermon, theme or door NOT to appear looks: the lookups have no end signal on the screen. */
const LOOKUP_FRAMES = 30;

const SERVICE = 'https://sermons.allmymind.org'; // the sermon index service the build asks (src/config.ts SERMONS_URL, default)
const CORS = { 'access-control-allow-origin': '*', 'content-type': 'application/json' }; // the service allows the app's origin; the stub allows any, as a preview server's origin is not the real one's

// the service is refused unless a test serves it: the counts above are the bundled index's
test.beforeEach(async ({ page }) => {
  await page.route(`${SERVICE}/**`, (route) => route.abort());
});

const SITES = /^https:\/\/(www\.)?(ccel\.org|archive\.org|spurgeongems\.org)\//;

test('Romans 5:8 has Sermons · N; the sheet groups the sermons; a row is a link out and nothing is fetched until it is tapped', async ({ page, context }) => {
  await openUnlocked(page);
  // under This browser: the default, Lampas, read aloud, opens a Spurgeon row in its own reader (tests/e2e/sermon-reader.spec.ts)
  await page.goto('/');
  await keepSettings(page, { sermonsOpenWeb: 'browser' });
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

test('Romans 5:8: no row\'s second line splits its \'Opens on the web\' or \'Needs the internet\' across two lines, online or offline (mw-qtu3zvz.48)', async ({ page, context }) => {
  await openUnlocked(page);
  await page.goto('/');
  await keepSettings(page, { sermonsOpenWeb: 'browser' });
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet).toBeVisible();
  // the rows of 'On the same theme' come after the passage's own (the theme tier is asked once they are drawn): count them all, not the first 22 (it failed on main, in 'shots', with 34 rows after a count of 22)
  await expect(sheet.locator('h3', { hasText: 'On the same theme' })).toBeVisible();
  const rows = sheet.locator('a[data-sermon-row]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(1);
  /** each row's phrase, its own span, and how many line boxes it takes */
  const phrases = async (said: string) => {
    const spans = sheet.locator('a[data-sermon-row] [data-sermon-opens]');
    await expect(spans).toHaveCount(count);
    await expect(spans.first()).toHaveText(said);
    return spans.evaluateAll((els) => els.map((el) => ({ text: el.textContent ?? '', rects: el.getClientRects().length })));
  };
  for (const { text, rects } of await phrases('Opens on the web')) expect(rects, `'${text}' on one line`).toBe(1);
  await shot(page, 'sermons-meta-online');
  await context.setOffline(true);
  for (const { text, rects } of await phrases('Needs the internet')) expect(rects, `'${text}' on one line`).toBe(1);
  await shot(page, 'sermons-meta-offline');
  await context.setOffline(false);
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
  await afterFrames(page, LOOKUP_FRAMES); // the browser's own frames, not a time: a loaded host draws them late, so the lookups have had as long as the host needed
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
  expect(await line.textContent()).not.toMatch(/[,;:] ·|[,;:]\s*$|[,;:]\s*[,;:]/);
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
  for (const heading of await themed.locator('h4').allTextContents()) {
    expect(heading).toMatch(/^On \S/);
    // reader order, never the module's surname-first 'On Sinner's Friend, Christ the' (mw-qtu3zvz.58)
    expect(heading).not.toMatch(/(, The| the| The| a)$/);
  }
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

test('Romans 5:8: each theme on the Themes line is a button that lists its sermons, and a way back leaves the sheet as it was (mw-qtu3zvz.81)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet).toBeVisible();
  const line = sheet.locator('[data-sermons-themes]');
  await expect(line).toBeVisible();
  const chips = line.locator('[data-theme-chip]');
  expect(await chips.count()).toBeGreaterThan(0);
  const before = await sheet.locator('h3').allTextContents();

  // a theme is a button named by the theme; a tap lists its sermons (the same rows as 'On the same theme'), in this sheet
  const chip = line.getByRole('button', { name: 'Love-Hatred: Of God' });
  await expect(chip).toBeVisible();
  expect((await chip.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await chip.click();
  const listed = sheet.locator('[data-sermons-part="theme-list"]');
  await expect(listed.getByRole('group', { name: /^On Love-Hatred/ })).toBeVisible();
  const rows = listed.locator('a[data-sermon-row]');
  expect(await rows.count()).toBeGreaterThan(0);
  for (let i = 0; i < Math.min(await rows.count(), 5); i++) expect((await rows.nth(i).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await expect(line).toHaveCount(0);
  await shot(page, 'sermons-theme-list');

  // back: the sheet is as it was, its Themes line and its groups
  await sheet.getByRole('button', { name: /Back to the sheet/ }).click();
  await expect(line).toBeVisible();
  await expect(listed).toHaveCount(0);
  await expect(sheet.locator('h3')).toHaveText(before);

  // and the phone's own Back does the same, leaving the sheet open
  await chip.click();
  await expect(listed).toBeVisible();
  await page.goBack();
  await expect(line).toBeVisible();
  await expect(sheet).toBeVisible();
});

test('2 Corinthians 13:1-10: the Themes line wraps whole chips, never fills more than a third of the sheet, and More shows the rest (mw-qtu3zvz.55)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=2co&c=13');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.locator('[data-heading]', { hasText: 'Examine Yourselves' }).getByRole('button').click();
  await page.getByRole('region', { name: 'Verse view' }).getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for 2 Corinthians 13:1-10' });
  await expect(sheet).toBeVisible();
  const line = sheet.locator('[data-sermons-themes]');
  await expect(line).toBeVisible();
  const third = async () => {
    const sheetBox = (await sheet.boundingBox())!;
    const lineBox = (await line.boundingBox())!;
    expect(lineBox.height).toBeLessThanOrEqual(sheetBox.height / 3 + 1);
  };
  const chips = line.locator('[data-theme-chip]');
  const more = line.getByRole('button', { name: 'More', exact: true });
  await expect(more).toBeVisible();
  expect(await chips.count()).toBe(4);
  // a whole chip each: none is wider than the line or cut by it
  const lineBox = (await line.boundingBox())!;
  for (let i = 0; i < (await chips.count()); i++) {
    const box = (await chips.nth(i).boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(lineBox.x + lineBox.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(lineBox.y + lineBox.height + 1);
  }
  await third();
  await shot(page, 'sermons-themes-more-closed');
  await more.click();
  await expect(line.getByRole('button', { name: 'Fewer', exact: true })).toBeVisible();
  expect(await chips.count()).toBeGreaterThan(4);
  // the rest is in the line's own box, which still fills no more than a third
  await third();
  await shot(page, 'sermons-themes-more-open');
  await line.getByRole('button', { name: 'Fewer', exact: true }).click();
  expect(await chips.count()).toBe(4);
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
  await afterFrames(page, LOOKUP_FRAMES); // the browser's own frames, not a time: a loaded host draws them late, so the lookups have had as long as the host needed
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
  await afterFrames(page, LOOKUP_FRAMES); // the browser's own frames, not a time: a loaded host draws them late, so the lookups have had as long as the host needed
  await expect(sheet.getByText('Who Is Man')).toHaveCount(0);
  await expect(sheet.locator('[data-sermon-credit]').filter({ hasText: /Greg Laurie|Greear|Heitzig/ })).toHaveCount(0);
});

test('with Greg Laurie On, Genesis 1 lists \'Who Is Man\', a link that opens in Logos (mw-qtu3zvz.12)', async ({ page }) => {
  await openUnlocked(page);
  await turnLogosOn(page); // a list made from Logos books is used only while Logos is On (mw-qtu3zvz.92)
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // the saved switch of the source; the archive is his: his Library import holds it (mw-qtu3zvz.94)
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
  await turnLogosOn(page);
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

test('with Chrysostom On, Matthew 8:5 lists a homily on it, a link that opens his volume in Logos (mw-qtu3zvz.20)', async ({ page }) => {
  await openUnlocked(page);
  await turnLogosOn(page);
  await page.goto('/#/?b=mat&c=8');
  await expect(page.locator('[data-verse="5"]')).toBeVisible();
  await keepImport(page);
  await keepSettings(page, { 'sermons.chrysostom-logos': 'on' });
  await expect(page.locator('[data-verse="5"]')).toBeVisible();
  const view = await openVerseView(page, 5);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Matthew 8:5' });
  await expect(sheet).toBeVisible();
  const row = sheet.locator('a[data-sermon-row]').filter({ hasText: 'Homily XXVI' }).first();
  await expect(row).toBeVisible();
  await expect(row.locator('[data-sermon-meta]')).toContainText('John Chrysostom');
  await expect(row.locator('[data-sermon-meta]')).toContainText('Opens in Logos');
  await expect(row).toHaveAttribute('href', /^https:\/\/ref\.ly\/logosres\/LLS:6\.60\.10\?off=\d+$/);
  await expect(sheet.locator('[data-sermon-credit]').filter({ hasText: 'John Chrysostom, Homilies' })).toBeVisible();
  await shot(page, 'sermons-chrysostom');
});

test('with no Library import kept, an archive switched On is still not offered: Genesis 19 lists no \'Genesis 19:15\' (mw-qtu3zvz.94)', async ({ page }) => {
  await openUnlocked(page);
  await turnLogosOn(page); // Logos is On, so only the import decides
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
  await afterFrames(page, LOOKUP_FRAMES);
  await expect(sheet.getByText('Genesis 19:15')).toHaveCount(0);
  await expect(sheet.locator('[data-sermon-credit]').filter({ hasText: 'My Sermon Notes' })).toHaveCount(0);
});

test('after a Library import is kept, the list of sermon sources does not ask him to import: no sources-import card, as an import with books is not none (mw-qtu3zvz.150)', async ({ page }) => {
  await openUnlocked(page);
  await turnLogosOn(page);
  await keepImport(page); // the rows and the note of an import that holds the archives
  await page.goto('/#/settings?sources=sermons');
  await expect(page.getByRole('heading', { name: 'Sermon sources', level: 1 })).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Greg Laurie\'s sermons', exact: true })).toBeVisible();
  await expect(page.getByTestId('sources-import')).toHaveCount(0);
});

test('Settings > Study resources > Sermons opens the one list: a row for each bundled source, the Logos lists Off, and a source turned Off leaves its sermons out (mw-qtu3zvz.3, mw-qtu3zvz.92)', async ({ page }) => {
  await openUnlocked(page);
  await turnLogosOn(page);
  await keepImport(page); // his import holds the archives, so their lists are in the list (mw-qtu3zvz.94)
  const section = page.locator('[data-section="sermons"]');
  await expect(section).toBeVisible();
  // the section is the door to the list, with its count, and Open web sermons in: no source has a row here
  await expect(section.getByTestId('sources-count')).toHaveText(`2 of ${bundledSources().length} on`);
  await expect(section.getByRole('group', { name: 'Open web sermons in', exact: true })).toBeVisible();
  await expect(section.getByRole('group', { name: /Spurgeon/ })).toHaveCount(0);
  await section.getByRole('button', { name: /^Sermon sources/ }).click();
  await expect(page.getByRole('heading', { name: 'Sermon sources', level: 1 })).toBeVisible();
  const on = async (name: string, value: 'On' | 'Off') => expect(page.getByRole('radiogroup', { name, exact: true }).getByRole('radio', { name: value, exact: true })).toHaveAttribute('aria-checked', 'true');
  await on('Spurgeon\'s sermons', 'On');
  await on('Matthew Henry\'s sermons', 'On');
  for (const name of ['Greg Laurie\'s sermons', 'Life Bible Ministry\'s Through the Bible', 'Mike Winger\'s Bible Thinker series']) await on(name, 'Off'); // the last two are web lists, Off to start (mw-qtu3zvz.280.3, mw-qtu3zvz.280.4)
  // his batch 2 books (mw-qtu3zvz.18)
  for (const name of ['Spurgeon\'s My Sermon Notes', 'John Wesley\'s sermons', 'George Whitefield\'s sermons', 'D. L. Moody\'s sermons']) await on(name, 'Off');
  // his batch 3 books (mw-qtu3zvz.20), Jimmy Evans's archive among them, which names no passage
  for (const name of ['Augustine\'s sermons', 'Chrysostom\'s homilies', 'John Piper\'s sermons', 'John Bunyan\'s last sermon', 'Charles Wesley\'s sermons', 'Jimmy Evans\'s sermons']) await on(name, 'Off');
  // his batch 4 books (mw-qtu3zvz.24), among them four lists that name no passage (Kuyper, The World's Great Sermons, McPherson, Strong)
  for (const name of ['Shedd\'s sermons', 'Burroughs\'s sermons', 'Keach\'s sermons', 'Maclaren\'s sermons', 'Kuyper\'s Rooted & Grounded', 'Broadus\'s Sermons', 'The World\'s Great Sermons', 'Princeton Sermons', 'McPherson\'s Healing Sermons', 'Strong\'s Philosophy and Religion']) await on(name, 'Off');
  // his batch 5 books (mw-qtu3zvz.26), Eyton, Chapin, Pope and Smale among them, which name no passage; Calvin's are in Portuguese and his row says so
  for (const name of ['Sedgwick\'s sermons', 'Moberly\'s Sermons on the Beatitudes', 'Eyton\'s The Beatitudes', 'Chapin\'s Discourses on the Beatitudes', 'Watson\'s sermons on the Beatitudes', 'Pope\'s The Inward Witness', 'Smale\'s The Pentecostal Blessing', 'W. I. Evans\'s This River Must Flow!', 'Calvin\'s sermons in Portuguese']) await on(name, 'Off');
  // his batch 6 books (mw-qtu3zvz.31): the eleven Sermon Outlines and the five Sermon Starters, each a list of its own (the Settings list has no group for a series), all Off
  for (const name of ['Sermon Outlines: Evangelistic', 'Sermon Outlines: for Growing Christians', 'Sermon Outlines: for Seekers', 'Sermon Outlines: for Special Days', 'Sermon Outlines: on 1 Corinthians', 'Sermon Outlines: on Acts', 'Sermon Outlines: on Christian Living', 'Sermon Outlines: on Ephesians', 'Sermon Outlines: on Galatians-Ephesians-Philippians-Colossians', 'Sermon Outlines: on Romans', 'Sermon Outlines: on the Gospels', 'Sermon Starters, vol 1', 'Sermon Starters, vol 2', 'Sermon Starters, vol 3', 'Sermon Starters, vol 4', 'Sermon Starters, vol 5']) await on(name, 'Off');
  await expect(page.getByRole('radio', { name: 'Off', exact: true, checked: true })).toHaveCount(bundledSources().length - 2); // every list but Spurgeon's and Henry's is Off, a list bundled later too
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0); // the bundled lists and no book: one group, so no heading; from eight sources up there is a search field
  await expect(page.getByRole('searchbox', { name: 'Search sermon sources' })).toHaveAttribute('placeholder', `Search ${bundledSources().length} sermon sources`);
  await shot(page, 'sermons-settings');

  // Spurgeon and Henry Off: Romans 5:8 has no listed sermon, and so no door
  for (const name of ['Spurgeon\'s sermons', 'Matthew Henry\'s sermons']) {
    await page.getByRole('radiogroup', { name, exact: true }).getByRole('radio', { name: 'Off', exact: true }).click();
    await on(name, 'Off');
  }
  await expect(page.getByTestId('sources-line')).toHaveText(`none of ${bundledSources().length} on`);
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await afterFrames(page, LOOKUP_FRAMES);
  await expect(view.getByRole('button', { name: /^Sermons/ })).toHaveCount(0);
});

test('with Logos On and two sermon books On that hold no sermon by passage, the Sermons sheet has no In Logos group: Galatians 1:4 lists neither Sermon Outlines: Soul Winning! Church Building! nor Things New and Old: Old and New Testament Studies (mw-qtu3zvz.239; The Beatitudes was one until batch 5 Eyton list stood for it, mw-qtu3zvz.26; Sermon Outlines on 1 Corinthians and on Acts were two until batch 6, mw-qtu3zvz.31)', async ({ page }) => {
  await openUnlocked(page);
  await turnLogosOn(page);
  // his import holds the archives and two books of sermons that no list stands for (mw-qtu3zvz.94)
  await keepImport(page, [...EVERY_LOGOS_SERMON, 'LLS:NWOLDSCOFLD', 'LLS:SOSOULWIN']);
  // the two books On, from the one list of sermon sources: the only place a book of sermons is switched
  await page.goto('/#/settings?sources=sermons');
  await expect(page.getByRole('heading', { name: 'Sermon sources', level: 1 })).toBeVisible();
  for (const name of ['Things New and Old: Old and New Testament Studies', 'Sermon Outlines: Soul Winning! Church Building!']) {
    const group = page.getByRole('radiogroup', { name, exact: true });
    await expect(group.getByRole('radio', { name: 'Pin', exact: true })).toHaveCount(0);
    await group.getByRole('radio', { name: 'On', exact: true }).click();
    await expect(group.getByRole('radio', { name: 'On', exact: true })).toHaveAttribute('aria-checked', 'true');
  }

  // Logos cannot open such a book at a verse it has no sermon indexed at ('Navigation failed'), and the catalogue knows no sermon of either: no row, at any verse
  for (const [book, chapter, verse, title] of [['gal', 1, 4, 'Sermons for Galatians 1:4'], ['rom', 5, 8, 'Sermons for Romans 5:8']] as const) {
    await page.goto(`/#/?b=${book}&c=${chapter}`);
    await expect(page.locator(`[data-verse="${verse}"]`)).toBeVisible();
    const view = await openVerseView(page, verse);
    await view.getByRole('button', { name: /^Sermons(?: · \d+)?$/ }).click();
    const sheet = page.getByRole('dialog', { name: title });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('group', { name: 'In Logos', exact: true })).toHaveCount(0);
    await expect(sheet.locator('a[data-archive-row]')).toHaveCount(0);
    if (book === 'gal') await shot(page, 'sermons-no-in-logos-row');
    await page.goBack();
    await expect(sheet).toBeHidden();
  }
});

/** The service's answers, the examples of the sermon-index repository's docs/api.md (tests/fixtures/sermons) given the id of a bundled Spurgeon row (104, Romans 5:8) and a row the bundle lacks. */
async function serveService(page: Page, { down = false, extra = [] }: { down?: boolean; extra?: object[] } = {}): Promise<{ asked: string[] }> {
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
      total: 2 + extra.length,
      rows: [sermon('104', 'Love\'s Commendation, Revised', 'Rom.5.8', 'https://ccel.org/ccel/spurgeon/sermons02/revised.html'), sermon('9999', 'Reigning Grace, Newly Found', 'Rom.5.21', 'https://ccel.org/ccel/spurgeon/sermons06/new.html'), ...extra],
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

test('online: a source the bundle lacks gets an Off row in the list of sermon sources the first time it is seen (mw-qtu3zvz.5)', async ({ page }) => {
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
  await page.goto('/#/settings?sources=sermons');
  await expect(page.getByRole('heading', { name: 'Sermon sources', level: 1 })).toBeVisible();
  // named without its bracket, with where it opens under it
  const group = page.getByRole('radiogroup', { name: 'Newbie\'s sermons', exact: true });
  await expect(group.getByRole('radio', { name: 'Off', exact: true })).toHaveAttribute('aria-checked', 'true');
  expect((await group.getByRole('radio', { name: 'On', exact: true }).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  await expect(page.locator('[data-source="sermons.newbie-sermons"]')).toContainText('on the web');
  // Logos is off, so the lists are the bundled ones that name no Logos book and the new one; two of them start On
  const onTheWeb = bundledSources().filter(({ id }) => !(id in LOGOS_RESOURCES)).length;
  await expect(page.getByTestId('sources-line')).toHaveText(`2 of ${onTheWeb + 1} on`);
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

test('Open web sermons in is Lampas, read aloud to start, Firefox is kept across a reload, and off Android a row stays an https link (mw-qtu3zvz.16, mw-ecpivg5.2)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=study');
  const section = page.locator('[data-section="sermons"]');
  await expect(section).toBeVisible();
  const row = section.getByRole('group', { name: 'Open web sermons in', exact: true });
  await expect(row.getByRole('button', { name: 'Lampas, read aloud', exact: true })).toHaveAttribute('aria-pressed', 'true');
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

test('Romans 5:8: Hide this theme is one 44 px tap that says where it comes back, and Settings > Study resources > Themes > Hidden themes lists it with Show again (mw-qtu3zvz.91)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  await expect(sheet).toBeVisible();
  const line = sheet.locator('[data-sermons-themes]');
  const chip = line.getByRole('button', { name: 'Love-Hatred: Of God' });
  await expect(chip).toBeVisible();
  await chip.click();

  // Hide this theme: 44 px, at the top of the theme's sermons, nothing cut off at its right
  const hide = sheet.getByRole('button', { name: 'Hide this theme', exact: true });
  await expect(hide).toBeVisible();
  const box = (await hide.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(43.5);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(await hide.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await shot(page, 'theme-hide');

  // one tap: back on the sheet, the theme gone from the line, and the sheet says where it comes back
  await hide.click();
  const said = sheet.locator('[data-theme-hidden-notice]');
  await expect(said).toHaveText('Hidden. Settings > Study resources > Themes brings it back.');
  await expect(line.getByRole('button', { name: 'Love-Hatred: Of God' })).toHaveCount(0);
  await expect(sheet.getByRole('group', { name: /^On Love-Hatred/ })).toHaveCount(0);
  expect(await said.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await shot(page, 'theme-hidden');
  // it stays hidden after a reload
  await page.reload();
  // the reload keeps the Verse view open on verse 8
  const again = page.getByRole('region', { name: 'Verse view' });
  await expect(again).toBeVisible();
  await again.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const kept = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' }).locator('[data-sermons-themes]');
  await expect(kept.locator('[data-theme-chip]').first()).toBeVisible();
  await expect(kept.getByRole('button', { name: /^Love-Hatred/ })).toHaveCount(0);

  // Settings > Study resources > Themes: Hidden themes lists it, and Show again is one 44 px tap that says what happened
  await page.goto('/#/settings?group=study');
  const row = page.locator('[data-section="themes"] [data-setting="themesHidden"]');
  await row.scrollIntoViewIfNeeded();
  await expect(row).toBeVisible();
  await expect(row.locator('[data-hidden-themes] li')).toHaveText([/Love-Hatred/]);
  const show = row.getByRole('button', { name: /^Show again/ });
  const showBox = (await show.boundingBox())!;
  expect(showBox.height).toBeGreaterThanOrEqual(43.5);
  expect(showBox.x + showBox.width).toBeLessThanOrEqual(390);
  expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await shot(page, 'themes-hidden-list');
  await show.click();
  await expect(row.locator('[data-hidden-said]')).toHaveText('Shown again: Love-Hatred.');
  await expect(row.locator('[data-hidden-none]')).toBeVisible();
  await row.scrollIntoViewIfNeeded();
  await shot(page, 'themes-shown-again');
});

/** The YouTube IFrame API as a fake (the real one is youtube.com's script): a Player that draws a box in its target, says it is ready, and counts playVideo; window.__ytBlock makes it report autoplay blocked. */
const FAKE_YOUTUBE = `
window.__yt = { made: [], played: 0 };
window.YT = { PlayerState: { PLAYING: 1, BUFFERING: 3 }, Player: class {
  constructor(target, opts) {
    this.opts = opts;
    const box = document.createElement('iframe');
    box.setAttribute('data-fake-youtube', opts.videoId);
    box.setAttribute('src', 'about:blank');
    target.appendChild(box);
    window.__yt.made.push({ host: opts.host, videoId: opts.videoId });
    setTimeout(() => opts.events.onReady({ target: this }), 0);
  }
  playVideo() {
    window.__yt.played++;
    if (window.__ytBlock) this.opts.events.onAutoplayBlocked({});
    else this.opts.events.onStateChange({ data: 1 });
  }
  destroy() { window.__yt.destroyed = true; }
} };
window.onYouTubeIframeAPIReady && window.onYouTubeIframeAPIReady();
`;

const VIDEO_ROWS = [
  { source: 'spurgeon-ccel', id: '9101', title: 'The Day of the Lord', preacher: 'Brookfield First', date: '2026-11-01', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', alt_url: null, kind: 'video', ref: 'Rom.5.8', role: 'text', width: 1 },
  { source: 'spurgeon-ccel', id: '9102', title: 'Like Precious Faith', preacher: 'Phil Morgan', date: '2026-10-25', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', alt_url: 'https://brookfieldfirst.subspla.sh/q59d572', kind: 'video', ref: 'Rom.5.8', role: 'text', width: 1 },
];

test('a video sermon plays in the app: a YouTube row opens the player sheet over the sermons with Close, not the web (mw-qtu3zvz.83)', async ({ page }) => {
  await openUnlocked(page);
  await serveService(page, { extra: VIDEO_ROWS });
  await page.route('https://www.youtube.com/iframe_api', (route) => route.fulfill({ status: 200, contentType: 'application/javascript', body: FAKE_YOUTUBE }));
  let leftTheApp = 0;
  page.on('popup', () => leftTheApp++);
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  const row = sheet.locator('a[data-sermon-row]').filter({ hasText: 'The Day of the Lord' });
  await expect(row).toHaveCount(1);
  // the play label, not 'Opens on the web'
  await expect(row.locator('[data-sermon-meta]')).toContainText('Plays here');
  await expect(row.locator('[data-sermon-meta]')).not.toContainText('Opens on the web');
  await row.click();

  const player = page.getByRole('dialog', { name: 'The Day of the Lord' });
  await expect(player).toBeVisible();
  await expect(player.locator('[data-fake-youtube="dQw4w9WgXcQ"]')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __yt: { made: object[] } }).__yt.made)).toEqual([{ host: 'https://www.youtube-nocookie.com', videoId: 'dQw4w9WgXcQ' }]);
  // a tap opens it; nothing starts by itself
  expect(await page.evaluate(() => (window as unknown as { __yt: { played: number } }).__yt.played)).toBe(0);
  expect(leftTheApp).toBe(0);
  // 16:9 inside the 390 px screen, Close a 44 px target
  const box = (await player.locator('[data-sermon-video]').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390.5);
  expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
  const close = player.getByRole('button', { name: 'Close' });
  expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'sermon-player-youtube');

  await close.click();
  await expect(player).toBeHidden();
  await expect(sheet).toBeVisible();
  // the phone's Back closes the player first, then the sheet
  await row.click();
  await expect(player).toBeVisible();
  await page.goBack();
  await expect(player).toBeHidden();
  await expect(sheet).toBeVisible();
});

test('a Subsplash row plays in Subsplash\'s own embed player in the same sheet (mw-qtu3zvz.83)', async ({ page }) => {
  await openUnlocked(page);
  await serveService(page, { extra: VIDEO_ROWS });
  const embedded: string[] = [];
  await page.route('https://subsplash.com/**', (route) => {
    embedded.push(route.request().url());
    return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>embed</title><body style="background:#222">embed</body>' });
  });
  await page.goto('/#/?b=rom&c=5');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  const view = await openVerseView(page, 8);
  await view.getByRole('button', { name: /^Sermons · \d+$/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Sermons for Romans 5:8' });
  const row = sheet.locator('a[data-sermon-row]').filter({ hasText: 'Like Precious Faith' });
  await expect(row.locator('[data-sermon-meta]')).toContainText('Plays here');
  await row.click();
  const player = page.getByRole('dialog', { name: 'Like Precious Faith' });
  await expect(player).toBeVisible();
  await expect(player.locator('iframe')).toHaveAttribute('src', 'https://subsplash.com/u/brookfieldfirst/media/embed/d/q59d572');
  await expect.poll(() => embedded).toEqual(['https://subsplash.com/u/brookfieldfirst/media/embed/d/q59d572']);
  await shot(page, 'sermon-player-subsplash');
  await player.getByRole('button', { name: 'Close' }).click();
  await expect(player).toBeHidden();
});

/** The bundled passage lists (public/sermons/index.json): the totals the list of sermon sources says are counted from them, so a source bundled later needs no new number in this spec. */
function bundledSources(): { id: string }[] {
  return (JSON.parse(readFileSync('public/sermons/index.json', 'utf8')) as { sources: { id: string }[] }).sources;
}
