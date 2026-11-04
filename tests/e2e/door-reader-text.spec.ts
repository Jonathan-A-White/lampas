// tests/e2e/door-reader-text.spec.ts — the Reader's text uses the whole width, and its foot is not held back for the ? or for buttons that are off (mw-5r3p30.1005). mw-5r3p30.992 had kept a 4.5 rem column
// clear of the floating ? on the Hand's side so no word was under it; the Governor did not like the column (Postern general, 2026-11-03: "Always use full like before and it is okay for question to cover as long
// as 2 finger tap can hide it and bring it back"), so a word may now sit under the ? and the two-finger tap hides it. What stays under the ?: the Verse view's tools line and the help line under its text
// (mw-5r3p30.1002; they are rows of buttons) and every foot row (mw-5r3p30.961, .981, .998), tested here and in door-overlap.spec.ts.
// Each case opens Luke 20 or John 5 at 390x844 on a licensed phone.
import { expect, test, type Page } from '@playwright/test';
import { FLOATING, twoFingers } from './open-tutor';
import { shot } from './shot';
import { keepHand } from './tutor-door';
import { keepSettings } from './keep-settings';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

type Row = { lemma: string; gloss: string; state: 'solid' | 'learning' };

// Puts words on his list through raw IndexedDB, as the app wrote them.
async function putWords(page: Page, rows: Row[]) {
  const now = Date.now();
  await page.evaluate(
    ([list, since]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('words', 'readwrite');
          for (const r of list as Row[]) tx.objectStore('words').put({ lemma: r.lemma, lemmas: [r.lemma], gloss: r.gloss, lesson: 0, state: r.state, since });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [rows, now] as const,
  );
}

/** The left and right edges, in px, that the lines of text in `rootSel` reach on the screen: [leftmost, rightmost]. */
async function reach(page: Page, rootSel = '[data-reader-text]', boxSel = '[data-reader]'): Promise<[number, number]> {
  return page.evaluate(([rootSel, boxSel]) => {
    const box = document.querySelector(boxSel)!.getBoundingClientRect();
    let left = Infinity;
    let right = -Infinity;
    const walker = document.createTreeWalker(document.querySelector(rootSel)!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if ((node.textContent ?? '').trim() === '') continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of Array.from(range.getClientRects())) {
        if (r.width === 0 || r.bottom < box.top || r.top > box.bottom || r.right < box.left || r.left > box.right) continue;
        left = Math.min(left, r.left);
        right = Math.max(right, r.right);
      }
    }
    return [left, right] as [number, number];
  }, [rootSel, boxSel] as const);
}

/** Scrolls the reading box a step at a time from top to foot and reports how far across the lines reach, over the whole chapter. */
async function reachOfTheChapter(page: Page): Promise<[number, number]> {
  let left = Infinity;
  let right = -Infinity;
  const box = page.locator('[data-reader]');
  const [height, total] = await box.evaluate((el) => [el.clientHeight, el.scrollHeight]);
  for (let top = 0; top < total; top += height / 3) {
    await box.evaluate((el, to) => void (el.scrollTop = to), top);
    const [l, r] = await reach(page);
    left = Math.min(left, l);
    right = Math.max(right, r);
  }
  return [left, right];
}

const VIEWS = [
  { name: 'Weave', query: 'view=english&weave=solid%2Blearning' },
  { name: 'Greek', query: 'view=greek&weave=off' },
] as const;

