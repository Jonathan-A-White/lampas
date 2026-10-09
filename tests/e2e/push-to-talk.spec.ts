import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

// headless Chromium has no microphone: bsv-kit's honest one (tests/support/honest-fakes.ts) opens a recogniser after a moment and
// sends the words of a recorded clip ("Please read me the first chapter") one by one as interim results while the bar is held, a
// final one at the clip's end. How a phone really hears is only a phone check (docs/pwa-best-practices.md section 12).
const SAID = 'Please read me the first chapter';
const installRecogniser = (page: Page) => honestMic(page);

test('holding Talk shows his words live in the sheet and sends them on release', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await installRecogniser(page);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  const talk = page.getByRole('button', { name: 'Talk', exact: true });
  const box = await talk.boundingBox();
  if (!box) throw new Error('no Talk button');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  await expect(sheet).toBeVisible();
  const live = sheet.locator('[data-talk-live]');
  await expect(live).toBeVisible();
  await expect(live).toContainText('Listening');
  // his words come as he says them
  await expect(live).toContainText('Please');

  // The live words, the mic button and Send are inside the window, a thumb tall, and the page has not moved.
  const hold = sheet.getByRole('button', { name: 'Hold to talk' });
  const holdBox = await hold.boundingBox();
  expect(holdBox?.height).toBeGreaterThanOrEqual(43.5);
  expect(holdBox?.width).toBeGreaterThanOrEqual(43.5);
  const sendBox = await sheet.getByRole('button', { name: 'Send', exact: true }).boundingBox();
  expect((sendBox?.x ?? 0) + (sendBox?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  const liveBox = await live.boundingBox();
  expect((liveBox?.x ?? 0) + (liveBox?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  expect((sendBox?.y ?? 0) + (sendBox?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
  expect(fake.received).toHaveLength(0);
  await shot(page, 'talk-listening');

  await expect(live).toContainText(SAID);
  await page.mouse.up();
  await expect(sheet.locator('[data-turn]')).toContainText(TALK_ANSWER.answer);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input.question).toBe(SAID);
  await expect(live).toHaveCount(0);
});

test('a long press on a verse number talks about that verse, and a tap on it opens its Verse view', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await installRecogniser(page);
  await openUnlocked(page);
  await page.goto('/');
  const number = page.getByRole('button', { name: 'Verse 28', exact: true });
  await number.scrollIntoViewIfNeeded();
  await number.click();
  await expect(number).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expect(number).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  const box = await number.boundingBox();
  if (!box) throw new Error('no verse number');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet.locator('[data-talk-live]')).toBeVisible();
  await expect(sheet.locator('[data-talk-live]')).toContainText(SAID);
  await page.mouse.up();
  await expect(sheet.locator('[data-turn]')).toContainText(TALK_ANSWER.answer);
  expect(fake.received[0].input.reference).toBe('Romans 8:28');
  await expect(number).toHaveAttribute('aria-pressed', 'false');
});
