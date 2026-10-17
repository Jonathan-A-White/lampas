// tests/e2e/ipa-course.spec.ts — the optional course 'Learn the IPA sounds' (mw-5r3p30.356) at 390x844 with a touch screen: the Optional entry is reached by scrolling below the main path of the
// Goal screen, 'Why learn it?' fits and its Start and Not now are the same size, a sound's card and a drill question fit without the page scrolling sideways, and the answers are reachable.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

/** The page has no sideways scroll and nothing wider than the phone. */
async function fits(page: Page): Promise<void> {
  const wide = await page.evaluate(() => [...document.querySelectorAll('main *')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1).length);
  expect(wide).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('the Optional entry, Why learn it?, a card and a drill question fit the phone', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/goal');
  await expect(page.getByRole('heading', { name: 'Goal', level: 1 })).toBeVisible();
  const entry = page.getByTestId('ipa-entry');
  await entry.scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { name: 'Optional' })).toBeVisible();
  // below the main path, and reachable above the phone's bar
  const box = (await entry.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await shot(page, 'ipa-entry');

  await entry.tap();
  await expect(page.getByRole('heading', { name: 'Why learn it?' })).toBeVisible();
  await expect(page.getByText('You do not need this for Lampas or for reading Greek.')).toBeVisible();
  const start = (await page.getByTestId('ipa-start').boundingBox())!;
  const notNow = (await page.getByTestId('ipa-not-now').boundingBox())!;
  expect(start.width).toBe(notNow.width);
  expect(start.height).toBe(notNow.height);
  expect(start.height).toBeGreaterThanOrEqual(44);
  expect(start.y + start.height).toBeLessThanOrEqual(844);
  await fits(page);
  await shot(page, 'ipa-why');

  await page.getByTestId('ipa-start').tap();
  await expect(page.getByTestId('ipa-home')).toBeVisible();
  await fits(page);
  await shot(page, 'ipa-home');

  await page.locator('[data-testid=ipa-home] li[data-sound="/x/"] button').tap();
  await expect(page.getByTestId('ipa-card-symbol')).toHaveText('/x/');
  await expect(page.getByRole('button', { name: 'Hear it' })).toBeVisible();
  await fits(page);
  await shot(page, 'ipa-card');
  await page.getByRole('button', { name: '‹ Sounds' }).tap();
  await page.locator('[data-testid=ipa-home] li[data-sound="/ç/"] button').tap();
  await expect(page.getByTestId('ipa-card-symbol')).toHaveText('/ç/');
  await page.getByRole('button', { name: '‹ Sounds' }).tap();

  await page.getByTestId('ipa-drill').tap();
  await expect(page.getByTestId('ipa-question')).toBeVisible();
  const options = page.locator('[data-option]');
  await expect(options).toHaveCount(2);
  for (const o of await options.all()) {
    const b = (await o.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(844);
    expect(b.height).toBeGreaterThanOrEqual(44);
  }
  await fits(page);
  await options.first().tap();
  await expect(page.getByTestId('ipa-told')).toBeVisible();
  await expect(page.getByTestId('ipa-next')).toBeVisible();
  await shot(page, 'ipa-drill');
});
