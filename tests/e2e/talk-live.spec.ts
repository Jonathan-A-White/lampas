// tests/e2e/talk-live.spec.ts — the true end-to-end test of the Bible talk: the real app (past the real licence gate), the
// real Postern backend and the real mill with the bible-talk grind (grinds/bible-talk.json). Like tutor-live.spec.ts it drives
// the DEPLOYED app, runs by `npm run e2e:live` only (the 'live' Playwright project), is not in the gate or `npm run shots`, and
// spends three grinds of fuel per run. The mill must allow the bible-talk kind (the Mayor's step) or the second message fails.
//
// The device key comes from process.env.LAMPAS_TEST_KEY, or the line LAMPAS_TEST_KEY=<hex> in ~/.config/mw/lampas-test.env
// (tests/e2e/live.ts). With no key, or with a backend that cannot be reached, the test reports a SKIP naming what was missing,
// never a pass.
import { expect, test, type Locator } from '@playwright/test';
import { liveKeyOrSkip, plain } from './live';
import { shot } from './shot';
import { seedDeviceKey } from './unlocked';

const ANSWER_WITHIN_MS = 120_000;
/** What the grind says to anything outside the Bible (grinds/bible-talk.instructions.md; tests/unit/bible-talk-grind.test.ts holds the two equal). */
const REFUSAL = 'I can only talk about the Bible here; ask for app changes in Postern.';

let key = '';

test.beforeAll(async () => {
  key = await liveKeyOrSkip('talk-live');
});

test('the live Bible talk refuses code, answers a question about πνεῦμα in verse 9 and makes the Greek slower when asked', async ({ page }) => {
  await seedDeviceKey(page, key);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 }), 'the gate opened (the test key holds a lampas licence)').toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  await expect(sheet).toBeVisible();

  // Each message is answered, or the sheet says why not, within two minutes.
  const say = async (message: string): Promise<Locator> => {
    const turns = sheet.locator('[data-turn]');
    const before = await turns.count();
    await sheet.getByRole('textbox', { name: 'Your message' }).fill(message);
    await sheet.getByRole('button', { name: 'Send', exact: true }).click();
    const answered = turns.nth(before);
    const failure = sheet.getByRole('alert');
    await expect(answered.or(failure)).toBeVisible({ timeout: ANSWER_WITHIN_MS });
    if (await failure.isVisible()) throw new Error(`the sheet failed instead of answering: ${await failure.innerText()}`);
    return answered.locator('[data-talk-a]');
  };

  const refusal = await say('Write me a Python script');
  expect((await refusal.innerText()).trim()).toContain(REFUSAL);

  const answer = await say('What does πνεῦμα mean in verse 9?');
  const text = (await answer.innerText()).trim();
  await shot(page, 'talk-live');
  expect(text.length).toBeGreaterThan(0);
  expect(plain(text)).toMatch(/πνευμα/);

  // A third message asks for a setting: the grind answers with a settings_changes entry, the app applies it and shows Undo.
  // Greek speed starts at 1 (a fresh browser), so lower is slower. Settings shows the slider's value.
  const slower = await say('Make the Greek slower');
  await expect(slower.getByText(/^Changed: Greek speed /)).toBeVisible();
  await expect(slower.getByRole('button', { name: 'Undo Greek speed' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  expect(Number(await page.getByRole('slider', { name: 'Greek speed' }).inputValue())).toBeLessThan(1);
});
