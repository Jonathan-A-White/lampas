// tests/e2e/hands-free-filler.spec.ts — Hands-free with words around the command (mw-rl10piw.44) at 390 x 844. 'Hey Lampas', then 'please read Proverbs 2 to me' in one breath: Proverbs 2 opens and is read
// (the filler 'please' and 'to me' dropped by src/handsFree/commands.ts), and words it cannot act on ('two to me') are said back: 'Sorry, I did not get that, I heard "two to me"'. The wake word is voice-kit's
// fake, the microphone and the recogniser its honest ones hearing a clip, the speech its honest synthesiser (tests/support/honest-fakes.ts).
import { expect, test, type Page } from '@playwright/test';
import { appReady } from './app-ready';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { clips, honestMic, honestSpeech, honestWake, sayWake, spoken, wakeListening } from '../support/honest-fakes';

test.use({ viewport: { width: 390, height: 844 } });

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

/** The wake listens: the mark says waiting and the fake has a wake open. */
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


/** 'Hey Lampas', then a clip that says `words`, on John 1. */
async function heardAfterWake(page: Page, words: string): Promise<void> {
  await honestSpeech(page, { langs: ['en-US'] });
  await honestMic(page, { clip: { ...clips.english, name: 'command', transcript: words } });
  await honestWake(page);
  await openUnlocked(page);
  await page.goto('/#/?b=jhn&c=1');
  await appReady(page);
  await threeFingers(page);
  await waitingForWake(page);
  expect(await sayWake(page)).toBe(true);
}

test("'Hey Lampas', then 'please read Proverbs 2 to me' in one breath, opens Proverbs 2 and reads it", async ({ page }) => {
  await heardAfterWake(page, 'please read Proverbs 2 to me');
  await expect(page.getByRole('heading', { name: 'Proverbs 2', level: 1 })).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-reading-bar]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-reader] [data-verse="1"][data-reading]')).toBeVisible();
  const said = (await spoken(page)).map((s) => s.text);
  expect(said).toContain('Proverbs 2');
  expect(said.filter((t) => t.startsWith('Sorry'))).toEqual([]);
  await shot(page, 'hands-free-filler-proverbs-2');
});

test("'Hey Lampas', then words it cannot act on ('two to me'), says what it heard", async ({ page }) => {
  await heardAfterWake(page, 'two to me');
  await expect
    .poll(async () => (await spoken(page)).map((s) => s.text).find((t) => t.includes('I heard "two to me"')) ?? '', { timeout: 20_000 })
    .toBe('Sorry, I did not get that, I heard "two to me"');
  await expect(page.getByRole('heading', { name: 'John 1', level: 1 })).toBeVisible();
});
