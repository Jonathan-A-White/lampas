// tests/e2e/hold-bar.spec.ts — Postern's hold-to-talk bar (src/cockpit/TalkLineScreen.tsx: h-24 w-full max-w-xl rounded-3xl,
// a mic over the label) is the one hold control of the Talk sheet, the reader's foot Talk bar and the reading check's
// whole-verse Read. Layout is only provable in a browser; phone width 360 x 740.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { GREEK_READING_ANSWER, makeFakePostern, READING_ANSWER, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 360, height: 740 };
/** Postern's bar: h-24 = 6 rem = 96 px (TalkLineScreen.tsx line 561) */
const POSTERN_BAR_HEIGHT = 96;

async function box(el: Locator) {
  const b = await el.boundingBox();
  if (!b) throw new Error('no box');
  return b;
}

async function fakeMicrophone(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const stream = { getTracks: () => [{ stop() {} }] };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => stream } });
    class FakeMediaRecorder {
      static isTypeSupported = () => true;
      mimeType = 'audio/webm';
      state = 'inactive';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.ondataavailable?.({ data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }) });
        this.onstop?.();
      }
    }
    Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: FakeMediaRecorder });
  });
}

test("the Talk sheet's hold-to-talk bar is the last control at the foot, the sheet's width, Postern's height", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Verse 28', exact: true }).click();
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();

  const bar = sheet.getByRole('button', { name: 'Hold to talk' });
  const barBox = await box(bar);
  const sheetBox = await box(sheet);
  expect(barBox.height).toBeGreaterThanOrEqual(POSTERN_BAR_HEIGHT - 0.5);
  // across the sheet, inside its 16 px padding (Postern's max-w-xl is wider than a phone)
  expect(barBox.width).toBeGreaterThanOrEqual(sheetBox.width - 2 * 16 - 1);
  expect(barBox.x + barBox.width).toBeLessThanOrEqual(VIEWPORT.width);

  // the last control: nothing in the sheet sits lower, and the field and Send are above it
  for (const control of await sheet.locator('button, textarea').all()) {
    if ((await control.getAttribute('data-hold-bar')) !== null) continue;
    if (!(await control.isVisible())) continue;
    const b = await box(control);
    expect(b.y + b.height).toBeLessThanOrEqual(barBox.y + 0.5);
  }
  const send = await box(sheet.getByRole('button', { name: 'Send', exact: true }));
  expect(send.y + send.height).toBeLessThanOrEqual(barBox.y + 0.5);
  expect(barBox.y + barBox.height).toBeLessThanOrEqual(VIEWPORT.height);
  // the field still takes typing
  const field = sheet.getByRole('textbox', { name: 'Your message' });
  expect((await box(field)).height).toBeGreaterThan(30);
  await shot(page, 'talk-sheet-hold-bar');
});

test("the reader's foot Talk bar is Postern's bar", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/');
  const talk = page.getByRole('button', { name: 'Talk', exact: true });
  await expect(talk).toBeInViewport();
  await expect(talk).toHaveAttribute('data-hold-bar', '');
  const b = await box(talk);
  expect(b.height).toBeGreaterThanOrEqual(POSTERN_BAR_HEIGHT - 0.5);
  expect(b.width).toBeGreaterThan(300);
  expect(b.y + b.height).toBeGreaterThan(VIEWPORT.height - 70);
  await shot(page, 'reader-talk-bar');
});

for (const [view, answer] of [['english', READING_ANSWER], ['greek', GREEK_READING_ANSWER]] as const) {
  test(`the reading check's Read and 'Read the whole verse again' are Postern's bar (${view})`, async ({ page }) => {
    await page.setViewportSize(VIEWPORT);
    const fake = makeFakePostern();
    fake.autoReply = { status: 'answered', answer };
    await routePostern(page, fake);
    await fakeMicrophone(page);
    await openUnlocked(page);
    await page.goto(view === 'greek' ? '/#/?c=8&view=greek' : '/');
    await page.getByRole('button', { name: 'Verse 28', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Reading check' });
    const read = panel.getByRole('button', { name: 'Read', exact: true });
    await expect(read).toHaveAttribute('data-hold-bar', '');
    expect((await box(read)).height).toBeGreaterThanOrEqual(POSTERN_BAR_HEIGHT - 0.5);

    const b = await box(read);
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1200);
    await page.mouse.up();
    await expect(panel.locator('[data-fix]').first()).toBeVisible();
    await panel.getByRole('button', { name: 'Read these again', exact: true }).click();
    const walk = panel.getByRole('group', { name: 'Read these again' });
    for (;;) {
      const next = walk.getByRole('button', { name: /^(Next word|On to the whole verse)$/ });
      const last = walk.getByRole('button', { name: 'Read the whole verse again', exact: true });
      if (await last.isVisible()) break;
      await next.click();
    }
    const again = walk.getByRole('button', { name: 'Read the whole verse again', exact: true });
    await expect(again).toHaveAttribute('data-hold-bar', '');
    await again.scrollIntoViewIfNeeded();
    expect((await box(again)).height).toBeGreaterThanOrEqual(POSTERN_BAR_HEIGHT - 0.5);
    if (view === 'english') await shot(page, 'read-whole-verse-bar');
  });
}
