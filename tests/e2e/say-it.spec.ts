import { expect, test, type Locator, type Page } from '@playwright/test';
import { holdFor } from '../support/hold';
import { clips, honestMic, honestSpeech } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Say it in the letter drill (mw-86e9r1.12): the third question of a round is the letter shown large, the hold bar and Skip, all in the window; after the answer
// the result, what the phone heard, the answer and Tap to hear, with Next in view. The phone's microphone is voice-kit's honest one hearing a clip that says 'delta'.
test.use({ viewport: { width: 390, height: 844 } });

// Puts a row in the app's own store through raw IndexedDB, as the app wrote it.
async function putSetting(page: Page, row: { key: string; value: string }) {
  await page.evaluate(
    (setting) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const idb = open.result;
          const tx = idb.transaction('settings', 'readwrite');
          tx.objectStore('settings').put(setting);
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

const seeded = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => resolve(false);
        open.onsuccess = () => {
          const idb = open.result;
          if (!idb.objectStoreNames.contains('meta')) {
            idb.close();
            return resolve(false);
          }
          const get = idb.transaction('meta').objectStore('meta').get('grammarLevelsSeeded');
          get.onsuccess = () => {
            idb.close();
            resolve(get.result !== undefined);
          };
          get.onerror = () => {
            idb.close();
            resolve(false);
          };
        };
      }),
  );

/** A control a thumb can hit, wholly inside the window. */
async function expectInWindow(target: Locator, minHeight = 47.5) {
  const box = await target.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(minHeight);
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(844);
}

test('Say it: the letter, the hold bar and Skip fit the phone; the answer shows what it heard, the answer and Tap to hear', async ({ page }) => {
  // the app and the honest microphone time a hold by the page's clock, which holdFor drives (tests/support/hold.ts)
  await page.clock.install();
  await honestSpeech(page);
  await honestMic(page, { clip: { ...clips.english, transcript: 'delta' } });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect.poll(() => seeded(page)).toBe(true);
  await putSetting(page, { key: 'goal', value: '1 John 1:1' });
  await page.reload();
  await page.goto('/#/goal');
  await page.getByTestId('ideas-bar').click();
  await page.getByTestId('ideas-list').getByRole('button', { name: 'The Greek alphabet' }).click();
  const sheet = page.getByRole('dialog', { name: 'Idea', exact: true });
  // the slider is disabled until the sheet has found its examples, and a disabled control takes no focus or key (mw-5r3p30.485)
  await expect(sheet.getByRole('slider', { name: 'Your level' })).toBeEnabled();
  await sheet.getByRole('slider', { name: 'Your level' }).focus();
  await page.keyboard.press('ArrowRight');

  const drill = page.getByRole('dialog', { name: 'Letter drill' });
  // two questions to choose from, then Say it
  for (let i = 0; i < 2; i += 1) {
    await expect(drill.getByTestId('letter-drill-step')).toContainText(`Question ${i + 1} of 8`);
    await drill.locator('[data-option]').first().click();
    await drill.getByTestId('letter-next').click();
  }
  await expect(drill.getByTestId('letter-drill-step')).toContainText('Question 3 of 8');
  const letter = drill.getByTestId('say-letter');
  await expect(letter).toBeVisible();
  expect((await letter.boundingBox())?.height).toBeGreaterThanOrEqual(60);
  const bar = drill.getByRole('button', { name: 'Hold and say it' });
  await expect(bar).toBeVisible();
  await expectInWindow(bar, 95);
  await expectInWindow(drill.getByRole('button', { name: 'Skip this one' }));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await shot(page, 'say-it');

  // he holds while the clip plays out, and lets go
  await holdFor(page, bar, 4500);
  const result = drill.getByTestId('say-result');
  await expect(result).toBeVisible();
  await expect(drill.getByTestId('say-heard')).toHaveText('You said “delta”');
  await expect(drill.getByTestId('say-answer')).toContainText('is ');
  await expectInWindow(drill.getByTestId('tap-to-hear'));
  await expectInWindow(drill.getByTestId('letter-next'));
  await shot(page, 'say-it-answered');
});
