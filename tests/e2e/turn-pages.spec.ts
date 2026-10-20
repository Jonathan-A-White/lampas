import { expect, test, type Locator, type Page } from '@playwright/test';
import { swipe } from '../support/gesture';
import { afterLastVerse } from './reader-foot';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Settings > Reading, Turn pages (mw-5r3p30.299): the chapter is laid out in pages the size of the reading box; a tap on the right third of the
// text or a swipe to the left turns forward a page, a tap on the left third or a swipe to the right turns back; past the last page the next chapter
// opens on its first page, and back past the first page the previous chapter opens on its LAST page (mw-5r3p30.620), never a blank page; the place line
// under the text says the page. With Scroll nothing changes. A phone-width layout claim: 390x844, with touch.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// swipe (tests/support/gesture.ts) times the drag on the page's clock, so it is installed before the page opens.
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

/** How Mark 12 is opened: more settings to keep (the text size, the layout) and more of the address (the view, the weave). */
interface Opening {
  settings?: Record<string, string>;
  address?: string;
}

async function openMark12(page: Page, mode: 'scroll' | 'pages', opening: Opening = {}) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await reopenAs(page, mode, opening);
}

/** Saves the Reading setting and opens Mark 12 afresh with it; with Turn pages, waits until the pages are cut for good (the chips and fonts come late). */
async function reopenAs(page: Page, mode: 'scroll' | 'pages', { settings = {}, address = '' }: Opening = {}) {
  await keep(page, { ...settings, readingMode: mode });
  await page.goto(`/#/?b=mrk&c=12${address}`);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', mode);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  if (mode === 'scroll') return;
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  let last = '';
  await expect
    .poll(async () => {
      const now = (await place(page).textContent()) ?? '';
      const same = now === last;
      last = now;
      return same;
    }, { intervals: [500] })
    .toBe(true);
}

const place = (page: Page) => page.locator('[data-place-line]');
/** The page the place line says, and of how many. */
const pageOf = async (page: Page): Promise<{ at: number; of: number }> => {
  const text = (await place(page).textContent()) ?? '';
  const match = text.match(/^Mark 12 · Page (\d+) of (\d+)$/);
  if (!match) throw new Error(`the place line reads "${text}"`);
  return { at: Number(match[1]), of: Number(match[2]) };
};
const at = async (page: Page) => (await placeOf(page)).at;

/** The box of the reading text, on screen. */
const box = (page: Page) =>
  page.evaluate(() => {
    const r = (document.querySelector('[data-reader]') as HTMLElement).getBoundingClientRect();
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width };
  });

/** The numbers of the verses that begin inside the reading box as it stands. */
const versesInView = (page: Page) =>
  page.evaluate(() => {
    const b = (document.querySelector('[data-reader]') as HTMLElement).getBoundingClientRect();
    return Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-verse]'))
      .filter((v) => {
        const r = v.getClientRects()[0];
        return r && r.left >= b.left - 1 && r.right <= b.right + 1;
      })
      .map((v) => Number(v.dataset.verse));
  });

/** A tap with one finger at a share of the reading box's width, on text (a verse number or other button there keeps its own tap), as near halfway down as
 * there is some. */
async function tapAt(page: Page, share: number) {
  const b = await box(page);
  const x = b.left + b.width * share;
  const y = await page.evaluate(({ x, top, bottom }) => {
    const middle = (top + bottom) / 2;
    for (let d = 0; d < (bottom - top) / 2; d += 6) {
      for (const y of [middle + d, middle - d]) {
        const hit = document.elementFromPoint(x, y);
        if (hit?.closest('[data-reader]') && !hit.closest('button, a')) return y;
      }
    }
    return middle;
  }, { x, top: b.top, bottom: b.bottom });
  await page.touchscreen.tap(x, y);
}

/** A finger drag across the text, as touch input to the browser (pointer events of type touch), on the page's clock (tests/support/gesture.ts). The finger
 * comes to rest before it lifts: a swipe lifted at speed starts a fling, and Chrome swallows the next tap, the one that stops it. */
async function swipeText(page: Page, direction: 'left' | 'right') {
  const b = await box(page);
  const y = (b.top + b.bottom) / 2;
  const from = direction === 'left' ? b.left + b.width * 0.8 : b.left + b.width * 0.2;
  const to = direction === 'left' ? b.left + b.width * 0.2 : b.left + b.width * 0.8;
  await swipe(page, [from, y], [to, y + 8], { with: 'touch', steps: 4, restMs: 80 });
}

