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

test('On sets the Greek tight, justified and hyphenated for Greek where the lines are long enough', async ({ page }) => {
  // a column narrower than 30rem is set ragged right (mw-5r3p30.585, below); a wide window keeps the even edges
  await page.setViewportSize({ width: 900, height: 700 });
  await openReader(page, 'on', { hash: '#/?b=rom&c=8&view=greek' });
  const g = await look(verse(page, 1));
  expect(g.lang).toBe('el');
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

/** WCAG 2's contrast ratio of two [r, g, b] colours. */
const contrast = (a: number[], b: number[]) => {
  const lum = ([r, g, b]: number[]) => {
    const [lr, lg, lb] = [r, g, b].map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('in the sepia theme On keeps the warm paper on a dark phone, with dim verse numbers still at 4.5:1', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await openReader(page, 'on', { settings: { theme: 'sepia' } });
  const paper = rgbOf(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));
  expect(paper).toEqual([244, 236, 216]);
  expect((await look(page.locator('[data-reader]'))).background).not.toBe('rgb(0, 0, 0)');

  const text = rgbOf(await verse(page, 2).evaluate((el) => getComputedStyle(el).color));
  expect(text).toEqual([59, 47, 32]);
  expect(contrast(text, paper)).toBeGreaterThanOrEqual(7);
  // the number as drawn: its colour, faded by its opacity over the paper
  const n = await verse(page, 2).locator('[data-verse-number]').evaluate((el) => {
    const s = getComputedStyle(el);
    return { color: s.color, opacity: parseFloat(s.opacity) };
  });
  const drawn = rgbOf(n.color).slice(0, 3).map((c, i) => c * n.opacity + paper[i] * (1 - n.opacity));
  expect(contrast(drawn, paper)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(drawn, paper)).toBeLessThan(contrast(text, paper));
  await shot(page, 'immersive-sepia');
});

test('Off in the dark theme keeps the usual dark', async ({ page }) => {
  await openReader(page, 'off', { settings: { theme: 'dark' } });
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgb(0, 0, 0)');
});

// The page is pure black in Dark with Immersive reader On, so the phone's bar and the Talk band around it are black too (mw-5r3p30.595); Settings and Off keep the navy.
const barColour = (page: Page) => page.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute('content')?.replace('#', ''));
const talkBand = (page: Page) => page.locator('[data-talk-bar]').evaluate((el) => getComputedStyle(el).backgroundColor);

test('Mark 12 in Dark with Immersive reader On: the phone\'s bar and the Talk band are black; Settings and Off keep the navy', async ({ page }) => {
  await openReader(page, 'on', { hash: '#/?b=mrk&c=12', heading: 'Mark 12', settings: { theme: 'dark' } });
  await expect(page.locator('[data-talk-bar]')).toBeVisible();
  await expect.poll(() => barColour(page)).toBe('000000');
  expect(await talkBand(page)).toBe('rgb(0, 0, 0)');
  await shot(page, 'immersive-black-bars');
  // Settings keeps its usual dark blue, bar included
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();
  await expect.poll(() => barColour(page)).toBe('0a0e17');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect.poll(() => barColour(page)).toBe('000000');
  // Off: the usual dark blue
  await keep(page, { immersiveReader: 'off' });
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'off');
  await expect.poll(() => barColour(page)).toBe('0a0e17');
  expect(await talkBand(page)).toBe('rgb(17, 23, 37)');
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

/** The widest gap between neighbouring words that stand on the same line of verse `n`, from a Range around each word (the verse number and play button are not words). */
const widestGap = (page: Page, n: number) =>
  page.evaluate((verseNumber) => {
    const root = document.querySelector(`[data-reader] [data-verse="${verseNumber}"]`)!;
    const words: DOMRect[][] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if ((node.parentElement as HTMLElement).closest('[data-verse-number], [data-verse-play]')) continue;
      const text = node.textContent ?? '';
      for (const match of text.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, match.index!);
        range.setEnd(node, match.index! + match[0].length);
        words.push(Array.from(range.getClientRects()).filter((r) => r.width > 0));
      }
    }
    let widest = 0;
    let pairs = 0;
    for (let i = 1; i < words.length; i++) {
      const before = words[i - 1].at(-1);
      const after = words[i][0];
      if (!before || !after) continue;
      // the same line: the two boxes overlap in height
      if (Math.min(before.bottom, after.bottom) - Math.max(before.top, after.top) < Math.min(before.height, after.height) / 2) continue;
      pairs += 1;
      widest = Math.max(widest, after.left - before.right);
    }
    return { widest, pairs };
  }, n);

