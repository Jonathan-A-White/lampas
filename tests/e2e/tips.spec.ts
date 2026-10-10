import { expect, test } from '@playwright/test';
import { makeFakePostern, TIP_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test('the tip chip opens a card that sits under the header, fits the phone, and Show me opens the screen', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TIP_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page, { tips: true });
  await page.goto('/');

  // the tip is a 'Tip' chip in the row under the header; a tap on it opens the card
  const chip = page.getByTestId('tip-chip');
  await expect(chip).toHaveText('Tip');
  await expect(page.getByTestId('tip-card')).toHaveCount(0);
  await chip.click();
  const card = page.getByTestId('tip-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Try Review');
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].grist.kind).toBe('tips');

  // Under the header, one-handed: thumb-sized buttons, the card inside the window, the page not wider than it.
  const header = await page.locator('header').first().boundingBox();
  const box = await card.boundingBox();
  expect(box && header && box.y).toBeGreaterThanOrEqual((header?.y ?? 0) + (header?.height ?? 0) - 1);
  expect(box?.x).toBeGreaterThanOrEqual(0);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.width ?? 390);
  for (const name of ['Show me', 'Not now']) {
    const b = await card.getByRole('button', { name }).boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(43.5);
    expect(b?.width).toBeGreaterThanOrEqual(43.5);
  }
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'tips');

  await card.getByRole('button', { name: 'Show me' }).click();
  await expect(page).toHaveURL(/#\/review/);
  await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
});

test('Not now puts the card away and a reload the same day brings nothing back', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TIP_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page, { tips: true });
  await page.goto('/');
  await page.getByTestId('tip-chip').click();
  await page.getByTestId('tip-card').getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByTestId('tip-card')).toHaveCount(0);
  await expect(page.getByTestId('tip-chip')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await expect(page.getByTestId('tip-card')).toHaveCount(0);
  await expect(page.getByTestId('tip-chip')).toHaveCount(0);
  expect(fake.received).toHaveLength(1);
});
