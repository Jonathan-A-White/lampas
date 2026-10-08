import { expect, test } from '@playwright/test';
import { GRAMMAR_HELP_ANSWER, makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('the word sheet has a Help with this word row with thumb-sized Grammar and Sound it out, and Grammar opens the Talk sheet with the question sent', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_HELP_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();

  const word = page.getByRole('dialog', { name: 'Word' });
  const row = word.getByRole('group', { name: 'Help with this word' });
  await expect(row).toBeInViewport();
  // The word's facts and the row fit the sheet without scrolling it, and the page does not move.
  for (const name of ['Grammar', 'Sound it out']) {
    const box = await row.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, top: document.documentElement.scrollTop }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  expect(fits.top).toBe(0);
  await shot(page, 'word-help');

  await row.getByRole('button', { name: 'Grammar', exact: true }).click();
  const talk = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(talk).toBeVisible();
  await expect(word).toBeHidden();
  await expect(talk.locator('[data-turn]')).toContainText(GRAMMAR_HELP_ANSWER.answer);
  expect(fake.received[0].input.focus).toMatchObject({ form: 'συνεργεῖ', lemma: 'συνεργέω', kind: 'grammar' });
});