// Justified lines hold too few words to justify well at Large and Largest type, and Greek has no hyphenation in Chrome (mw-5r3p30.585): there the book look
// keeps even edges only where a line is wide enough, and sets the text ragged right, as Off does, where it is not. Gaps are measured against the widest gap
// of the same verse with Immersive reader Off.
const WIDE = 2.5;
const SCENARIOS: Array<{ name: string; settings: Record<string, string>; hash: string }> = [
  { name: 'English at Text size Largest', settings: { textSize: '160' }, hash: '#/?b=mrk&c=12' },
  { name: 'English at Text size Large', settings: { textSize: '130' }, hash: '#/?b=mrk&c=12' },
  { name: 'Greek at Text size Normal', settings: {}, hash: '#/?b=mrk&c=12&view=greek' },
];
for (const scenario of SCENARIOS) {
  test(`${scenario.name}: no gap between words is wider than ${WIDE} times the widest with Immersive reader Off`, async ({ page }) => {
    const options = { hash: scenario.hash, heading: 'Mark 12', settings: { theme: 'dark', ...scenario.settings } };
    await openReader(page, 'off', options);
    await verse(page, 28).scrollIntoViewIfNeeded();
    const off = await widestGap(page, 28);
    expect(off.pairs).toBeGreaterThan(5);

    await keep(page, { immersiveReader: 'on' });
    await page.reload();
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'on');
    await verse(page, 28).scrollIntoViewIfNeeded();
    const on = await widestGap(page, 28);
    expect(on.pairs).toBeGreaterThan(5);
    expect(on.widest, `widest gap On ${on.widest}px, Off ${off.widest}px`).toBeLessThanOrEqual(WIDE * off.widest);
    await shot(page, `immersive-gaps-${scenario.name.replace(/\W+/g, '-').toLowerCase()}`);
  });
}

test('English at Text size Normal is still justified and hyphenated', async ({ page }) => {
  await openReader(page, 'on', { hash: '#/?b=mrk&c=12', heading: 'Mark 12', settings: { theme: 'dark' } });
  await verse(page, 28).scrollIntoViewIfNeeded();
  const l = await look(verse(page, 28));
  expect(l.textAlign).toBe('justify');
  expect(l.hyphens).toBe('auto');
});

// The play button at each verse end is dimmed like the verse number (mw-5r3p30.590): in a book it is nothing like the brightest thing on a black page.
test('On dims the play button to the verse number and keeps its tap box; Off leaves it bright', async ({ page }) => {
  const opacities = (n: number) =>
    verse(page, n).evaluate((el) => {
      const number = el.querySelector('[data-verse-number]')!;
      const play = el.querySelector('[data-verse-play]')!;
      const box = play.getBoundingClientRect();
      return { number: parseFloat(getComputedStyle(number).opacity), play: parseFloat(getComputedStyle(play).opacity), width: box.width, height: box.height };
    });
  await openReader(page, 'on', { hash: '#/?b=mrk&c=12', heading: 'Mark 12', settings: { theme: 'dark' } });
  await verse(page, 28).scrollIntoViewIfNeeded();
  const on = await opacities(28);
  expect(on.play).toBeLessThanOrEqual(on.number);
  expect(on.play).toBeLessThan(1);
  expect(on.width).toBeGreaterThanOrEqual(43.5);
  expect(on.height).toBeGreaterThanOrEqual(43.5);

  await keep(page, { immersiveReader: 'off' });
  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', 'off');
  await verse(page, 28).scrollIntoViewIfNeeded();
  expect((await opacities(28)).play).toBe(1);
});
