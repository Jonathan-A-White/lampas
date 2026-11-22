// tests/e2e/hold-and-scroll.spec.ts — hold Talk with one finger and scroll the passage with another (mw-06ggew.16, his want 2026-11-17): while a talk bar is held, a second touch
// scrolls the page and never ends or cancels the hold; letting go of the holding finger still sends once; the holding finger sliding off the bar still drops the hold unsent.
// Two real touch points through CDP Input.dispatchTouchEvent (tests/e2e/bottom-reach.spec.ts's way of a phone's own touches), on the Memorize session of Exodus 20:8-12 (five verses: one piece, since a longer passage is learned a piece at a time, src/memorize/pieces.ts, and a piece of Exodus 20:1-17 is too short to scroll),
// 'English · Read and say · step 1 of 7', whose foot is the kit's hold bar (src/talk/Bars.tsx HeldTalkBar).
import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { clips, honestMic } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

type Finger = { x: number; y: number; id: number };

/** A phone's touches by hand: each call says every finger that is down now, as CDP wants it. */
async function fingers(page: Page): Promise<{ send(type: 'touchStart' | 'touchMove' | 'touchEnd', down: Finger[]): Promise<unknown>; done(): Promise<void> }> {
  const cdp: CDPSession = await page.context().newCDPSession(page);
  return {
    send: (type, down) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: down.map((f) => ({ x: f.x, y: f.y, id: f.id })) }),
    done: () => cdp.detach(),
  };
}

