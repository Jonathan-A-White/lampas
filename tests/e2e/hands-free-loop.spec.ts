// tests/e2e/hands-free-loop.spec.ts — the Hands-free session on the built app (mw-rl10piw.6), at 390 x 844 with its service worker running. The wake word is voice-kit's
// fake (tests/support/honest-fakes.ts honestWake: startWake hands itself to it), the microphone and the recogniser the kit's honest ones hearing a clip whose words are
// 'play', and the speech the kit's honest synthesiser. Hands-free is turned on with a three-finger tap through the browser (one touchstart a finger, as a phone's).
//  - 'Hey Lampas', then 'play' and his pause: the reading of the chapter on screen sets going (the Reader's own start).
//  - The model (assets/hey-lampas-<hash>.json) is not in the first download: it is fetched the first time Hands-free is on and the worker keeps it, so with the network
//    off the same address is answered from the worker's cache.
import { expect, test, type Page, type Response } from '@playwright/test';
import { appReady, WORKER_INSTALL_MS, workerControls, workerReady } from './app-ready';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { clips, honestMic, honestSpeech, honestWake, sayWake, wakeListening } from '../support/honest-fakes';

test.use({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });

const FINGERS = [
  { x: 120, y: 520 },
  { x: 200, y: 540 },
  { x: 280, y: 530 },
];

/** Three fingers on the page one after another, lifted together: what the browser sends for a three-finger tap. */
async function threeFingers(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    const points = FINGERS.map((p, i) => ({ x: p.x, y: p.y, id: i + 1 }));
    for (let n = 1; n <= points.length; n += 1) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points.slice(0, n) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
}

const mark = (page: Page) => page.getByRole('img', { name: 'Hands-free is on', exact: true });

/** The wake listens: the mark says waiting and the fake has a wake open. A page whose audio will not start without a touch (needs-touch) is touched once, at the mark. */
async function waitingForWake(page: Page): Promise<void> {
  await expect(mark(page)).toBeVisible();
  await expect
    .poll(async () => {
      const state = await mark(page).getAttribute('data-state');
      if (state === 'needs-touch') {
        const box = await mark(page).boundingBox();
        if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      }
      return state === 'waiting' && (await wakeListening(page));
    }, { message: 'the wake word is listened for' })
    .toBe(true);
}

const isModel = (url: string): boolean => /\/assets\/hey-lampas-[\w-]+\.json$/.test(new URL(url).pathname);

test("'Hey Lampas', then 'play' and a pause, reads the chapter on screen", async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US'] });
  await honestMic(page, { clip: { ...clips.english, name: 'play', transcript: 'play' } });
  await honestWake(page);
  await openUnlocked(page);
  await page.goto('/#/?b=jhn&c=1');
  await appReady(page);
  await expect(page.getByRole('heading', { name: 'John 1', level: 1 })).toBeVisible();

  await threeFingers(page);
  await waitingForWake(page);

  expect(await sayWake(page)).toBe(true);
  await expect(mark(page)).toHaveAttribute('data-state', /listening|working/);
  // the clip says 'play'; 1.5 s of quiet after it ends the command, and the Reader reads John 1 from verse 1 (in the voice its own start chooses: David's recording
  // where John 1 has one, which a headless page cannot fetch, so the voice is not asserted here: features/hands-free-loop.feature hears the words)
  await expect(page.locator('[data-reading-bar]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-reader] [data-verse="1"][data-reading]')).toBeVisible();
  await expect(page.locator('[data-reading-bar]')).toContainText('Reading verse 1');
  await waitingForWake(page);
  await shot(page, 'hands-free-loop-reading');
});

test("the wake model is fetched when Hands-free is first on and kept by the worker: offline it is answered from the worker's cache", async ({ page, context }) => {
  test.setTimeout(WORKER_INSTALL_MS + 120_000);
  await honestSpeech(page, { langs: ['en-US'] });
  await honestWake(page);
  await openUnlocked(page);
  const models: Response[] = [];
  page.on('response', (response) => {
    if (isModel(response.url())) models.push(response);
  });
  await page.goto('/');
  await appReady(page);
  await workerReady(page);
  await page.reload();
  await workerControls(page);
  await appReady(page);
  // not in the first download: nothing has asked for the model yet
  expect(models).toEqual([]);

  await threeFingers(page);
  await waitingForWake(page);
  expect(models.length).toBe(1);
  expect(models[0].status()).toBe(200);

  // the worker kept it: with the network off the same address is answered from its cache, whole
  expect(await page.evaluate(async () => (await caches.open('lampas-wake')).keys().then((keys) => keys.map((k) => new URL(k.url).pathname)))).toEqual([new URL(models[0].url()).pathname]);
  await context.setOffline(true);
  const answered = await page.evaluate(async (url) => {
    const response = await fetch(url);
    return { ok: response.ok, bytes: (await response.text()).length };
  }, models[0].url());
  expect(answered.ok).toBe(true);
  expect(answered.bytes).toBeGreaterThan(400_000);
  expect(models.length).toBe(2);
  expect(models[1].fromServiceWorker()).toBe(true);
  await context.setOffline(false);
});
