import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// With Immersive reader On and the bars away, one quiet line at the foot says where he is: the book and chapter and how far through the chapter's
// text he has scrolled, like a Kindle's "Page 9 of 187 · 12%" (mw-5r3p30.298). It is not there with the setting Off or with the bars brought
// back, it is smaller and dimmer than the text, and it takes a row of its own, so it covers none of the text. A phone-width layout claim: it runs
// under --project=shots (390x844).
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

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

async function openMark12(page: Page, immersive: 'on' | 'off') {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { immersiveReader: immersive, immersiveHint: 'off' });
  await page.goto('/#/?b=mrk&c=12');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

const place = (page: Page) => page.locator('[data-place-line]');
const scrollText = (page: Page, by: number) =>
  page.evaluate((px) => {
    (document.querySelector('[data-reader]') as HTMLElement).scrollTop += px;
  }, by);
const percentOf = async (page: Page) => {
  const text = (await place(page).textContent()) ?? '';
  const match = text.match(/^Mark 12 · (\d+)%$/);
  if (!match) throw new Error(`the place line reads "${text}"`);
  return Number(match[1]);
};

/** Two fingers on the text at once, lifted together: a two-finger tap. */
async function twoFingerTap(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const points = [
    { x: 150, y: 450, id: 1 },
    { x: 240, y: 460, id: 2 },
  ];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test('the place line is there only with Immersive reader On and the bars away', async ({ page }) => {
  await openMark12(page, 'on');
  await expect(place(page)).toHaveCount(0);

  await scrollText(page, 300);
  await expect(place(page)).toBeVisible();
  await expect(place(page)).toHaveText(/^Mark 12 · \d+%$/);

  await twoFingerTap(page);
  await expect(place(page)).toHaveCount(0);
  await expect(page.getByTestId('reader-chips')).toBeVisible();

  await page.waitForTimeout(700);
  await twoFingerTap(page);
  await expect(place(page)).toBeVisible();
});

test('with Immersive reader Off there is no place line', async ({ page }) => {
  await openMark12(page, 'off');
  await scrollText(page, 600);
  await page.waitForTimeout(400);
  await expect(place(page)).toHaveCount(0);
});

test('it reads the book and chapter and a percent that rises as the text is scrolled', async ({ page }) => {
  await openMark12(page, 'on');
  await scrollText(page, 300);
  await expect(place(page)).toBeVisible();
  const first = await percentOf(page);
  expect(first).toBeGreaterThanOrEqual(0);
  expect(first).toBeLessThan(100);

  await scrollText(page, 900);
  await expect.poll(() => percentOf(page)).toBeGreaterThan(first);
  const second = await percentOf(page);

  await scrollText(page, 100000);
  await expect.poll(() => percentOf(page)).toBe(100);
  expect(second).toBeLessThan(100);
});

test('it is small and dim, and covers none of the text', async ({ page }) => {
  await openMark12(page, 'on');
  await scrollText(page, 600);
  await expect(place(page)).toBeVisible();

  const look = await page.evaluate(() => {
    const line = document.querySelector('[data-place-line]') as HTMLElement;
    const verse = document.querySelector('[data-verse]') as HTMLElement;
    const box = document.querySelector('[data-reader]') as HTMLElement;
    const ls = getComputedStyle(line);
    return {
      lineSize: parseFloat(ls.fontSize),
      lineOpacity: parseFloat(ls.opacity),
      verseSize: parseFloat(getComputedStyle(verse).fontSize),
      lineTop: line.getBoundingClientRect().top,
      boxBottom: box.getBoundingClientRect().bottom,
      lineBottom: line.getBoundingClientRect().bottom,
      windowHeight: window.innerHeight,
    };
  });
  expect(look.lineSize).toBeLessThan(look.verseSize);
  expect(look.lineOpacity).toBeLessThan(1);
  // below the text's box, not over it, and on the screen
  expect(look.lineTop).toBeGreaterThanOrEqual(look.boxBottom - 0.5);
  expect(look.lineBottom).toBeLessThanOrEqual(look.windowHeight + 0.5);
  await shot(page, 'immersive-place');
});
