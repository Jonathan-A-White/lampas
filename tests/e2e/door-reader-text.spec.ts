// tests/e2e/door-reader-text.spec.ts — the floating ? does not sit over the Reader's text (mw-5r3p30.992, the Mayor's screenshots of Luke 20 on 0.7.86: the ? hid the end of αὐτῶν and the 'du-' of 'duplicity' in
// Weave, so the next line began 'plicity', and the end of δοῦναι in Greek). The ? floats at the Hand side's edge over the reading box, so the box keeps a column clear on that side while the ? is drawn
// (src/Reader.tsx data-door-room). Each case opens Luke 20 at 390x844 on a licensed phone, once for each hand, scrolls through the chapter and compares every line of text with the ?'s box.
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

/** Every line of text in the reading box that is on screen and meets the ?'s box: [] when the ? hides nothing. */
async function textUnderTheDoor(page: Page, rootSel = '[data-reader-text]', boxSel = '[data-reader]'): Promise<string[]> {
  return page.evaluate(([sel, rootSel, boxSel]) => {
    const door = document.querySelector(sel)!.getBoundingClientRect();
    const box = document.querySelector(boxSel)!.getBoundingClientRect();
    const hits: string[] = [];
    const walker = document.createTreeWalker(document.querySelector(rootSel)!, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      if (text.trim() === '') continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of Array.from(range.getClientRects())) {
        if (r.width === 0 || r.bottom < box.top || r.top > box.bottom || r.right < box.left || r.left > box.right) continue;
        if (r.left < door.right && door.left < r.right && r.top < door.bottom && door.top < r.bottom) hits.push(`${text.trim().slice(0, 30)} ${Math.round(r.left)}-${Math.round(r.right)}`);
      }
    }
    return hits;
  }, [FLOATING, rootSel, boxSel] as const);
}

/** Scrolls the reading box a step at a time from top to foot and reports the text under the ? at each stop. */
async function walkTheChapter(page: Page): Promise<string[]> {
  const found: string[] = [];
  const box = page.locator('[data-reader]');
  const [height, total] = await box.evaluate((el) => [el.clientHeight, el.scrollHeight]);
  for (let top = 0; top < total; top += height / 3) {
    await box.evaluate((el, to) => void (el.scrollTop = to), top);
    found.push(...(await textUnderTheDoor(page)));
  }
  return found;
}

const VIEWS = [
  { name: 'Weave', query: 'view=english&weave=solid%2Blearning' },
  { name: 'Greek', query: 'view=greek&weave=off' },
] as const;

for (const { name, query } of VIEWS) {
  for (const hand of ['right', 'left'] as const) {
    test(`Luke 20 in ${name}, ${hand}-handed: no line of the text is under the ?, scrolling through the chapter`, async ({ page }) => {
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
      await page.goto(`/#/?b=luk&c=20&${query}`);
      await page.reload();
      await expect(page.locator('[data-verse="23"]')).toBeVisible();
      await expect(page.locator(FLOATING)).toBeVisible();
      expect(await walkTheChapter(page), 'text under the ?').toEqual([]);
      await page.locator('[data-reader]').evaluate((el) => void (el.scrollTop = 0));
      await page.locator('[data-verse="23"]').scrollIntoViewIfNeeded();
      await shot(page, `door-reader-text-${name.toLowerCase()}-${hand}`);
    });
  }
}

// Turn pages: the pages are columns a box wide, so the box's padding is the column kept clear on every page (src/index.css [data-door-room]).
for (const hand of ['right', 'left'] as const) {
  test(`Luke 20 with Turn pages, ${hand}-handed: no line of any page is under the ?, and the last page is reached`, async ({ page }) => {
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
    const step = await page.locator('[data-pages]').evaluate((el) => el.clientWidth + parseFloat(getComputedStyle(el).columnGap));
    const width = await page.locator('[data-pages]').evaluate((el) => el.scrollWidth);
    expect(width, 'the chapter is more than one page').toBeGreaterThan(step * 2);
    const found: string[] = [];
    for (let at = 0; at < width - step / 2; at += step) {
      await box.evaluate((el, to) => void (el.scrollLeft = to), at);
      found.push(...(await textUnderTheDoor(page)));
    }
    expect(found, 'text under the ?').toEqual([]);
    // the last page is reachable: the box scrolls as far as the text goes
    await box.evaluate((el) => void (el.scrollLeft = el.scrollWidth));
    const last = await page.locator('[data-pages] > :last-child').evaluate((el) => el.getBoundingClientRect().left);
    expect(last, 'the chapter buttons of the last page are on screen').toBeLessThan(390);
  });
}

test('the Verse view of a passage keeps its text clear of the ?, scrolling the passage, at text size 160', async ({ page }) => {
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
  const [height, total] = await box.evaluate((el) => [el.clientHeight, el.scrollHeight]);
  expect(total, 'the passage scrolls').toBeGreaterThan(height);
  const found: string[] = [];
  for (let top = 0; top < total; top += height / 3) {
    await box.evaluate((el, to) => void (el.scrollTop = to), top);
    found.push(...(await textUnderTheDoor(page, '[data-passage-box]', '[data-passage-box]')));
  }
  expect(found, 'text under the ?').toEqual([]);
});

test('the immersive reader keeps the column when the ? goes away, so the text does not re-flow as the bars come and go', async ({ page }) => {
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
  expect(await textUnderTheDoor(page), 'text under the ?').toEqual([]);
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