for (const { name, query } of VIEWS) {
  for (const hand of ['right', 'left'] as const) {
    for (const immersive of ['off', 'on'] as const) {
      test(`Luke 20 in ${name}, ${hand}-handed, Immersive reader ${immersive}: the text uses the full width, with no column kept for the ?`, async ({ page }) => {
        test.setTimeout(120_000);
        await openUnlocked(page, { empty: true });
        await page.goto('/');
        await expect(page.locator('[data-reader]')).toBeVisible();
        await putWords(page, [
          { lemma: 'ἀρχή', gloss: 'rule', state: 'solid' },
          { lemma: 'αὐτός', gloss: 'he', state: 'learning' },
          { lemma: 'ὁ', gloss: 'the', state: 'learning' },
          { lemma: 'δίδωμι', gloss: 'give', state: 'solid' },
        ]);
        await keepHand(page, hand);
        await keepSettings(page, { immersiveReader: immersive, immersiveHint: 'off' });
        await page.goto(`/#/?b=luk&c=20&${query}`);
        await page.reload();
        await expect(page.locator('[data-verse="23"]')).toBeVisible();
        await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
        // the box pads 0.25 rem (4 px) a side and no more: the line is 382 px of the 390
        const sides = await page.locator('[data-reader]').evaluate((el) => {
          const s = getComputedStyle(el);
          return [parseFloat(s.paddingLeft), parseFloat(s.paddingRight)];
        });
        expect(sides, 'the box pads its two sides alike, a quarter rem each').toEqual([4, 4]);
        await expect(page.locator('[data-reader]')).not.toHaveAttribute('data-door-room', /.+/);
        expect((await page.locator('[data-reader-text]').boundingBox())!.width, 'the text is the box wide').toBeGreaterThanOrEqual(381);
        const [left, right] = await reachOfTheChapter(page);
        expect(right, 'a line reaches the Hand side that was kept clear').toBeGreaterThanOrEqual(350);
        expect(left, 'a line starts at the other edge').toBeLessThanOrEqual(12);
        await page.locator('[data-reader]').evaluate((el) => void (el.scrollTop = 0));
        await page.locator('[data-verse="23"]').scrollIntoViewIfNeeded();
        await shot(page, `door-reader-text-${name.toLowerCase()}-${hand}-${immersive}`);
      });
    }
  }
}

// Turn pages: the pages are columns a box wide with the gap of Turn pages (2 rem, as before the column), and a page shows only its own lines.
for (const hand of ['right', 'left'] as const) {
  test(`Luke 20 with Turn pages, ${hand}-handed: the page is the full width, no line of the next page shows, and the last page is reached`, async ({ page }) => {
    test.setTimeout(120_000);
    await openUnlocked(page, { empty: true });
    await page.goto('/');
    await expect(page.locator('[data-reader]')).toBeVisible();
    await keepSettings(page, { hand, readingMode: 'pages' });
    await page.goto('/#/?b=luk&c=20&view=greek&weave=off');
    await page.reload();
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
    await expect(page.locator('[data-verse="23"]')).toBeAttached();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const box = page.locator('[data-reader]');
    const [pageWidth, gap] = await page.locator('[data-pages]').evaluate((el) => [el.clientWidth, parseFloat(getComputedStyle(el).columnGap)]);
    expect(pageWidth, 'a page is the full width of the box').toBeGreaterThanOrEqual(381);
    expect(gap, 'the gap between pages is Turn pages\' own 2 rem').toBe(32);
    const step = pageWidth + gap;
    const width = await page.locator('[data-pages]').evaluate((el) => el.scrollWidth);
    expect(width, 'the chapter is more than one page').toBeGreaterThan(step * 2);
    let farthest = -Infinity;
    for (let at = 0; at < width - step / 2; at += step) {
      await box.evaluate((el, to) => void (el.scrollLeft = to), at);
      const [l, r] = await reach(page);
      // every line that shows is inside the box: nothing of a neighbouring page is in view
      expect(l, `page at ${at}: a line starts left of the box`).toBeGreaterThanOrEqual(0);
      expect(r, `page at ${at}: a line runs past the box`).toBeLessThanOrEqual(390);
      farthest = Math.max(farthest, r);
    }
    expect(farthest, 'a page\'s lines reach the Hand side that was kept clear').toBeGreaterThanOrEqual(350);
    // the last page is reachable: the box scrolls as far as the text goes
    await box.evaluate((el) => void (el.scrollLeft = el.scrollWidth));
    const last = await page.locator('[data-pages] > :last-child').evaluate((el) => el.getBoundingClientRect().left);
    expect(last, 'the chapter buttons of the last page are on screen').toBeLessThan(390);
  });
}

