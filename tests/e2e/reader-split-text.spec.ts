import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { drag } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

// The Reader split, the second text (mw-5r3p30.1130, docs/design/reader-split.md 'A text pane' and 'The Link'): the Verse view's Tools line ends with Split, which opens the sheet 'Beside Genesis 14'; a text
// chosen there docks beside the passage with its handle row (the text's name, Link, Close), the two panes kept on the same verse as either scrolls (Lampas's verse number, by the Septuagint's own
// where it differs), a verse the text lacks as a muted row, a word tap over both panes, and the name swapping the text. public/data-lxx ships no chapter in the gate: the Septuagint's files are the fixtures
// of tests/fixtures/data-lxx answered by route, Genesis 14 being the fixture of Genesis 1 renumbered (as tutor-door-overlays.spec.ts does for Genesis 13), and the passage is the Hebrew (Settings > Old Testament in Greek Off).
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// the gesture helpers time a drag on the page's clock, so it is installed before the page opens
test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    let body = readFileSync(`tests/fixtures/data-lxx/${/^gen\/1[45]\.json$/.test(path) ? 'gen/1.json' : path}`, 'utf8');
    if (path === 'index.json') {
      const index = JSON.parse(body) as { books: { code: string; chapters: number; verses: number[]; fingerprints: string[]; lampasChapters: number[][] }[] };
      const gen = index.books.find((b) => b.code === 'gen')!;
      gen.chapters = 15;
      gen.verses = Array.from({ length: 15 }, () => 24);
      gen.fingerprints = Array.from({ length: 15 }, () => gen.fingerprints[0]);
      gen.lampasChapters = Array.from({ length: 15 }, (_, i) => [i + 1]);
      body = JSON.stringify(index);
    } else if (path === 'gen/14.json' || path === 'gen/15.json') {
      const n = path === 'gen/14.json' ? 14 : 15;
      const chapter = JSON.parse(readFileSync('tests/fixtures/data-lxx/gen/1.json', 'utf8')) as { chapter: number; verses: { n: number; ref: { book: string; chapter: number; verse: number } }[] };
      chapter.chapter = n;
      chapter.verses = chapter.verses.filter((v) => v.n <= 24);
      for (const v of chapter.verses) v.ref = { book: 'gen', chapter: n, verse: v.n };
      body = JSON.stringify(chapter);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
});

const PICTURE = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#e8dcc0"/></svg>`;
const dock = (page: Page) => page.locator('[data-dock]');
const link = (page: Page) => page.locator('[data-dock-handle]').getByRole('button', { name: 'Link', exact: true });

/** The verse at the top of a scroll box: the first of its `item`s whose bottom is more than half a line below the box's top, and how far its top is from the box's. */
const topOf = (page: Page, box: string, item: string, attr: string) =>
  page.evaluate(
    ([b, i, a]) => {
      const el = document.querySelector(b)!;
      const top = el.getBoundingClientRect().top;
      for (const row of Array.from(el.querySelectorAll<HTMLElement>(i))) {
        const r = row.getBoundingClientRect();
        if (r.bottom > top + 12) return { n: Number(row.getAttribute(a)), offset: Math.round(r.top - top) };
      }
      return null;
    },
    [box, item, attr],
  );
const passageTop = (page: Page) => topOf(page, '[data-reader]', '[data-verse]', 'data-verse');
const dockTop = (page: Page) => topOf(page, '[data-dock-body]', '[data-dock-verse]', 'data-dock-verse');

/** Scrolls a box as a user's scroll does (the scroll event follows): `item` number `n` to the box's top. */
const scrollTo = (page: Page, box: string, item: string, n: number) =>
  page.evaluate(
    ([b, sel, verse]) => {
      const el = document.querySelector(b)!;
      const row = el.querySelector(sel.replace('{n}', String(verse)))!;
      el.scrollTop += row.getBoundingClientRect().top - el.getBoundingClientRect().top;
    },
    [box, item, n] as const,
  );
