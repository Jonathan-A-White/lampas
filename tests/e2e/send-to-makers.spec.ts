// tests/e2e/send-to-makers.spec.ts — 'Send to the makers' (mw-5r3p30.760) at the phone's 390 x 844: the action is on screen and a thumb can tap it in the Talk sheet and in the
// Verse view's Ask, with the words and a picture in the composer; the tap files one feedback grist and says Sent with the way to Your requests.
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

async function start(page: Page) {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
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
  expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
}

test('the Talk sheet: Send to the makers is on screen and sends his words and a picture', async ({ page }) => {
  const fake = await start(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  const action = sheet.getByRole('button', { name: 'Send to the makers', exact: true });
  // an empty sheet keeps all its room for the talk: the action shows once the composer holds something to send, a picture alone too
  await expect(action).toHaveCount(0);
  await pictureInput(sheet).setInputFiles(PICTURE);
  await expectTappable(action);
  await (await talkField(sheet)).fill('The Greek keyboard is missing');
  await expectTappable(action);
  await shot(page, 'send-to-makers-talk');
  await action.click();
  await expect(sheet.getByText('Sent to the makers. The answer will come back.')).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Your requests' })).toBeVisible();
  await expect.poll(() => fake.received.filter((g) => g.grist.kind === 'feedback').length).toBe(1);
  expect(fake.received[0].input).toMatchObject({ kind: 'tutor-ask', text: 'The Greek keyboard is missing', screen: 'Reader', reference: 'Romans 8:28' });
  expect(fake.received[0].attachments).toHaveLength(1);
  expect(fake.received.filter((g) => g.grist.kind === 'bible-talk')).toHaveLength(0);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'send-to-makers-talk-sent');
});

test("the Verse view's Ask: Attach a picture, Take a photo and Send to the makers are on screen, and the action sends", async ({ page }) => {
  const fake = await start(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  const composer = composerOf(page);
  await expect(composer.getByRole('button', { name: 'Attach a picture' })).toBeVisible();
  await expect(composer.getByRole('button', { name: 'Take a photo' })).toBeVisible();
  const action = view.getByRole('button', { name: 'Send to the makers', exact: true });
  await expectTappable(action);
  await view.locator('input[type="file"]:not([capture])').setInputFiles(PICTURE);
  await (await questionField(page)).fill('The Greek is too small here');
  await expectTappable(action);
  await shot(page, 'send-to-makers-ask');
  await action.click();
  await expect(view.getByText('Sent to the makers. The answer will come back.')).toBeVisible();
  await expect.poll(() => fake.received.filter((g) => g.grist.kind === 'feedback').length).toBe(1);
  expect(fake.received[0].input).toMatchObject({ kind: 'tutor-ask', text: 'The Greek is too small here', screen: 'Verse view', reference: 'Romans 8:1-11' });
  expect(fake.received[0].attachments).toHaveLength(1);
  expect(fake.received.filter((g) => g.grist.kind === 'verse-ask')).toHaveLength(0);
  await shot(page, 'send-to-makers-ask-sent');
});

test('the Talk sheet on its side: Send to the makers stands in the header, tappable, and Sent shows in the foot', async ({ page }) => {
  const fake = await start(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  const action = sheet.getByRole('button', { name: 'Send to the makers', exact: true });
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  const header = await sheet.getByRole('button', { name: 'Done' }).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(43.5);
  expect(Math.abs(box!.y - header!.y)).toBeLessThan(12);
  await (await talkField(sheet)).fill('The Greek keyboard is missing');
  await action.click();
  await expect(sheet.getByText('Sent to the makers. The answer will come back.')).toBeVisible();
  await expect.poll(() => fake.received.filter((g) => g.grist.kind === 'feedback').length).toBe(1);
  await shot(page, 'send-to-makers-talk-sideways');
});
