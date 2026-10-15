import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Settings > English accent (mw-5r3p30.353): American | British | IPA (the standard), each a 44 px target that fits the screen, upright and sideways.
const TAP = 43.5;

const SIZES = [
  { name: '390x844', width: 390, height: 844 },
  { name: '844x390', width: 844, height: 390 },
];

async function expectFits(page: Page, width: number) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(clientWidth).toBe(width);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

for (const size of SIZES) {
  test(`the English accent setting has three 44 px choices and fits the screen at ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await openUnlocked(page);
    await page.goto('/#/settings');
    const group = page.getByRole('group', { name: 'English accent' });
    await group.scrollIntoViewIfNeeded();
    await expect(group).toBeVisible();
    for (const name of ['American', 'British', 'IPA (the standard)']) {
      const button = group.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box?.height, name).toBeGreaterThanOrEqual(TAP);
      expect(box?.width, name).toBeGreaterThanOrEqual(TAP);
      expect(box ? box.x + box.width : 0, name).toBeLessThanOrEqual(size.width);
    }
    await expect(group.getByRole('button', { name: 'American', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expectFits(page, size.width);

    await group.getByRole('button', { name: 'British', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('group', { name: 'English accent' }).getByRole('button', { name: 'British', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await shot(page, `english-accent-${size.name}`);
  });
}
