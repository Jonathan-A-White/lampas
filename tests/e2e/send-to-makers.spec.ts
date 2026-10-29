// tests/e2e/send-to-makers.spec.ts — no standing 'Send to the makers' button (mw-5r3p30.844) at the phone's 390 x 844 and sideways: the Talk sheet and the Verse view's Ask do not draw one; when the
// tutor cannot do what he asks, the offer is in the talk, a thumb-sized 'Send this to the makers' under its answer, and a tap or a typed yes files one feedback grist.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { composerOf, questionField } from './ask-composer';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { pictureInput, talkField } from './talk-field';
import { openTalkAbout } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };
const PICTURE = { name: 'shot.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') };
const CANNOT = {
  answer: 'Lampas has no Greek keyboard. I can pass your wish to the makers; I cannot say what they will decide.',
  words: [],
  feedback_offer: { summary: 'He wants a Greek keyboard.' },
};

async function start(page: Page) {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: CANNOT };
  fake.kindReplies.feedback = { status: 'answered', answer: { status: 'sent' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  return fake;
}

/** Visible, inside the phone's width and at least a thumb tall. */
async function expectTappable(action: Locator): Promise<void> {
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  if (!box) throw new Error('no action');
  expect(box.height).toBeGreaterThanOrEqual(43.5);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT.width);
}

const feedbacks = (fake: ReturnType<typeof makeFakePostern>) => fake.received.filter((g) => g.grist.kind === 'feedback');

test('the Talk sheet has no Send to the makers button, empty or with words and a picture in the composer', async ({ page }) => {
  const fake = await start(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  const action = sheet.getByRole('button', { name: 'Send to the makers', exact: true });
  await expect(action).toHaveCount(0);
  await pictureInput(sheet).setInputFiles(PICTURE);
  await (await talkField(sheet)).fill('The Greek keyboard is missing');
  await expect(action).toHaveCount(0);
  await expect(sheet.locator('[data-makers-send]')).toHaveCount(0);
  await shot(page, 'send-to-makers-talk-none');
  expect(feedbacks(fake)).toHaveLength(0);
});

test("the Verse view's Ask has Attach a picture and Take a photo and no Send to the makers button", async ({ page }) => {
  await start(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  const composer = composerOf(page);
  await expect(composer.getByRole('button', { name: 'Attach a picture' })).toBeVisible();
  await expect(composer.getByRole('button', { name: 'Take a photo' })).toBeVisible();
  await view.locator('input[type="file"]:not([capture])').setInputFiles(PICTURE);
  await (await questionField(page)).fill('The Greek is too small here');
  await expect(view.getByRole('button', { name: 'Send to the makers', exact: true })).toHaveCount(0);
  await shot(page, 'send-to-makers-ask-none');
});

test('what the tutor cannot do is offered in the talk, and a tap on the offer sends it with the picture', async ({ page }) => {
  const fake = await start(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await pictureInput(sheet).setInputFiles(PICTURE);
  await (await talkField(sheet)).fill('Can I have a Greek keyboard?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const offer = sheet.getByRole('button', { name: 'Send this to the makers', exact: true });
  await expect(sheet.getByText(CANNOT.answer)).toBeVisible();
  await expectTappable(offer);
  expect(feedbacks(fake)).toHaveLength(0);
  await shot(page, 'send-to-makers-offer');
  await offer.click();
  await expect.poll(() => feedbacks(fake).length).toBe(1);
  expect(feedbacks(fake)[0].input).toMatchObject({ kind: 'tutor-ask', text: 'Can I have a Greek keyboard?', summary: 'He wants a Greek keyboard.', screen: 'Reader', reference: 'Romans 8:28' });
  expect(feedbacks(fake)[0].attachments).toHaveLength(1);
  await expect(sheet.locator('[data-feedback-offer]').getByText('Sent', { exact: true })).toBeVisible();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'send-to-makers-offer-sent');
});

test('on its side the Talk sheet still has no button for the makers, and a typed yes sends the offer', async ({ page }) => {
  const fake = await start(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet.getByRole('button', { name: 'Send to the makers', exact: true })).toHaveCount(0);
  await (await talkField(sheet)).fill('Can I have a Greek keyboard?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.getByRole('button', { name: 'Send this to the makers', exact: true })).toBeVisible();
  fake.autoReply = { status: 'answered', answer: { answer: 'Done: I have sent that to the makers.', words: [], offer_reply: 'confirm' } };
  await (await talkField(sheet)).fill('yes please do');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect.poll(() => feedbacks(fake).length).toBe(1);
  expect(feedbacks(fake)[0].input).toMatchObject({ kind: 'tutor-ask', summary: 'He wants a Greek keyboard.' });
  await expect(sheet.getByRole('button', { name: 'Send to the makers', exact: true })).toHaveCount(0);
  await shot(page, 'send-to-makers-talk-sideways-yes');
});
