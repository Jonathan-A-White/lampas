import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// These specs measure a 390 px phone screen, so they pin it themselves: run under the 'chromium' project (a bare
// `npx playwright test <file>`) they would otherwise get Desktop Chrome's 1280 px and fail every width check.
test.use({ viewport: { width: 390, height: 844 } });

test('the reader header holds the chapter, English | Greek and the gear, in one row at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  const header = page.locator('header').first();
  const title = await header.getByRole('heading', { name: 'Romans 8', level: 1 }).boundingBox();
  const language = await header.getByRole('group', { name: 'Language' }).boundingBox();
  const gear = await header.getByRole('button', { name: 'Settings', exact: true }).boundingBox();
  const head = await header.boundingBox();
  if (!title || !language || !gear || !head) throw new Error('the header is missing a part');

  expect(gear.width).toBeGreaterThanOrEqual(43.5);
  expect(gear.height).toBeGreaterThanOrEqual(43.5);
  // left to right, no overlap, all inside the 390 px screen, and the title is not squeezed to nothing
  expect(title.x + title.width).toBeLessThanOrEqual(language.x + 0.5);
  expect(language.x + language.width).toBeLessThanOrEqual(gear.x + 0.5);
  expect(gear.x + gear.width).toBeLessThanOrEqual(390);
  expect(title.width).toBeGreaterThanOrEqual(90);
  // nothing else in the header, and no Weave switch or Words button in the reader's top
  expect(await page.getByRole('group', { name: 'Weave' }).count()).toBe(0);
  expect(await header.getByRole('button', { name: 'Words', exact: true }).count()).toBe(0);
  expect(head.height).toBeLessThanOrEqual(72);

  await page.screenshot({ path: 'shots/reader-header.png', clip: { x: 0, y: 0, width: 390, height: Math.ceil(head.y + head.height) + 8 } });
});

test('Settings at phone width: the weave, the voices, the Greek pronunciation, Words and About', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('#/settings');

  const solid = page.getByRole('group', { name: 'Weave' }).getByRole('button', { name: 'Solid', exact: true });
  await expect(solid).toBeVisible();
  for (const control of [
    solid,
    page.getByRole('combobox', { name: 'English voice' }),
    page.getByRole('combobox', { name: 'Greek voice' }),
    page.getByRole('radio', { name: 'Modern Greek' }),
    page.getByRole('button', { name: 'Words', exact: true }),
    page.getByRole('button', { name: 'About', exact: true }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
  }
  await expect(page.getByRole('radio', { name: 'Modern Greek' })).toBeChecked();
  const picker = page.getByRole('combobox', { name: 'Greek voice' });
  expect(await picker.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);

  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
  await shot(page, 'settings');

  await solid.click();
  await page.reload();
  await expect(solid).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-weave', 'solid');
  await expect(page.locator('[data-verse="1"] [data-woven]').first()).toBeVisible();
});

test('Settings at phone width: Read aloud span has its four choices in one row inside the screen, Chapter chosen', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const group = page.getByRole('group', { name: 'Read aloud span' });
  await expect(group).toBeVisible();
  const names = ['Verse', 'Passage', 'Chapter', 'Book'];
  for (const name of names) {
    const box = await group.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(390);
  }
  await expect(group.getByRole('button', { name: 'Chapter', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await group.getByRole('button', { name: 'Book', exact: true }).click();
  await expect(group.getByRole('button', { name: 'Book', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await group.scrollIntoViewIfNeeded();
  await shot(page, 'settings-read-span');
});
