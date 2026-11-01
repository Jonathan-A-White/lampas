import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { talkField } from './talk-field';
import { openTutor } from './open-tutor';
import { honestMic } from '../support/honest-fakes';
import { openVerseView } from './verse-view';

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

test('the floating ? over verse 28 opens the Talk sheet, a typed question is sent and the sheet shows the answer, at phone width', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await openVerseView(page, 28);
  const sheet = await openTutor(page, { sheet: 'Talk about Romans 8:28' });
  await expect(sheet).toBeInViewport();
  const field = await talkField(sheet);
  const ask = sheet.getByRole('button', { name: 'Send', exact: true });
  await expect(ask).toHaveCount(0);
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
  const card = sheet.locator('[data-turn]');
  await expect(card).toContainText(SYNERGEI_ANSWER.answer);
  // the explained word's lemma in the words list (the answer's own text has the Greek too, as words to tap)
  await expect(card.locator('dl').getByText('συνεργέω', { exact: true })).toBeVisible();
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
