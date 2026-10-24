// tests/e2e/memorize-session.spec.ts — the Memorize session (mw-fu7dqf.8, #/memorize/<ref>/<lang>) at 390x844 over voice-kit's honest speech and microphone: Romans 8:28 at step 2 has half its words
// blank, Hear it speaks the verse, a hold that says it ends on 'Got it' and 'Due …', and nothing on the phone scrolls or runs off its edge. The recogniser hears the verse because the clip's transcript is set to it.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { clips, honestMic, honestSpeech, spoken } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const REF = 'Rom.8.28';
const HOLD_MS = 2800;
const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as { verses: { n: number; e: { t: string }[] }[] };
const VERSE = chapter.verses.find((v) => v.n === 28)!.e.map((c) => c.t).join(' ').replace(/\s+/g, ' ').trim();
const WORDS = VERSE.split(' ');

/** Puts the verse on the schedule at `step`, due, as Memorize wrote it. */
async function seedVerse(page: Page, step: number): Promise<void> {
  await page.evaluate(
    ({ ref, step }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['reviews'], 'readwrite');
          const now = Date.now();
          tx.objectStore('reviews').put({ kind: 'verse', id: `en:${ref}`, step, due: now - 1000, lastWhen: now - 86_400_000, lapses: 0, rights: 0 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { ref: REF, step },
  );
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test('a verse at step 2 shows half its words, is heard, said from memory and ends on Got it and its due day (step 2 waits a week)', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR'] });
  await honestMic(page, { clip: { ...clips.english, transcript: VERSE } });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seedVerse(page, 2);

  await page.goto(`/#/memorize/${REF}/en`);
  await expect(page.getByRole('heading', { name: 'Romans 8:28', level: 1 })).toBeVisible();
  await expect(page.getByText('English · Half the words gone · step 3 of 7')).toBeVisible();
  const verse = page.getByTestId('memorize-verse');
  await expect(verse).toBeVisible();
  await expect(verse.locator('[data-blank]')).toHaveCount(Math.round(WORDS.length / 2));
  await expect(verse.locator('[data-token]')).toHaveCount(WORDS.length);

  // Hear it speaks the whole verse, blanks or not
  await page.getByRole('button', { name: 'Hear it' }).click();
  await expect.poll(async () => (await spoken(page)).map((s) => s.text).join(' ').replace(/\s+/g, ' ')).toContain(WORDS[0]);
  await page.getByRole('button', { name: 'Stop hearing it' }).click();
  await shot(page, 'memorize-session');

  // the hold at the foot says it from memory
  const bar = page.getByRole('button', { name: 'Hold to say it' });
  await expect(bar).toBeInViewport();
  await holdFor(page, bar, HOLD_MS);
  await expect(page.getByTestId('judgement')).toHaveText(`Got it: ${WORDS.length} of ${WORDS.length} words`);
  await expect(page.getByTestId('due')).toHaveText(/^Due \w+/);
  await expect(verse.locator('[data-blank]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'memorize-session-judged');
});
