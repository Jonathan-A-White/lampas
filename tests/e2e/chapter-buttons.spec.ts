import { expect, test, type Page } from '@playwright/test';
import { swipe } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The chapter buttons at a chapter's foot (mw-5r3p30.706): a tip about the swipe; once he has changed chapter by a swipe (scroll mode's chapter swipe, or a
// Turn pages swipe or drag past a chapter's edge) the next foot offers once to hide the buttons, in place of the tip; Settings > Chapter buttons brings them
// back. A phone-width layout claim: 390x844, with touch, under --project=shots.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// swipe (tests/support/gesture.ts) times the drag on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const nav = (page: Page) => page.getByRole('navigation', { name: 'Chapters', exact: true });
const tip = (page: Page) => nav(page).getByRole('note');

async function footOfScroll(page: Page) {
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.locator('[data-reader]').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
}

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

test('scroll mode: the tip at the foot, a swipe to the next chapter, then the offer; Hide removes the buttons and Settings brings them back', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=1');
  await expect(page.getByRole('heading', { name: '1 John 1', level: 1 })).toBeVisible();
  await footOfScroll(page);
  await expect(tip(page)).toContainText('Swipe the text left or right to change chapter');
  await expect(tip(page).getByRole('button', { name: 'Hide' })).toHaveCount(0);
  await shot(page, 'chapter-buttons-tip');

  await swipe(page, [330, 400], [90, 408], { with: 'touch', steps: 4, restMs: 80 });
  await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();
  await footOfScroll(page);
  await expect(tip(page)).toContainText('You swipe between chapters. Hide these buttons?');
  await expect(tip(page)).not.toContainText('Swipe the text left or right');
  await expect(nav(page).getByRole('button', { name: '1 John 3 ›' })).toBeVisible();
  await shot(page, 'chapter-buttons-offer');

  await tip(page).getByRole('button', { name: 'Hide' }).click();
  await expect(nav(page)).toHaveCount(0);

  await page.goto('/#/settings?setting=chapterButtons');
  const row = page.locator('[data-setting="chapterButtons"]');
  await expect(row).toContainText('The ‹ and › buttons at the end of each chapter. Swipe left or right to change chapter.');
  await expect(row.getByRole('button', { name: 'Hide', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await row.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Show', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/#/?b=1jn&c=2');
  await footOfScroll(page);
  await expect(nav(page).getByRole('button', { name: '1 John 3 ›' })).toBeVisible();
  // the offer was answered for good
  await expect(tip(page)).toHaveCount(0);
});

test('scroll mode: a chapter button is not a swipe, so no offer', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=1');
  await footOfScroll(page);
  await nav(page).getByRole('button', { name: '1 John 2 ›' }).click();
  await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();
  await footOfScroll(page);
  await expect(tip(page)).toContainText('Swipe the text left or right to change chapter');
});

test('with Tips Off neither the tip nor the offer shows; the setting still hides the buttons', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=1');
  await expect(page.getByRole('heading', { name: '1 John 1', level: 1 })).toBeVisible();
  await keep(page, { tips: 'off' });
  await page.reload();
  await footOfScroll(page);
  await expect(nav(page).getByRole('button', { name: '1 John 2 ›' })).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
  await swipe(page, [330, 400], [90, 408], { with: 'touch', steps: 4, restMs: 80 });
  await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();
  await footOfScroll(page);
  await expect(nav(page).getByRole('button', { name: '1 John 3 ›' })).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
  await keep(page, { chapterButtons: 'hide' });
  await page.reload();
  await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(nav(page)).toHaveCount(0);
});

const place = (page: Page) => page.locator('[data-place-line]');
const pageOf = async (page: Page): Promise<{ title: string; at: number; of: number }> => {
  const text = (await place(page).textContent()) ?? '';
  const match = text.match(/^(.+) · Page (\d+) of (\d+)$/);
  if (!match) throw new Error(`the place line reads "${text}"`);
  return { title: match[1], at: Number(match[2]), of: Number(match[3]) };
};

async function settledPages(page: Page) {
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

/** A tap with one finger on the outer third, on text. */
async function tapThird(page: Page, share: number) {
  const b = await page.evaluate(() => {
    const r = (document.querySelector('[data-reader]') as HTMLElement).getBoundingClientRect();
    return { left: r.left, top: r.top, bottom: r.bottom, width: r.width };
  });
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

/** A tap on the right third in the blank under the chapter buttons on the last page: Chrome snaps a tap near a button (the tip's Got it) to it. */
async function tapBelowNav(page: Page) {
  const b = await page.locator('[data-reader]').boundingBox();
  const n = await nav(page).boundingBox();
  if (!b || !n) throw new Error('no reading box or chapter buttons');
  await page.touchscreen.tap(b.x + b.width * 0.85, Math.min(b.y + b.height - 40, n.y + n.height + 60));
}

/** Turns to the last page of the chapter shown, by taps on the right third (a tap is not a swipe). */
async function toLastPage(page: Page) {
  await settledPages(page);
  for (let guard = 0; guard < 40; guard++) {
    const { at, of } = await pageOf(page);
    if (at >= of) break;
    await tapThird(page, 0.85);
    await expect.poll(async () => (await pageOf(page)).at).toBe(at + 1);
  }
  await expect(nav(page)).toBeInViewport();
}

test('Turn pages: a swipe past the last page opens the next chapter and the offer shows at its foot; Keep is kept for good', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { readingMode: 'pages' });
  await page.goto('/#/?b=2jn&c=1');
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await toLastPage(page);
  await expect(tip(page)).toContainText('Swipe the text left or right to change chapter');
  await swipe(page, [300, 400], [90, 408], { with: 'touch', steps: 4, restMs: 80 });
  await expect(page.getByRole('heading', { name: '3 John 1', level: 1 })).toBeVisible();
  await toLastPage(page);
  await expect(tip(page)).toContainText('You swipe between chapters. Hide these buttons?');
  await shot(page, 'chapter-buttons-offer-pages');

  await tip(page).getByRole('button', { name: 'Keep' }).click();
  await expect(tip(page)).toHaveCount(0);
  await expect(nav(page).getByRole('button', { name: 'Jude 1 ›' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '3 John 1', level: 1 })).toBeVisible();
  await toLastPage(page);
  await expect(nav(page).getByRole('button', { name: 'Jude 1 ›' })).toBeVisible();
  await expect(tip(page)).toHaveCount(0);
});

test('Turn pages: a tap on the right third past the last page is not a swipe, so no offer', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { readingMode: 'pages' });
  await page.goto('/#/?b=2jn&c=1');
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await toLastPage(page);
  await tapBelowNav(page);
  await expect(page.getByRole('heading', { name: '3 John 1', level: 1 })).toBeVisible();
  await toLastPage(page);
  await expect(tip(page)).toContainText('Swipe the text left or right to change chapter');
});
