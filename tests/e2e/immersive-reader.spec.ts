import { expect, test, type Page } from '@playwright/test';
import { honestMic } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The Immersive reader (mw-5r3p30.120) at 412x915: scrolling the text down slides the header, the chips, the Talk bar and the Ask button away;
// scrolling up 24 px or a two-finger tap brings them back. A phone-width layout claim: it runs under --project=shots.
test.use({ viewport: { width: 412, height: 915 }, hasTouch: true });

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

async function expectAll(page: Page, state: 'visible' | 'hidden') {
  for (const el of all(page)) await (state === 'visible' ? expect(el).toBeVisible() : expect(el).toBeHidden());
}

/** Two fingers on the text at once, lifted together: what the browser sends for a two-finger tap. */
async function twoFingerTap(page: Page, at = { x: 150, y: 450 }, moveBy = 0) {
  const cdp = await page.context().newCDPSession(page);
  const points = [
    { x: at.x, y: at.y, id: 1 },
    { x: at.x + 90, y: at.y + 10, id: 2 },
  ];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points });
  if (moveBy) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points.map((p) => ({ ...p, y: p.y - moveBy })) });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test('scrolling down slides the bars away, scrolling up 24 px brings them back', async ({ page }) => {
  await openReader(page, 'on');
  await expectAll(page, 'visible');
  const before = await textHeight(page);
  await shot(page, 'immersive-shown');

  await scrollText(page, 200);
  await expectAll(page, 'hidden');
  // out of the tab order too
  await expect(page.getByRole('button', { name: 'Settings' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Talk', exact: true })).toHaveCount(0);
  expect(await textHeight(page)).toBeGreaterThan(before + 150);
  // the text has the whole screen: its box ends at the bottom of the window
  const box = await page.locator('[data-reader]').boundingBox();
  expect((box?.y ?? 1) + (box?.height ?? 0)).toBeGreaterThan(915 - 100);
  await shot(page, 'immersive-hidden');

  await scrollText(page, -10);
  await page.waitForTimeout(300);
  await expectAll(page, 'hidden');
  await scrollText(page, -14);
  await expectAll(page, 'visible');
  await expect.poll(() => textHeight(page)).toBeCloseTo(before, 0);
});

test('a two-finger tap brings the bars back and opens no word sheet; a one-finger tap on a word still opens it', async ({ page }) => {
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
  const at = await word.boundingBox();
  if (!at) throw new Error('no word');
  await page.touchscreen.tap(at.x + at.width / 2, at.y + at.height / 2);
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

test('the bars come back when the chapter ends', async ({ page }) => {
  await openReader(page, 'on');
  await scrollText(page, 300);
  await expectAll(page, 'hidden');
  await scrollText(page, 100000);
  await expectAll(page, 'visible');
  expect(await scrollTop(page)).toBeGreaterThan(300);
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
  const group = page.getByRole('group', { name: 'Immersive reader' });
  await expect(group.getByRole('button', { name: 'Off' })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'On' }).click();
  await page.reload();
  await expect(page.getByRole('group', { name: 'Immersive reader' }).getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
});
