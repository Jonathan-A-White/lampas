import { expect, test, type Page } from '@playwright/test';
import { honestSpeech } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlicensed, openUnlocked } from './unlocked';

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
async function twoFingerTap(page: Page, y = 450) {
  const cdp = await page.context().newCDPSession(page);
  const points = [
    { x: 150, y, id: 1 },
    { x: 240, y: y + 10, id: 2 },
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

// 100% means the last verse is read (mw-5r3p30.479): with the last verse's bottom at the foot of the box the line reads 100%, though the chapter's
// links sit under it and the box could scroll further; it was 93% there, and 100% came only at the page's end.
test('with the last verse of Mark 12 scrolled to the foot the line reads 100%, though the box scrolls further', async ({ page }) => {
  await openMark12(page, 'on');
  await scrollText(page, 300);
  await expect(place(page)).toBeVisible();
  await page.waitForTimeout(700);
  // the last verse's bottom to the box's bottom
  const left = await page.evaluate(() => {
    const box = document.querySelector('[data-reader]') as HTMLElement;
    const verses = box.querySelectorAll('[data-verse]');
    const last = verses[verses.length - 1] as HTMLElement;
    box.scrollTop += last.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom;
    return box.scrollHeight - box.clientHeight - box.scrollTop;
  });
  // text is still to come under the last verse
  expect(left).toBeGreaterThan(20);
  await expect.poll(() => percentOf(page)).toBe(100);

  // a verse earlier is not the end
  await page.evaluate(() => {
    const box = document.querySelector('[data-reader]') as HTMLElement;
    const verses = box.querySelectorAll('[data-verse]');
    const before = verses[verses.length - 2] as HTMLElement;
    box.scrollTop += before.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom;
  });
  await expect.poll(() => percentOf(page)).toBeLessThan(100);
});

test('it is small and dim, and covers none of the text', async ({ page }) => {
  await openMark12(page, 'on');
  await scrollText(page, 600);
  await expect(place(page)).toBeVisible();
  // the row slides in with the bars going: measured once it has
  await page.waitForTimeout(400);

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

// The foot of the Reader with the bars away (mw-5r3p30.473): the place line, the reading bar (Pause, Restart, Stop) and the round Ask button all keep the floor
// of a three-button bar (48 px, src/index.css --lp-bar-inset), because Android Chrome does not always report the navigation bar. Upright and sideways,
// with the Talk bar drawn (a licensed phone) and without it.
const FLOOR = 48;
const VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '844x390', width: 844, height: 390 },
];
for (const licensed of [true, false]) {
  for (const size of VIEWPORTS) {
    test(`reading aloud with the bars away, ${licensed ? 'licensed' : 'free'} at ${size.name}, every row at the foot ends ${FLOOR} px above the bottom`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await honestSpeech(page, { msPerWord: 400 });
      await (licensed ? openUnlocked(page) : openUnlicensed(page));
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      await keep(page, { immersiveReader: 'on', immersiveHint: 'off' });
      await page.goto('/#/?b=mrk&c=12');
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
      await expect(page.locator('[data-verse="1"]')).toBeVisible();
      await page.getByRole('button', { name: 'Read from the top', exact: true }).click();
      await expect(page.locator('[data-speaking-slot] button').first()).toBeVisible();
      await scrollText(page, 300);
      await expect(place(page)).toBeVisible();
      await expect(page.locator('header').first()).toBeHidden();
      await page.waitForTimeout(400);

      const rows = await page.evaluate(() => {
        const out: Array<{ name: string; bottom: number }> = [];
        for (const el of document.querySelectorAll<HTMLElement>('[data-speaking-slot] button')) {
          out.push({ name: `bar button ${el.getAttribute('aria-label') ?? el.textContent}`, bottom: el.getBoundingClientRect().bottom });
        }
        // the place line's text, not its box: the box holds the floor as padding
        const line = document.querySelector<HTMLElement>('[data-place-line]');
        if (line) {
          const range = document.createRange();
          range.selectNodeContents(line);
          out.push({ name: 'the place line', bottom: range.getBoundingClientRect().bottom });
        }
        // the round Ask button slides off the screen with the bars: it is a row at the foot only while they are shown
        const ask = document.querySelector<HTMLElement>('[data-ask-tutor]:not([data-away])');
        if (ask) out.push({ name: 'the Ask button', bottom: ask.getBoundingClientRect().bottom });
        return { rows: out, height: window.innerHeight };
      });
      expect(rows.rows.length).toBeGreaterThanOrEqual(4);
      for (const row of rows.rows) expect(rows.height - row.bottom, row.name).toBeGreaterThanOrEqual(FLOOR - 0.5);
      if (licensed) await expect(page.locator('[data-ask-tutor]')).toHaveAttribute('data-away', '');
      await shot(page, `immersive-place-floor-${licensed ? 'licensed' : 'free'}-${size.name}`);

      // the bars back: the speaking bar, the Talk bar's round Ask button and the rows under them keep the floor too. Upright only: sideways, with the bars
      // shown and a chapter read, the stack of rows is taller than the window (the box is squeezed to 136 px, mw-5r3p30.212) and the Talk bar ends 12 px short of it.
      if (size.height < size.width) return;
      await twoFingerTap(page, size.height / 2);
      await expect(place(page)).toHaveCount(0);
      await page.waitForTimeout(400);
      const shown = await page.evaluate(() => {
        const out: Array<{ name: string; bottom: number }> = [];
        for (const el of document.querySelectorAll<HTMLElement>('[data-speaking-slot] button, [data-ask-tutor], [data-talk-bar] button')) {
          if (el.closest('[data-away]') || el.hasAttribute('data-away')) continue;
          out.push({ name: `shown ${el.getAttribute('aria-label') ?? el.textContent}`, bottom: el.getBoundingClientRect().bottom });
        }
        return { rows: out, height: window.innerHeight };
      });
      expect(shown.rows.length).toBeGreaterThanOrEqual(3);
      for (const row of shown.rows) expect(shown.height - row.bottom, row.name).toBeGreaterThanOrEqual(FLOOR - 0.5);
    });
  }
}

// A two-finger cycle must not move the text (mw-5r3p30.472): the box changes size when the bars come and go, and the text stays where it is, so the end of
// the chapter still reads 100% (it read 99% after a cycle, 22 px short). At the top, the middle and the end of Mark 12, with the Talk bar drawn and without.
for (const licensed of [true, false]) {
  test(`two two-finger cycles leave the text where it was and the end of Mark 12 at 100%, ${licensed ? 'with' : 'without'} the Talk bar`, async ({ page }) => {
    await (licensed ? openUnlocked(page) : openUnlicensed(page));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await keep(page, { immersiveReader: 'on', immersiveHint: 'off' });
    await page.goto('/#/?b=mrk&c=12');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    const top = () => page.evaluate(() => (document.querySelector('[data-reader]') as HTMLElement).scrollTop);
    const settle = () => page.waitForTimeout(700);

    // the end first: it is where the bug was seen
    await scrollText(page, 300);
    await expect(place(page)).toBeVisible();
    // the bars have finished sliding away before he goes on to the end
    await settle();
    await scrollText(page, 100000);
    await expect.poll(() => percentOf(page)).toBe(100);
    for (const where of ['end', 'middle', 'top']) {
      if (where === 'middle') await page.evaluate(() => { const b = document.querySelector('[data-reader]') as HTMLElement; b.scrollTop = (b.scrollHeight - b.clientHeight) / 2; });
      if (where === 'top') await page.evaluate(() => { (document.querySelector('[data-reader]') as HTMLElement).scrollTop = 40; });
      await settle();
      await expect(place(page)).toBeVisible();
      const before = await top();
      for (let cycle = 0; cycle < 2; cycle++) {
        await twoFingerTap(page);
        await expect(place(page)).toHaveCount(0);
        await settle();
        expect(await top(), `${where}: the bars shown, cycle ${cycle + 1}`).toBe(before);
        await twoFingerTap(page);
        await expect(place(page)).toBeVisible();
        await settle();
        expect(await top(), `${where}: the bars away again, cycle ${cycle + 1}`).toBe(before);
      }
      if (where === 'end') expect(await percentOf(page)).toBe(100);
    }
  });
}

// Coming back to the Reader at a scrolled place keeps the bars as he left them (mw-5r3p30.471): the Reader puts the saved place back, and that is not
// him scrolling down, so with the bars shown (a two-finger tap) Settings and then '‹ Reader' leaves them shown and draws no place line; the same
// place after a reload keeps them shown. Licensed (with the Talk bar) and not.
for (const licensed of [true, false]) {
  test(`with the bars shown on a scrolled Mark 12, Settings and then ‹ Reader and a reload keep them shown, ${licensed ? 'licensed' : 'free'}`, async ({ page }) => {
    await (licensed ? openUnlocked(page) : openUnlicensed(page));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await keep(page, { immersiveReader: 'on', immersiveHint: 'off' });
    await page.goto('/#/?b=mrk&c=12');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    const top = () => page.evaluate(() => (document.querySelector('[data-reader]') as HTMLElement).scrollTop);
    const shown = async (what: string) => {
      await expect(place(page), `${what}: no place line`).toHaveCount(0);
      await expect(page.locator('header').first(), `${what}: the header`).toBeVisible();
      await expect(page.getByTestId('reader-chips'), `${what}: the chips`).toBeVisible();
      if (licensed) await expect(page.locator('[data-talk-bar]'), `${what}: the Talk bar`).toBeVisible();
    };

    await scrollText(page, 1000);
    await expect(place(page)).toBeVisible();
    await page.waitForTimeout(700);
    await twoFingerTap(page);
    await shown('after the tap');
    await page.waitForTimeout(700);
    const at = await top();
    expect(at).toBeGreaterThan(500);

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: '‹ Reader' }).click();
    await expect.poll(top).toBeGreaterThan(at - 50);
    // the saved place is back; the restore waits for the text to stay still before it lets go
    await page.waitForTimeout(900);
    await shown('after Settings');
    await shot(page, `immersive-return-${licensed ? 'licensed' : 'free'}`);

    // the place is written to the phone 250 ms after the last scroll
    await page.waitForTimeout(600);
    await page.reload();
    await expect.poll(top).toBeGreaterThan(at - 50);
    await page.waitForTimeout(900);
    await shown('after a reload');
  });
}