test('a tap on the right third and a swipe left turn forward; the left third and a swipe right turn back', async ({ page }) => {
  await openMark12(page, 'pages');
  await expect(place(page)).toBeVisible();
  const first = await pageOf(page);
  expect(first.at).toBe(1);
  expect(first.of).toBeGreaterThanOrEqual(4);
  expect(await versesInView(page)).toContain(1);

  await tapAt(page, 0.85);
  await expect.poll(() => at(page)).toBe(2);
  const second = await versesInView(page);
  expect(second).not.toContain(1);
  expect(second.length).toBeGreaterThan(0);
  await expect(page.getByTestId('sheet-backdrop')).toHaveCount(0);

  await swipeText(page, 'left');
  await expect.poll(() => at(page)).toBe(3);
  expect(Math.min(...(await versesInView(page)))).toBeGreaterThan(Math.min(...second));

  await tapAt(page, 0.15);
  await expect.poll(() => at(page)).toBe(2);
  expect(await versesInView(page)).toEqual(second);

  await swipeText(page, 'right');
  await expect.poll(() => at(page)).toBe(1);
  expect(await versesInView(page)).toContain(1);
  await expect(page.getByTestId('sheet-backdrop')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
});

/** The place line as a whole: the chapter it names, the page and how many there are. */
const placeOf = async (page: Page): Promise<{ title: string; at: number; of: number }> => {
  const text = (await place(page).textContent()) ?? '';
  const match = text.match(/^(.+) · Page (\d+) of (\d+)$/);
  if (!match) throw new Error(`the place line reads "${text}"`);
  return { title: match[1], at: Number(match[2]), of: Number(match[3]) };
};

/** Waits until the pages of the chapter shown are cut for good (the place line stops changing: the chips and fonts come late). */
async function settled(page: Page) {
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  let last = '';
  await expect
    .poll(async () => {
      const now = (await place(page).textContent()) ?? '';
      const same = now === last;
      last = now;
      return same;
    }, { intervals: [300] })
    .toBe(true);
}

/** Opens a chapter in Turn pages by its address, with its pages cut. */
async function openChapter(page: Page, hash: string, title: string) {
  await page.goto(hash);
  await page.reload();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  await settled(page);
}

/** Turns forward by a tap on the right third to the last page of the chapter shown. */
async function toLastPage(page: Page) {
  const { of } = await placeOf(page);
  for (let n = 2; n <= of; n++) {
    await tapAt(page, 0.85);
    await expect.poll(() => at(page)).toBe(n);
  }
  return of;
}

/** The chapter shown is `title`, on page `on` (the last when `on` is 'last') of its pages. */
async function expectOn(page: Page, title: string, on: number | 'last') {
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  await settled(page);
  const now = await placeOf(page);
  expect(now.title).toBe(title);
  expect(now.at, `${title}: page ${now.at} of ${now.of}`).toBe(on === 'last' ? now.of : on);
}

// mw-5r3p30.620 (his 2026-10-19 words: "you should be able to turn past the chapter ... to the previous chapter also ... but be careful that you don't
// have just random like blank pages"): past the last page the next chapter opens on its first page, back past the first page the previous chapter opens
// on its last, by a swipe, by a tap on an outer third and by the Previous page and Next page buttons.
test('past the last page a swipe or a tap opens the next chapter on its first page; past the first, the previous chapter on its last', async ({ page }) => {
  await openMark12(page, 'pages');
  await expect(place(page)).toBeVisible();
  await toLastPage(page);
  // the end of the chapter is on the last page
  await expect(page.getByRole('button', { name: /Mark 13/ })).toBeInViewport();

  await swipeText(page, 'left');
  await expectOn(page, 'Mark 13', 1);
  // back on the first page, a swipe right opens Mark 12 on its LAST page
  await swipeText(page, 'right');
  await expectOn(page, 'Mark 12', 'last');
  await expect(page.locator('[data-swipe-note]')).toHaveCount(0);
  await shot(page, 'turn-pages-last');

  // the same by a tap on the third, both ways
  await tapAt(page, 0.85);
  await expectOn(page, 'Mark 13', 1);
  await tapAt(page, 0.15);
  await expectOn(page, 'Mark 12', 'last');
  // and from the middle of Mark 13 a swipe back is one page, not a chapter
  await tapAt(page, 0.85);
  await expectOn(page, 'Mark 13', 1);
  await tapAt(page, 0.85);
  await expect.poll(() => at(page)).toBe(2);
  await swipeText(page, 'right');
  await expect.poll(() => at(page)).toBe(1);
  await expect(page.getByRole('heading', { name: 'Mark 13', level: 1 })).toBeVisible();
});

test('past the last page, Next page opens the next chapter, and Previous page on the first opens the last page of the one before', async ({ page }) => {
  await openMark12(page, 'pages');
  await toLastPage(page);
  const controls = page.getByRole('group', { name: 'Reading controls' });
  await controls.getByRole('button', { name: 'Next page', exact: true }).evaluate((b) => (b as HTMLButtonElement).click());
  await expectOn(page, 'Mark 13', 1);
  await expect(controls.getByRole('button', { name: 'Previous page', exact: true })).not.toHaveAttribute('aria-disabled', 'true');
  await controls.getByRole('button', { name: 'Previous page', exact: true }).evaluate((b) => (b as HTMLButtonElement).click());
  await expectOn(page, 'Mark 12', 'last');
});

// The first chapter of the New Testament has nothing before it and the last nothing after: there the edge of the pages is the end, and no page is blank.
test('on Matthew 1 page 1 turns no further back, and on Revelation 22 the last page turns no further on', async ({ page }) => {
  await openMark12(page, 'pages');
  await openChapter(page, '/#/?b=mat&c=1', 'Matthew 1');
  expect(await placeOf(page)).toMatchObject({ title: 'Matthew 1', at: 1 });
  await tapAt(page, 0.15);
  await swipeText(page, 'right');
  await page.waitForTimeout(400);
  await expectOn(page, 'Matthew 1', 1);
  await expect(page.locator('[data-swipe-note]')).toHaveCount(0);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const controls = page.getByRole('group', { name: 'Reading controls' });
  await expect(controls.getByRole('button', { name: 'Previous page', exact: true })).toHaveAttribute('aria-disabled', 'true');

  await openChapter(page, '/#/?b=rev&c=22', 'Revelation 22');
  const of = await toLastPage(page);
  await tapAt(page, 0.85);
  await swipeText(page, 'left');
  await page.waitForTimeout(400);
  expect(await placeOf(page)).toEqual({ title: 'Revelation 22', at: of, of });
  await expect(page.locator('[data-swipe-note]')).toHaveCount(0);
  await expect(controls.getByRole('button', { name: 'Next page', exact: true })).toHaveAttribute('aria-disabled', 'true');
});

/** The settings key of Section headings (On | Off). */
const HEADINGS_KEY = 'sectionHeadings';

/** True when the page shown holds at least one line of a verse: some part of a verse stands wholly inside the reading box. */
const holdsAVerse = (page: Page) =>
  page.evaluate(() => {
    const b = (document.querySelector('[data-reader]') as HTMLElement).getBoundingClientRect();
    return Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-verse]')).some((v) =>
      Array.from(v.getClientRects()).some((r) => r.width > 0 && r.height > 0 && r.left >= b.left - 1 && r.right <= b.right + 1 && r.top < b.bottom && r.bottom > b.top),
    );
  });

