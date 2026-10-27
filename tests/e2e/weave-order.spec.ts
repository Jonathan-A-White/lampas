// The Weave's Order (mw-5r3p30.250): Settings > Weave > Order Greek lays the woven verse out in the Greek word order, and stays so after a reload.
import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { leaveSettings, openGroup } from './settings-group';

test.use({ viewport: { width: 390, height: 844 } });

test('Order Greek puts the Reader\'s first words in the Greek order, one line of two chips, and is kept across a reload', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  const verse1 = page.locator('[data-verse="1"] [data-text]');
  await expect(verse1).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Reading');
  // like Grammar, the Order row is drawn only while the Weave is not Off
  await expect(page.getByRole('group', { name: 'Order', exact: true })).toHaveCount(0);
  await page.getByRole('group', { name: 'Weave', exact: true }).getByRole('button', { name: 'Solid', exact: true }).click();
  await leaveSettings(page);
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-weave', 'solid');
  await expect(verse1).toHaveText(/^Therefore there is now no condemnation/);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Reading');
  const order = page.getByRole('group', { name: 'Order', exact: true });
  await expect(order).toBeVisible();
  await expect(order.locator('xpath=..')).toContainText('Order');
  await expect(order.getByRole('button', { name: 'English', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const box = await order.boundingBox();
  expect(box?.height).toBeLessThan(64);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  for (const chip of ['English', 'Original']) {
    const b = await order.getByRole('button', { name: chip, exact: true }).boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(47.5);
    expect(b?.width).toBeGreaterThanOrEqual(47.5);
  }
  await order.getByRole('button', { name: 'Original', exact: true }).click();
  await expect(order.getByRole('button', { name: 'Original', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'weave-order-settings');

  await leaveSettings(page);
  // Οὐδὲν ἄρα νῦν κατάκριμα: 'no' first, as the Greek has it
  await expect(verse1).toHaveText(/^no Therefore there is now condemnation for those who are ἐν χριστῷ Ἰησοῦ/);
  const woven = page.locator('[data-verse="1"] [data-woven]').first();
  await woven.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await shot(page, 'weave-order');

  await page.reload();
  await expect(verse1).toHaveText(/^no Therefore there is now condemnation/);
});