const middle = async (target: Locator): Promise<{ x: number; y: number }> => {
  const box = await target.boundingBox();
  if (!box) throw new Error('the target is not on the page');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** What the bar saw of the pointers: pointerdown, pointerup and pointercancel, counted where the bar is (capture phase on the window as well, for a cancel that is aimed elsewhere). */
async function watchBar(bar: Locator): Promise<void> {
  await bar.evaluate((el) => {
    const seen = { down: 0, up: 0, cancel: 0 };
    (window as unknown as { barSeen: typeof seen }).barSeen = seen;
    el.addEventListener('pointerdown', () => (seen.down += 1));
    el.addEventListener('pointerup', () => (seen.up += 1));
    el.addEventListener('pointercancel', () => (seen.cancel += 1));
  });
}
const barSeen = (page: Page) => page.evaluate(() => (window as unknown as { barSeen: { down: number; up: number; cancel: number } }).barSeen);

async function openPassage(page: Page): Promise<{ bar: Locator; area: Locator; scroller: Locator }> {
  await honestMic(page, { clip: clips.english });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.goto('/#/memorize/Exod.20.8-12/en');
  await expect(page.getByText('English · Read and say · step 1 of 7')).toBeVisible();
  const scroller = page.locator('main.screen');
  // the passage (one piece, five verses) runs past the bottom of the screen: it has somewhere to scroll
  await expect.poll(() => scroller.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(100);
  await expect(page.getByRole('button', { name: 'Hold to say it' })).toBeVisible();
  return { bar: page.locator('.lp-bar'), area: page.getByTestId('memorize-verse'), scroller };
}

test('a second finger scrolls the passage while Hold to say it is held: the hold stays, and lifting the first finger sends once', async ({ page }) => {
  const { bar, area, scroller } = await openPassage(page);
  await expect(bar).toBeInViewport();
  await watchBar(bar);
  const hold = await middle(bar);
  const box = (await area.boundingBox())!;
  const start = { x: box.x + box.width / 2, y: box.y + 300 };
  const touch = await fingers(page);
  try {
    const first: Finger = { ...hold, id: 1 };
    await touch.send('touchStart', [first]);
    await expect(bar).toHaveText(/Release to send/);
    const before = await scroller.evaluate((el) => el.scrollTop);

    // the second finger goes down on the passage and drags it upward, the first still holding the bar
    const second: Finger = { ...start, id: 2 };
    await touch.send('touchStart', [first, second]);
    const dragged: Finger = { ...second, y: second.y - 250 };
    for (let step = 1; step <= 10; step += 1) await touch.send('touchMove', [first, { ...second, y: second.y - step * 25 }]);
    await expect.poll(() => scroller.evaluate((el) => el.scrollTop)).toBeGreaterThan(before + 20);
    await expect(bar).toHaveText(/Release to send/);
    expect((await barSeen(page)).cancel).toBe(0);
    await expect(page.getByTestId('judgement')).toHaveCount(0);
    await shot(page, 'hold-and-scroll');

    // the second finger lifts: the hold goes on; then the first lifts and the hold is sent
    await touch.send('touchEnd', [dragged]); // a touchEnd names the fingers that lift
    await expect(bar).toHaveText(/Release to send/);
    expect((await barSeen(page)).cancel).toBe(0);
    await touch.send('touchEnd', [first]);
  } finally {
    await touch.done();
  }
  await expect(page.getByTestId('judgement')).toHaveCount(1);
  const seen = await barSeen(page);
  expect(seen.cancel).toBe(0);
  expect(seen.up).toBe(1);
});

// mw-06ggew.20: a second touch that lands on the bar itself and lifts must not end the hold: only the holding finger's lift sends.
test('a second finger that touches the bar and lifts leaves the hold: it is sent once, when the first finger lifts', async ({ page }) => {
  const { bar } = await openPassage(page);
  await watchBar(bar);
  const hold = await middle(bar);
  const box = (await bar.boundingBox())!;
  const touch = await fingers(page);
  try {
    const first: Finger = { ...hold, id: 1 };
    await touch.send('touchStart', [first]);
    await expect(bar).toHaveText(/Release to send/);
    const second: Finger = { x: box.x + 12, y: hold.y, id: 2 };
    await touch.send('touchStart', [first, second]);
    await touch.send('touchEnd', [second]);
    await page.waitForTimeout(300); // a real-time wait: a window in which nothing must happen (the lift of the second finger must not send)
    await expect(bar).toHaveText(/Release to send/);
    await expect(page.getByTestId('judgement')).toHaveCount(0);
    expect((await barSeen(page)).cancel).toBe(0);
    await page.waitForTimeout(2800); // a real-time wait: the clip is heard in real time while the finger holds; a hold lifted at 300 ms was heard as nothing ('Try again') on a loaded host
    await touch.send('touchEnd', [first]);
  } finally {
    await touch.done();
  }
  await expect(page.getByTestId('judgement')).toHaveCount(1);
  expect((await barSeen(page)).cancel).toBe(0);
});

test('the holding finger sliding off the bar still drops the hold unsent', async ({ page }) => {
  const { bar, area } = await openPassage(page);
  await watchBar(bar);
  const hold = await middle(bar);
  const box = (await area.boundingBox())!;
  const touch = await fingers(page);
  try {
    const first: Finger = { ...hold, id: 1 };
    await touch.send('touchStart', [first]);
    await expect(bar).toHaveText(/Release to send/);
    // the finger leaves the bar for the passage, well past the slide-off margin
    for (let step = 1; step <= 8; step += 1) await touch.send('touchMove', [{ ...first, y: first.y - step * 40 }]);
    await expect(bar).toHaveText(/Let go to keep it unsent/);
    await touch.send('touchEnd', []);
  } finally {
    await touch.done();
  }
  await expect(bar).not.toHaveText(/Release to send/);
  await expect(page.getByTestId('judgement')).toHaveCount(0);
  expect(box.height).toBeGreaterThan(0);
});

// The letter drill's Say it (src/LetterDrillScreen.tsx SayFoot, a HeldTalkBar in a fixed dialog): the same bar, the same two touches; the drill has nothing to scroll, so the proof here
// is that a second finger on its card leaves the hold alone, the slide-off still drops it, and the lift of the first finger still ends it.
/** The app's own store, read and written through raw IndexedDB as the app writes it (tests/e2e/say-it.spec.ts). */
const grammarSeeded = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => resolve(false);
        open.onsuccess = () => {
          const idb = open.result;
          if (!idb.objectStoreNames.contains('meta')) {
            idb.close();
            return resolve(false);
          }
          const get = idb.transaction('meta').objectStore('meta').get('grammarLevelsSeeded');
          get.onsuccess = () => {
            idb.close();
            resolve(get.result !== undefined);
          };
          get.onerror = () => {
            idb.close();
            resolve(false);
          };
        };
      }),
  );
const putGoal = (page: Page, value: string) =>
  page.evaluate(
    (goal) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'goal', value: goal });
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    value,
  );

