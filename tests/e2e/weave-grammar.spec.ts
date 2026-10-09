import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test('Settings > Weave: a Words row and a Grammar row, each one line of three chips at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();

  const rows = [
    { group: page.getByRole('group', { name: 'Weave', exact: true }), chips: ['Off', 'Solid', '+ Learning'], label: 'Words' },
    { group: page.getByRole('group', { name: 'Grammar', exact: true }), chips: ['Any', 'Solid', '+ Frontier'], label: 'Grammar' },
  ];
  for (const { group, chips, label } of rows) {
    await expect(group).toBeVisible();
    const box = await group.boundingBox();
    // one chip tall: a wrapped third chip would make the group two chips (96 px and more) tall
    expect(box?.height).toBeLessThan(64);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
    await expect(group.locator('xpath=..')).toContainText(label);
    const tops: number[] = [];
    for (const chip of chips) {
      const button = group.getByRole('button', { name: chip, exact: true });
      await expect(button).toBeVisible();
      const b = await button.boundingBox();
      expect(b?.height).toBeGreaterThanOrEqual(47.5);
      expect(b?.width).toBeGreaterThanOrEqual(47.5);
      expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(390);
      tops.push(Math.round(b?.y ?? 0));
      expect(await button.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    }
    expect(new Set(tops).size).toBe(1);
  }

  const grammar = rows[1].group;
  await expect(grammar.getByRole('button', { name: 'Any', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await grammar.getByRole('button', { name: '+ Frontier', exact: true }).click();
  await expect(grammar.getByRole('button', { name: '+ Frontier', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await rows[0].group.getByRole('button', { name: '+ Learning', exact: true }).click();
  await expect(rows[0].group.getByRole('button', { name: '+ Learning', exact: true })).toHaveAttribute('aria-pressed', 'true');

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'weave-grammar');
});
