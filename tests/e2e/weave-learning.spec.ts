import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

async function openReader(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

test('a learning word stands in Greek with its English in small grey beneath, the verse flow intact', async ({ page }) => {
  await openReader(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const group = page.getByRole('group', { name: 'Weave' });
  const option = group.getByRole('button', { name: '+ Learning', exact: true });
  const box = await option.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  const groupBox = await group.boundingBox();
  expect((groupBox?.x ?? 0) + (groupBox?.width ?? 0)).toBeLessThanOrEqual(390);
  await option.click();
  await expect(option).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-weave', 'solid+learning');

  // verse 18: "glory" is δόξα, lesson 10 of the seed, which he is still learning
  const verse = page.locator('[data-verse="18"]');
  await verse.scrollIntoViewIfNeeded();
  const learning = verse.locator('[data-woven][data-learning]', { has: page.locator('[data-hint]', { hasText: 'glory' }) });
  await expect(learning).toBeVisible();
  const greek = learning.locator('[data-greek]');
  const hint = learning.locator('[data-hint]');
  await expect(greek).toHaveText('δόξαν');
  await expect(hint).toHaveText('glory');

  const g = await greek.boundingBox();
  const h = await hint.boundingBox();
  // beneath the Greek, one line, small and grey
  expect(h!.y).toBeGreaterThanOrEqual(g!.y + g!.height - 2);
  const hintStyle = await hint.evaluate((el) => {
    const s = getComputedStyle(el);
    return { size: parseFloat(s.fontSize), lineHeight: parseFloat(s.lineHeight), color: s.color, family: s.fontFamily };
  });
  expect(h!.height).toBeLessThanOrEqual(hintStyle.lineHeight * 1.5);
  expect(hintStyle.size).toBeGreaterThanOrEqual(12);
  expect(hintStyle.size).toBeLessThan(await greek.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)));
  const greekColor = await greek.evaluate((el) => getComputedStyle(el).color);
  expect(hintStyle.color).not.toBe(greekColor);
  expect(await greek.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Gentium Plus');

  // the hint is under its Greek, centred on it, and the whole woven word is still a 44 px target
  expect(Math.abs(h!.x + h!.width / 2 - (g!.x + g!.width / 2))).toBeLessThanOrEqual(2);
  expect((await learning.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);

  // the verse flow is intact: the verse's other English is still there, and nothing runs off the screen
  const text = (await verse.locator('[data-text]').innerText()).replace(/\s+/g, ' ');
  expect(text).toContain('our present sufferings are not comparable');
  const vbox = await verse.boundingBox();
  expect(vbox!.x).toBeGreaterThanOrEqual(0);
  expect(vbox!.x + vbox!.width).toBeLessThanOrEqual(390);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  // a solid word of verse 1 has no hint
  await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
  await expect(page.locator('[data-verse="1"] [data-hint]')).toHaveCount(0);

  // tappable as any woven word
  await learning.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await verse.scrollIntoViewIfNeeded();
  await shot(page, 'weave-learning');
});
