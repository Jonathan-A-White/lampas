import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The page never scrolls and never grows wider than the window.
async function expectFitsPhone(page: import('@playwright/test').Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

test('the Words screen lists the seeded words by lesson at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Words', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();
  await expect(page.getByTestId('word-counts')).toHaveText('54 solid, 9 learning');
  await expect(page.getByRole('heading', { name: 'Lesson 1', level: 2, exact: true })).toBeVisible();

  const row = page.locator('[data-lemma]').first();
  const box = await row.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(48);
  await expectFitsPhone(page);

  await shot(page, 'words');
});

test('the Import screen previews a pasted list and keeps Add in reach at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/import');
  await expect(page.getByRole('heading', { name: 'Import', level: 1 })).toBeVisible();
  await page.getByRole('textbox').fill('ἀνάστασις — resurrection\nπνεῦμα, spirit\nspirit');
  await expect(page.getByTestId('import-summary')).toHaveText('2 words to add');

  const add = page.getByRole('button', { name: 'Add 2 words' });
  await expect(add).toBeVisible();
  const box = await add.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844);
  expect(box?.height).toBeGreaterThanOrEqual(48);
  await expectFitsPhone(page);

  await shot(page, 'import');
});

for (const scheme of ['light', 'dark'] as const) {
  test(`a Words card shows its memory picture, clear in the ${scheme} theme, at phone width`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openUnlocked(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Words', exact: true }).click();
    await expect(page.getByTestId('word-counts')).toHaveText('54 solid, 9 learning');

    const card = page.locator('[data-lemma="ἀγαπάω"]');
    await card.scrollIntoViewIfNeeded();
    const picture = card.locator('img');
    await expect(picture).toBeVisible();
    // The file loaded (a broken image has no natural width) and is big enough to see.
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    expect((await picture.boundingBox())?.width).toBeGreaterThanOrEqual(48);
    // A word with no picture has no image.
    await expect(page.locator('[data-lemma="γάρ"] img')).toHaveCount(0);
    await expectFitsPhone(page);

    await shot(page, scheme === 'light' ? 'words-pictures' : 'words-pictures-dark');
  });
}
