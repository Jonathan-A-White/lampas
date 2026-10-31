// tests/e2e/talk-document-scroll.spec.ts — the phone's scroll capture can scroll the Talk sheet's conversation (mw-5r3p30.930). Android's scroll capture
// (and Samsung's) scrolls the PAGE: it knows nothing of a scroll box inside it, so it found nothing to scroll and its swipe landed on Hold to talk. While the Talk sheet
// is open the document therefore scrolls the conversation (src/talk/documentScroll.ts): window.scrollBy moves it, the header and the Hold to talk bar stay where they are,
// and a swipe that starts on Hold to talk never starts a hold (src/talk/steadyPress.ts).
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic } from '../support/honest-fakes';
import { swipe } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const TURNS = 20;

/** Twenty turns kept for Romans 8:28, written straight into the talks table (the sheet reads them live). */
async function seedTurns(page: Page): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['talks'], 'readwrite');
          const store = tx.objectStore('talks');
          for (let i = 1; i <= count; i += 1) {
            store.add({
              ref: 'rom.8.28',
              q: `Question number ${i}: what does the verse say?`,
              a: `Answer number ${i}. God works all things together for good, to those who love him; this is the long answer for turn ${i}, long enough to take a few lines of the phone's width.`,
              words: [],
              when: 1_700_000_000_000 + i * 1000,
            });
          }
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    TURNS,
  );
}

async function openLongTalk(page: Page) {
  // a swipe is timed on the page's clock (tests/support/gesture.ts)
  await page.clock.install();
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await seedTurns(page);
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet.locator('[data-turn]')).toHaveCount(TURNS);
  return sheet;
}

test('window.scrollBy moves the conversation, and the header and the Hold to talk bar stay put', async ({ page }) => {
  const sheet = await openLongTalk(page);
  const list = sheet.locator('[data-talk-list]');
  const bar = sheet.getByRole('button', { name: 'Hold to talk', exact: true });
  const done = sheet.getByRole('button', { name: 'Done', exact: true });
  await list.evaluate((el) => {
    el.scrollTop = 0;
  });
  const first = sheet.locator('[data-turn]').first();
  const before = { first: (await first.boundingBox())!, bar: (await bar.boundingBox())!, done: (await done.boundingBox())! };

  // the page is taller than the window, by what the conversation has below its fold: that is what a scroll capture sees
  const room = await page.evaluate(() => ({ page: document.scrollingElement!.scrollHeight, window: window.innerHeight }));
  expect(room.page).toBeGreaterThan(room.window * 2);

  await page.evaluate(() => window.scrollBy(0, 300));
  await expect.poll(() => list.evaluate((el) => Math.round(el.scrollTop))).toBe(300);
  const after = { first: (await first.boundingBox())!, bar: (await bar.boundingBox())!, done: (await done.boundingBox())! };
  expect(Math.round(before.first.y - after.first.y)).toBe(300);
  expect(after.bar).toEqual(before.bar);
  expect(after.done).toEqual(before.done);

  // all the way down: the page stops where the conversation does, the last answer is in the box, and the bar is still clear of it
  await page.evaluate(() => window.scrollTo(0, document.scrollingElement!.scrollHeight));
  await expect.poll(() => list.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(2);
  const last = sheet.locator('[data-turn]').last();
  const lastBox = (await last.boundingBox())!;
  const listBox = (await list.boundingBox())!;
  expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(listBox.y + listBox.height + 1);
  expect((await bar.boundingBox())!).toEqual(before.bar);
  await shot(page, 'talk-document-scroll');
});

test('the conversation and the page move together whichever he scrolls, and the page is back to rest when the sheet closes', async ({ page }) => {
  const sheet = await openLongTalk(page);
  const list = sheet.locator('[data-talk-list]');
  await list.evaluate((el) => {
    el.scrollTop = 500;
  });
  await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(500);
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toBeHidden();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => document.scrollingElement!.scrollHeight <= window.innerHeight)).toBe(true);
});

test('a swipe that starts on Hold to talk scrolls nothing into a hold: the microphone never opens', async ({ page }) => {
  const sheet = await openLongTalk(page);
  const bar = sheet.getByRole('button', { name: 'Hold to talk', exact: true });
  const box = (await bar.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  // a touch that goes down on the bar and moves up the screen at once, as a scroll capture's synthetic swipe does
  await swipe(page, [x, y], [x, y - 200], { with: 'touch', steps: 10 });
  await page.clock.runFor(400);
  await expect(sheet.getByTestId('live-transcript')).toHaveCount(0);
  await expect(sheet.getByText('Listening… let go to send, slide away to cancel')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __bsvKitTesting: { mic: { recognitions: unknown[] } } }).__bsvKitTesting.mic.recognitions.length)).toBe(0);
});

test('a touch that stays on Hold to talk still holds', async ({ page }) => {
  const sheet = await openLongTalk(page);
  const bar = sheet.getByRole('button', { name: 'Hold to talk', exact: true });
  const box = (await bar.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await page.clock.runFor(400);
  await expect(sheet.getByTestId('live-transcript')).toBeVisible();
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
});

test('Copy the whole talk, at the foot of the conversation, puts every question and answer on the clipboard and moves nothing in the header', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const sheet = await openLongTalk(page);
  const title = sheet.getByRole('heading', { level: 2 });
  const titleBefore = (await title.boundingBox())!;
  expect(titleBefore.height).toBeLessThan(60);
  await page.evaluate(() => window.scrollTo(0, document.scrollingElement!.scrollHeight));
  const copy = sheet.getByRole('button', { name: 'Copy the whole talk' });
  await expect(copy).toBeInViewport();
  await copy.click();
  await expect(sheet.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.startsWith('Talk about Romans 8:28\n\nMe: Question number 1: what does the verse say?\n\nTutor: Answer number 1.')).toBe(true);
  expect(copied).toContain('Me: Question number 20: what does the verse say?');
  expect(copied.indexOf('Question number 2:')).toBeLessThan(copied.indexOf('Question number 3:'));
  expect((await title.boundingBox())!).toEqual(titleBefore);
  await shot(page, 'talk-copy-whole-talk');
});
