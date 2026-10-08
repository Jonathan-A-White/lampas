import { expect, test } from '@playwright/test';
import { GRAMMAR_TERM_ANSWER, makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('every grammar word of the Parsing is a thumb-sized link; conjunction opens a Grammar sheet that fits the phone, I know this survives a reload, Ask the tutor sends the term', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_TERM_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'For', exact: true }).click();

  const word = page.getByRole('dialog', { name: 'Word' });
  const link = word.getByTestId('sheet-parse').getByRole('button', { name: 'conjunction', exact: true });
  const box = await link.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  expect(await link.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('underline');
  await link.click();

  const grammar = page.getByRole('dialog', { name: 'Grammar' });
  await expect(grammar).toBeVisible();
  await expect(grammar.getByRole('heading', { name: 'conjunction' })).toBeVisible();
  await expect(grammar.getByTestId('grammar-example')).toHaveCount(3);
  const sheet = await grammar.boundingBox();
  expect((sheet?.x ?? 0) + (sheet?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  expect((sheet?.y ?? 0) + (sheet?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  const know = grammar.getByRole('button', { name: 'I know this' });
  const knowBox = await know.boundingBox();
  expect(knowBox?.height).toBeGreaterThanOrEqual(43.5);
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, top: document.documentElement.scrollTop }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  expect(fits.top).toBe(0);
  await shot(page, 'grammar-sheet');

  await know.click();
  await expect(know).toHaveAttribute('aria-pressed', 'true');
  await grammar.getByRole('button', { name: 'Done' }).click();
  await word.getByRole('button', { name: 'Done' }).click();

  await page.reload();
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'For', exact: true }).click();
  const again = page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-parse').getByRole('button', { name: 'conjunction', exact: true });
  expect(await again.evaluate((el) => getComputedStyle(el).textDecorationLine)).toBe('none');
  await again.click();
  await page.getByRole('dialog', { name: 'Grammar' }).getByRole('button', { name: 'Ask the tutor' }).click();
  const talk = page.getByRole('dialog', { name: 'Talk about Romans 8:2' });
  await expect(talk).toBeVisible();
  await expect(talk.locator('[data-turn]')).toContainText(GRAMMAR_TERM_ANSWER.answer);
  expect(fake.received[0].input.focus).toEqual({ term: 'conjunction', kind: 'grammar-term' });
});
