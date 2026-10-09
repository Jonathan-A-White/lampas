import { expect, test, type Page } from '@playwright/test';
import { GREEK_READING_ANSWER, INCOMPLETE_ANSWER, makeFakePostern, READING_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };

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

// The Chromium of the gate has no microphone: a stream and a MediaRecorder stand in, enough for the recorder to run.
async function fakeMicrophone(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const stream = { getTracks: () => [{ stop() {} }] };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
    class FakeMediaRecorder {
      static isTypeSupported = (mime: string) => mime === 'audio/webm;codecs=opus';
      mimeType = 'audio/webm;codecs=opus';
      state = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob([new Uint8Array(2000)], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });
  });
}

async function holdFor(page: Page, button: ReturnType<Page['getByRole']>, ms: number): Promise<void> {
  const box = await button.boundingBox();
  if (!box) throw new Error('the button is not on the page');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

test('holding the bar of Read it aloud on verse 28 sends the reading and marks the words to fix, at phone width', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: READING_ANSWER };
  await routePostern(page, fake);
  await fakeMicrophone(page);
  await openUnlocked(page);
  await page.goto('/');
  await chooseAction(page, 28, 'Read it aloud');

  const panel = page.getByRole('region', { name: 'Reading check' });
  const read = page.getByRole('button', { name: 'Hold to read verse 28', exact: true });
  await expect(panel).toBeInViewport();
  const readBox = await read.boundingBox();
  expect(readBox?.height).toBeGreaterThanOrEqual(43.5);
  expect(readBox?.width).toBeGreaterThanOrEqual(43.5);
  // the one hold bar of the Verse view, across the width of the phone
  expect(readBox?.height).toBeGreaterThanOrEqual(95.5);
  expect(readBox?.width).toBeGreaterThan(300);
  await expect(page.locator('[data-hold-bar]')).toHaveCount(1);

  // a quick press is only a tap
  await holdFor(page, read, 100);
  await expect(panel).toContainText('Hold while you read');
  expect(fake.received).toHaveLength(0);

  // under about a second is too short for a verse: nothing is sent
  await holdFor(page, read, 700);
  await expect(panel).toContainText('Hold the bar for the whole verse');
  expect(fake.received).toHaveLength(0);

  await holdFor(page, read, 1200);
  await expect(panel.locator('[data-fix]')).toHaveText(['together', 'purpose']);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].grist.kind).toBe('verse-read');
  expect(fake.received[0].attachments).toHaveLength(1);
  expect(fake.received[0].attachments[0].mime).toBe('audio/webm');

  const together = panel.getByRole('button', { name: 'together', exact: true });
  expect((await together.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  // each flagged word has a speaker right beside it, a thumb-sized button on the same line
  const wordBox = await together.boundingBox();
  const speakerBox = await panel.getByRole('button', { name: 'Hear together', exact: true }).boundingBox();
  expect(speakerBox?.width).toBeGreaterThanOrEqual(43.5);
  expect(speakerBox?.height).toBeGreaterThanOrEqual(43.5);
  expect(Math.abs((speakerBox?.y ?? 0) + (speakerBox?.height ?? 0) / 2 - ((wordBox?.y ?? 0) + (wordBox?.height ?? 0) / 2))).toBeLessThan(wordBox?.height ?? 0);
  expect(Math.abs((speakerBox?.x ?? 0) - ((wordBox?.x ?? 0) + (wordBox?.width ?? 0)))).toBeLessThan(8);
  await together.click();
  await expect(panel.locator('[data-fix-detail] [data-chunks]')).toHaveText('to · geth · er');
  await expectFitsPhone(page);
  await panel.locator('[data-fix-detail]').scrollIntoViewIfNeeded();
  await shot(page, 'reading-check');

  await panel.getByRole('button', { name: 'Read these again', exact: true }).click();
  const walk = panel.getByRole('group', { name: 'Read these again' });
  await expect(walk).toContainText('Word 1 of 2');
  await walk.getByRole('button', { name: 'Next word', exact: true }).click();
  await expect(walk).toContainText('Word 2 of 2');
  await walk.getByRole('button', { name: 'On to the whole verse', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hold to read the whole verse again', exact: true })).toBeVisible();
  await expectFitsPhone(page);
});

test('holding the bar of Read it aloud in the Greek view sends the Greek, marks Greek words and shows their syllables, at phone width', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GREEK_READING_ANSWER };
  await routePostern(page, fake);
  await fakeMicrophone(page);
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=greek');
  await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  const read = page.getByRole('button', { name: 'Hold to read verse 28', exact: true });
  await expect(panel).toBeInViewport();
  const readBox = await read.boundingBox();
  expect(readBox?.height).toBeGreaterThanOrEqual(43.5);
  expect(readBox?.width).toBeGreaterThanOrEqual(43.5);
  // the one hold bar of the Verse view, across the width of the phone
  expect(readBox?.height).toBeGreaterThanOrEqual(95.5);
  expect(readBox?.width).toBeGreaterThan(300);
  await expect(page.locator('[data-hold-bar]')).toHaveCount(1);

  await holdFor(page, read, 1200);
  await expect(panel.locator('[data-fix]')).toHaveText(['συνεργεῖ', 'πρόθεσιν']);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input).toMatchObject({ reference: 'Romans 8:28', lang: 'el' });
  expect(String(fake.received[0].input.target_text)).toContain('συνεργεῖ');

  // the verse above has tappable words of the same names: the marked word is the one with [data-fix]
  const word = panel.locator('[data-fix]').filter({ hasText: /^συνεργεῖ$/ });
  expect((await word.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await word.click();
  await expect(panel.locator('[data-fix-detail] [data-chunks]')).toHaveText('συν · ερ · γεῖ');
  await expect(panel.locator('[data-fix-detail] [data-chunks]')).toHaveAttribute('lang', 'grc');
  await expect(panel.locator('[data-fix-detail]').getByRole('button', { name: 'Hear it', exact: true })).toBeVisible();
  await expectFitsPhone(page);
  await panel.locator('[data-fix-detail]').scrollIntoViewIfNeeded();
  await shot(page, 'reading-check-greek');

  await panel.getByRole('button', { name: 'Read these again', exact: true }).click();
  const walk = panel.getByRole('group', { name: 'Read these again' });
  await expect(walk).toContainText('Word 1 of 2');
  await expect(walk.locator('[data-walk-word]')).toHaveText('συνεργεῖ');
  await walk.getByRole('button', { name: 'Next word', exact: true }).click();
  await walk.getByRole('button', { name: 'On to the whole verse', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hold to read the whole verse again', exact: true })).toBeVisible();
  await expectFitsPhone(page);
});

test('a reading of only the first words is headed Read the whole verse, not Well read, at phone width', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: INCOMPLETE_ANSWER };
  await routePostern(page, fake);
  await fakeMicrophone(page);
  await openUnlocked(page);
  await page.goto('/');
  await chooseAction(page, 28, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 28', exact: true }), 1200);
  const result = panel.locator('[data-reading-result="incomplete"]');
  await expect(result.getByRole('heading', { name: 'Read the whole verse', exact: true })).toBeVisible();
  await expect(result).toContainText('I heard');
  await expect(panel).not.toContainText('Well read');
  await expectFitsPhone(page);
  await result.scrollIntoViewIfNeeded();
  await shot(page, 'reading-check-incomplete');
});
