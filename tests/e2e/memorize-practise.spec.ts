// tests/e2e/memorize-practise.spec.ts — practise a verse any time (mw-5r3p30.1145) at 390x844: with nothing due, a row of Your verses has Practise, which opens the session at the verse's step; after a
// judgement the session offers Again (the same step, the verse hidden again) and, on a pass, Next step (the next step in the subtitle at once), beside Done; nothing runs off the phone's edge.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { clips, honestMic, honestSpeech } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const REF = 'Rom.8.28';
const HOLD_MS = 2800;
const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as { verses: { n: number; e: { t: string }[] }[] };
const VERSE = chapter.verses.find((v) => v.n === 28)!.e.map((c) => c.t).join(' ').replace(/\s+/g, ' ').trim();
const WORDS = VERSE.split(' ');

/** The verse at step 1, not due for three days. */
async function seedResting(page: Page): Promise<void> {
  await page.evaluate(
    (ref) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['reviews'], 'readwrite');
          const now = Date.now();
          tx.objectStore('reviews').put({ kind: 'verse', id: `en:${ref}`, step: 1, due: now + 3 * 86_400_000, lastWhen: now - 86_400_000, lapses: 0, rights: 0 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    REF,
  );
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test('with nothing due, Practise opens the verse; after a judgement Again says it once more and Next step moves on', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR'] });
  await honestMic(page, { clip: { ...clips.english, transcript: VERSE } });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seedResting(page);

  await page.goto('/#/memorize');
  await expect(page.getByText('Nothing due today')).toBeVisible();
  const mine = page.getByRole('region', { name: 'Your verses' });
  const practise = mine.getByRole('button', { name: 'Practise Romans 8:28 in English' });
  await expect(practise).toBeVisible();
  const box = await practise.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(47.5);
  const wide = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1).length);
  expect(wide).toBe(0);
  await shot(page, 'memorize-practise-home');

  await practise.click();
  await expect(page.getByText('English · A quarter of the words gone · step 2 of 7')).toBeVisible();
  const verse = page.getByTestId('memorize-verse');
  await holdFor(page, page.getByRole('button', { name: 'Hold to say it' }), HOLD_MS);
  await expect(page.getByTestId('judgement')).toHaveText(`Got it: ${WORDS.length} of ${WORDS.length} words`);
  await expect(page.getByRole('button', { name: 'Again' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next step' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
  await shot(page, 'memorize-practise-judged');

  // Again: the same step, the verse hidden again
  await page.getByRole('button', { name: 'Again' }).click();
  await expect(page.getByText('English · A quarter of the words gone · step 2 of 7')).toBeVisible();
  await expect(page.getByTestId('judgement')).toHaveCount(0);
  await expect(verse.locator('[data-blank]').first()).toBeVisible();
  await holdFor(page, page.getByRole('button', { name: 'Hold to say it' }), HOLD_MS);
  await expect(page.getByTestId('judgement')).toHaveText(`Got it: ${WORDS.length} of ${WORDS.length} words`);

  // Next step: step 3 of 7 at once
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByText('English · Half the words gone · step 3 of 7')).toBeVisible();
  await expect(page.getByTestId('judgement')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hold to say it' })).toBeInViewport();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'memorize-practise-next-step');
});
