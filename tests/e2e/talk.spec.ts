import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

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

test('the Talk bar sits at the bottom of the reader and opens a sheet that fits the phone', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Verse 28', exact: true }).click();

  // The bar is the lowest thing on the screen, a thumb-sized button across its width.
  const talk = page.getByRole('button', { name: 'Talk', exact: true });
  await expect(talk).toBeInViewport();
  const bar = await talk.boundingBox();
  expect(bar?.height).toBeGreaterThanOrEqual(43.5);
  expect(bar?.width).toBeGreaterThan(300);
  // It rests just above the 48 px the navigation bar may cover (mw-5r3p30.42).
  expect((bar?.y ?? 0) + (bar?.height ?? 0)).toBeGreaterThan(VIEWPORT.height - 70);
  await expectFitsPhone(page);

  await talk.click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();
  const field = sheet.getByRole('textbox', { name: 'Your message' });
  const send = sheet.getByRole('button', { name: 'Send', exact: true });
  await expect(send).toBeDisabled();
  await field.fill('What does συνεργεῖ mean here?');
  await expect(send).toBeEnabled();

  // A thumb-sized button, and a field the phone does not zoom into (16 px or more).
  const sendBox = await send.boundingBox();
  expect(sendBox?.height).toBeGreaterThanOrEqual(43.5);
  expect(sendBox?.width).toBeGreaterThanOrEqual(43.5);
  expect(await field.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  await send.click();
  const turn = sheet.locator('[data-turn]');
  await expect(turn).toContainText(TALK_ANSWER.answer);
  const word = turn.getByRole('button', { name: 'συνεργεῖ', exact: true });
  await expect(word).toBeVisible();
  expect((await word.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].grist.kind).toBe('bible-talk');

  // The sheet is inside the window, its field and Send above the bottom edge, and the page has not moved.
  const box = await sheet.boundingBox();
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  expect((await send.boundingBox())?.y ?? 0).toBeGreaterThan(VIEWPORT.height / 2);
  await expectFitsPhone(page);
  await shot(page, 'talk-sheet');

  // The Greek word opens the word sheet on top; Done closes it and the Talk sheet is still there.
  await word.click();
  const wordSheet = page.getByRole('dialog', { name: 'Word' });
  await expect(wordSheet.getByTestId('sheet-lemma')).toHaveText('συνεργέω');
  await wordSheet.getByRole('button', { name: 'Done' }).click();
  await expect(wordSheet).toBeHidden();
  await expect(sheet).toBeVisible();

  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toBeHidden();
  await expectFitsPhone(page);
});

test('a setting asked for in the talk is applied at once, shown as Changed with a thumb-sized Undo, and Undo puts it back', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: { answer: 'Done: the Greek is read a little slower.', words: [], settings_changes: [{ key: 'greekRate', value: 0.8 }, { key: 'theme', value: 'dark' }] },
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Make the Greek slower, and dark');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(sheet.getByText('Changed: Greek speed 0.8x')).toBeVisible();
  await expect(sheet.getByText('Changed: Theme: Dark')).toBeVisible();
  expect(fake.received[0].input.settings).toMatchObject({ greekRate: 1, theme: 'phone' });
  // The dark theme is on the page already.
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const undo = sheet.getByRole('button', { name: 'Undo Greek speed' });
  const box = await undo.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  expect(box?.width).toBeGreaterThanOrEqual(43.5);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  await expectFitsPhone(page);
  await shot(page, 'talk-changed');

  await undo.click();
  await expect(sheet.getByText('Put back: Greek speed 1x')).toBeVisible();
  await expect(undo).toBeHidden();
  await sheet.getByRole('button', { name: 'Undo Theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'phone');
});
