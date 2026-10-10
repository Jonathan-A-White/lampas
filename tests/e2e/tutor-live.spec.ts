// tests/e2e/tutor-live.spec.ts — the true end-to-end test of the tutor: the real app (past the real licence gate),
// the real Postern backend and the real mill. It drives the DEPLOYED app (playwright.config.ts: LAMPAS_LIVE_URL, default
// https://lampas.allmymind.org), the one origin Postern's CORS allows.
// Run by `npm run e2e:live` only (the 'live' Playwright project); it is not in the gate and not in `npm run shots`,
// and every run spends one grind of fuel.
//
// The device key comes from process.env.LAMPAS_TEST_KEY, or the line LAMPAS_TEST_KEY=<hex> in
// ~/.config/mw/lampas-test.env; that key holds a lampas licence the Governor issued. It is never printed.
// With no key, or with a backend that cannot be reached, the test reports a SKIP with the reason, never a pass.
import { expect, test } from '@playwright/test';
import { typeQuestion } from './ask-composer';
import { liveKeyOrSkip, plain } from './live';
import { shot } from './shot';
import { seedDeviceKey } from './unlocked';
import { chooseAction } from './verse-view';

const QUESTION = 'What does συνεργεῖ mean here?';

let key = '';

test.beforeAll(async () => {
  key = await liveKeyOrSkip('tutor-live');
});

test('the live tutor answers a question about Romans 8:28', async ({ page }) => {
  await seedDeviceKey(page, key);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 }), 'the gate opened (the test key holds a lampas licence)').toBeVisible({ timeout: 60_000 });
  await chooseAction(page, 28, 'Ask the tutor');
  await typeQuestion(page, QUESTION);

  const card = page.locator('[data-answers-for="28"] [data-answer]').first();
  const failure = page.getByRole('region', { name: 'Verse view' }).getByRole('alert');
  await expect(card.or(failure)).toBeVisible({ timeout: 120_000 });
  if (await failure.isVisible()) throw new Error(`the box failed instead of answering: ${await failure.innerText()}`);

  const text = (await card.innerText()).trim();
  await shot(page, 'tutor-live');
  expect(text.length).toBeGreaterThan(QUESTION.length);
  expect(plain(text)).toMatch(/συνεργει|συνεργεω/);
});
