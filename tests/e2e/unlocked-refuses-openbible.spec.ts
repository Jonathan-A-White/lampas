import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { openUnlicensed, openUnlocked } from './unlocked';

// The shared e2e setup refuses openbible.com (mw-fnvjof.17.312): a spec that presses Play on a timed MSB chapter without noRecording or its own stub
// would otherwise stream the real publisher's MP3 (mw-fnvjof.17.289). A request to it is aborted by the page's own route (net::ERR_FAILED), not left to the network.

/** What the browser says of a request to the real openbible.com, made from the page: the error it failed with, or null when it got an answer. */
async function failureOf(page: Page, url: string): Promise<string | null> {
  const failures: string[] = [];
  page.on('requestfailed', (request) => {
    if (request.url() === url) failures.push(request.failure()?.errorText ?? '');
  });
  await page.goto('/');
  await page.evaluate((target) => fetch(target, { mode: 'no-cors' }).then(() => null, () => null), url);
  await expect.poll(() => failures.length).toBeGreaterThan(0);
  return failures[0];
}

test('openUnlocked refuses openbible.com', async ({ page }) => {
  await openUnlocked(page);
  expect(await failureOf(page, 'https://openbible.com/audio/msb/MSB_43_Jhn_003_D.mp3')).toBe('net::ERR_FAILED');
});

test('openUnlocked refuses a subdomain of openbible.com', async ({ page }) => {
  await openUnlocked(page);
  expect(await failureOf(page, 'https://www.openbible.com/audio/x.mp3')).toBe('net::ERR_FAILED');
});

test('openUnlicensed refuses openbible.com', async ({ page }) => {
  await openUnlicensed(page);
  expect(await failureOf(page, 'https://openbible.com/audio/msb/MSB_43_Jhn_003_D.mp3')).toBe('net::ERR_FAILED');
});