const scrollPassage = (page: Page, n: number) => scrollTo(page, '[data-reader]', '[data-verse="{n}"]', n);
const scrollDock = (page: Page, n: number) => scrollTo(page, '[data-dock-body]', '[data-dock-verse="{n}"]', n);

/** Opens the Verse view of verse `n` of a chapter and taps Split in its Tools line: the sheet 'Beside <chapter>'. */
async function openChooser(page: Page, url: string, n: number, title: string) {
  await page.goto(url);
  await expect(page.locator(`[data-verse="${n}"]`)).toBeAttached();
  const view = await openVerseView(page, n);
  const tools = view.getByRole('group', { name: 'Tools' });
  const split = tools.getByRole('button', { name: 'Split', exact: true });
  await expect(split).toBeVisible();
  // Split is the last word of the Tools line
  const labels = await tools.getByRole('button').evaluateAll((buttons) => buttons.map((b) => b.textContent?.trim() ?? ''));
  expect(labels[labels.length - 1]).toBe('Split');
  await split.click();
  const sheet = page.getByRole('dialog', { name: `Beside ${title}` });
  await expect(sheet).toBeVisible();
  return { view, sheet };
}

/** Genesis 14:15, Split, Septuagint · Greek: the Greek docked beside the Hebrew. */
async function dockTheGreek(page: Page) {
  await openUnlocked(page);
  const { view, sheet } = await openChooser(page, '/#/?b=gen&c=14', 15, 'Genesis 14');
  await sheet.getByRole('button', { name: /^Septuagint · Greek/ }).click();
  await expect(sheet).toBeHidden();
  await expect(view).toBeHidden();
  await expect(dock(page)).toBeVisible();
  await expect(page.locator('[data-dock-verse="15"]')).toBeAttached();
}

test('Split on the Verse view of Genesis 14:15 opens "Beside Genesis 14" with Hebrew, English, Septuagint · Greek, Septuagint · English and A map, each with whose it is', async ({ page }) => {
  await openUnlocked(page);
  const { sheet } = await openChooser(page, '/#/?b=gen&c=14', 15, 'Genesis 14');
  const rows = sheet.getByRole('button').filter({ hasNotText: /^Close$|^Done$/ });
  await expect(sheet.getByRole('button', { name: /^Hebrew/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /^English\s*Berean Standard Bible$/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /^Septuagint · Greek\s*Swete's edition$/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /^Septuagint · English\s*Brenton's translation$/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /^A map\s*Maps for Genesis 14 · \d+$/ })).toBeVisible();
  // in that order, A map last
  const names = await rows.evaluateAll((buttons) => buttons.map((b) => (b.textContent ?? '').trim().split(/\s{2,}|\n/)[0]));
  expect(names.filter((n) => /^(Hebrew|English|Septuagint · Greek|Septuagint · English|A map)/.test(n)).map((n) => n.split(/Westminster|Berean|Swete|Brenton|Maps for/)[0].trim())).toEqual(['Hebrew', 'English', 'Septuagint · Greek', 'Septuagint · English', 'A map']);
  await shot(page, 'reader-split-chooser');
});

test('Split on Romans 8:28 offers Greek and English (the Majority Standard Bible), and A map when Romans 8 has maps', async ({ page }) => {
  await openUnlocked(page);
  const { view, sheet } = await openChooser(page, '/#/?b=rom&c=8', 28, 'Romans 8');
  await expect(sheet.getByRole('button', { name: /^Greek/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /^English\s*Majority Standard Bible$/ })).toBeVisible();
  await expect(sheet.getByRole('button', { name: /^Hebrew|^Septuagint/ })).toHaveCount(0);
  const hasMaps = (await view.getByRole('button', { name: /^Maps · \d+$/ }).count()) > 0;
  await expect(sheet.getByRole('button', { name: /^A map/ })).toHaveCount(hasMaps ? 1 : 0);
});

