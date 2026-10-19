import { expect, test, type Page } from '@playwright/test';
import { honestMic } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

// The Immersive reader (mw-5r3p30.120) at 390x844: scrolling the text down slides the header, the chips, the Talk bar and the Ask button away;
// scrolling up, the chapter's end and scrolling past it leave them away; only a two-finger tap shows them and a second one puts them away
// (mw-5r3p30.255). A phone-width layout claim: it runs under --project=shots.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** Puts the Immersive reader setting in the app's store through raw IndexedDB, as the app wrote it. */
async function keepImmersive(page: Page, value: 'on' | 'off') {
  await page.evaluate(
    (v) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'immersiveReader', value: v });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    value,
  );
}

async function openReader(page: Page, immersive: 'on' | 'off') {
  await openUnlocked(page);
  await honestMic(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keepImmersive(page, immersive);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-immersive', immersive);
  await expect(page.getByTestId('reader-chips')).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

const header = (page: Page) => page.locator('header').first();
const chips = (page: Page) => page.getByTestId('reader-chips');
const talkBar = (page: Page) => page.locator('[data-talk-bar]');
const askButton = (page: Page) => page.locator('[data-ask-tutor]');
const all = (page: Page) => [header(page), chips(page), talkBar(page), askButton(page)];

const scrollText = (page: Page, by: number) =>
  page.evaluate((px) => {
    const box = document.querySelector('[data-reader]') as HTMLElement;
    box.scrollTop += px;
  }, by);
const scrollTop = (page: Page) => page.evaluate(() => (document.querySelector('[data-reader]') as HTMLElement).scrollTop);
const textHeight = (page: Page) => page.evaluate(() => (document.querySelector('[data-reader]') as HTMLElement).getBoundingClientRect().height);

/** The text box's height once the page has stopped moving (a row that arrives late, such as a tip, changes it): two reads 400 ms apart agree. */
async function settledHeight(page: Page) {
  let last = await textHeight(page);
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(400);
    const now = await textHeight(page);
    if (now === last) return now;
    last = now;
  }
  throw new Error(`the text box never stopped changing height (last ${last})`);
}

async function expectAll(page: Page, state: 'visible' | 'hidden') {
  for (const el of all(page)) await (state === 'visible' ? expect(el).toBeVisible() : expect(el).toBeHidden());
}

/** Two or three fingers on the text at once, lifted together: what the browser sends for a two- or three-finger tap (three must do nothing). */
async function fingerTap(page: Page, fingers: 2 | 3, at = { x: 150, y: 450 }, moveBy = 0) {
  const cdp = await page.context().newCDPSession(page);
  const points = [
    { x: at.x, y: at.y, id: 1 },
    { x: at.x + 90, y: at.y + 10, id: 2 },
    { x: at.x + 180, y: at.y, id: 3 },
  ].slice(0, fingers);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  if (moveBy) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points.map((p) => ({ ...p, y: p.y - moveBy })) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}
const twoFingerTap = (page: Page, at?: { x: number; y: number }, moveBy?: number) => fingerTap(page, 2, at, moveBy);
const threeFingerTap = (page: Page) => fingerTap(page, 3);

test('scrolling down slides the bars away, scrolling up leaves them away', async ({ page }) => {
  await openReader(page, 'on');
  await expectAll(page, 'visible');
  const before = await settledHeight(page);
  await shot(page, 'immersive-shown');

  await scrollText(page, 400);
  await expectAll(page, 'hidden');
  // out of the tab order too
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Talk', exact: true })).toHaveCount(0);
  expect(await textHeight(page)).toBeGreaterThan(before + 150);
  // the text has the whole screen: its box ends in the foot's last 100 px of the window, above the place line and the phone's 48 px floor under it (mw-5r3p30.473)
  const box = await page.locator('[data-reader]').boundingBox();
  expect((box?.y ?? 1) + (box?.height ?? 0)).toBeGreaterThan(844 - 100);
  await shot(page, 'immersive-hidden');

  await scrollText(page, -200);
  await page.waitForTimeout(400);
  await expectAll(page, 'hidden');
  expect(await scrollTop(page)).toBeGreaterThan(0);
  await shot(page, 'immersive-scroll-up');
});

test('a two-finger tap shows the bars and a second one puts them away', async ({ page }) => {
  await openReader(page, 'on');
  const before = await settledHeight(page);
  await scrollText(page, 200);
  await expectAll(page, 'hidden');

  await twoFingerTap(page);
  await expectAll(page, 'visible');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect.poll(() => textHeight(page)).toBeCloseTo(before, 0);

  await page.waitForTimeout(700);
  await twoFingerTap(page);
  await expectAll(page, 'hidden');
  await shot(page, 'immersive-two-finger-away');
});

test('a three-finger tap does nothing', async ({ page }) => {
  await openReader(page, 'on');
  await scrollText(page, 200);
  await expectAll(page, 'hidden');
  await threeFingerTap(page);
  await page.waitForTimeout(300);
  await expectAll(page, 'hidden');
});

test('a two-finger tap opens no word sheet; a one-finger tap on a word still opens it', async ({ page }) => {
  await openReader(page, 'on');
  await scrollText(page, 200);
  await expectAll(page, 'hidden');

  await twoFingerTap(page);
  await expectAll(page, 'visible');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await scrollText(page, 200);
  await expectAll(page, 'hidden');
  // two fingers that wander are not a tap
  await twoFingerTap(page, { x: 150, y: 450 }, 60);
  await page.waitForTimeout(300);
  await expectAll(page, 'hidden');

  // a finger on a word opens its sheet as ever
  const word = page.locator('[data-verse="3"] [role="button"][data-chunk]').first();
  await word.scrollIntoViewIfNeeded();
  // the bars slide: let the page stop moving, then tap where the word is (a locator tap waits for it to be still and hits its own pixels)
  await settledHeight(page);
  await word.tap();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('with the bars away, a two-finger tap and then holding Talk starts listening', async ({ page }) => {
  await openReader(page, 'on');
  await scrollText(page, 200);
  await expectAll(page, 'hidden');
  await twoFingerTap(page);
  await expectAll(page, 'visible');

  const talk = page.getByRole('button', { name: 'Talk', exact: true });
  const at = await talk.boundingBox();
  if (!at) throw new Error('no Talk button');
  await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
  await page.mouse.down();
  const live = page.getByRole('dialog', { name: 'Talk about Romans 8' }).locator('[data-talk-live]');
  await expect(live).toContainText('Listening');
  await page.mouse.up();
});

test('scrolling to the chapter\'s end and past the bottom leaves the bars away', async ({ page }) => {
  await openReader(page, 'on');
  await scrollText(page, 300);
  await expectAll(page, 'hidden');
  await scrollText(page, 100000);
  await page.waitForTimeout(400);
  expect(await scrollTop(page)).toBeGreaterThan(300);
  await expectAll(page, 'hidden');
  // further down, past the bottom: it cannot go, and nothing changes
  await scrollText(page, 500);
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(400);
  await expectAll(page, 'hidden');
  await shot(page, 'immersive-chapter-end');
});

test('with Immersive reader Off scrolling leaves the bars where they are', async ({ page }) => {
  await openReader(page, 'off');
  await scrollText(page, 300);
  await page.waitForTimeout(400);
  await expectAll(page, 'visible');
  await scrollText(page, 400);
  await page.waitForTimeout(400);
  await expectAll(page, 'visible');
});

test('the setting is kept across a reload', async ({ page }) => {
  await openReader(page, 'off');
  await page.getByRole('button', { name: 'Settings' }).click();
  const group = page.getByRole('group', { name: 'Immersive reader', exact: true });
  await expect(group.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'On' }).click();
  await page.reload();
  await expect(page.getByRole('group', { name: 'Immersive reader', exact: true }).getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
});

// Every return to the Reader at a scrolled place keeps the bars as he left them (mw-5r3p30.471): the Reader puts the saved place back, and that
// move is not him scrolling down. With them shown (a two-finger tap after the scroll) they stay shown; with them away they stay away.
async function shownAtAScrolledPlace(page: Page): Promise<number> {
  await openReader(page, 'on');
  await scrollText(page, 1000);
  await expectAll(page, 'hidden');
  // the bars have finished sliding away
  await settledHeight(page);
  await twoFingerTap(page);
  await expectAll(page, 'visible');
  await settledHeight(page);
  const at = await scrollTop(page);
  expect(at).toBeGreaterThan(500);
  return at;
}

/** After a return the saved place is put back and the page is given time to react to it (the restore waits 400 ms for the text to stay still). */
async function expectStillShown(page: Page, at: number, what: string) {
  await expect.poll(() => scrollTop(page), { message: `${what}: the saved place comes back` }).toBeGreaterThan(at - 50);
  await page.waitForTimeout(900);
  await expectAll(page, 'visible');
  await expect(page.locator('[data-place-line]'), `${what}: no place line`).toHaveCount(0);
}

test('with the bars shown, Settings and then ‹ Reader leaves them shown', async ({ page }) => {
  const at = await shownAtAScrolledPlace(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expectStillShown(page, at, 'Settings');
});

test('with the bars shown, Immersive reader Off and On again in Settings and then ‹ Reader leaves them shown', async ({ page }) => {
  const at = await shownAtAScrolledPlace(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  const group = page.getByRole('group', { name: 'Immersive reader', exact: true });
  await group.getByRole('button', { name: 'Off' }).click();
  await expect(group.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'On' }).click();
  await expect(group.getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expectStillShown(page, at, 'Off then On');
});

test('with the bars shown, the chapter picker opened and closed leaves them shown', async ({ page }) => {
  const at = await shownAtAScrolledPlace(page);
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
  await expect(picker).toBeVisible();
  await page.goBack();
  await expect(picker).toHaveCount(0);
  await expectStillShown(page, at, 'the picker');
});

test('with the bars shown, a Verse view closed leaves them shown', async ({ page }) => {
  await shownAtAScrolledPlace(page);
  // a verse number already in view, so the tap scrolls nothing (a scroll down would take the bars away for a reason of its own)
  const inView = await page.evaluate(() => {
    const box = (document.querySelector('[data-reader]') as HTMLElement).getBoundingClientRect();
    for (const el of document.querySelectorAll<HTMLElement>('button[data-verse-number][aria-label^="Verse "]')) {
      const r = el.getBoundingClientRect();
      if (r.top > box.top + 4 && r.bottom < box.bottom - 4) return el.getAttribute('aria-label')?.replace('Verse ', '') ?? null;
    }
    return null;
  });
  if (inView === null) throw new Error('no verse number in view');
  const left = await scrollTop(page);
  const view = await openVerseView(page, Number(inView));
  expect(await scrollTop(page)).toBe(left);
  await view.getByRole('button', { name: '‹ Reader' }).click();
  await expect(view).toBeHidden();
  await expectStillShown(page, left, 'the Verse view');
});

test('with the bars shown, a reload keeps them shown at the saved place', async ({ page }) => {
  const at = await shownAtAScrolledPlace(page);
  // the place is written to the phone 250 ms after the last scroll
  await page.waitForTimeout(600);
  await page.reload();
  await expectStillShown(page, at, 'a reload');
});

test('with the bars shown, the next chapter opens shown, and Back to this one keeps them shown', async ({ page }) => {
  const at = await shownAtAScrolledPlace(page);
  // the end of the chapter: scrolling there with the bars shown does not take them away
  await scrollText(page, 100000);
  await page.waitForTimeout(600);
  await expectAll(page, 'visible');
  await page.getByRole('navigation', { name: 'Chapters' }).getByRole('button', { name: /Romans 9/ }).click();
  await expect(page.getByRole('heading', { name: 'Romans 9', level: 1 })).toBeVisible();
  await page.waitForTimeout(900);
  await expectAll(page, 'visible');
  await page.goBack();
  await expectStillShown(page, at, 'Back from the next chapter');
});
