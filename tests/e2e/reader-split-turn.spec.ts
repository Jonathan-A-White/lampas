import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { drag } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

// The Reader split with Turn pages (mw-fnvjof.17.3, docs/design/reader-split.md 'Portrait, sideways and wide' and 'The Link'): the passage pane pages inside its shorter box (the box above the dock, at whatever height
// the free divider leaves), and the Link follows the page's first verse: a turn moves the dock to that verse, the dock moved to another verse turns the passage to the page holding it, and the follower's own move
// never turns the leader back. The Septuagint's files are the fixtures of tests/fixtures/data-lxx answered by route, Genesis 14 being the fixture of Genesis 1 renumbered, as reader-split-text.spec.ts does.
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

const dock = (page: Page) => page.locator('[data-dock]');
const link = (page: Page) => page.locator('[data-dock-handle]').getByRole('button', { name: 'Link', exact: true });
const place = (page: Page) => page.locator('[data-place-line]');

/** Puts a setting in the app's store through raw IndexedDB, as the app wrote it. */
const keep = (page: Page, key: string, value: string) =>
  page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: k, value: v });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [key, value],
  );

/** The dock's top verse: the first of its rows whose bottom is more than half a line below the box's top, and how far its top is from the box's. */
const dockTop = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('[data-dock-body]')!;
    const top = el.getBoundingClientRect().top;
    for (const row of Array.from(el.querySelectorAll<HTMLElement>('[data-dock-verse]'))) {
      const r = row.getBoundingClientRect();
      if (r.bottom > top + 12) return { n: Number(row.dataset.dockVerse), offset: Math.round(r.top - top) };
    }
    return null;
  });

/** What the passage's page shows: the first verse with a line on it, the verses with a line on it, how many lines are cut at the box's bottom (or top) edge, and where the box ends. */
const shown = (page: Page) =>
  page.evaluate(() => {
    const box = document.querySelector('[data-reader]')!.getBoundingClientRect();
    const on: number[] = [];
    let cut = 0;
    for (const v of Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-verse]'))) {
      const lines = Array.from(v.getClientRects()).filter((r) => r.width > 0 && r.right > box.left + 1 && r.left < box.right - 1);
      if (lines.length === 0) continue;
      on.push(Number(v.dataset.verse));
      cut += lines.filter((r) => r.bottom > box.bottom + 1 || r.top < box.top - 1).length;
    }
    return { first: on[0] ?? null, on, cut, bottom: box.bottom, height: box.height };
  });

/** The dock has verse `n` at its top, or it is scrolled to its end with that verse in view (its box cannot take the verse any higher). */
const dockHolds = (page: Page, n: number) =>
  page.evaluate((verse) => {
    const el = document.querySelector('[data-dock-body]')!;
    const box = el.getBoundingClientRect();
    const row = el.querySelector(`[data-dock-verse="${verse}"]`)!.getBoundingClientRect();
    const top = Array.from(el.querySelectorAll<HTMLElement>('[data-dock-verse]')).find((r) => r.getBoundingClientRect().bottom > box.top + 12);
    if (Number(top?.dataset.dockVerse) === verse) return true;
    const atEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    return atEnd && row.top >= box.top - 1 && row.bottom <= box.bottom + 1;
  }, n);

/** The first verse with a word on the page: a verse whose only line on the page is its play button (Hear the verse) does not count. */
const firstWithWords = (page: Page) =>
  page.evaluate(() => {
    const box = document.querySelector('[data-reader]')!.getBoundingClientRect();
    for (const v of Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-verse]'))) {
      for (const child of Array.from(v.childNodes)) {
        if (child instanceof HTMLElement && child.closest('[data-verse-play]')) continue;
        const range = document.createRange();
        range.selectNodeContents(child);
        if (Array.from(range.getClientRects()).some((r) => r.width > 0 && r.right > box.left + 1 && r.left < box.right - 1)) return Number(v.dataset.verse);
      }
    }
    return null;
  });

/** How many pages the place line says the chapter has. */
const pagesOf = async (page: Page) => {
  const match = ((await place(page).textContent()) ?? '').match(/Page (\d+) of (\d+)$/);
  if (!match) throw new Error('the place line has no page');
  return { at: Number(match[1]), of: Number(match[2]) };
};

