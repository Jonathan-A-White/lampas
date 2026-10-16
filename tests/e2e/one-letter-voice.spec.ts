import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { fakeMedia, type FakeWindow } from './fake-media';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The speaker on the one-letter example Ὃ ('That which', 1 John 1:1) on The Greek alphabet hands the phone's Greek voice the vowel doubled, 'οο', and plays
// no clip (mw-5r3p30.421): his phone's Greek voice said 'Omicron' for every form of the letter it was handed alone (mw-5r3p30.226, .256, .262), and on the
// listening trial (mw-5r3p30.395) the doubled vowel was the sound he chose. The audio element is tests/e2e/fake-media.ts (window.played); the clip of
// mw-5r3p30.347 stays, served from the build and precached, for a phone with no Greek voice.

/** Puts a row in the app's own settings store through raw IndexedDB, as the app wrote it. */
async function putSetting(page: Page, row: { key: string; value: string }) {
  await page.evaluate(
    (r) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          tx.objectStore('settings').put(r);
          tx.oncomplete = () => {
            idb.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    row,
  );
}

const played = (page: Page) => page.evaluate(() => (window as unknown as FakeWindow).played.map((src) => new URL(src).pathname));

test('the speaker beside Ὃ on The Greek alphabet hands the Greek voice οο, and plays no clip', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR'] });
  await fakeMedia(page, 0.4);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await putSetting(page, { key: 'goal', value: '1 John 1:1' });
  await page.goto('/#/goal');
  await page.reload();
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The Greek alphabet' }).click();
  const sheet = page.getByRole('dialog', { name: 'Idea' });
  await expect(sheet).toBeVisible();
  const speaker = sheet.getByRole('button', { name: 'Hear Ὃ' });
  await speaker.scrollIntoViewIfNeeded();
  const before = (await spoken(page)).length;
  await speaker.click();

  await expect.poll(async () => (await spoken(page)).slice(before).map((u) => [u.text, u.lang])).toEqual([['οο', 'el-GR']]);
  expect(await played(page)).toEqual([]);
  await shot(page, 'one-letter-voice');

  // the clip, for a phone with no Greek voice, is in the build, as a sound, and in the worker's precache, so it plays offline
  const clip = await page.request.get('/sounds/modern/o.mp3');
  expect(clip.status()).toBe(200);
  expect(clip.headers()['content-type']).toContain('audio/mpeg');
  expect(readFileSync('dist/sw.js', 'utf8')).toContain('sounds/modern/o.mp3');
});
