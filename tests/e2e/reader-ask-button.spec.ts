// The round Ask the tutor button floats over the Reader's foot (mw-5r3p30.115): no line of the chapter may be left hidden behind it. At the
// end of a chapter the last verse clears it; reading aloud never leaves the verse being read behind it; and anything it covers mid-chapter
// is scrolled clear by moving the text up by the button's height (the padding at the foot of the reading box). Hebrews 7 at a 412x915 phone.
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });

const BUTTON = 'button[data-ask-tutor]';
const CHAPTER = '/#/?b=heb&c=7';

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function open(page: Page) {
  await openUnlocked(page);
  await page.goto(CHAPTER);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.locator(BUTTON)).toBeVisible();
}

/** The rectangle of every line of text in the reading box as it is on screen (what the box clips is not counted), with the verse it belongs to. */
const linesOnScreen = (page: Page) =>
  page.evaluate(() => {
    const box = document.querySelector<HTMLElement>('[data-reader]');
    if (!box) return [];
    const bounds = box.getBoundingClientRect();
    const out: { verse: number; x: number; y: number; width: number; height: number }[] = [];
    for (const verse of box.querySelectorAll<HTMLElement>('[data-verse]')) {
      const range = document.createRange();
      range.selectNodeContents(verse);
      for (const r of range.getClientRects()) {
        const top = Math.max(r.top, bounds.top);
        const bottom = Math.min(r.bottom, bounds.bottom);
        if (r.width < 2 || bottom - top < 4) continue;
        out.push({ verse: Number(verse.getAttribute('data-verse')), x: r.x, y: top, width: r.width, height: bottom - top });
      }
    }
    return out;
  });

test('the last verse of the chapter scrolls clear of the round Ask the tutor button', async ({ page }) => {
  await open(page);
  const last = await page.locator('[data-verse]').last().getAttribute('data-verse');
  await page.locator('[data-reader]').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const verse = await page.locator(`[data-reader] [data-verse="${last}"]`).boundingBox();
  const button = await page.locator(BUTTON).boundingBox();
  if (!verse || !button) throw new Error('no boxes');
  expect(meets(verse, button)).toBe(false);
  await shot(page, 'reader-ask-button-end');
});

test('the verse being read aloud is never left behind the button', async ({ page }) => {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 300 });
  await page.clock.install();
  await page.goto(CHAPTER);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Read from the top', exact: true }).click();
  const bar = page.locator('[data-reading-bar]');
  const seen = new Set<string>();
  for (let step = 0; step < 90 && seen.size < 14; step++) {
    await page.clock.runFor(1000);
    const text = (await bar.textContent()) ?? '';
    const n = /Reading verse (\d+)/.exec(text)?.[1];
    if (!n || seen.has(n)) continue;
    seen.add(n);
    const lines = (await linesOnScreen(page)).filter((l) => l.verse === Number(n));
    const button = await page.locator(BUTTON).boundingBox();
    if (!button) throw new Error('no button');
    expect(lines.length, `verse ${n} is on screen`).toBeGreaterThan(0);
    for (const line of lines) expect(meets(line, button), `a line of verse ${n} is behind the button`).toBe(false);
  }
  expect(seen.size).toBeGreaterThanOrEqual(10);
  await shot(page, 'reader-ask-button-reading');
});

test('scrolled anywhere in the chapter, no line of text is behind the button', async ({ page }) => {
  await open(page);
  const reading = page.locator('[data-reader]');
  const button = await page.locator(BUTTON).boundingBox();
  if (!button) throw new Error('no button');
  const top = await reading.evaluate((el) => el.scrollHeight - el.clientHeight);
  expect(top).toBeGreaterThan(1500);
  for (let at = 0; at <= top; at += 120) {
    await reading.evaluate((el, t) => {
      el.scrollTop = t;
    }, at);
    const behind = (await linesOnScreen(page)).filter((l) => meets(l, button));
    expect(behind, `scrolled to ${at}`).toEqual([]);
  }
  await reading.evaluate((el, t) => {
    el.scrollTop = t * 0.4;
  }, top);
  await shot(page, 'reader-ask-button-mid');
});

/** The rectangle of every word of the reading box and every verse number button, as it is on screen (what the box clips is not counted). */
const wordsAndNumbersOnScreen = (page: Page) =>
  page.evaluate(() => {
    const box = document.querySelector<HTMLElement>('[data-reader]');
    if (!box) return [];
    const bounds = box.getBoundingClientRect();
    const out: { what: string; x: number; y: number; width: number; height: number }[] = [];
    const add = (what: string, r: DOMRect) => {
      const top = Math.max(r.top, bounds.top);
      const bottom = Math.min(r.bottom, bounds.bottom);
      if (r.width < 1 || bottom - top < 2) return;
      out.push({ what, x: r.x, y: top, width: r.width, height: bottom - top });
    };
    for (const number of box.querySelectorAll<HTMLElement>('button[aria-label^="Verse "]')) add(number.getAttribute('aria-label') ?? 'verse number', number.getBoundingClientRect());
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      for (const m of text.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, m.index ?? 0);
        range.setEnd(node, (m.index ?? 0) + m[0].length);
        for (const r of range.getClientRects()) add(m[0], r);
      }
    }
    return out;
  });

test('the button meets no word and no verse number, at rest and at the chapter end (Hebrews 7, English)', async ({ page }) => {
  await open(page);
  const reading = page.locator('[data-reader]');
  const button = await page.locator(BUTTON).boundingBox();
  if (!button) throw new Error('no button');
  expect(button.width).toBeGreaterThanOrEqual(44);
  expect(button.height).toBeGreaterThanOrEqual(44);
  for (const place of ['rest', 'end'] as const) {
    if (place === 'end')
      await reading.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
    const items = await wordsAndNumbersOnScreen(page);
    expect(items.length, `${place}: words are on screen`).toBeGreaterThan(20);
    expect(items.filter((item) => meets(item, button)).map((item) => item.what), `${place}: behind the button`).toEqual([]);
    await shot(page, `reader-ask-button-words-${place}`);
  }
});