// mw-5r3p30.620: no page of a chapter is blank (every page holds a verse line), walking forward across chapters and back, at the smallest, the default and
// the largest text size. Philippians (four chapters) and 3 John and Jude (one each) are short books whose chapters end near a page's foot in some size.
for (const size of [
  { name: 'Small', id: 'small', headings: 'on' },
  { name: 'Normal', id: 'normal', headings: 'on' },
  { name: 'Largest', id: 'largest', headings: 'on' },
  { name: 'Normal', id: 'normal', headings: 'off' },
  { name: 'Largest', id: 'largest', headings: 'off' },
]) {
  test(`no page is blank walking Philippians, 3 John and Jude forward and back at ${size.name} text, headings ${size.headings}`, async ({ page }) => {
    test.setTimeout(240_000);
    await openMark12(page, 'pages', { settings: { textSize: size.id, [HEADINGS_KEY]: size.headings } });

    /** Walks forward from page 1 of `from` by taps on the right third until `until` opens, checking every page on the way; gives the pages seen by chapter. */
    async function walk(from: string, hash: string, until: string, chapters: Record<string, number>) {
      await openChapter(page, hash, from);
      for (let guard = 0; guard < 80; guard++) {
        const now = await placeOf(page);
        if (now.title === until) return;
        expect(await holdsAVerse(page), `${now.title}, page ${now.at} of ${now.of} (${size.name}, headings ${size.headings}) holds a verse line`).toBe(true);
        chapters[now.title] = Math.max(chapters[now.title] ?? 0, now.of);
        await tapAt(page, 0.85);
        await expect.poll(async () => { const p = await placeOf(page); return p.title !== now.title || p.at !== now.at; }).toBe(true);
        await settled(page);
      }
      throw new Error(`${until} never opened`);
    }

    const seen: Record<string, number> = {};
    await walk('Philippians 1', '/#/?b=php&c=1', 'Colossians 1', seen);
    expect(Object.keys(seen)).toEqual(['Philippians 1', 'Philippians 2', 'Philippians 3', 'Philippians 4']);
    await walk('3 John 1', '/#/?b=3jn&c=1', 'Revelation 1', seen);
    expect(Object.keys(seen)).toEqual(expect.arrayContaining(['3 John 1', 'Jude 1']));

    // and back: Revelation 1 on page 1, back through Jude 1 and 3 John 1 to 2 John 1, each page on its way holding a verse line
    await openChapter(page, '/#/?b=rev&c=1', 'Revelation 1');
    await tapAt(page, 0.15);
    await expectOn(page, 'Jude 1', 'last');
    for (const title of ['Jude 1', '3 John 1']) {
      for (let guard = 0; guard < 80; guard++) {
        const now = await placeOf(page);
        if (now.title !== title) break;
        expect(await holdsAVerse(page), `${now.title}, page ${now.at} of ${now.of} (${size.name}, headings ${size.headings}, walking back) holds a verse line`).toBe(true);
        await tapAt(page, 0.15);
        await expect.poll(async () => { const p = await placeOf(page); return p.title !== now.title || p.at !== now.at; }).toBe(true);
        await settled(page);
      }
    }
    await expectOn(page, '2 John 1', 'last');
    expect(await holdsAVerse(page)).toBe(true);
  });
}

