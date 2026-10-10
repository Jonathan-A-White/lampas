import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

// The page never scrolls and never grows wider than the window.
async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

test('the Ask box of the Verse view on verse 28 sends the question and shows the answer, at phone width', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await chooseAction(page, 28, 'Ask the tutor');

  const box = page.getByRole('region', { name: 'Ask the tutor' });
  const field = box.getByRole('textbox', { name: 'Your question' });
  const ask = box.getByRole('button', { name: 'Ask', exact: true });
  await expect(box).toBeInViewport();
  await expect(ask).toBeDisabled();
  await field.fill('What does συνεργεῖ mean here?');
  await expect(ask).toBeEnabled();

  // A thumb-sized button and a field the phone does not zoom into (16 px or more).
  const buttonBox = await ask.boundingBox();
  expect(buttonBox?.height).toBeGreaterThanOrEqual(43.5);
  expect(buttonBox?.width).toBeGreaterThanOrEqual(43.5);
  const fontSize = await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(fontSize).toBeGreaterThanOrEqual(16);
  await expectFitsPhone(page);
  await shot(page, 'ask');

  await ask.click();
  const card = page.locator('[data-answers-for="28"] [data-answer]');
  await expect(card).toContainText(SYNERGEI_ANSWER.answer);
  await expect(card.getByText('συνεργέω', { exact: true })).toBeVisible();
  await expect(field).toHaveValue('');
  await expect(card).toBeInViewport();
  await expectFitsPhone(page);
  expect(fake.received).toHaveLength(1);

  // Copy: a thumb-sized button that puts the exchange on the clipboard as Markdown and says Copied.
  const copy = card.getByRole('button', { name: 'Copy this exchange' });
  const copyBox = await copy.boundingBox();
  expect(copyBox?.height).toBeGreaterThanOrEqual(43.5);
  expect(copyBox?.width).toBeGreaterThanOrEqual(43.5);
  await copy.click();
  await expect(card.getByRole('status')).toHaveText('Copied');
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(`[Romans 8:28](https://lampas.allmymind.org/#/?ref=Rom.8.28)\n\n**Q:** What does συνεργεῖ mean here?\n\n${SYNERGEI_ANSWER.answer}`);
  await expectFitsPhone(page);
  await shot(page, 'answer');
});
