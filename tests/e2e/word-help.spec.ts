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

  const word = page.getByRole('dialog', { name: 'Word', exact: true });
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

// mw-fnvjof.17.306: the Greek card's Definition (the one fact of any length) once sat between Meaning and the rows, and pushed Help with this word (and the Study row) below the sheet's fold.
// Every row group the sheet draws is on the screen when it opens; the Definition is drawn, and is what scrolls.
test('every group of the Greek word sheet is on the screen at 390x844 when it opens, the Definition under them', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();

  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(word.getByTestId('sheet-definition')).toBeAttached();
  const groups = word.getByRole('group');
  const count = await groups.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) await expect(groups.nth(i)).toBeInViewport();
  const rows = await word.evaluate((el) => {
    const top = (sel: string): number => (el.querySelector(sel) as HTMLElement).getBoundingClientRect().top;
    return { help: top('[aria-label="Help with this word"]'), definition: top('[data-testid="sheet-definition"]') };
  });
  expect(rows.definition).toBeGreaterThan(rows.help);
});