test('the last page of a chapter in Turn pages ends with the chapter links: no About, no build version', async ({ page }) => {
  await openMark12(page, 'pages');
  const { of } = await pageOf(page);
  for (let n = 2; n <= of; n++) {
    await tapAt(page, 0.85);
    await expect.poll(() => at(page)).toBe(n);
  }
  await expect(page.getByRole('navigation', { name: 'Chapters', exact: true })).toBeInViewport();
  expect(await afterLastVerse(page)).toEqual(['nav:Chapters']);
  await expect(page.locator('[data-reader]').getByRole('button', { name: 'About', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('build-version')).toHaveCount(0);
});

test('the place line says the page, under the text; the type is the size it is with Scroll and nothing scrolls', async ({ page }) => {
  await openMark12(page, 'scroll');
  const scrollSize = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('[data-reader] [data-verse]') as HTMLElement).fontSize));

  await reopenAs(page, 'pages');
  await expect(place(page)).toHaveText(/^Mark 12 · Page 1 of \d+$/);
  await tapAt(page, 0.85);
  await expect(place(page)).toHaveText(/^Mark 12 · Page 2 of \d+$/);

  const look = await page.evaluate(() => {
    const reader = document.querySelector('[data-reader]') as HTMLElement;
    const line = document.querySelector('[data-place-line]') as HTMLElement;
    return {
      size: parseFloat(getComputedStyle(reader.querySelector('[data-verse]') as HTMLElement).fontSize),
      scrollsDown: reader.scrollHeight > reader.clientHeight + 1,
      lineTop: line.getBoundingClientRect().top,
      boxBottom: reader.getBoundingClientRect().bottom,
      lineBottom: line.getBoundingClientRect().bottom,
      windowHeight: window.innerHeight,
    };
  });
  expect(look.size).toBe(scrollSize);
  expect(look.scrollsDown).toBe(false);
  expect(look.lineTop).toBeGreaterThanOrEqual(look.boxBottom - 0.5);
  expect(look.lineBottom).toBeLessThanOrEqual(look.windowHeight + 0.5);
  await shot(page, 'turn-pages');
});