test('Septuagint · Greek docks the Greek at Half beside the Hebrew: its handle row names it, Link is pressed, Close at the right; Greek 15 is the dock\'s top verse and verse 15 the passage\'s', async ({ page }) => {
  await dockTheGreek(page);
  const handle = page.locator('[data-dock-handle]');
  await expect(handle.locator('[data-dock-title]')).toHaveText('Septuagint · Greek');
  await expect(link(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(handle.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  const [row, title, close] = [(await handle.boundingBox())!, (await handle.locator('[data-dock-title]').boundingBox())!, (await handle.getByRole('button', { name: 'Close', exact: true }).boundingBox())!];
  expect(title.x).toBeLessThan(row.x + row.width / 2);
  expect(close.x).toBeGreaterThan(row.x + row.width / 2);
  const reader = (await page.locator('[data-reader-box]').boundingBox())!;
  const at = (await dock(page).boundingBox())!;
  expect(Math.abs(at.height - reader.height / 2)).toBeLessThanOrEqual(10);
  // the dock draws Swete's Greek: Greek letters in the dock; the passage is Genesis 14 as the Reader opens it (the Berean English of the Hebrew)
  await expect(page.locator('[data-dock-verse="15"]')).toContainText(/[Ͱ-Ͽἀ-῿]/);
  await expect(page.locator('[data-reader] [data-verse="15"]')).toContainText('During the night');
  await expect.poll(async () => (await dockTop(page))?.n).toBe(15);
  await expect.poll(async () => (await passageTop(page))?.n).toBe(15);
  await shot(page, 'reader-split-linked');
});

test('Link on: the passage leads and the Greek follows within a line, the Greek leads and the passage follows, and the follower never scrolls the leader back', async ({ page }) => {
  await dockTheGreek(page);
  await scrollPassage(page, 18);
  await expect.poll(async () => (await dockTop(page))?.n).toBe(18);
  expect(Math.abs((await dockTop(page))!.offset)).toBeLessThanOrEqual(30);
  // the leader stays where it was put: still on 18, at the same place
  const led = await passageTop(page);
  await page.waitForTimeout(300);
  expect(await passageTop(page)).toEqual(led);

  await scrollDock(page, 20);
  await expect.poll(async () => (await passageTop(page))?.n).toBe(20);
  const dockLed = await dockTop(page);
  await page.waitForTimeout(300);
  expect(await dockTop(page)).toEqual(dockLed);
  expect((await passageTop(page))!.n).toBe(20);
});

test('Link off: each pane scrolls alone; pressing Link again brings the dock to the passage\'s top verse', async ({ page }) => {
  await dockTheGreek(page);
  await link(page).click();
  await expect(link(page)).toHaveAttribute('aria-pressed', 'false');
  const before = await passageTop(page);
  await scrollDock(page, 20);
  await expect.poll(async () => (await dockTop(page))?.n).toBe(20);
  await page.waitForTimeout(300);
  expect(await passageTop(page)).toEqual(before);
  const dockWas = await dockTop(page);
  await scrollPassage(page, 3);
  await expect.poll(async () => (await passageTop(page))?.n).toBe(3);
  await page.waitForTimeout(300);
  expect(await dockTop(page)).toEqual(dockWas);
  // Link again: the dock goes to the passage's top verse
  await link(page).click();
  await expect(link(page)).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await dockTop(page))?.n).toBe(3);
  expect((await passageTop(page))!.n).toBe(3);
  await shot(page, 'reader-split-unlinked');
});

test('Psalm 23 with Septuagint · Greek: the dock shows Greek Psalm 22, its verses numbered "1 (22:1)" as the Reader numbers them', async ({ page }) => {
  await openUnlocked(page);
  const { sheet } = await openChooser(page, '/#/?b=psa&c=23', 1, 'Psalms 23');
  await sheet.getByRole('button', { name: /^Septuagint · Greek/ }).click();
  await expect(dock(page)).toBeVisible();
  const one = page.locator('[data-dock-verse="1"]');
  await expect(one).toBeAttached();
  await expect(one.locator('[data-verse-number]')).toHaveText(/^\s*1\s*\(22:1\)\s*$/);
  await expect(page.locator('[data-dock-verse="6"] [data-verse-number]')).toHaveText(/^\s*6\s*\(22:6\)\s*$/);
});

test('a passage verse with no partner gets the muted row "<n> · Not in the Septuagint" at its place in the dock, never a blank (Psalm 9: Greek 9 has two of its verses)', async ({ page }) => {
  await openUnlocked(page);
  const { sheet } = await openChooser(page, '/#/?b=psa&c=9', 1, 'Psalms 9');
  await sheet.getByRole('button', { name: /^Septuagint · Greek/ }).click();
  await expect(dock(page)).toBeVisible();
  await expect(page.locator('[data-dock-verse="1"]')).toBeAttached();
  const missing = page.locator('[data-dock-missing]');
  await expect(missing.first()).toBeVisible();
  await expect(page.locator('[data-dock-verse="3"]')).toHaveText('3 · Not in the Septuagint');
  await expect(page.locator('[data-dock-verse="3"]')).toHaveAttribute('data-dock-missing', '');
  // the dock's sequence is the passage's: every verse of the Hebrew psalm has a row
  const passageVerses = await page.locator('[data-reader] [data-verse]').count();
  expect(await page.locator('[data-dock-verse]').count()).toBe(passageVerses);
});

test('a tap on a Greek word in the dock opens its word sheet over both panes and closing it leaves the split; a tap on a dock verse number brings the passage to that verse', async ({ page }) => {
  await dockTheGreek(page);
  const word = page.locator('[data-dock-verse="15"] [data-word]').first();
  await word.click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();
  await expect(dock(page)).toBeVisible();
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(dock(page)).toBeVisible();
  await expect(page.locator('[data-dock-verse="15"]')).toBeAttached();

  // a dock verse's number brings the passage there (and, linked, the dock to its top)
  await link(page).click();
  await scrollPassage(page, 2);
  await page.locator('[data-dock-verse="9"] [data-verse-number]').click();
  await expect.poll(async () => (await passageTop(page))?.n).toBe(9);
  await expect(dock(page)).toBeVisible();
});

test('the dock\'s name opens the chooser with the text ticked; Hebrew swaps the dock at the same top verse; A map opens the Maps sheet and a map\'s Split swaps the dock for the map', async ({ page }) => {
  await page.route(/^https:\/\/biblemapper\.com\//, (route) => route.fulfill({ contentType: 'image/svg+xml', body: PICTURE }));
  await dockTheGreek(page);
  await scrollDock(page, 18);
  await expect.poll(async () => (await passageTop(page))?.n).toBe(18);
  const name = page.locator('[data-dock-handle]').getByRole('button', { name: 'Septuagint · Greek' });
  await name.click();
  const chooser = page.getByRole('dialog', { name: 'Beside Genesis 14' });
  await expect(chooser).toBeVisible();
  await expect(chooser.getByRole('button', { name: /^Septuagint · Greek/ })).toHaveAttribute('aria-current', 'true');
  await chooser.getByRole('button', { name: /^Hebrew/ }).click();
  await expect(chooser).toBeHidden();
  await expect(page.locator('[data-dock-handle] [data-dock-title]')).toHaveText('Hebrew');
  await expect(dock(page)).toContainText(/[֐-׿]/);
  await expect.poll(async () => (await dockTop(page))?.n).toBe(18);
  expect((await passageTop(page))!.n).toBe(18);

  await page.locator('[data-dock-handle]').getByRole('button', { name: 'Hebrew' }).click();
  await page.getByRole('dialog', { name: 'Beside Genesis 14' }).getByRole('button', { name: /^A map/ }).click();
  const maps = page.getByRole('dialog', { name: 'Maps for Genesis 14' });
  await expect(maps).toBeVisible();
  await maps.getByRole('button', { name: /The Battle at the Valley of Siddim/ }).click();
  const map = page.getByRole('dialog', { name: 'The Battle at the Valley of Siddim' });
  await map.getByTestId('maps-handle').getByRole('button', { name: 'Split', exact: true }).click();
  await expect(map).toBeHidden();
  await expect(page.locator('[data-dock-handle] [data-dock-title]')).toHaveText('The Battle at the Valley of Siddim');
  await expect(page.locator('[data-dock-verse]')).toHaveCount(0);
  await expect(link(page)).toHaveCount(0);
});

test('the next chapter keeps the split and the text; a chapter the text does not exist for (Romans 8 with Septuagint · Greek) shows "No Septuagint for Romans" over an empty body', async ({ page }) => {
  await dockTheGreek(page);
  await page.goto('/#/?b=gen&c=15');
  await expect(page.getByRole('heading', { name: 'Genesis 15', level: 1 })).toBeVisible();
  await expect(page.locator('[data-dock-handle] [data-dock-title]')).toHaveText('Septuagint · Greek');
  await expect(page.locator('[data-dock-verse="1"]')).toBeAttached();
  await expect(page.locator('[data-dock-verse="1"]')).toContainText(/[Ͱ-Ͽἀ-῿]/);

  await page.goto('/#/?b=rom&c=8');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(dock(page)).toBeVisible();
  await expect(page.locator('[data-dock-handle] [data-dock-title]')).toHaveText('No Septuagint for Romans');
  await expect(page.locator('[data-dock-verse]')).toHaveCount(0);
  expect((await dockBodyText(page)).trim()).toBe('');
  const box = (await page.locator('[data-reader-box]').boundingBox())!;
  const at = (await dock(page).boundingBox())!;
  expect(Math.abs(at.height - box.height / 2)).toBeLessThanOrEqual(10);
});
const dockBodyText = (page: Page) => page.locator('[data-dock-body]').evaluate((el) => el.textContent ?? '');

test('a reload keeps the split, the text, the Link and the size as a fraction of the box', async ({ page }) => {
  await dockTheGreek(page);
  await link(page).click();
  // drag the divider to some height of its own: the dock is about 60 % of the box
  const handle = page.locator('[data-dock-handle]');
  const row = (await handle.boundingBox())!;
  const reader = (await page.locator('[data-reader-box]').boundingBox())!;
  const x = row.x + row.width * 0.5;
  await drag(page, [x, row.y + row.height / 2], [x, reader.y + reader.height * 0.4 + row.height / 2], { steps: 8, ms: 240 });
  await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.height / reader.height - 0.6)).toBeLessThan(0.02);
  const share = (await dock(page).boundingBox())!.height / reader.height;
  await page.reload();
  await expect(dock(page)).toBeVisible();
  await expect(page.locator('[data-dock-handle] [data-dock-title]')).toHaveText('Septuagint · Greek');
  await expect(link(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-dock-verse="1"]')).toBeAttached();
  await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.height / (await page.locator('[data-reader-box]').boundingBox())!.height - share)).toBeLessThan(0.02);
});

test('sideways at 844x390 the passage stands at the left and the text at the right, the divider rests where it is let go, and the Link holds', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await dockTheGreek(page);
  await expect(dock(page)).toHaveAttribute('data-axis', 'row');
  const passage = (await page.locator('[data-reader]').boundingBox())!;
  const at = (await dock(page).boundingBox())!;
  expect(at.x).toBeGreaterThan(passage.x);
  expect(passage.x + passage.width).toBeLessThanOrEqual(at.x + 1);
  // the divider rests wherever he lets go: a drag to a third of the width
  const box = (await page.locator('[data-reader-box]').boundingBox())!;
  const row = (await page.locator('[data-dock-handle]').boundingBox())!;
  const y = row.y + row.height / 2;
  await drag(page, [row.x + 30, y], [box.x + box.width * (1 - 0.4) + 30, y], { steps: 8, ms: 240 });
  await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.width / box.width - 0.4)).toBeLessThan(0.02);
  // the Link holds
  await scrollPassage(page, 18);
  await expect.poll(async () => (await dockTop(page))?.n).toBe(18);
  await scrollDock(page, 21);
  await expect.poll(async () => (await passageTop(page))?.n).toBe(21);
  await shot(page, 'reader-split-text-sideways');
});
