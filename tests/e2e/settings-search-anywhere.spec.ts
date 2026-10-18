import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

/** One tap on the search entry, the words typed, and the first result tapped. */
async function searchFor(page: Page, words: string, result: string | RegExp): Promise<void> {
  await page.getByRole('button', { name: 'Search settings' }).click();
  const box = page.getByRole('dialog', { name: 'Search settings' }).getByRole('searchbox', { name: 'Search settings' });
  await expect(box).toBeFocused();
  await box.fill(words);
  await page.getByRole('dialog', { name: 'Search settings' }).getByRole('button', { name: result }).first().click();
}

test('from the Reader one tap opens the settings search, and the result lands on Settings at the highlighted row', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8');
  await expect(page.getByRole('button', { name: 'Search settings' })).toBeVisible();
  const entry = await page.getByRole('button', { name: 'Search settings' }).boundingBox();
  expect(entry?.width).toBeGreaterThanOrEqual(44);
  expect(entry?.height).toBeGreaterThanOrEqual(44);

  await searchFor(page, 'text size', /^Text size/);
  await expect(page).toHaveURL(/#\/settings\?setting=textSize$/);
  const row = page.locator('[data-setting="textSize"]');
  await expect(row).toHaveAttribute('data-highlighted', '');
  await expect(row).toBeInViewport();
  await expect(page.getByRole('dialog', { name: 'Search settings' })).toHaveCount(0);
  await shot(page, 'settings-search-from-reader');

  // a tap anywhere clears the mark
  await page.getByRole('heading', { name: 'Settings', level: 1 }).click();
  await expect(row).not.toHaveAttribute('data-highlighted', '');

  // Back is the Reader he started from
  await page.goBack();
  await expect(page).toHaveURL(/#\/\?b=rom&c=8/);
  await expect(page.getByRole('button', { name: 'Search settings' })).toBeVisible();
});

for (const [name, path] of [
  ['Review', '/#/review'],
  ['Words', '/#/words'],
  ['Goal', '/#/goal'],
] as const) {
  test(`from ${name} one tap opens the settings search, and Back from Settings returns to ${name}`, async ({ page }) => {
    await openUnlocked(page);
    await page.goto(path);
    await searchFor(page, 'text size', /^Text size/);
    await expect(page).toHaveURL(/#\/settings\?setting=textSize$/);
    await expect(page.locator('[data-setting="textSize"]')).toHaveAttribute('data-highlighted', '');
    await expect(page.locator('[data-setting="textSize"]')).toBeInViewport();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${path.slice(1).replace('/', '\\/')}$`));
    await expect(page.getByRole('button', { name: 'Search settings' })).toBeVisible();
  });
}

test('a result whose setting is hidden by one that is off lands on Settings saying what to turn on first', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/words');
  await searchFor(page, 'bible in logos', /^Bible in Logos/);
  await expect(page).toHaveURL(/#\/settings\?setting=logosBible$/);
  await expect(page.locator('[data-setting-needs]')).toContainText('Turn “Logos” on first');
  await expect(page.locator('[data-setting="resource.logos"]')).toBeVisible();
  await expect(page.locator('[data-setting="logosBible"]')).toHaveAttribute('data-highlighted', '');
});