test('with Turn pages a tap in the middle third opens the word, and a verse number in the left third is the page edge', async ({ page }) => {
  await openMark12(page, 'pages');
  const b = await box(page);
  // a word of verse 1 that stands wholly in the middle third
  const middle = await page.evaluate(({ from, to }) => {
    for (const w of Array.from(document.querySelectorAll<HTMLElement>('[data-verse="1"] [data-text] [role="button"]'))) {
      const r = w.getClientRects()[0];
      if (r && r.left > from && r.right < to) return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 };
    }
    return null;
  }, { from: b.left + b.width / 3, to: b.left + (b.width * 2) / 3 });
  if (!middle) throw new Error('no word in the middle third');
  await page.touchscreen.tap(middle.x, middle.y);
  await expect(page.getByTestId('sheet-backdrop')).toBeVisible();
  expect(await at(page)).toBe(1);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('sheet-backdrop')).toHaveCount(0);

  const number = page.locator('[data-verse="2"] [data-verse-number]');
  const numberBox = await number.boundingBox();
  if (!numberBox) throw new Error('no verse number');
  expect(numberBox.x).toBeLessThan(b.left + b.width / 3);
  // mw-5r3p30.609: the left third turns back, number or not; on the first page that is the previous chapter's last page (mw-5r3p30.620), and no verse opens
  await page.touchscreen.tap(numberBox.x + numberBox.width / 2, numberBox.y + numberBox.height / 2);
  await expect(page.getByRole('heading', { name: 'Mark 11', level: 1 })).toBeVisible();
  expect(page.url()).not.toMatch(/[?&]v=/);
  await expect(page.getByTestId('sheet-backdrop')).toHaveCount(0);
});

/** The gap on screen between the bottom of the lowest line of text on the page shown and the top of the place line, and the line height of that line. A
 * line is its line height tall, centred on its letters, so its bottom is under the letters' box by half of what the line height adds to it. `heading` is
 * the height (with its margins) of a section heading that starts the next page: the browser does not leave a heading at a page's foot with no line of its
 * verse under it, so a page that ends right before one may end that much higher. */
const footGap = (page: Page) =>
  page.evaluate(() => {
    const reader = document.querySelector('[data-reader]') as HTMLElement;
    const b = reader.getBoundingClientRect();
    const walk = document.createTreeWalker(reader.querySelector('[data-pages]') as HTMLElement, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let lowest = -Infinity;
    let lineHeight = 0;
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent?.trim() || !n.parentElement) continue;
      range.selectNodeContents(n);
      for (const r of Array.from(range.getClientRects())) {
        if (r.width <= 0 || r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1) continue;
        const style = getComputedStyle(n.parentElement);
        const height = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
        const bottom = r.bottom + Math.max(0, height - r.height) / 2;
        if (bottom <= lowest) continue;
        lowest = bottom;
        lineHeight = height;
      }
    }
    let heading = 0;
    let nearest = Infinity;
    for (const h of Array.from(reader.querySelectorAll<HTMLElement>('[data-heading]'))) {
      const r = h.getBoundingClientRect();
      if (r.left < b.right - 1 || r.left >= nearest || r.top > b.top + 40) continue;
      const style = getComputedStyle(h);
      nearest = r.left;
      heading = r.height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);
    }
    const line = document.querySelector('[data-place-line]') as HTMLElement;
    // the place line's words and the round Ask button beside them do not meet
    range.selectNodeContents(line);
    const words = range.getBoundingClientRect();
    const button = document.querySelector('[data-ask-tutor]')?.getBoundingClientRect();
    const clear = !button || words.right <= button.left || words.bottom <= button.top || words.top >= button.bottom;
    return { gap: line.getBoundingClientRect().top - lowest, lineHeight, heading, clear };
  });

/** Pages 1 and 3 each end at most a line (and 8 px, and a section heading that starts the next page) above the place line: no blank band of paper under the text (mw-5r3p30.610). */
async function pagesFillToPlaceLine(page: Page, name: string) {
  // the chapter opened again opens on the page he was on (mw-5r3p30.608): back to the first
  for (let on = await at(page); on > 1; on--) {
    await tapAt(page, 0.15);
    await expect.poll(() => at(page)).toBe(on - 1);
  }
  for (const on of [1, 3]) {
    if (on > 1) await turnTo(page, on);
    const { gap, lineHeight, heading, clear } = await footGap(page);
    expect(clear, `${name}, page ${on}: the place line is clear of the round button`).toBe(true);
    expect(lineHeight, `${name}, page ${on}: a line of text is on it`).toBeGreaterThan(0);
    expect(gap, `${name}, page ${on}: the place line is under the text`).toBeGreaterThanOrEqual(-0.5);
    expect(gap, `${name}, page ${on}: the text ends ${Math.round(gap)} px above the place line, a line is ${Math.round(lineHeight)} px${heading ? `, a heading starts the next page (${Math.round(heading)} px)` : ''}`).toBeLessThanOrEqual(lineHeight + heading + 8);
  }
  await shot(page, `turn-pages-foot-${name.toLowerCase().replace(/\W+/g, '-')}`);
}

