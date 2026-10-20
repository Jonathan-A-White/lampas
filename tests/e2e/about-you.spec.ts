// tests/e2e/about-you.spec.ts — About you (mw-1vuvq6.1) at phone width: Settings > About you, every control a thumb tall and inside the phone,
// what he fills in is still there after a reload, and Clear empties it. jsdom has no layout, so every size and place is proven here.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

async function insidePhone(target: Locator, minHeight = 47.5): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  const b = await target.boundingBox();
  if (!b) throw new Error('no box');
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.x + b.width).toBeLessThanOrEqual(VIEWPORT.width);
  expect(b.height).toBeGreaterThanOrEqual(minHeight);
}

async function noSideways(page: Page): Promise<void> {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test.use({ viewport: VIEWPORT });

test('Settings > About you keeps age, pace and ways of learning, and Clear empties them', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings?group=account');
  await page.getByRole('button', { name: 'About you' }).click();
  await expect(page.getByRole('heading', { name: 'About you', level: 1 })).toBeVisible();

  const age = page.getByRole('textbox', { name: 'Age', exact: true });
  await insidePhone(age);
  await age.fill('34');
  await page.getByRole('group', { name: 'Pace', exact: true }).getByRole('button', { name: 'Steady', exact: true }).click();
  const ways = page.getByRole('group', { name: 'Ways of learning' });
  await ways.getByRole('button', { name: 'Hearing', exact: true }).click();
  await ways.getByRole('button', { name: 'Doing', exact: true }).click();
  for (const name of ['Steady', 'Quick', 'Slow']) await insidePhone(page.getByRole('group', { name: 'Pace', exact: true }).getByRole('button', { name, exact: true }));
  for (const name of ['Hearing', 'Seeing', 'Reading', 'Doing']) await insidePhone(ways.getByRole('button', { name, exact: true }));
  await insidePhone(page.getByRole('textbox', { name: 'Background', exact: true }));
  await insidePhone(page.getByRole('textbox', { name: 'Why', exact: true }));
  await insidePhone(page.getByRole('button', { name: 'Clear', exact: true }));
  await noSideways(page);
  await page.locator('main.screen').evaluate((el) => el.scrollTo(0, 0));
  await shot(page, 'about-you');

  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Age', exact: true })).toHaveValue('34');
  await expect(page.getByRole('group', { name: 'Pace', exact: true }).getByRole('button', { name: 'Steady', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Ways of learning' }).getByRole('button', { name: 'Hearing', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('group', { name: 'Ways of learning' }).getByRole('button', { name: 'Seeing', exact: true })).toHaveAttribute('aria-pressed', 'false');

  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Age', exact: true })).toHaveValue('');
  await expect(page.getByRole('group', { name: 'Pace', exact: true }).getByRole('button', { pressed: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled();
});
