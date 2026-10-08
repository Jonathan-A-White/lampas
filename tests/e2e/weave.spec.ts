import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

async function openReader(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

test('the Weave switch swaps his solid words for Greek, big and tappable, at phone width', async ({ page }) => {
  await openReader(page);
  const group = page.getByRole('group', { name: 'Weave' });
  await expect(group).toBeVisible();
  for (const label of ['Off', 'Solid words']) {
    const box = await group.getByRole('button', { name: label, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
  }
  await group.getByRole('button', { name: 'Solid words', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-weave', 'solid');

  const woven = page.locator('[data-verse="1"] [data-woven]');
  await expect(woven.first()).toBeVisible();
  await expect(page.locator('[data-verse="1"] [data-text]')).toContainText('ἐν χριστῷ Ἰησοῦ');
  const box = await woven.first().boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  const family = await woven.first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toContain('Gentium Plus');
  const size = await woven.first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(size).toBeGreaterThanOrEqual(26);

  const count = await page.locator('[data-woven]').count();
  await expect(page.getByTestId('weave-count')).toHaveText(`${count} words in Greek`);

  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);

  await woven.first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await shot(page, 'weave');
});
