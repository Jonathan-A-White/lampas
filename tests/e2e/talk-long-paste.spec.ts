// tests/e2e/talk-long-paste.spec.ts — a long question pasted into the Talk sheet's box is kept whole and sent whole (mw-5r3p30.464): 885 characters are all
// in the box and all sent. The box once cut at 600; mw-5r3p30.413 (0.1.259) made the limit 4000 (src/services/requestBudget.ts), so this spec is the regression
// test and passes on build 0.1.344, on which the finding was re-made.
import { expect, test } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { longQuestion } from '../support/long-text';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

test('885 characters pasted into the Talk box are all in the box and all sent', async ({ page }) => {
  const QUESTION = longQuestion(885);
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  const box = sheet.getByRole('textbox', { name: 'Your message' });
  await box.fill(QUESTION);
  await expect(box).toHaveValue(QUESTION);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-turn]')).toContainText(TALK_ANSWER.answer);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input.question).toBe(QUESTION);
  expect(String(fake.received[0].input.question)).toHaveLength(885);
  await shot(page, 'talk-long-paste');
});
