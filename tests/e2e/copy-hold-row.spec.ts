import { expect, test, type Page } from '@playwright/test';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The row a hold on a verse number draws (mw-5r3p30.1074, src/copy/HoldRow.tsx), Hebrews 9 in Paragraph layout at 360 px: it moves no line of the Reader, covers only the strip it sits on, dims nothing,
// has no close button, fits one line with its longest set, and does not animate under prefers-reduced-motion.
test.use({ viewport: { width: 360, height: 780 }, hasTouch: true });

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.clock.install();
});

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

async function keepLayout(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'layout', value: 'paragraph' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

/** The top of every verse the Reader draws: the lines of the text. */
const tops = (page: Page) => page.evaluate(() => Array.from(document.querySelectorAll('[data-reader] [data-verse]')).map((el) => Math.round(el.getBoundingClientRect().top * 10) / 10));
const fixedCount = (page: Page) =>
  page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((el) => getComputedStyle(el).position === 'fixed' && el.getBoundingClientRect().width > 0).length);

async function holdVerse(page: Page, n: number) {
  const number = page.locator(`[data-verse="${n}"] [data-verse-number]`);
  await number.scrollIntoViewIfNeeded();
  await holdFor(page, number, 650);
}

async function open(page: Page) {
  await openUnlocked(page);
  await page.goto('/#/?b=heb&c=9');
  await expect(page.getByRole('heading', { name: 'Hebrews 9', level: 1 })).toBeVisible();
  await keepLayout(page);
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-layout', 'paragraph');
  await expect(page.locator('[data-verse="11"] [data-verse-number]')).toBeVisible();
}

test('the row moves no line, covers one strip, dims nothing, has no close button and fits one line', async ({ page }) => {
  await open(page);
  const before = await tops(page);
  const fixedBefore = await fixedCount(page);
  await holdVerse(page, 1);
  const row = page.locator('[data-copy-row]');
  await expect(row).toBeVisible();
  await expect(row.getByRole('status')).toHaveText('Copied Hebrews 9:1');
  await expect(row.getByRole('button')).toHaveText(['Verse', 'Paragraph', 'Pericope', 'Chapter', 'Share']);
  // no line of the Reader moved
  expect(await tops(page)).toEqual(before);
  // one strip: a short box in the lower part of the window, narrower than the window, and the only thing added that is fixed
  const box = (await row.boundingBox())!;
  expect(box.height).toBeLessThan(100);
  expect(box.y).toBeGreaterThan(780 * 0.6);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  expect(await fixedCount(page)).toBe(fixedBefore + 1);
  // dims nothing: no dialog, no backdrop, the text under it is as opaque as before
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('[data-reader]')!).opacity)).toBe('1');
  // one line: every button on the same row, nothing wider than the row
  const buttons = await row.getByRole('button').evaluateAll((els) => els.map((el) => ({ top: Math.round(el.getBoundingClientRect().top), right: el.getBoundingClientRect().right })));
  expect(new Set(buttons.map((b) => b.top)).size).toBe(1);
  expect(Math.max(...buttons.map((b) => b.right))).toBeLessThanOrEqual(box.x + box.width);
  // no close button: its buttons are the ends and Share, and none says tutor
  await expect(row.getByRole('button', { name: /close|dismiss|tutor|ask/i })).toHaveCount(0);
  await shot(page, 'copy-hold-row');
});

test('a tap on Pericope copies 9:11-28 and says so; the row goes by itself; Share sends the range and takes the row away', async ({ page }) => {
  await open(page);
  await page.addInitScript(() => {
    (window as unknown as { __shared: unknown[] }).__shared = [];
    Object.defineProperty(navigator, 'share', { configurable: true, value: (data: unknown) => ((window as unknown as { __shared: unknown[] }).__shared.push(data), Promise.resolve()) });
  });
  await page.reload();
  await expect(page.locator('[data-verse="11"] [data-verse-number]')).toBeVisible();
  await holdVerse(page, 11);
  const row = page.locator('[data-copy-row]');
  await expect(row.getByRole('status')).toHaveText('Copied Hebrews 9:11');
  await row.getByRole('button', { name: 'Pericope' }).click();
  await expect(row.getByRole('status')).toHaveText('Copied Hebrews 9:11-28');
  expect((await clipboard(page)).split('\n')).toContain('— Hebrews 9:11-28 (MSB)');
  await expect(row.getByRole('button', { name: 'Pericope' })).toHaveAttribute('aria-pressed', 'true');
  await row.getByRole('button', { name: 'Share' }).click();
  await expect(row).toHaveCount(0);
  const sent = await page.evaluate(() => (window as unknown as { __shared: { title: string; text: string }[] }).__shared);
  expect(sent).toHaveLength(1);
  expect(sent[0].title).toBe('Hebrews 9:11-28');
  // and the row goes by itself, 3 s from the last touch
  await holdVerse(page, 11);
  await expect(page.locator('[data-copy-row]')).toBeVisible();
  await page.clock.runFor(2500);
  await expect(page.locator('[data-copy-row]')).toBeVisible();
  await page.clock.runFor(700);
  await expect(page.locator('[data-copy-row]')).toHaveCount(0);
});

test('under prefers-reduced-motion the row does not animate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await holdVerse(page, 11);
  const row = page.locator('[data-copy-row]');
  await expect(row).toBeVisible();
  expect(await row.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
});
