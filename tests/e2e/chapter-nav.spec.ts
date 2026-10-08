import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// 48 px is the floor for a button (the Governor reads one-handed); a pixel of margin for sub-pixel layout.
const TAP = 47.5;

test('the foot of 1 John 1 offers 1 John 2, which opens from the top and is kept on reload', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=1');
  await expect(page.getByRole('heading', { name: '1 John 1', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="10"]')).toBeVisible();
  await page.locator('[data-reader]').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const nav = page.getByRole('navigation', { name: 'Chapters' });
  const next = nav.getByRole('button', { name: '1 John 2 ›' });
  await expect(next).toBeInViewport();
  await expect(nav.getByRole('button', { name: '‹ 2 Peter 3' })).toBeInViewport();
  for (const button of await nav.getByRole('button').all()) expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(TAP);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'chapter-nav-foot');

  await next.click();
  await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  expect(await page.locator('[data-reader]').evaluate((el) => el.scrollTop)).toBe(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();

  await page.locator('[data-reader]').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await page.getByRole('navigation', { name: 'Chapters' }).getByRole('button', { name: '‹ 1 John 1' }).click();
  await expect(page.getByRole('heading', { name: '1 John 1', level: 1 })).toBeVisible();
});

test('Romans 16 goes on to 1 Corinthians 1; Matthew 1 and Revelation 22 stop', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=16');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('navigation', { name: 'Chapters' }).getByRole('button', { name: '1 Corinthians 1 ›' }).click();
  await expect(page.getByRole('heading', { name: '1 Corinthians 1', level: 1 })).toBeVisible();
  await page.goto('/#/?b=mat&c=1');
  await expect(page.getByRole('heading', { name: 'Matthew 1', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /^‹/ })).toHaveCount(0);
  await page.goto('/#/?b=rev&c=22');
  await expect(page.getByRole('heading', { name: 'Revelation 22', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Chapters' }).getByRole('button', { name: '‹ Revelation 21' })).toBeVisible();
  await expect(page.getByRole('button', { name: /›$/ })).toHaveCount(0);
});
