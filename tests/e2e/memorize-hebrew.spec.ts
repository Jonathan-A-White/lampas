// tests/e2e/memorize-hebrew.spec.ts — Jonah 1:1 memorized in Hebrew (mw-gdcyf98.15, #/memorize/Jonah.1.1/he) at 390x844 over voice-kit's honest speech and microphone: at step 2 half of the Hebrew words
// are blank, the verse is drawn right to left in the Hebrew face, nothing runs off the edge, the progress mark fills from the right, a hold that says the verse (heard as he-IL, the points not counted)
// ends on Got it, and Type it waits for the Hebrew keyboard setting. The honest fakes cannot say how a real phone hears Hebrew: that is a phone check.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { clips, honestMic, honestSpeech } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const REF = 'Jonah.1.1';
const HOLD_MS = 2800;
const chapter = JSON.parse(readFileSync('public/data/jon/1.json', 'utf8')) as { verses: { n: number; g: { t: string }[] }[] };
const WORDS = chapter.verses.find((v) => v.n === 1)!.g.map((w) => w.t.replace(/\s+[פס]$/u, ''));
/** What the recogniser hears: the verse without its points and cantillation. */
const SAID = WORDS.map((w) => w.normalize('NFD').replace(/\p{M}/gu, '')).join(' ');

/** Puts the verse on the schedule in Hebrew at `step`, due, and the Hebrew setting at All in (and the keyboard as asked), as Memorize and Settings write them. */
async function seed(page: Page, step: number, keyboard: 'on' | 'off'): Promise<void> {
  await page.evaluate(
    ({ ref, step, keyboard }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['reviews', 'settings'], 'readwrite');
          const now = Date.now();
          tx.objectStore('reviews').put({ kind: 'verse', id: `he:${ref}`, step, due: now - 1000, lastWhen: now - 86_400_000, lapses: 0, rights: 0 });
          tx.objectStore('settings').put({ key: 'hebrewInterest', value: '5' });
          tx.objectStore('settings').put({ key: 'hebrewKeyboard', value: keyboard });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { ref: REF, step, keyboard },
  );
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test('Jonah 1:1 at step 2 shows half its Hebrew words right to left, is said from memory and judged in Hebrew', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR', 'he-IL'] });
  await honestMic(page, { clip: { ...clips.english, transcript: SAID } });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seed(page, 2, 'off');

  await page.goto(`/#/memorize/${REF}/he`);
  await expect(page.getByRole('heading', { name: 'Jonah 1:1', level: 1 })).toBeVisible();
  await expect(page.getByText('Hebrew · Half the words gone · step 3 of 7')).toBeVisible();
  const verse = page.getByTestId('memorize-verse');
  await expect(verse).toBeVisible();
  await expect(verse).toHaveAttribute('dir', 'rtl');
  expect(await verse.evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
  await expect(verse.locator('[data-token]')).toHaveCount(WORDS.length);
  await expect(verse.locator('[data-blank]')).toHaveCount(WORDS.length / 2);
  await expect(verse.locator('[data-token]').first()).toHaveAttribute('lang', 'he');
  await expect(verse.locator('[data-token]').first()).toHaveClass(/script-he/);
  // the first word is at the right of the line: Hebrew reads from the right
  const first = (await verse.locator('[data-token="0"]').boundingBox())!;
  const last = (await verse.locator(`[data-token="${WORDS.length - 1}"]`).boundingBox())!;
  expect(first.x).toBeGreaterThan(last.x);
  const wide = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(wide.scrollWidth).toBeLessThanOrEqual(wide.clientWidth);

  // Type it waits for the Hebrew keyboard setting
  await expect(page.getByRole('button', { name: 'Type it' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Turn on Hebrew keyboard in Settings to type Hebrew' })).toBeVisible();
  await shot(page, 'memorize-hebrew');

  const bar = page.getByRole('button', { name: 'Hold to say it' });
  await expect(bar).toBeInViewport();
  await holdFor(page, bar, HOLD_MS);
  await expect(page.getByTestId('judgement')).toHaveText(`Got it: ${WORDS.length} of ${WORDS.length} words`);
  await expect(verse.locator('[data-blank]')).toHaveCount(0);
  await expect(verse.locator('[data-token]').first()).toContainText('וַֽיְהִי');
  await shot(page, 'memorize-hebrew-judged');
});

test('with the Hebrew keyboard On, Type it opens a right-to-left Hebrew box', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR', 'he-IL'] });
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await seed(page, 2, 'on');

  await page.goto(`/#/memorize/${REF}/he`);
  await page.getByRole('button', { name: 'Type it' }).click();
  const box = page.getByRole('textbox', { name: 'Type the verse in Hebrew' });
  await expect(box).toHaveAttribute('lang', 'he');
  await expect(box).toHaveAttribute('dir', 'rtl');
  await box.fill(SAID);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByTestId('judgement')).toHaveText(`Got it: ${WORDS.length} of ${WORDS.length} words`);
});