test('the Verse view of a passage uses the full width of its text box, at text size 160', async ({ page }) => {
  await openUnlocked(page, { empty: true });
  await page.goto('/');
  await expect(page.locator('[data-reader]')).toBeVisible();
  await keepSettings(page, { textSize: '160' });
  await page.goto('/#/?b=luk&c=20&view=english&weave=off');
  await page.reload();
  await page.locator('[data-heading] button').first().click();
  const box = page.locator('[data-passage-box]');
  await expect(box).toBeVisible();
  await expect(page.locator(FLOATING)).toBeVisible();
  await expect(box).not.toHaveAttribute('data-door-room', /.+/);
  const sides = await box.evaluate((el) => {
    const s = getComputedStyle(el);
    return [parseFloat(s.paddingLeft), parseFloat(s.paddingRight)];
  });
  expect(sides, 'the box pads 0.5 rem a side and no more').toEqual([8, 8]);
  const [, right] = await reach(page, '[data-passage-box]', '[data-passage-box]');
  expect(right, 'a line reaches the Hand side that was kept clear').toBeGreaterThanOrEqual(340);
});

test('the immersive reader is as wide with the ? away as with it back, so the text does not re-flow as the bars come and go', async ({ page }) => {
  await openUnlocked(page, { empty: true });
  await page.goto('/#/?b=luk&c=20&view=english&weave=off');
  await expect(page.locator('[data-verse="23"]')).toBeVisible();
  const text = page.locator('[data-reader-text]');
  const before = (await text.boundingBox())!;
  await twoFingers(page, { x: before.x + 40, y: before.y + 120 });
  await expect(page.locator(FLOATING)).toHaveCount(0);
  const away = (await text.boundingBox())!;
  expect(away.width, 'the text is as wide with the ? away').toBe(before.width);
  await twoFingers(page, { x: away.x + 40, y: away.y + 120 });
  await expect(page.locator(FLOATING)).toBeVisible();
  expect((await text.boundingBox())!.width, 'and as wide with it back').toBe(before.width);
});

// The foot of the chapter (mw-5r3p30.1005; picture -3 of the Governor's 2026-11-03 message ended 'John 5 · 100%' with a blank band above the phone's bar). The Chapter buttons setting Hide
// draws no buttons and keeps no room for them; the immersive reader's place line is the lowest row and carries the phone's bar floor, so the box above it keeps none of its own.
async function openJohnFoot(page: Page, settings: Record<string, string>) {
  await openUnlocked(page, { empty: true });
  await page.goto('/');
  await expect(page.locator('[data-reader]')).toBeVisible();
  await keepSettings(page, { immersiveHint: 'off', ...settings });
  await page.goto('/#/?b=jhn&c=5&view=english&weave=off');
  await page.reload();
  await expect(page.locator('[data-verse="47"]')).toBeAttached();
  const box = page.locator('[data-reader]');
  // scrolling down well short of the end puts the bars away in the immersive reader (nearer the end it does not); the place line then stands under the text, and he scrolls on to the foot
  if (settings.immersiveReader === 'on') {
    await box.evaluate((el) => void (el.scrollTop += 600));
    await expect(page.locator('[data-place-line]')).toBeVisible();
  }
  await box.evaluate((el) => void (el.scrollTop = el.scrollHeight));
  await page.waitForTimeout(500);
}

/** How far the last line of John 5:47 ends above the place line's top, in px. */
const gapAbovePlaceLine = (page: Page) =>
  page.evaluate(() => {
    const verse = document.querySelector('[data-verse="47"]')!;
    const walker = document.createTreeWalker(verse, NodeFilter.SHOW_TEXT);
    let bottom = -Infinity;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if ((node.textContent ?? '').trim() === '') continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of Array.from(range.getClientRects())) bottom = Math.max(bottom, r.bottom);
    }
    return document.querySelector('[data-place-line]')!.getBoundingClientRect().top - bottom;
  });

