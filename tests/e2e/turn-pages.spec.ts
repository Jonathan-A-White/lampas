import { expect, test, type Page } from '@playwright/test';
import { swipe } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Settings > Reading, Turn pages (mw-5r3p30.299): the chapter is laid out in pages the size of the reading box; a tap on the right third of the
// text or a swipe to the left turns forward a page, a tap on the left third or a swipe to the right turns back; the first page does not turn
// back and the last does not turn forward (and a swipe there opens no other chapter); the place line under the text says the page. With Scroll
// nothing changes. A phone-width layout claim: 390x844, with touch.
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

async function openMark12(page: Page, mode: 'scroll' | 'pages') {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await reopenAs(page, mode);
}

/** Saves the Reading setting and opens Mark 12 afresh with it; with Turn pages, waits until the pages are cut for good (the chips and fonts come late). */
async function reopenAs(page: Page, mode: 'scroll' | 'pages') {
  await keep(page, { readingMode: mode });
  await page.goto('/#/?b=mrk&c=12');
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
const at = async (page: Page) => (await pageOf(page)).at;

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

test('the first page does not turn back and the last does not turn forward, and no swipe opens another chapter', async ({ page }) => {
  await openMark12(page, 'pages');
  await expect(place(page)).toBeVisible();
  const { of } = await pageOf(page);

  await tapAt(page, 0.15);
  await swipeText(page, 'right');
  await page.waitForTimeout(400);
  expect(await at(page)).toBe(1);
  await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
  await expect(page.locator('[data-swipe-note]')).toHaveCount(0);

  for (let n = 2; n <= of; n++) {
    await tapAt(page, 0.85);
    await expect.poll(() => at(page)).toBe(n);
  }
  // the end of the chapter is on the last page
  await expect(page.getByRole('button', { name: /Mark 13/ })).toBeInViewport();

  await tapAt(page, 0.85);
  await swipeText(page, 'left');
  await page.waitForTimeout(400);
  expect(await pageOf(page)).toEqual({ at: of, of });
  await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
  await shot(page, 'turn-pages-last');
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

test('with Turn pages a tap in the middle third opens the word, and a verse number in the left third opens its verse', async ({ page }) => {
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
  await page.touchscreen.tap(numberBox.x + numberBox.width / 2, numberBox.y + numberBox.height / 2);
  await expect(page).toHaveURL(/v=2/);
  await page.goBack();
  await expect(page).not.toHaveURL(/v=2/);
  await expect.poll(() => at(page)).toBe(1);
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
