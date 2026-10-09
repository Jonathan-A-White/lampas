import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// 48 px is the floor for the picker's buttons (the Governor reads one-handed); a pixel of margin for sub-pixel layout.
const TAP = 47.5;

test('the picker lists the Old Testament before Matthew, and an Old Testament chapter is a Logos link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
  await expect(picker).toBeVisible();
  await expect(picker.locator('[data-ot-book]')).toHaveCount(39);
  await expect(picker.locator('[data-book]')).toHaveCount(27);
  await expect(picker.locator('[data-in-logos]')).toHaveCount(39);

  // The list opens at the book he is in (Romans); the Old Testament is above it, in the same box: scroll to the top for the shot.
  const box = page.getByTestId('chapter-picker-box');
  await box.evaluate((el) => (el.scrollTop = 0));
  await expect(picker.locator('[data-ot-book="gen"]')).toBeInViewport();
  const heights = await picker.locator('[data-ot-book]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  for (const height of heights) expect(height).toBeGreaterThanOrEqual(TAP);
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  await shot(page, 'old-testament-picker');

  // Logos is off to start with: the book says so and turns it on in one tap; the chapter is then a link that opens Logos.
  await picker.locator('[data-ot-book="psa"]').click();
  await expect(picker.getByText('Logos is off')).toBeVisible();
  await picker.getByRole('button', { name: 'Turn on Logos' }).click();
  await expect(picker.locator('[data-chapter]')).toHaveCount(150);
  await expect(picker.getByRole('link', { name: 'Chapter 23' })).toHaveAttribute('href', 'logosres:lgcystndrdbblsb;ref=Bible.Ps23');
  await shot(page, 'old-testament-psalms');
  await picker.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
});