/** Scrolls the dock as a user's scroll does (the scroll event follows): verse `n` to its top. */
const scrollDock = (page: Page, n: number) =>
  page.evaluate((verse) => {
    const el = document.querySelector('[data-dock-body]')!;
    const row = el.querySelector(`[data-dock-verse="${verse}"]`)!;
    el.scrollTop += row.getBoundingClientRect().top - el.getBoundingClientRect().top;
  }, n);

/** A tap with one finger at a share of the passage box's width, on text and not on a button (the right third turns forward, the left third back). */
async function tapAt(page: Page, share: number) {
  const point = await page.evaluate((s) => {
    const b = document.querySelector('[data-reader]')!.getBoundingClientRect();
    const x = b.left + b.width * s;
    for (let d = 0; d < b.height / 2; d += 6) {
      for (const y of [(b.top + b.bottom) / 2 + d, (b.top + b.bottom) / 2 - d]) {
        const hit = document.elementFromPoint(x, y);
        if (hit?.closest('[data-reader]') && !hit.closest('button, a')) return { x, y };
      }
    }
    return { x, y: (b.top + b.bottom) / 2 };
  }, share);
  await page.touchscreen.tap(point.x, point.y);
}

/** Genesis 14 with the Septuagint's Greek docked beside the Hebrew (as reader-split-text.spec.ts does it), then the Reader put in Turn pages and opened again: the pages cut and the Link on. */
async function dockInPages(page: Page, textSize?: string) {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=14');
  await expect(page.locator('[data-verse="15"]')).toBeAttached();
  const view = await openVerseView(page, 15);
  await view.getByRole('group', { name: 'Tools' }).getByRole('button', { name: 'Split', exact: true }).click();
  await page.getByRole('dialog', { name: 'Beside Genesis 14' }).getByRole('button', { name: /^Septuagint · Greek/ }).click();
  await expect(dock(page)).toBeVisible();
  await expect(page.locator('[data-dock-verse="15"]')).toBeAttached();
  await keep(page, 'readingMode', 'pages');
  if (textSize) await keep(page, 'textSize', textSize);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Genesis 14', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  await expect(dock(page)).toBeVisible();
  await expect(page.locator('[data-dock-verse="1"]')).toBeAttached();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  // the pages are cut for good once the place line stops changing (the chips and fonts come late)
  let last = '';
  await expect
    .poll(async () => {
      const now = (await place(page).textContent()) ?? '';
      const same = now === last;
      last = now;
      return same;
    }, { intervals: [500] })
    .toBe(true);
  await expect(link(page)).toHaveAttribute('aria-pressed', 'true');
}

