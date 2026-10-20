// tests/e2e/sheets-landscape.spec.ts — every sheet sideways keeps its main content at least half the sheet's height (mw-5r3p30.450's sweep): at 844x390 the box a
// sheet scrolls its text in is at least half as tall as the sheet, so the slider, the buttons and the bars it keeps beside or under it never take the sheet.
// The idea sheet has its own spec (tests/e2e/idea-sheet-landscape.spec.ts).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

/** The share of the sheet's height that its tallest scrolling box takes (the sheet itself when nothing inside it scrolls). */
async function mainShare(dialog: Locator): Promise<number> {
  return dialog.evaluate((el) => {
    const boxes = [el, ...Array.from(el.querySelectorAll<HTMLElement>('*'))].filter((node) => {
      const overflow = getComputedStyle(node).overflowY;
      return overflow === 'auto' || overflow === 'scroll';
    });
    const tallest = boxes.reduce((most, node) => Math.max(most, node.getBoundingClientRect().height), 0);
    return tallest / el.getBoundingClientRect().height;
  });
}

async function openReader(page: Page): Promise<void> {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="2"]')).toBeVisible();
}

test('the word sheet keeps its text over half its height', async ({ page }) => {
  await openReader(page);
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();
  expect(await mainShare(sheet)).toBeGreaterThanOrEqual(0.5);
  await shot(page, 'sheets-landscape-word');
});

test('the grammar sheet keeps its text over half its height', async ({ page }) => {
  await openReader(page);
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Grammar', exact: true });
  await expect(sheet).toBeVisible();
  expect(await mainShare(sheet)).toBeGreaterThanOrEqual(0.5);
});

test('the Talk sheet keeps its conversation over half its height', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openReader(page);
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();
  expect(await mainShare(sheet)).toBeGreaterThanOrEqual(0.5);
});

test('the chapter picker keeps its list over half its height', async ({ page }) => {
  await openReader(page);
  await page.getByRole('button', { name: /^Romans 8/ }).first().click();
  const sheet = page.getByRole('dialog').last();
  await expect(sheet).toBeVisible();
  expect(await mainShare(sheet)).toBeGreaterThanOrEqual(0.5);
});
