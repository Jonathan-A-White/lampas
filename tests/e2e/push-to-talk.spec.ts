import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

// headless Chromium has no microphone: a stand-in recogniser the test drives by hand. How a phone really hears is only a
// phone check (docs/pwa-best-practices.md section 12).
async function installRecogniser(page: Page) {
  await page.addInitScript(() => {
    class Recognizer {
      lang = '';
      continuous = false;
      interimResults = false;
      processLocally = false;
      onstart: (() => void) | null = null;
      onaudiostart: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      constructor() {
        (window as unknown as { __rec: Recognizer }).__rec = this;
      }
      start() {
        setTimeout(() => this.onstart?.(), 0);
      }
      stop() {
        setTimeout(() => this.onend?.(), 0);
      }
      abort() {
        setTimeout(() => this.onend?.(), 0);
      }
    }
    Object.defineProperty(window, 'SpeechRecognition', { value: Recognizer, configurable: true });
    (window as unknown as { __say: (t: string) => void }).__say = (text) =>
      (window as unknown as { __rec: Recognizer }).__rec.onresult?.({ resultIndex: 0, results: [{ isFinal: false, length: 1, 0: { transcript: text } }] });
  });
}

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
  await page.evaluate(() => (window as unknown as { __say: (t: string) => void }).__say('What is this chapter about'));
  await expect(live).toContainText('What is this chapter about');
  await expect(live).toContainText('Listening');

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

  await page.mouse.up();
  await expect(sheet.locator('[data-turn]')).toContainText(TALK_ANSWER.answer);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input.question).toBe('What is this chapter about');
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
  await page.evaluate(() => (window as unknown as { __say: (t: string) => void }).__say('Why does Paul say all things'));
  await page.mouse.up();
  await expect(sheet.locator('[data-turn]')).toContainText(TALK_ANSWER.answer);
  expect(fake.received[0].input.reference).toBe('Romans 8:28');
  await expect(number).toHaveAttribute('aria-pressed', 'false');
});