test('Turn pages with a text docked: the passage shows whole pages in the box above the dock, and turning to the next page puts the dock\'s top verse at the new page\'s first verse within a line', async ({ page }) => {
  await dockInPages(page);
  const box = (await page.locator('[data-reader]').boundingBox())!;
  const at = (await dock(page).boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(at.y + 1);
  expect((await pagesOf(page)).of).toBeGreaterThan(2);
  const one = await shown(page);
  expect(one.cut).toBe(0);
  expect(one.first).toBe(1);
  expect((await dockTop(page))!.n).toBe(1);

  await tapAt(page, 0.85);
  await expect.poll(async () => (await pagesOf(page)).at).toBe(2);
  const two = await shown(page);
  expect(two.cut).toBe(0);
  expect(two.first).toBeGreaterThan(1);
  await expect.poll(async () => (await dockTop(page))?.n).toBe(two.first);
  expect(Math.abs((await dockTop(page))!.offset)).toBeLessThanOrEqual(30);

  await tapAt(page, 0.85);
  await expect.poll(async () => (await pagesOf(page)).at).toBe(3);
  const three = await shown(page);
  expect(three.cut).toBe(0);
  await expect.poll(async () => (await dockTop(page))?.n).toBe(three.first);

  // and back
  await tapAt(page, 0.15);
  await expect.poll(async () => (await pagesOf(page)).at).toBe(2);
  await expect.poll(async () => (await dockTop(page))?.n).toBe(two.first);
  await shot(page, 'reader-split-turn');
});

test('Turn pages, Link on: scrolling the dock until a later verse is its top verse turns the passage to the page holding it, and the passage\'s own move never moves the dock back', async ({ page }) => {
  await dockInPages(page);
  await scrollDock(page, 20);
  await expect.poll(async () => (await shown(page)).on).toContain(20);
  const turned = await shown(page);
  expect(turned.cut).toBe(0);
  const led = await dockTop(page);
  expect(led!.n).toBe(20);
  await page.waitForTimeout(400);
  // the leader stays where it was put, and the page too
  expect(await dockTop(page)).toEqual(led);
  expect(await shown(page)).toEqual(turned);

  // the other way: back on page 1 the dock follows to its first verse
  await scrollDock(page, 2);
  await expect.poll(async () => (await shown(page)).on).toContain(2);
  await page.waitForTimeout(400);
  expect((await dockTop(page))!.n).toBe(2);
});

test('Turn pages: after the divider is dragged to another height the passage pages again for its new box and the Link holds', async ({ page }) => {
  await dockInPages(page);
  const before = await pagesOf(page);
  const reader = (await page.locator('[data-reader-box]').boundingBox())!;
  const handle = (await page.locator('[data-dock-handle]').boundingBox())!;
  const x = handle.x + handle.width * 0.5;
  // the dock to about 30 % of the box, the passage taller
  await drag(page, [x, handle.y + handle.height / 2], [x, reader.y + reader.height * 0.7 + handle.height / 2], { steps: 8, ms: 240 });
  await expect.poll(async () => Math.abs((await dock(page).boundingBox())!.height / reader.height - 0.3)).toBeLessThan(0.02);
  await expect.poll(async () => (await pagesOf(page)).of).toBeLessThan(before.of);
  const taller = (await page.locator('[data-reader]').boundingBox())!;
  expect(taller.height).toBeGreaterThan(reader.height * 0.6);
  expect((await shown(page)).cut).toBe(0);

  await tapAt(page, 0.85);
  await expect.poll(async () => (await pagesOf(page)).at).toBe(2);
  const two = await shown(page);
  expect(two.cut).toBe(0);
  await expect.poll(async () => (await dockTop(page))?.n).toBe(two.first);
  await scrollDock(page, 21);
  await expect.poll(async () => (await shown(page)).on).toContain(21);
  expect((await dockTop(page))!.n).toBe(21);
  await shot(page, 'reader-split-turn-resized');
});

test('Turn pages, Link off: turning a page moves the dock not at all and scrolling the dock turns nothing', async ({ page }) => {
  await dockInPages(page);
  await link(page).click();
  await expect(link(page)).toHaveAttribute('aria-pressed', 'false');
  const dockWas = await dockTop(page);
  await tapAt(page, 0.85);
  await expect.poll(async () => (await pagesOf(page)).at).toBe(2);
  await page.waitForTimeout(400);
  expect(await dockTop(page)).toEqual(dockWas);

  const pageWas = await shown(page);
  await scrollDock(page, 20);
  await expect.poll(async () => (await dockTop(page))?.n).toBe(20);
  await page.waitForTimeout(400);
  expect(await shown(page)).toEqual(pageWas);
  expect((await pagesOf(page)).at).toBe(2);
});

// mw-fnvjof.17.58: a verse that ends at the foot of a page has its play button wrap onto the top line of the next, and that button is not the verse's words
for (const [name, size] of [['Small', '85'], ['Normal', '100'], ['Largest', '160']] as const) {
  test(`Turn pages, Link on, text ${name}: at every page the dock's top verse is the first verse with a word on the page, not one whose only line there is its play button`, async ({ page }) => {
    await dockInPages(page, size);
    const of = (await pagesOf(page)).of;
    expect(of).toBeGreaterThan(2);
    let held: number | null = null;
    for (let at = 1; at <= of; at++) {
      await expect.poll(async () => (await pagesOf(page)).at).toBe(at);
      const first = await firstWithWords(page);
      if (first === null) {
        // a verse ending at the very foot of the last page leaves the chapter's end (the buttons to the neighbouring chapters) alone on a page after it: no verse to follow, so the dock stays on the one before
        expect(at, `page ${at} has no verse and is not the last`).toBe(of);
        await expect(page.locator('[data-reader]').getByRole('button', { name: /^Genesis 15/ })).toBeInViewport();
        expect(held, `page ${at} follows a page with a verse`).not.toBeNull();
        await expect.poll(() => dockHolds(page, held!), { message: `page ${at} of ${of}` }).toBe(true);
        break;
      }
      held = first;
      // the dock's top verse is it; or, where the dock's box ends before it can stand at the top, the dock is at its end with that verse in view
      await expect.poll(() => dockHolds(page, first!), { message: `page ${at} of ${of}` }).toBe(true);
      if (at < of) await tapAt(page, 0.85);
    }
    await shot(page, `reader-split-turn-link-${name.toLowerCase()}`);
  });
}
