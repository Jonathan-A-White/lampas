// tests/e2e/tutor-live.spec.ts — the true end-to-end test of the tutor: the real app (past the real licence gate),
// the real Postern backend and the real mill. Run by `npm run e2e:live` only (the 'live' Playwright project); it is not
// in the gate and not in `npm run shots`, and every run spends one grind of fuel.
//
// The device key comes from process.env.LAMPAS_TEST_KEY, or the line LAMPAS_TEST_KEY=<hex> in
// ~/.config/mw/lampas-test.env; that key holds a lampas licence the Governor issued. It is never printed.
// With no key, or with a backend that cannot be reached, the test reports a SKIP with the reason, never a pass.
import { expect, test } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { POSTERN_DOOR } from '../../src/config';
import { shot } from './shot';
import { seedDeviceKey } from './unlocked';

const ENV_FILE = join(homedir(), '.config', 'mw', 'lampas-test.env');
const QUESTION = 'What does συνεργεῖ mean here?';

/** The test key and where it came from, or why there is none. */
function testKey(): { key: string } | { missing: string } {
  const fromEnv = process.env.LAMPAS_TEST_KEY?.trim();
  if (fromEnv) return { key: fromEnv };
  if (!existsSync(ENV_FILE)) return { missing: `LAMPAS_TEST_KEY is not set and ${ENV_FILE} does not exist` };
  const line = readFileSync(ENV_FILE, 'utf8').split('\n').find((l) => l.startsWith('LAMPAS_TEST_KEY='));
  const key = line?.slice('LAMPAS_TEST_KEY='.length).trim().replace(/^["']|["']$/g, '');
  return key ? { key } : { missing: `LAMPAS_TEST_KEY is not set and ${ENV_FILE} has no LAMPAS_TEST_KEY= line` };
}

/** Why the backend cannot be reached, or undefined when it answers. */
async function unreachable(): Promise<string | undefined> {
  try {
    const response = await fetch(`${POSTERN_DOOR}/api/challenge`, { signal: AbortSignal.timeout(15_000) });
    return response.ok ? undefined : `${POSTERN_DOOR} answered ${response.status} to /api/challenge`;
  } catch (err) {
    return `${POSTERN_DOOR} cannot be reached: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** Greek without its accents and breathings, lower case, so the check does not depend on how the tutor accents a word. */
const plain = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

let key = '';

// Skipped before any browser is launched: a skip names its reason and is never a pass.
function skipBecause(reason: string): void {
  console.log(`SKIP tutor-live: ${reason}`);
  test.skip(true, reason);
}

test.beforeAll(async () => {
  const found = testKey();
  if ('missing' in found) return skipBecause(found.missing);
  const down = await unreachable();
  if (down !== undefined) return skipBecause(down);
  key = found.key;
});

test('the live tutor answers a question about Romans 8:28', async ({ page }) => {

  await seedDeviceKey(page, key);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 }), 'the gate opened (the test key holds a lampas licence)').toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Verse 28', exact: true }).click();

  const box = page.getByRole('region', { name: 'Ask the tutor' });
  await box.getByRole('textbox', { name: 'Your question' }).fill(QUESTION);
  await box.getByRole('button', { name: 'Ask', exact: true }).click();

  const card = page.locator('[data-answers-for="28"] [data-answer]').first();
  const failure = box.getByRole('alert');
  await expect(card.or(failure)).toBeVisible({ timeout: 120_000 });
  if (await failure.isVisible()) throw new Error(`the box failed instead of answering: ${await failure.innerText()}`);

  const text = (await card.innerText()).trim();
  await shot(page, 'tutor-live');
  expect(text.length).toBeGreaterThan(QUESTION.length);
  expect(plain(text)).toMatch(/συνεργει|συνεργεω/);
});
