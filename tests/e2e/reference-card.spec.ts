import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

// A Bible reference in the tutor's answer opens a card under it (mw-5r3p30.133, features/reference-card.feature) at a small phone's width.
const VIEWPORT = { width: 360, height: 740 };
const ANSWER = 'Compare Ps. 110 with Heb 7:1-3 and Romans 8:28; Melchizedek is the thread between them, and the letter to the Hebrews draws it out at length for its readers.';

test('a reference in the tutor\'s answer opens a card that fits a 360 px phone, does not cover the reference and Open goes there', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: ANSWER, words: [] } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Who is Melchizedek?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();

  const link = sheet.getByRole('link', { name: 'Heb 7:1-3', exact: true });
  await expect(link).toBeVisible();
  await expect(sheet.getByRole('link')).toHaveCount(3);
  const before = page.url();

  await link.click();
  const card = page.getByRole('dialog', { name: 'Hebrews 7:1-3' });
  await expect(card).toBeVisible();
  await expect(card.getByText('This Melchizedek was king of Salem')).toBeVisible();
  await expect(card.getByText('Majority Standard Bible', { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Open', exact: true })).toBeVisible();
  expect(page.url()).toBe(before);

  // It fits the screen and stands clear of the words tapped.
  const box = await card.boundingBox();
  const tapped = await link.boundingBox();
  expect(box && tapped).toBeTruthy();
  if (box && tapped) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
    const apart = box.y >= tapped.y + tapped.height - 0.5 || box.y + box.height <= tapped.y + 0.5;
    expect(apart, 'the card stands clear of the reference').toBe(true);
    const open = await card.getByRole('button', { name: 'Open', exact: true }).boundingBox();
    expect(open?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  }
  await shot(page, 'reference-card');

  // A tap outside closes it and nothing moves; so does Back.
  await page.mouse.click(VIEWPORT.width / 2, 8);
  await expect(card).toBeHidden();
  expect(page.url()).toBe(before);
  await expect(sheet).toBeVisible();
  await link.click();
  await expect(card).toBeVisible();
  await page.goBack();
  await expect(card).toBeHidden();
  await expect(sheet).toBeVisible();

  // A book Lampas has no text for.
  await sheet.getByRole('link', { name: 'Ps. 110', exact: true }).click();
  const psalm = page.getByRole('dialog', { name: 'Psalm 110' });
  await expect(psalm.getByText('Not in Lampas yet')).toBeVisible();
  await expect(psalm.getByRole('button', { name: 'Open', exact: true })).toHaveCount(0);
  await psalm.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(psalm).toBeHidden();

  // Open takes him to the verse and the card and the sheet are gone.
  await link.click();
  await card.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(card).toBeHidden();
  await expect(sheet).toBeHidden();
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  expect(page.url()).toContain('b=heb');
  expect(page.url()).toContain('c=7');
  expect(page.url()).toContain('v=1');
});
