import { expect, test, type Page } from '@playwright/test';
import { tapTwice } from '../support/gesture';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openReviewFromToday, waitForDue } from './today-chip';

// The 'in Hebrews 8:9 as ἐκ' line of an answered word question opens the verse card with the form marked, in his view (mw-5r3p30.652, features/word-question-verse.feature).
// tapTwice (tests/support/gesture.ts) times its two taps on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

/** Starts Review in `view` and answers cards until one has the line (a word the open chapter has); leaves that card answered. */
async function answeredWithLine(page: Page, view: 'greek' | 'english'): Promise<void> {
  await openUnlocked(page);
  await page.goto(`/#/?c=8&view=${view}&weave=solid`);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await waitForDue(page);
  await openReviewFromToday(page);
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('prompt')).toBeVisible();
  for (let i = 0; i < 10; i += 1) {
    const show = page.getByRole('button', { name: 'Show' });
    if (await show.isVisible()) {
      await show.click();
      await page.getByRole('button', { name: 'I knew it' }).click();
    } else {
      await page.locator('[data-option]').first().click();
      if (await page.getByTestId('chapter-form').isVisible()) return;
    }
    await page.getByTestId('next').click();
  }
  throw new Error('no card of the round had the reference line');
}

for (const view of ['greek', 'english'] as const) {
  test(`in the ${view} view the Review card's reference opens the verse with the word marked and closing leaves the card answered`, async ({ page }) => {
    await answeredWithLine(page, view);
    const line = page.getByTestId('chapter-form');
    const link = line.getByRole('link');
    const reference = (await link.innerText()).trim();
    expect((await link.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
    const form = (await line.getAttribute('data-form')) ?? '';
    const result = await page.locator('[data-option][data-result="right"], [data-option][data-result="wrong"]').count();
    const feedback = await page.getByTestId('feedback').innerText();

    // a double tap opens one card
    await tapTwice(page, link, 120);
    const card = page.getByRole('dialog', { name: reference });
    await expect(card).toBeVisible();
    await expect(page.locator('[data-reference-card]')).toHaveCount(1);
    await expect(card.locator('[data-reference-text]')).toHaveAttribute('data-view', view);
    // the form stands marked: in the English view only where the weave has drawn it, which the lemma being solid or learning decides
    const marked = card.locator('[data-marked]');
    if (view === 'greek') {
      await expect(marked).toHaveCount(1);
      await expect(marked).toHaveText(form);
    } else {
      expect(await marked.count()).toBeLessThanOrEqual(1);
    }
    const box = await card.boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844).toBe(true);
    await shot(page, `review-reference-verse-${view}`);

    await card.getByRole('button', { name: 'Close' }).click();
    await expect(card).toBeHidden();
    await expect(page.getByTestId('chapter-form')).toBeVisible();
    await expect(page.locator('[data-option][data-result="right"], [data-option][data-result="wrong"]')).toHaveCount(result);
    await expect(page.getByTestId('feedback')).toHaveText(feedback);
    await expect(page.getByTestId('next')).toBeVisible();
  });
}
