// tests/e2e/hands-free-help.spec.ts — Hands-free help (mw-rl10piw.43) at 390 x 844. 'Hey Lampas', then 'help' (or 'what can I say') is answered by the phone saying what he can say, from the router's one table
// (src/handsFree/commands.ts), and not 'Sorry, I did not get that'; and a tap on the mic mark opens the sheet 'What you can say' with the same commands, one example each. The wake word is voice-kit's fake, the
// microphone and the recogniser its honest ones hearing a clip, the speech its honest synthesiser (tests/support/honest-fakes.ts).
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

const LISTED = ['play', 'pause', 'stop', 'read John 3', 'next chapter', 'previous chapter', 'ask'];

for (const words of ['help', 'what can I say']) {
  test(`'Hey Lampas', then '${words}', says what he can say and not that it did not get it`, async ({ page }) => {
    await honestSpeech(page, { langs: ['en-US'] });
    await honestMic(page, { clip: { ...clips.english, name: 'help', transcript: words } });
    await honestWake(page);
    await openUnlocked(page);
    await page.goto('/#/?b=jhn&c=1');
    await appReady(page);
    await threeFingers(page);
    await waitingForWake(page);
    expect(await sayWake(page)).toBe(true);
    await expect
      .poll(async () => (await spoken(page)).map((s) => s.text).find((t) => t.startsWith('You can say')) ?? '', { timeout: 20_000 })
      .not.toBe('');
    const said = (await spoken(page)).map((s) => s.text);
    const list = said.find((t) => t.startsWith('You can say')) as string;
    for (const word of LISTED) expect(list, `the list names '${word}'`).toContain(word);
    expect(said).not.toContain('Sorry, I did not get that');
  });
}

test("a tap on the mic mark opens the sheet 'What you can say': every command, one example each", async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US'] });
  await honestWake(page);
  await openUnlocked(page);
  await page.goto('/#/?b=jhn&c=1');
  await appReady(page);
  await threeFingers(page);
  await waitingForWake(page);
  const sheet = page.getByRole('dialog', { name: 'What you can say', exact: true });
  // a tap in the moments after the page settles may be dropped by the page's own guard against a double tap: tap again until the sheet is up, never once it is
  await expect(async () => {
    if (!(await sheet.isVisible())) await mark(page).click();
    await expect(sheet).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
  await expect(sheet.getByRole('heading', { name: 'What you can say', level: 2 })).toBeVisible();
  const lines = sheet.locator('[data-help-line]');
  expect(await lines.count()).toBeGreaterThanOrEqual(LISTED.length);
  for (const word of LISTED) await expect(sheet.locator('[data-help-line]', { hasText: word }).first()).toBeVisible();
  await shot(page, 'hands-free-help');
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toHaveCount(0);
});
