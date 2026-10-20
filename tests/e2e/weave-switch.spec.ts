// The Reader's switch English | Weave | Greek (mw-5r3p30.651): with the Weave on, English is plain English, Weave the woven English and Greek the Greek;
// a long press on Weave flips the woven text between the English and the Greek word order and says which in a toast, and the order survives a reload.
// With the Weave Off the switch is English | Greek. At 390x844 and 844x390.
import { expect, test, type Page } from '@playwright/test';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const SIZES = [
  { name: 'upright', size: { width: 390, height: 844 } },
  { name: 'sideways', size: { width: 844, height: 390 } },
];

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language' }).getByRole('button', { name, exact: true });

for (const { name, size } of SIZES) {
  test(`the switch is English | Weave | Greek and a long press on Weave flips the word order, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await page.goto('/#/?b=rom&c=8&weave=solid');
    const verse1 = page.locator('[data-verse="1"] [data-text]');
    await expect(verse1).toBeVisible();

    // the Weave is on: three choices, Weave chosen, the Greek of his words in the English
    const group = page.getByRole('group', { name: 'Language' });
    await expect(group.getByRole('button')).toHaveText(['English', 'Weave', 'Greek']);
    await expect(choice(page, 'Weave')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
    await expect(verse1).toHaveText(/^Therefore there is now no condemnation/);
    const box = await group.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 0.5);
    for (const label of ['English', 'Weave', 'Greek']) {
      const b = await choice(page, label).boundingBox();
      expect(b!.height).toBeGreaterThanOrEqual(43.5);
      expect(b!.width).toBeGreaterThanOrEqual(43.5);
    }
    await shot(page, `weave-switch-weave-${name}`);

    // English is plain English
    await choice(page, 'English').click();
    await expect(choice(page, 'English')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-verse="1"] [data-woven]')).toHaveCount(0);
    await expect(verse1).toHaveText(/^Therefore there is now no condemnation/);
    await shot(page, `weave-switch-english-${name}`);

    // Greek is the Greek
    await choice(page, 'Greek').click();
    await expect(choice(page, 'Greek')).toHaveAttribute('aria-pressed', 'true');
    await expect(verse1).toHaveText(/^Οὐδὲν ἄρα νῦν/);

    // Weave brings the woven text back; a long press on it flips to the Greek word order and says so
    await choice(page, 'Weave').click();
    await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
    await holdFor(page, choice(page, 'Weave'), 700);
    const toast = page.getByRole('status').filter({ hasText: 'Greek word order' });
    await expect(toast).toBeVisible();
    const toastBox = await toast.boundingBox();
    expect(toastBox!.x).toBeGreaterThanOrEqual(0);
    expect(toastBox!.x + toastBox!.width).toBeLessThanOrEqual(size.width + 0.5);
    await expect(verse1).toHaveText(/^no Therefore there is now condemnation/);
    await expect(choice(page, 'Weave')).toHaveAttribute('aria-pressed', 'true');
    await shot(page, `weave-switch-greek-order-${name}`);
    await page.clock.runFor(3000);
    await expect(toast).toHaveCount(0);

    // the order is kept across a reload; a second long press puts the English order back
    await page.reload();
    await expect(verse1).toHaveText(/^no Therefore there is now condemnation/);
    await holdFor(page, choice(page, 'Weave'), 700);
    await expect(page.getByRole('status').filter({ hasText: 'English word order' })).toBeVisible();
    await expect(verse1).toHaveText(/^Therefore there is now no condemnation/);
  });

  test(`plain English is kept across a reload, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await page.goto('/#/?b=rom&c=8&weave=solid');
    await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
    await choice(page, 'English').click();
    await expect(page.locator('[data-verse="1"] [data-woven]')).toHaveCount(0);
    await page.reload();
    await expect(choice(page, 'English')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-verse="1"] [data-woven]')).toHaveCount(0);
  });

  test(`with the Weave off the switch is English | Greek, ${name}`, async ({ page }) => {
    await page.setViewportSize(size);
    await openUnlocked(page);
    await page.goto('/#/?b=rom&c=8&weave=off');
    await expect(page.locator('[data-verse="1"] [data-text]')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Language' }).getByRole('button')).toHaveText(['English', 'Greek']);
    await shot(page, `weave-switch-off-${name}`);
  });
}
