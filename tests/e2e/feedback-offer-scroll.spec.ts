// tests/e2e/feedback-offer-scroll.spec.ts — after his yes or no to the makers' offer, the proof is in view (mw-5r3p30.210): the settled offer's 'Sent' / 'Not sent'
// on the first answer and the newest turn (his words and the tutor's reply) are both inside the answers box at 390x844, without a scroll by him.
// jsdom has no layout, so it is proven here. The words go through the sheet's field: the app sends them the same way as a held, spoken message.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const OFFER = {
  answer: 'Lampas does not work with Olive Tree. I can pass your wish to the makers; I cannot say what they will decide.',
  words: [],
  feedback_offer: { summary: 'He wants Lampas to work with the Olive Tree app, as it does with Accordance.' },
};

/** Opens the Words screen's talk, asks about Olive Tree and waits for the offer. */
async function askAndGetOffer(page: Page, reply: Record<string, unknown>) {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: OFFER };
  fake.kindReplies.feedback = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/words');
  await expect(page.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: Words' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Can this work with Olive Tree?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.getByRole('button', { name: 'Send this to the makers' })).toBeVisible();
  fake.autoReply = { status: 'answered', answer: { words: [], ...reply } };
  return sheet;
}

/** True when the locator lies wholly inside the answers box. */
function inBox(sheet: Locator, target: Locator): () => Promise<boolean> {
  const list = sheet.locator('[data-talk-list]');
  return async () => {
    const [room, box] = await Promise.all([list.boundingBox(), target.boundingBox()]);
    if (!room || !box) return false;
    return box.y >= room.y - 0.5 && box.y + box.height <= room.y + room.height + 0.5;
  };
}

async function say(sheet: Locator, words: string): Promise<void> {
  await sheet.getByRole('textbox', { name: 'Your message' }).fill(words);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
}

test('a yes: the first answer reads Sent, and that mark and the newest turn are in view', async ({ page }) => {
  const sheet = await askAndGetOffer(page, { answer: 'Sent to the makers.', offer_reply: 'confirm' });
  await say(sheet, 'yes send it');
  const sent = sheet.locator('[data-feedback-offer]').getByText('Sent', { exact: true });
  const reply = sheet.getByText('Sent to the makers.', { exact: true });
  await expect(sent).toBeVisible();
  await expect(reply).toBeVisible();
  await expect.poll(inBox(sheet, sent)).toBe(true);
  await expect.poll(inBox(sheet, reply)).toBe(true);
  await shot(page, 'feedback-offer-yes-in-view');
});

test('a no: the first answer reads Not sent, and that mark and the newest turn are in view', async ({ page }) => {
  const sheet = await askAndGetOffer(page, { answer: 'Alright, I will not send it.', offer_reply: 'decline' });
  await say(sheet, 'no not now');
  const notSent = sheet.locator('[data-feedback-offer]').getByText('Not sent', { exact: true });
  const reply = sheet.getByText('Alright, I will not send it.', { exact: true });
  await expect(notSent).toBeVisible();
  await expect(reply).toBeVisible();
  await expect.poll(inBox(sheet, notSent)).toBe(true);
  await expect.poll(inBox(sheet, reply)).toBe(true);
  await shot(page, 'feedback-offer-no-in-view');
});