// mw-5r3p30.610: a Kindle page fills its screen down to the one small line; the room the Reader keeps for the round Ask button is under the place line,
// not between it and the text.
test('with Turn pages each page fills down to the place line, at Normal and at Largest', async ({ page }) => {
  await openMark12(page, 'pages');
  await pagesFillToPlaceLine(page, 'Normal');
  await reopenAs(page, 'pages', { settings: { textSize: '160' } });
  await pagesFillToPlaceLine(page, 'Largest');
});

test('with Turn pages each page fills down to the place line in the Greek view, the Paragraph layout and with the Weave on', async ({ page }) => {
  await openMark12(page, 'pages', { address: '&view=greek' });
  await pagesFillToPlaceLine(page, 'Greek');
  await reopenAs(page, 'pages', { settings: { layout: 'paragraph' }, address: '&view=english' });
  await pagesFillToPlaceLine(page, 'Paragraph');
  await reopenAs(page, 'pages', { settings: { layout: 'verse' }, address: '&view=english&weave=solid%2Blearning' });
  await pagesFillToPlaceLine(page, 'Weave');
});

// The room is the place line's row only while the bars are shown: with them away the row is the line alone, and the page still reaches it.
test('with Turn pages and the Immersive reader, each page fills down to the place line with the bars away', async ({ page }) => {
  await openMark12(page, 'pages', { settings: { immersiveReader: 'on', immersiveHint: 'off' } });
  await page.getByRole('button', { name: 'Put the bars away', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-ask-tutor]')).toHaveAttribute('data-away', '');
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  // the place line is the lowest row now, with the phone's floor under it; the bars' slide is 200 ms
  await expect(place(page)).toHaveAttribute('data-floor', '');
  await page.waitForTimeout(400);
  await pagesFillToPlaceLine(page, 'Bars away');
});

// mw-5r3p30.611: with the Immersive reader On and Turn pages, the card said 'Scroll down and the bars slide away.' though nothing scrolls, the bars
// never went, and the card and bars left the text five lines of a 844 px screen (four sideways). Now the card says what works in pages and turning to the
// next page puts the bars, and the card with them, away, as scrolling down does with Scroll; turning back changes nothing.
for (const size of [
  { name: '390x844', width: 390, height: 844 },
  { name: '844x390', width: 844, height: 390 },
]) {
  test(`with Turn pages and the Immersive reader the card says what works in pages, and the next page puts the bars away, at ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await openMark12(page, 'pages', { settings: { immersiveReader: 'on' } });
    const card = page.locator('[data-immersive-hint]');
    await expect(card).toBeVisible();
    await expect(card).not.toContainText('Scroll');
    await expect(card).toContainText('Turn to the next page and the bars slide away.');
    await expect(card).toContainText('Tap with two fingers to bring them back or put them away.');
    // sideways the card and the bars leave the text a sliver until the first turn, and the pages cut so thin open past page 1 (reported on the story)
    const before = await pageOf(page);
    if (size.height > size.width) expect(before.at).toBe(1);

    await tapAt(page, 0.85);
    await expect(page.locator('header').first()).toBeHidden();
    await expect(card).toBeHidden();
    await expect(page.locator('[data-ask-tutor]')).toHaveAttribute('data-away', '');
    // the slide is 200 ms, and the pages are cut afresh for the taller box: fewer of them
    await page.waitForTimeout(400);
    const b = await box(page);
    expect(b.bottom - b.top, `the text box is ${Math.round(b.bottom - b.top)} px of ${size.height}`).toBeGreaterThanOrEqual(size.height * 0.55);
    const lines = await page.evaluate(() => {
      const verse = document.querySelector('[data-reader] [data-verse]') as HTMLElement;
      const reader = (document.querySelector('[data-reader]') as HTMLElement).getBoundingClientRect();
      return reader.height / parseFloat(getComputedStyle(verse).lineHeight);
    });
    expect(lines, 'lines of text on a page').toBeGreaterThan(size.height > size.width ? 12 : 4);
    await expect.poll(async () => (await pageOf(page)).of).toBeLessThan(before.of);
    await shot(page, `turn-pages-immersive-away-${size.name}`);

    // more page turns, back and forward, leave them away; a two-finger tap brings them back, the card with them
    const on = await at(page);
    await tapAt(page, 0.85);
    await expect.poll(() => at(page)).toBe(on + 1);
    await tapAt(page, 0.15);
    await expect.poll(() => at(page)).toBe(on);
    await expect(page.locator('header').first()).toBeHidden();
    const cdp = await page.context().newCDPSession(page);
    const y = (b.top + b.bottom) / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.left + b.width * 0.4, y, id: 1 }, { x: b.left + b.width * 0.6, y: y + 10, id: 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    await expect(page.locator('header').first()).toBeVisible();
    await expect(card).toBeVisible();
  });
}

/** Whether a verse screen or a sheet is open: a tap on the outer thirds opens neither. */
const opened = async (page: Page) => /[?&]v=/.test(page.url()) || (await page.getByTestId('sheet-backdrop').count()) > 0;

/** Taps (x, y) and waits for the page to be `to`; fails, naming the point and what it landed on, when a verse or sheet opened instead. */
async function tapTurns(page: Page, x: number, y: number, to: number) {
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return el ? `${el.tagName.toLowerCase()}${el.closest('[data-verse-number]') ? ' (verse number)' : el.closest('[data-verse-play]') ? ' (play)' : ''}` : 'nothing';
  }, { x, y });
  await page.touchscreen.tap(x, y);
  await expect.poll(() => at(page), `a tap at (${Math.round(x)}, ${Math.round(y)}) on ${hit} turns to page ${to}`).toBe(to);
  expect(await opened(page), `a tap at (${Math.round(x)}, ${Math.round(y)}) on ${hit} opens nothing`).toBe(false);
}

// mw-5r3p30.609: the verse number is a 44 px button at the left edge of its verse, right where a thumb taps to turn back; like a Kindle's, the left
// edge always turns back. Page 4 of Mark 12 begins three verses (page 3 only two since the pages reach the place line, mw-5r3p30.610).
test('with Turn pages a tap on any verse number in the left third turns back, and no verse opens', async ({ page }) => {
  await openMark12(page, 'pages');
  await turnTo(page, 4);
  const b = await box(page);
  const numbers = await page.evaluate(({ left, right }) =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-verse-number]'))
      .map((n) => n.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.left >= left - 1 && r.right <= right + 1)
      .map((r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 })),
  { left: b.left, right: b.right });
  expect(numbers.length).toBeGreaterThan(2);
  for (const n of numbers) {
    expect(n.x).toBeLessThan(b.left + b.width / 3);
    await tapTurns(page, n.x, n.y, 3);
    await tapAt(page, 0.85);
    await expect.poll(() => at(page)).toBe(4);
  }
  await shot(page, 'turn-pages-verse-numbers');
});

// mw-5r3p30.609: every point of the outer thirds turns the page, whatever is under it (a word, a verse number, a play button, a gap); only the middle
// third keeps a word's tap. Pages 2 to 4 of Mark 12: none is the first or the last, whose chapter buttons keep their taps.
test('with Turn pages every point of the left and right thirds turns the page, on three pages', async ({ page }) => {
  test.setTimeout(240_000);
  await openMark12(page, 'pages');
  expect((await pageOf(page)).of).toBeGreaterThanOrEqual(5);
  const b = await box(page);
  const rows: number[] = [];
  // rows closer than a verse number is tall, so every number on the page is under some row
  for (let y = b.top + 10; y < b.bottom - 4; y += 24) rows.push(y);
  const columns = (from: number, to: number) => [0, 1, 2].map((i) => b.left + b.width * (from + ((to - from) * i) / 2));
  const left = columns(0.04, 0.3);
  const right = columns(0.7, 0.96);
  await turnTo(page, 2);
  for (const on of [2, 3, 4]) {
    if (on > 2) {
      await tapAt(page, 0.85);
      await expect.poll(() => at(page)).toBe(on);
    }
    // each point is tapped on page `on` in both thirds, and the page it turns to is turned home by the same point of the other third
    for (const y of rows) {
      for (let i = 0; i < left.length; i++) {
        await tapTurns(page, left[i], y, on - 1);
        await tapTurns(page, right[i], y, on);
        await tapTurns(page, right[i], y, on + 1);
        await tapTurns(page, left[i], y, on);
      }
    }
  }
});

test('with Scroll nothing changes: the text scrolls, a tap on the right third turns no page, a swipe opens the next chapter', async ({ page }) => {
  await openMark12(page, 'scroll');
  await expect(page.locator('[data-reader] [data-pages]')).toHaveCount(0);
  expect(await page.evaluate(() => {
    const reader = document.querySelector('[data-reader]') as HTMLElement;
    return reader.scrollHeight > reader.clientHeight + 100 && reader.scrollWidth <= reader.clientWidth + 1;
  })).toBe(true);

  const before = await versesInView(page);
  await tapAt(page, 0.85);
  await page.waitForTimeout(300);
  await expect(place(page)).toHaveCount(0);
  if (await page.getByTestId('sheet-backdrop').count()) await page.keyboard.press('Escape');
  await expect(page.getByTestId('sheet-backdrop')).toHaveCount(0);
  expect(await versesInView(page)).toEqual(before);

  await swipeText(page, 'left');
  await expect(page.getByRole('heading', { name: 'Mark 13', level: 1 })).toBeVisible();
});

/** Turns forward from page 1 to page `to` by taps on the right third, and gives back the verses then in view. */
async function turnTo(page: Page, to: number): Promise<number[]> {
  await expect.poll(() => at(page)).toBe(1);
  for (let n = 2; n <= to; n++) {
    await tapAt(page, 0.85);
    await expect.poll(() => at(page)).toBe(n);
  }
  return versesInView(page);
}

/** The Reader is back on Mark 12, on page `to`, with `verses` in view. */
async function backOnPage(page: Page, to: number, verses: number[]) {
  await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
  await expect(place(page)).toHaveText(new RegExp(`^Mark 12 · Page ${to} of \\d+$`));
  await expect.poll(() => versesInView(page)).toEqual(verses);
}

// mw-5r3p30.608: reading in pages, he goes to Settings for the theme or the text size and comes back to the page he was on, not page 1.
test('with Turn pages, Settings and back by ‹ Reader or by Back keeps the page he was on', async ({ page }) => {
  await openMark12(page, 'pages');
  const verses = await turnTo(page, 6);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await backOnPage(page, 6, verses);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();
  await page.goBack();
  await backOnPage(page, 6, verses);
  await shot(page, 'turn-pages-back-from-settings');
});

// mw-5r3p30.638: the page is kept on the phone too, so a reload or the app opened again from the home screen opens the chapter on the page he was reading.
test('with Turn pages, a reload opens the chapter on the page he was reading', async ({ page }) => {
  await openMark12(page, 'pages');
  const verses = await turnTo(page, 6);

  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  await backOnPage(page, 6, verses);
  await shot(page, 'turn-pages-after-reload');
});

/** The screens the Reader gives way to (it unmounts for each), opened as the app opens a screen (a new history entry), and how each shows it is there. */
const AWAY: { name: string; hash: string; ready: (page: Page) => Locator }[] = [
  { name: 'Words', hash: '#/words', ready: (p) => p.getByRole('heading', { name: 'Words', exact: true, level: 1 }) },
  { name: 'Review', hash: '#/review', ready: (p) => p.getByRole('heading', { name: 'Review', exact: true, level: 1 }) },
  { name: 'Paradigms', hash: '#/paradigms', ready: (p) => p.getByRole('heading', { name: 'Paradigms', exact: true, level: 1 }) },
  { name: 'About', hash: '#/about', ready: (p) => p.getByRole('heading', { name: 'About', exact: true, level: 1 }) },
];

test('with Turn pages, Words, Review, Paradigms, About and the Talk sheet each keep the page when he comes back', async ({ page }) => {
  await openMark12(page, 'pages');
  const verses = await turnTo(page, 6);

  for (const away of AWAY) {
    await page.evaluate((hash) => {
      window.location.hash = hash;
    }, away.hash);
    await expect(away.ready(page), away.name).toBeVisible();
    await expect(page.locator('[data-reader]'), away.name).toHaveCount(0);
    await page.goBack();
    await backOnPage(page, 6, verses);
  }

  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Mark 12' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await backOnPage(page, 6, verses);
});
