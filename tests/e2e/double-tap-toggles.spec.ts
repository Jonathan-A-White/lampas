// A thumb's double tap on a play / stop control or an open / closed toggle ends where one tap does (mw-5r3p30.637, left by mw-svw421.41's sweep):
// the second tap of the pair must not stop what the first started, or close what it opened. Each control goes through oneTap (src/ui/settle.ts).
// The moment is as on his phone (SETTLE_MS), and both taps are timed on the page's clock (tests/support/gesture.ts), which is installed before the page opens.
// The verse number is not here: a tap on it opens the Verse view (a change of screen), whose second tap the app-wide guard swallows (src/ui/tapGuard.ts).
import { expect, test, type Page } from '@playwright/test';
import { SETTLE_MS } from '../../src/ui/settle';
import { holdFor } from '../support/hold';
import { pageTime, tapTwice } from '../support/gesture';
import { honestSpeech } from '../support/honest-fakes';
import { makeFakePostern, TIMED_READING_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { fakeMedia } from './fake-media';
import { openUnlocked } from './unlocked';

/** A thumb's gap between the two taps: well inside SETTLE_MS. */
const GAP_MS = 120;

/** 'together' lasts from 0.2 s to 2.1 s of the 2.2 s clip, so it still plays when the second tap lands. */
const LONG_WORD_ANSWER = {
  ...TIMED_READING_ANSWER,
  focus_words: [{ ...TIMED_READING_ANSWER.focus_words[0], start: 0.2, end: 2.1 }, TIMED_READING_ANSWER.focus_words[1]],
};

/** The moment is put back after openUnlocked's '0' (init scripts run in order). */
async function settleAsOnHisPhone(page: Page): Promise<void> {
  await page.addInitScript((ms) => window.localStorage.setItem('lampas.settleMs', ms), String(SETTLE_MS));
}

/** Romans 8:28 read through the fake mill; returns once the words to fix ('together', 'purpose') are marked. */
async function readVerse28(page: Page) {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: LONG_WORD_ANSWER };
  await routePostern(page, fake);
  await fakeMedia(page, 2.2);
  await openUnlocked(page);
  await settleAsOnHisPhone(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // a Verse view swallows taps for the moment as it opens (src/ui/tapGuard.ts): the action is chosen after it
  await pageTime(page, SETTLE_MS + 100);
  await page.getByRole('button', { name: 'Verse 28', exact: true }).click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  await pageTime(page, SETTLE_MS + 100);
  await view.getByRole('button', { name: 'Read it aloud', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Reading check' });
  await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 28', exact: true }), 2200);
  await expect(panel.locator('[data-fix]')).toHaveText(['together', 'purpose']);
  await pageTime(page, SETTLE_MS + 100);
  return panel;
}

test.describe('a double tap on a play or open toggle', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test.beforeEach(async ({ page }) => {
    await page.clock.install();
  });

  test("Read aloud on a page of prose: a double tap on its button ends playing, as one tap does", async ({ page }) => {
    await honestSpeech(page, { msPerWord: 300 });
    await openUnlocked(page);
    await settleAsOnHisPhone(page);
    await page.goto('/#/about');
    await expect(page.getByRole('heading', { name: 'About', exact: true, level: 1 })).toBeVisible();
    await pageTime(page, SETTLE_MS + 100);

    const read = page.getByRole('banner').getByRole('button', { name: 'Read aloud', exact: true });
    await tapTwice(page, read, GAP_MS, { touch: true });
    await pageTime(page, SETTLE_MS + 100);
    await expect(read).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('region', { name: 'Speaking', exact: true })).toBeVisible();
  });

  test("ReadCheck: a double tap on 'Me' ends recording-playing, as one tap does", async ({ page }) => {
    const panel = await readVerse28(page);
    await tapTwice(page, panel.getByRole('button', { name: 'Hear me say together', exact: true }), GAP_MS, { touch: true });
    await expect(panel.getByRole('button', { name: 'Stop hearing me say together', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByRole('button', { name: 'Stop hearing me say together', exact: true })).toHaveText('Stop');
  });

  test("ReadCheck: a double tap on a word to fix leaves its chunks open, as one tap does", async ({ page }) => {
    const panel = await readVerse28(page);
    const word = panel.locator('[data-fix="together"]');
    await tapTwice(page, word, GAP_MS, { touch: true });
    await pageTime(page, SETTLE_MS + 100);
    await expect(word).toHaveAttribute('aria-pressed', 'true');
  });

  // The guards mw-svw421.41 put on Settings' study-resource switches had a unit test only (GrammarSheet, Today and SearchableList likewise).
  test("Settings: a double tap on a study resource's switch leaves it On, as one tap does", async ({ page }) => {
    await openUnlocked(page);
    await settleAsOnHisPhone(page);
    await page.goto('/');
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    await pageTime(page, SETTLE_MS + 100);
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await pageTime(page, SETTLE_MS + 100);
    const section = page.getByRole('region', { name: 'Study resources' });
    await section.scrollIntoViewIfNeeded();
    const strongs = section.getByRole('switch', { name: "Strong's", exact: true });
    await expect(strongs).toHaveAttribute('aria-checked', 'false');
    await tapTwice(page, strongs, GAP_MS, { touch: true });
    await pageTime(page, SETTLE_MS + 100);
    await expect(strongs).toHaveAttribute('aria-checked', 'true');
  });
});
