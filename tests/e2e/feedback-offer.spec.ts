// The tutor's offer to the makers (mw-5r3p30.109) at phone width: an answer that carries a feedback_offer shows its summary and 'Send this to the
// makers' as a thumb-sized button inside the sheet; the tap sends the feedback grist and the turn reads Sent. Ends with a shot of the sent turn.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const ANSWER = {
  answer: 'Lampas does not work with Olive Tree. I can pass your wish to the makers; I cannot say what they will decide.',
  words: [],
  feedback_offer: { summary: 'He wants Lampas to work with the Olive Tree app, as it does with Accordance.' },
};

test('an ask Lampas cannot meet is offered to the makers and one tap sends it', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: ANSWER };
  fake.kindReplies.feedback = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/words');
  await expect(page.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Words' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Can this work with Olive Tree?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const offer = sheet.getByRole('button', { name: 'Send this to the makers' });
  await expect(offer).toBeVisible();
  const box = await offer.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  await expect(sheet.locator('[data-feedback-offer]')).toContainText('Olive Tree');
  await shot(page, 'feedback-offer');

  await offer.click();
  await expect(sheet.getByText('Sent', { exact: true })).toBeVisible();
  await expect(sheet.getByText('The answer will come back.')).toBeVisible();
  await expect(offer).toHaveCount(0);
  expect(fake.received.map((g) => g.grist.kind)).toEqual(['bible-talk', 'feedback']);
  expect(fake.received[1].input).toMatchObject({ kind: 'tutor-ask', text: 'Can this work with Olive Tree?', screen: 'Words' });
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'feedback-offer-sent');
});
