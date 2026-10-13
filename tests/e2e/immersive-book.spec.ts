import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// With Immersive reader On the Reader's text reads like a book (mw-5r3p30.297): tight lines (line-height about 1.4) wherever no line sits under a
// word, a book serif, justified and hyphenated in the text's language, pure black behind it in the dark theme, and small dim verse numbers.
// Off keeps today's look. Type size never shrinks. A phone-width layout claim: it runs under --project=shots (390x844).
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

async function openReader(
  page: Page,
  immersive: 'on' | 'off',
  options: { hash?: string; heading?: string; settings?: Record<string, string> } = {},
) {
  const heading = options.heading ?? 'Romans 8';
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { immersiveReader: immersive, immersiveHint: 'off', ...options.settings });
  if (options.hash) await page.goto(`/${options.hash}`);
  await page.reload();
  await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

interface Look {
  lineHeight: number;
  fontSize: number;
  fontFamily: string;
  textAlign: string;
  hyphens: string;
  lang: string | null;
  background: string;
}

const look = (el: Locator): Promise<Look> =>
  el.evaluate((node) => {
    const s = getComputedStyle(node);
    return {
      lineHeight: parseFloat(s.lineHeight),
      fontSize: parseFloat(s.fontSize),
      fontFamily: s.fontFamily,
      textAlign: s.textAlign,
      hyphens: s.hyphens,
      lang: node.getAttribute('lang'),
      background: s.backgroundColor,
    };
  });

const verse = (page: Page, n: number) => page.locator(`[data-verse="${n}"]`);
const ratio = (l: Look) => l.lineHeight / l.fontSize;
const rgbOf = (color: string) => color.match(/[\d.]+/g)!.map(Number);
/** a rough brightness of a colour string, 0 (black) to 255 (white), over its alpha */
const brightness = (color: string) => {
  const [r, g, b, a = 1] = rgbOf(color);
  return ((r + g + b) / 3) * a;
};

test('Off keeps today\'s look: roomy lines, sans, ragged right, no hyphenation', async ({ page }) => {
  await openReader(page, 'off');
  const l = await look(verse(page, 1));
  expect(l.lineHeight).toBeGreaterThanOrEqual(44 - 0.5);
  expect(ratio(l)).toBeGreaterThan(1.9);
  expect(l.fontFamily).not.toMatch(/Georgia|Noto Serif/);
  expect(l.textAlign).not.toBe('justify');
  expect(l.hyphens).not.toBe('auto');
});

test('On sets the English as a book: lines near 1.4, a serif, justified and hyphenated in English', async ({ page }) => {
  await openReader(page, 'off');
  const off = await look(verse(page, 1));
  await keep(page, { immersiveReader: 'on' });
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
  await expect(verse(page, 1)).toBeVisible();
  const on = await look(verse(page, 1));
  expect(ratio(on)).toBeGreaterThanOrEqual(1.35);
  expect(ratio(on)).toBeLessThanOrEqual(1.45);
  expect(on.fontFamily).toMatch(/Georgia|Noto Serif|serif/);
  expect(on.fontFamily).not.toMatch(/system-ui|sans-serif/);
  expect(on.textAlign).toBe('justify');
  expect(on.hyphens).toBe('auto');
  expect(on.lang).toBe('en');
  // the type never shrinks
  expect(on.fontSize).toBeGreaterThanOrEqual(off.fontSize);
  // the 44 px verse number and play button do not make their lines tall: the verse is a whole number of tight lines
  for (const n of [1, 2, 3]) {
    const box = await verse(page, n).boundingBox();
    const lines = (box?.height ?? 0) / on.lineHeight;
    expect(lines).toBeLessThan(Math.round(lines) + 0.2);
    expect(lines).toBeGreaterThan(Math.round(lines) - 0.2);
  }
});

test('On sets the Greek tight, justified and hyphenated for Greek', async ({ page }) => {
  await openReader(page, 'on', { hash: '#/?b=rom&c=8&view=greek' });
  const g = await look(verse(page, 1));
  expect(g.lang).toBe('grc');
  expect(ratio(g)).toBeGreaterThanOrEqual(1.35);
  expect(ratio(g)).toBeLessThanOrEqual(1.45);
  expect(g.fontFamily).toContain('Gentium Plus');
  expect(g.textAlign).toBe('justify');
  expect(g.hyphens).toBe('auto');
});

test('a paragraph layout is tight and justified too', async ({ page }) => {
  await openReader(page, 'on', { settings: { layout: 'paragraph' } });
  const p = page.locator('[data-paragraph]').first();
  await expect(p).toBeVisible();
  const l = await look(p);
  expect(ratio(l)).toBeGreaterThanOrEqual(1.35);
  expect(ratio(l)).toBeLessThanOrEqual(1.45);
  expect(l.textAlign).toBe('justify');
  expect(l.hyphens).toBe('auto');
  expect(l.lang).toBe('en');
});

test('a verse with a line under its words keeps its spacing', async ({ page }) => {
  // the address carries the weave, and it wins over the saved choice
  await openReader(page, 'on', { hash: '#/?b=rom&c=8&weave=solid%2Blearning' });
  // verse 18: "glory" is δόξα, a word he is still learning, drawn with its English beneath
  const hinted = verse(page, 18);
  await hinted.scrollIntoViewIfNeeded();
  await expect(hinted.locator('[data-hint]').first()).toBeVisible();
  const loose = await look(hinted);
  expect(loose.lineHeight).toBeGreaterThanOrEqual(44 - 0.5);
  // a verse of the same chapter without one is tight
  await expect(verse(page, 1).locator('[data-hint]')).toHaveCount(0);
  expect(ratio(await look(verse(page, 1)))).toBeLessThanOrEqual(1.45);
});

test('in the dark theme On is pure black, with small dim verse numbers; light stays light', async ({ page }) => {
  await openReader(page, 'on', { settings: { theme: 'dark' } });
  const reader = page.locator('[data-reader]');
  expect((await look(reader)).background).toBe('rgb(0, 0, 0)');
  const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(canvas).toBe('rgb(0, 0, 0)');

  const number = verse(page, 2).locator('[data-verse-number]');
  const n = await number.evaluate((el) => {
    const s = getComputedStyle(el);
    return { size: parseFloat(s.fontSize), color: s.color, opacity: parseFloat(s.opacity) };
  });
  const text = await look(verse(page, 2));
  const textColor = await verse(page, 2).evaluate((el) => getComputedStyle(el).color);
  expect(n.size).toBeLessThan(text.fontSize);
  expect(n.size).toBeLessThanOrEqual(13);
  expect(brightness(n.color) * n.opacity).toBeLessThan(brightness(textColor) * 0.7);
  // still a thumb-sized button
  const box = await number.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(43.5);
});

test('On in the light theme does not paint black', async ({ page }) => {
  await openReader(page, 'on', { settings: { theme: 'light' } });
  expect((await look(page.locator('[data-reader]'))).background).not.toBe('rgb(0, 0, 0)');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgb(0, 0, 0)');
});

test('Off in the dark theme keeps the usual dark', async ({ page }) => {
  await openReader(page, 'off', { settings: { theme: 'dark' } });
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgb(0, 0, 0)');
});

test('Mark 12 with Immersive reader On, in the dark theme', async ({ page }) => {
  await openReader(page, 'on', { hash: '#/?b=mrk&c=12', heading: 'Mark 12', settings: { theme: 'dark' } });
  await verse(page, 28).scrollIntoViewIfNeeded();
  // no word runs off the screen
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'immersive-book');
});
