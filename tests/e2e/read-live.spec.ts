// tests/e2e/read-live.spec.ts — the true end-to-end test of the reading check: the real app (past the real licence gate),
// the real Postern backend and the real mill, which scores a recording and answers it with the verse-read grind. It drives
// the DEPLOYED app (playwright.config.ts: LAMPAS_LIVE_URL, default https://lampas.allmymind.org). Chromium's fake microphone
// plays tests/fixtures/read-8-28.wav, Romans 8:28 read aloud (synthesized with espeak-ng), as what he says; the Greek case
// plays tests/fixtures/read-8-28-el.wav, the Greek of 8:28 read in modern pronunciation (espeak-ng -v el), through a browser
// of its own (the fake microphone's clip is a launch argument).
// Run by `npm run e2e:live` only (the 'live' Playwright project); it is not in the gate and not in `npm run shots`, and every
// run spends one grind of fuel. It proves a landing only after the deploy, and only once the mill allows the verse-read kind.
//
// With no key, or with a backend that cannot be reached, the test reports a SKIP with the reason, never a pass.
import { chromium, expect, test, type Page } from '@playwright/test';
import { join } from 'node:path';
import { browserEnv } from '../support/browser-env';
import { liveKeyOrSkip } from './live';
import { shot } from './shot';
import { seedDeviceKey } from './unlocked';

let key = '';

test.beforeAll(async () => {
  key = await liveKeyOrSkip('read-live');
});

/** Opens the deployed app past the real gate, selects verse 28 in `view`, holds Read for `holdMs` and waits for the answer. */
async function readEightTwentyEight(page: Page, view: 'English' | 'Greek', holdMs: number) {
  await seedDeviceKey(page, key);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 }), 'the gate opened (the test key holds a lampas licence)').toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: view, exact: true }).click();
  await page.getByRole('button', { name: 'Verse 28', exact: true }).click();

  const panel = page.getByRole('region', { name: 'Reading check' });
  const read = panel.getByRole('button', { name: 'Read', exact: true });
  const box = await read.boundingBox();
  if (!box) throw new Error('the Read button is not on the page');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(holdMs);
  await page.mouse.up();

  const result = panel.locator('[data-reading-result]');
  const failure = panel.getByRole('alert');
  await expect(result.or(failure)).toBeVisible({ timeout: 150_000 });
  if (await failure.isVisible()) throw new Error(`the reading check failed instead of answering: ${await failure.innerText()}`);
  return { panel, result };
}

test('the live mill answers a reading of Romans 8:28 with a verdict', async ({ page }) => {
  // The clip is about 7.5 s of speech: hold a little longer, then let go.
  const { result } = await readEightTwentyEight(page, 'English', 9000);
  await shot(page, 'read-live');
  const verdict = await result.getAttribute('data-reading-result');
  expect(['well-read', 'some-to-fix'], 'the mill answered with a verdict').toContain(verdict);
  expect((await result.innerText()).trim().length).toBeGreaterThan(0);
});

// The fake microphone's clip is a launch argument, so the Greek case launches a Chromium of its own, set up as the 'live'
// project is (playwright.config.ts), with the Greek clip as the microphone.
test('the live mill answers a Greek reading of Romans 8:28 with a verdict, and its marked words are Greek', async ({ baseURL }) => {
  const browser = await chromium.launch({
    channel: 'chromium',
    env: browserEnv,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-audio-capture=${join(process.cwd(), 'tests', 'fixtures', 'read-8-28-el.wav')}`,
    ],
  });
  try {
    const context = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 }, permissions: ['microphone'], serviceWorkers: 'block' });
    const page = await context.newPage();
    // The clip is about 9 s of speech: hold a little longer, then let go.
    const { panel, result } = await readEightTwentyEight(page, 'Greek', 11_000);
    await shot(page, 'read-live-greek');
    const verdict = await result.getAttribute('data-reading-result');
    expect(['well-read', 'some-to-fix'], 'the mill answered with a verdict').toContain(verdict);
    expect((await result.innerText()).trim().length).toBeGreaterThan(0);
    for (const word of await panel.locator('[data-fix]').allInnerTexts()) expect(word, 'a marked word is in Greek letters').toMatch(/\p{Script=Greek}/u);
  } finally {
    await browser.close();
  }
});