async function openSayIt(page: Page): Promise<Locator> {
  await honestMic(page, { clip: { ...clips.english, transcript: 'delta' } });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => grammarSeeded(page)).toBe(true);
  await putGoal(page, '1 John 1:1');
  await page.reload();
  await page.goto('/#/goal');
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The Greek alphabet' }).click();
  const sheet = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(sheet.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  await sheet.getByRole('slider', { name: 'Your level' }).focus();
  await page.keyboard.press('ArrowRight');
  const drill = page.getByRole('dialog', { name: 'Letter drill' });
  for (let i = 0; i < 2; i += 1) {
    await expect(drill.getByTestId('letter-drill-step')).toContainText(`Question ${i + 1} of 8`);
    await drill.locator('[data-option]').first().click();
    await drill.getByTestId('letter-next').click();
  }
  await expect(drill.getByTestId('say-letter')).toBeVisible();
  await expect(drill.getByRole('button', { name: 'Hold and say it' })).toBeVisible();
  return drill;
}

test('on the letter drill a second finger on the card leaves the hold alone, and lifting the first sends once', async ({ page }) => {
  const drill = await openSayIt(page);
  const bar = drill.locator('.lp-bar');
  await watchBar(bar);
  const hold = await middle(bar);
  const card = await middle(drill.getByTestId('say-letter'));
  const touch = await fingers(page);
  try {
    const first: Finger = { ...hold, id: 1 };
    await touch.send('touchStart', [first]);
    await expect(bar).toHaveText(/Let go when you have said it/);
    const second: Finger = { ...card, id: 2 };
    await touch.send('touchStart', [first, second]);
    for (let step = 1; step <= 6; step += 1) await touch.send('touchMove', [first, { ...second, y: second.y - step * 20 }]);
    await expect(bar).toHaveText(/Let go when you have said it/);
    await touch.send('touchEnd', [{ ...second, y: second.y - 120 }]);
    await expect(bar).toHaveText(/Let go when you have said it/);
    expect((await barSeen(page)).cancel).toBe(0);
    await page.waitForTimeout(4500); // a real-time wait: the clip ('delta') is heard in real time while the finger holds, as tests/e2e/say-it.spec.ts's hold of 4500 ms
    await touch.send('touchEnd', [first]);
  } finally {
    await touch.done();
  }
  await expect(drill.getByTestId('say-result')).toBeVisible();
  await expect(drill.getByTestId('say-result')).toHaveCount(1);
  expect((await barSeen(page)).cancel).toBe(0);
});

test('on the letter drill a second finger that touches the bar and lifts leaves the hold, and lifting the first sends once', async ({ page }) => {
  const drill = await openSayIt(page);
  const bar = drill.locator('.lp-bar');
  await watchBar(bar);
  const hold = await middle(bar);
  const box = (await bar.boundingBox())!;
  const touch = await fingers(page);
  try {
    const first: Finger = { ...hold, id: 1 };
    await touch.send('touchStart', [first]);
    await expect(bar).toHaveText(/Let go when you have said it/);
    const second: Finger = { x: box.x + 12, y: hold.y, id: 2 };
    await touch.send('touchStart', [first, second]);
    await touch.send('touchEnd', [second]);
    await page.waitForTimeout(300); // a real-time wait: a window in which nothing must happen (the lift of the second finger must not send)
    await expect(bar).toHaveText(/Let go when you have said it/);
    await expect(drill.getByTestId('say-result')).toHaveCount(0);
    await page.waitForTimeout(4200); // a real-time wait: the clip is heard in real time while the finger holds
    await touch.send('touchEnd', [first]);
  } finally {
    await touch.done();
  }
  await expect(drill.getByTestId('say-result')).toHaveCount(1);
  expect((await barSeen(page)).cancel).toBe(0);
});

test('on the letter drill the holding finger sliding off the bar still drops the hold unsent', async ({ page }) => {
  const drill = await openSayIt(page);
  const bar = drill.locator('.lp-bar');
  const hold = await middle(bar);
  const touch = await fingers(page);
  try {
    const first: Finger = { ...hold, id: 1 };
    await touch.send('touchStart', [first]);
    await expect(bar).toHaveText(/Let go when you have said it/);
    for (let step = 1; step <= 8; step += 1) await touch.send('touchMove', [{ ...first, y: first.y - step * 40 }]);
    await expect(bar).toHaveText(/Let go to keep it unsent/);
    await touch.send('touchEnd', []);
  } finally {
    await touch.done();
  }
  await expect(bar).toHaveText('Hold and say it');
  await expect(drill.getByTestId('say-result')).toHaveCount(0);
});