test('immersive, Chapter buttons Hide: no room is held at the foot of the chapter above the place line', async ({ page }) => {
  await openJohnFoot(page, { immersiveReader: 'on', chapterButtons: 'hide' });
  await expect(page.getByRole('navigation', { name: 'Chapters' })).toHaveCount(0);
  const gap = await gapAbovePlaceLine(page);
  // the last line's own leading (a 44 px line) and a little air: well under the 64 px the box held before
  expect(gap, 'the blank between the last line and the place line').toBeLessThanOrEqual(24);
  await shot(page, 'door-reader-foot-hide');
});

test('immersive, Chapter buttons Show: the buttons keep their room above the place line', async ({ page }) => {
  await openJohnFoot(page, { immersiveReader: 'on', chapterButtons: 'show' });
  const nav = page.getByRole('navigation', { name: 'Chapters' });
  await expect(nav).toBeVisible();
  const [navBottom, placeTop] = await Promise.all([nav.evaluate((el) => el.getBoundingClientRect().bottom), page.locator('[data-place-line]').evaluate((el) => el.getBoundingClientRect().top)]);
  expect(navBottom, 'the buttons end above the place line').toBeLessThanOrEqual(placeTop - 8);
});

/** Every line of text and every button in the Verse view, outside its text box, that meets the ?'s box at rest (mw-5r3p30.1002: the 'Maps · 4' button and a help line, on Luke 20:47 at text size 160, were under it). */
async function viewUnderTheDoor(page: Page): Promise<string[]> {
  return page.evaluate((sel) => {
    const door = document.querySelector(sel)!.getBoundingClientRect();
    const view = document.querySelector('[data-verse-view]')!;
    const text = view.querySelector('[data-verse-text]');
    const hits: string[] = [];
    const meets = (r: DOMRect) => r.width > 0 && r.left < door.right && door.left < r.right && r.top < door.bottom && door.top < r.bottom;
    const walker = document.createTreeWalker(view, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const words = (node.textContent ?? '').trim();
      if (words === '' || text?.contains(node)) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of Array.from(range.getClientRects())) if (meets(r)) hits.push(`${words.slice(0, 30)} ${Math.round(r.left)}-${Math.round(r.right)}`);
    }
    for (const b of Array.from(view.querySelectorAll('button, a'))) {
      if (text?.contains(b)) continue;
      const r = b.getBoundingClientRect();
      if (meets(r)) hits.push(`[${(b.textContent ?? '').trim().slice(0, 30)}] ${Math.round(r.left)}-${Math.round(r.right)}`);
    }
    return hits;
  }, FLOATING);
}

for (const hand of ['right', 'left'] as const) {
  test(`the Verse view of Luke 20:47 at text size 160, ${hand}-handed: no button or help line is under the ? at rest`, async ({ page }) => {
    await openUnlocked(page, { empty: true });
    await page.goto('/');
    await expect(page.locator('[data-reader]')).toBeVisible();
    await keepSettings(page, { textSize: '160' });
    await keepHand(page, hand);
    await page.goto('/#/?b=luk&c=20&view=english&weave=off');
    await page.reload();
    await expect(page.locator('[data-verse="47"]')).toBeAttached();
    const view = await openVerseView(page, 47);
    await expect(view.getByRole('button', { name: /^Maps · \d+$/ })).toBeVisible();
    await expect(page.locator(FLOATING)).toBeVisible();
    expect(await viewUnderTheDoor(page), 'controls and help under the ?').toEqual([]);
    // the help line of each action, too
    for (const action of ['Listen', 'Read it aloud', 'Practise', 'Diagram']) {
      const button = view.getByRole('button', { name: action, exact: true });
      if ((await button.count()) === 0) continue;
      await button.click();
      expect(await viewUnderTheDoor(page), `${action}: controls and help under the ?`).toEqual([]);
    }
    await shot(page, `door-verse-view-160-${hand}`);
  });
}
