// tests/e2e/place-line-chapter.spec.ts — a tap on the Reader's place line ('Mark 12 · 45%', or 'Mark 12 · Page 2 of 7' with Turn pages) opens the whole chapter in the
// view a section heading opens (mw-5r3p30.699): verses 1 to the last, titled with the chapter, with Listen, Read it aloud, Ask the tutor, Quiz me, Copy link and
// Share; Back returns to the reader where he was; and the line is the size and place it was. A phone-width layout claim (390x844).
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, QUIZ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// Mark 12 has 44 verses
const LAST = 44;

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

const place = (page: Page) => page.locator('[data-place-line]');

async function start(page: Page, settings: Record<string, string>) {
  await page.addInitScript(() => {
    // a phone with Share: the view draws its sixth button
    Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true });
  });
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: QUIZ_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { immersiveHint: 'off', ...settings });
  await page.goto('/#/?b=mrk&c=12&view=english&weave=off');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mark 12', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  return fake;
}

/** The pages are cut for good: the place line stops changing. */
async function settled(page: Page) {
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

/** The line is a quiet row: 12 px type on a 16 px line with the padding of `.place-line`, so tapping it does not make it taller. */
async function expectQuiet(page: Page) {
  const size = await place(page).evaluate((el) => {
    const s = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return { font: s.fontSize, line: parseFloat(s.lineHeight), pad: parseFloat(s.paddingTop) + parseFloat(s.paddingBottom), height: box.height, width: box.width };
  });
  expect(size.font).toBe('12px');
  expect(size.height).toBeCloseTo(size.line + size.pad, 0);
  expect(size.width).toBeCloseTo(390, 0);
}

/** Opens the chapter's view from the place line and checks what it holds. */
async function openFromLine(page: Page) {
  await place(page).click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  await expect(view.getByRole('heading', { name: `Mark 12, Mark 12:1-${LAST}` })).toBeVisible();
  await expect(view.locator('[data-passage-verse]')).toHaveCount(LAST);
  const row = view.getByRole('group', { name: 'Actions', exact: true });
  for (const name of ['Listen', 'Read it aloud', 'Ask the tutor', 'Quiz me', 'Copy link', 'Share']) {
    await expect(row.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(view.locator('[data-verse-bar]').getByRole('button', { name: `Play verses 1-${LAST}`, exact: true })).toBeVisible();
  return view;
}

test('Immersive reader: a tap on the place line opens the whole chapter, Back returns where he was, and Quiz me asks about all of it', async ({ page }) => {
  const fake = await start(page, { immersiveReader: 'on' });
  await page.evaluate(() => {
    (document.querySelector('[data-reader]') as HTMLElement).scrollTop += 300;
  });
  await expect(place(page)).toBeVisible();
  await expect(place(page)).toHaveText(/^Mark 12 · \d+%$/);
  // the row slides in with the bars (200 ms): measure it once it has stopped
  await page.waitForTimeout(400);
  await expectQuiet(page);
  const was = await page.evaluate(() => (document.querySelector('[data-reader]') as HTMLElement).scrollTop);
  const before = await place(page).boundingBox();

  const view = await openFromLine(page);
  await shot(page, 'place-line-chapter');

  await view.getByRole('button', { name: 'Quiz me', exact: true }).click();
  await view.getByRole('button', { name: 'Start the quiz', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: `Quiz on Mark 12:1-${LAST}` });
  await expect(sheet).toContainText(`Quiz me on Mark 12:1-${LAST}.`);
  await expect(sheet).toContainText(QUIZ_ANSWER.answer);
  const sent = fake.received[fake.received.length - 1].input;
  expect(sent.reference).toBe(`Mark 12:1-${LAST}`);
  expect(sent.mode).toBe('quiz');
  expect(sent.question).toBe(`Quiz me on Mark 12:1-${LAST}.`);
  // a chapter is more than a request holds: the text is sent from verse 1 on and cut at its end
  expect(String(sent.english)).toMatch(/…$/);
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();

  await view.getByRole('button', { name: '‹ Reader' }).click();
  await expect(view).toHaveCount(0);
  await expect(place(page)).toHaveText(/^Mark 12 · \d+%$/);
  expect(await page.evaluate(() => (document.querySelector('[data-reader]') as HTMLElement).scrollTop)).toBe(was);
  const after = await place(page).boundingBox();
  expect(after).toEqual(before);
});

test('Turn pages: a tap on the Page N of M line opens the whole chapter, Back returns to the same page', async ({ page }) => {
  await start(page, { readingMode: 'pages' });
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  await settled(page);
  await expect(place(page)).toHaveText(/^Mark 12 · Page \d+ of \d+$/);
  await expectQuiet(page);
  const reading = await place(page).textContent();
  const before = await place(page).boundingBox();

  await openFromLine(page);
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  await settled(page);
  await expect(place(page)).toHaveText(reading ?? '');
  expect(await place(page).boundingBox()).toEqual(before);
});
