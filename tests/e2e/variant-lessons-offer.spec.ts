// The offer of the lessons on variant readings (mw-9ji6ek0.19) at 390x844: on a fresh phone the first tap of the variants chip on Revelation 3 turns Variants On and a quiet card
// under the chips row offers the five lessons ('Read the lessons', 'Not now', and where they are found); Not now puts it away, turns Offer the lessons Off and a reload shows no card;
// Settings > Reading > Variants shows 'Offer the lessons' (Off now) and the 'Lessons on variant readings' row, which opens them; turning Offer the lessons On shows the card once more;
// Read the lessons opens the lessons and puts the card away for good. Ends with a shot of the card.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const chip = (page: Page) => page.getByRole('button', { name: /^Variants,/ });
const card = (page: Page) => page.getByTestId('variant-lessons-offer');
const offer = (page: Page) => page.getByRole('group', { name: 'Offer the lessons', exact: true });

test('the card offers the lessons when Variants first goes On; Not now turns the offer Off, Settings has both rows and On brings the card back', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=3');
  await expect(page.locator('[data-verse="3"] [data-text]')).toBeVisible();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(card(page)).toHaveCount(0);

  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toContainText('New to variant readings? Five short lessons explain them.');
  await expect(card(page)).toContainText('You can find them in Settings > Reading > Variants.');
  for (const name of ['Read the lessons', 'Not now']) {
    const box = await card(page).getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  }
  const frame = await card(page).boundingBox();
  const row = await page.getByTestId('reader-chips').boundingBox();
  expect(frame && row && frame.y >= row.y + row.height - 1 && frame.x >= 0 && frame.x + frame.width <= 390).toBe(true);
  await shot(page, 'variant-lessons-offer');

  await card(page).getByRole('button', { name: 'Not now', exact: true }).click();
  await expect(card(page)).toHaveCount(0);
  await page.reload();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page)).toHaveCount(0);

  await page.goto('/#/settings?group=reading');
  await expect(offer(page)).toBeVisible();
  await expect(offer(page).getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const way = page.getByRole('button', { name: 'Lessons on variant readings', exact: true });
  await expect(way).toBeVisible();
  expect((await way.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(47.5);

  await offer(page).getByRole('button', { name: 'On', exact: true }).click();
  await expect(offer(page).getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/#/?b=rev&c=3');
  await expect(card(page)).toBeVisible();

  await card(page).getByRole('button', { name: 'Read the lessons', exact: true }).click();
  await expect(page).toHaveURL(/#\/lessons\/variants$/);
  await expect(page.getByRole('heading', { name: 'Lessons on variant readings', exact: true, level: 1 })).toBeVisible();
  await page.goto('/#/?b=rev&c=3');
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page)).toHaveCount(0);
});

test('with Offer the lessons Off the chip turns Variants On and no card shows; the Lessons row opens the lessons even with Variants Off', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=reading');
  await offer(page).getByRole('button', { name: 'Off', exact: true }).click();
  await expect(offer(page).getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Variants', exact: true }).getByRole('button', { name: 'Off', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Lessons on variant readings', exact: true }).click();
  await expect(page).toHaveURL(/#\/lessons\/variants$/);
  await page.goto('/#/?b=rev&c=3');
  await expect(page.locator('[data-verse="3"] [data-text]')).toBeVisible();
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page)).toHaveCount(0);
});
