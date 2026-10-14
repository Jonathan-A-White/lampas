// tests/e2e/talk-copy-question.spec.ts — a Copy under his own question in the Talk sheet (mw-5r3p30.341): when a long question cannot be sent, the
// Copy is in view at the foot of the failure (beside Retry), without scrolling the sheet, and a tap puts the whole question on the clipboard.
import { expect, test } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

const LONG = 'Why does Paul say that all things work together for good? '.repeat(10).trim();

test('a question that could not be sent has its Copy in view, and a tap copies all of it', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  fake.licensed = false;
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill(LONG);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(sheet.getByRole('alert')).toContainText('No licence');
  const copy = sheet.getByRole('alert').getByRole('button', { name: 'Copy my question' });
  await expect(copy).toBeInViewport({ ratio: 1 });
  expect((await copy.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);

  await copy.click();
  await expect(sheet.locator('[data-talk-pending] [data-copy-text]').getByRole('status')).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(LONG);
  await shot(page, 'talk-copy-question');
});

test('a sent question has a Copy under it that copies his words', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('What does συνεργεῖ mean here?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const turn = sheet.locator('[data-turn]');
  await expect(turn).toContainText(TALK_ANSWER.answer);
  await turn.getByRole('button', { name: 'Copy my question' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('What does συνεργεῖ mean here?');
});
