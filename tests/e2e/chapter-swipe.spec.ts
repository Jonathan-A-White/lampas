import { expect, test } from '@playwright/test';
import { swipe } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Swipe the Reader's text to the next or previous chapter (mw-5r3p30.126) at 412x915. A phone-width layout claim: it runs under --project=shots.
test.use({ viewport: { width: 412, height: 915 }, hasTouch: true });

// The app times a swipe by the page's clock (SWIPE_MAX_MS, 600); tests/support/gesture.ts swipe drives that clock, so a loaded host cannot stretch it
// (mw-5r3p30.612). The clock is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test('a left swipe on Romans 8 opens Romans 9 from the top; Back returns; a right swipe goes to Romans 7', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await swipe(page, [300, 500], [120, 508]);
  await expect(page.getByRole('heading', { name: 'Romans 9', level: 1 })).toBeVisible();
  expect(await page.locator('[data-reader]').evaluate((el) => el.scrollTop)).toBe(0);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await swipe(page, [120, 500], [300, 508]);
  await expect(page.getByRole('heading', { name: 'Romans 7', level: 1 })).toBeVisible();
});

test('a finger swipe changes chapter; a mostly vertical drag does not; the first and last chapters leave a note', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8');
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await swipe(page, [250, 600], [230, 200], { with: 'touch' });
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-swipe-note]')).toHaveCount(0);
  await swipe(page, [330, 500], [90, 510], { with: 'touch' });
  await expect(page.getByRole('heading', { name: 'Romans 9', level: 1 })).toBeVisible();

  await page.goto('/#/?b=gen&c=1');
  await expect(page.getByRole('heading', { name: 'Genesis 1', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await swipe(page, [90, 500], [330, 500], { with: 'touch' });
  const note = page.locator('[data-swipe-note]');
  await expect(note).toContainText('This is the first chapter. Before it: the Preface');
  await expect(page.getByRole('heading', { name: 'Genesis 1', level: 1 })).toBeVisible();
  await shot(page, 'chapter-swipe-first');
  await note.getByRole('button', { name: 'the Preface' }).click();
  await expect(page).toHaveURL(/#\/preface$/);

  await page.goto('/#/?b=rev&c=22');
  await expect(page.getByRole('heading', { name: 'Revelation 22', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await swipe(page, [330, 500], [90, 500], { with: 'touch' });
  await expect(page.locator('[data-swipe-note]')).toContainText('You have reached the end of Revelation. Well done.');
  await expect(page.getByRole('heading', { name: 'Revelation 22', level: 1 })).toBeVisible();
});

// A host that delivers the drag slowly: the release comes 900 ms of real time after the last move, past the app's 600 ms, and it is still a swipe,
// because the page's clock did not move (mw-5r3p30.289: Romans 9 never opened on a loaded host).
for (const input of ['mouse', 'touch'] as const) {
  test(`a ${input} swipe that the host delivers 900 ms late is still a swipe`, async ({ page }) => {
    await openUnlocked(page);
    await page.goto('/#/?b=rom&c=8');
    await expect(page.locator('[data-verse="3"]')).toBeVisible();
    await swipe(page, [330, 500], [90, 508], { with: input, lagMs: 900 });
    await expect(page.getByRole('heading', { name: 'Romans 9', level: 1 })).toBeVisible();
  });
}
