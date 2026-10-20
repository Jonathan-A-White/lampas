import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('Works at phone width (mw-5r3p30.675): each work by its full title and author, a thumb-sized switch off to start with, kept across a reload', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  const list = page.getByRole('list', { name: 'Works in your Logos library' });
  await list.scrollIntoViewIfNeeded();
  const titles = ["Calvin's Commentaries", 'Institutes of the Christian Religion (Library of Christian Classics)', 'Institutes of the Christian Religion (Beveridge)'];
  for (const title of titles) {
    const item = list.getByRole('listitem').filter({ has: page.getByRole('switch', { name: title, exact: true }) });
    await expect(item).toContainText(title);
    await expect(item).toContainText('by John Calvin');
    const control = item.getByRole('switch', { name: title, exact: true });
    await expect(control).toHaveAttribute('aria-checked', 'false');
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    // the whole title is there to read, wrapped rather than cut, and the row stays inside the screen
    const row = await item.boundingBox();
    expect((row?.x ?? 0) + (row?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
    expect(await item.evaluate((li) => li.scrollWidth <= li.clientWidth)).toBe(true);
  }
  await list.getByRole('switch', { name: "Calvin's Commentaries", exact: true }).click();
  await expect(list.getByRole('switch', { name: "Calvin's Commentaries", exact: true })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await shot(page, 'settings-works');

  await page.reload();
  await expect(list.getByRole('switch', { name: "Calvin's Commentaries", exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(list.getByRole('switch', { name: 'Institutes of the Christian Religion (Beveridge)', exact: true })).toHaveAttribute('aria-checked', 'false');
});
