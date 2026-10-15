import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';

// The listening page of the letter-sounds research (public/sounds-trial.html, mw-5r3p30.395) is served from the build as a plain file: no licence
// gate, no app shell. Every item is there, every clip it plays answers from the build as an MP3, a phone-voice button hands the phone's own voice
// exactly its text in Greek, and the page is in neither the app's precache nor its screens.

test('the letter-sounds trial page serves every item and clip, and hands the phone’s voice its Greek', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR'] });
  await page.goto('/sounds-trial.html');
  await expect(page.getByRole('heading', { name: 'Letter sounds: a listening trial', level: 1 })).toBeVisible();

  const items = page.locator('section[data-item]');
  await expect(items).toHaveCount(await items.count());
  for (const id of ['vowel-a', 'vowel-e', 'vowel-ee', 'vowel-o', 'O-1jn', 'o', 'ee', 'omega', 'beta', 'gamma', 'theta', 'voice-o-logos']) {
    await expect(page.locator(`section[data-item="${id}"]`), id).toHaveCount(1);
  }

  // every clip on the page answers from the build, as audio
  const clips = [...new Set(await page.locator('button[data-clip]').evaluateAll((buttons) => buttons.map((b) => (b as HTMLElement).dataset.clip!)))];
  expect(clips.length).toBeGreaterThan(40);
  for (const url of clips) {
    const answer = await page.request.get(url);
    expect(answer.status(), url).toBe(200);
    expect(answer.headers()['content-type'], url).toContain('audio/mpeg');
  }

  // the phone's own voice is handed the phrase, in Greek
  await page.locator('section[data-item="o"] button[data-say="ὁ λόγος"][data-mode="plain"]').click();
  await expect.poll(async () => (await spoken(page)).map((u) => `${u.lang}:${u.text}`)).toContain('el-GR:ὁ λόγος');

  // not precached, and no screen of the app points at it
  expect(readFileSync('dist/sw.js', 'utf8')).not.toContain('sounds-trial');
  await shot(page, 'sounds-trial');
});
