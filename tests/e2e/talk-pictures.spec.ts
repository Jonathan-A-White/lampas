// tests/e2e/talk-pictures.spec.ts — the Talk sheet takes pictures (mw-y3qno5.1) at the phone's width, 390 px: attach, paste and remove in the composer, the
// picture cut down by the real canvas and sent as the grist's attachment, the thumbnail in his turn (a thumb-sized tap), the full-screen view and Back.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };
const ENTRY = readFileSync('grinds/examples/bible-talk/lexicon-entry.png');

const ANSWER = {
  answer: 'This is a lexicon entry for δακρύω, "to weep". It is the word John uses when Jesus wept.',
  words: [],
};

async function open(page: Page) {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();
  return { fake, sheet };
}

/** A picture as the phone's canvas draws it, `width` x `height` px, pasted as a copied screenshot would be. */
async function pasteScreenshot(field: Locator, width: number, height: number): Promise<void> {
  await field.evaluate(async (el, size) => {
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    context.fillStyle = '#fff';
    context.fillRect(0, 0, size.width, size.height);
    context.fillStyle = '#123';
    context.font = '96px serif';
    context.fillText('δακρύω — to weep', 60, 200);
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/png'));
    const data = new DataTransfer();
    data.items.add(new File([blob], 'screenshot.png', { type: 'image/png' }));
    el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  }, { width, height });
}

test('a picture attached to the talk waits in the composer, goes with the message, and shows as a thumbnail he can open', async ({ page }) => {
  const { fake, sheet } = await open(page);

  // the two buttons are thumb-sized and the composer fits the phone
  for (const name of ['Attach a picture', 'Take a photo']) {
    const box = await sheet.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
  }
  await sheet.getByLabel('Picture file').setInputFiles({ name: 'lexicon-entry.png', mimeType: 'image/png', buffer: ENTRY });

  // the thumbnail waits in the composer with a remove x of a thumb's size
  const waiting = sheet.getByRole('group', { name: 'Pictures to send' }).getByRole('img', { name: 'Picture 1' });
  await expect(waiting).toBeVisible();
  const remove = sheet.getByRole('button', { name: 'Remove picture 1', exact: true });
  const removeBox = await remove.boundingBox();
  expect(removeBox?.width).toBeGreaterThanOrEqual(43.5);
  expect(removeBox?.height).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'talk-pictures-composer');

  // a pasted 3000 x 2000 screenshot is a second picture; removing it leaves the first
  await pasteScreenshot(sheet.getByRole('textbox', { name: 'Your message' }), 3000, 2000);
  await expect(sheet.getByRole('group', { name: 'Pictures to send' }).getByRole('img')).toHaveCount(2);
  await sheet.getByRole('button', { name: 'Remove picture 2', exact: true }).click();
  await expect(sheet.getByRole('group', { name: 'Pictures to send' }).getByRole('img')).toHaveCount(1);

  await sheet.getByRole('textbox', { name: 'Your message' }).fill('What does this entry say about Jesus weeping?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  // his turn carries the thumbnail, a thumb-sized button, and the composer is empty again
  const turn = sheet.locator('[data-turn]');
  await expect(turn).toContainText('lexicon entry');
  const thumb = turn.getByRole('button', { name: 'Picture 1', exact: true });
  await expect(thumb).toBeVisible();
  const thumbBox = await thumb.boundingBox();
  expect(thumbBox?.width).toBeGreaterThanOrEqual(43.5);
  expect(thumbBox?.height).toBeGreaterThanOrEqual(43.5);
  await expect(sheet.getByRole('group', { name: 'Pictures to send' })).toHaveCount(0);

  // the grist: one picture attached, a real JPEG under the grind's limit
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input.pictures).toBe(1);
  expect(fake.received[0].attachments).toHaveLength(1);
  expect(fake.received[0].attachments[0].mime).toBe('image/jpeg');
  expect(fake.received[0].attachments[0].size).toBeLessThanOrEqual(1024 * 1024);

  // the Greek word the tutor quotes is a word to tap, thumb-sized
  const word = turn.locator('[data-answer-text]').getByRole('button', { name: 'δακρύω', exact: true });
  await expect(word).toBeVisible();
  expect((await word.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'talk-pictures-turn');

  // a tap opens the picture full screen; Back closes it and the talk is still there
  await thumb.click();
  const viewer = page.getByRole('dialog', { name: 'Picture 1' });
  await expect(viewer).toBeVisible();
  const picture = await viewer.getByRole('img', { name: 'Picture 1' }).boundingBox();
  expect(picture?.x).toBeGreaterThanOrEqual(0);
  expect((picture?.x ?? 0) + (picture?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  expect((picture?.y ?? 0) + (picture?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  await shot(page, 'talk-pictures-full-screen');
  await page.goBack();
  await expect(viewer).toBeHidden();
  await expect(sheet).toBeVisible();

  // the page never scrolled or grew wider than the window
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
