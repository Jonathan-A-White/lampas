import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('Words lists a word taken on the teach sheet under From my reading', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByTestId('new-words').click();
  const sheet = page.getByRole('dialog', { name: 'New word' });
  await expect(sheet.getByTestId('teach-lemma')).toHaveText('αὐτός');
  await sheet.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(sheet.getByTestId('teach-lemma')).toHaveText('εἰς');
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Words' }).click();
  const group = page.locator('section', { has: page.getByRole('heading', { name: 'From my reading' }) });
  await expect(group.locator('[data-lemma="αὐτός"]')).toHaveAttribute('data-state', 'learning');
});

test('the teach sheet fits the phone, its four buttons clear 48 px, and the verse number shows the verse', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  const strip = page.getByTestId('new-words');
  await expect(strip).toHaveText('New words: 3');
  expect((await strip.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);

  // the verse link first: it closes the sheet and takes the reader to verse 9
  await strip.click();
  const sheet = page.getByRole('dialog', { name: 'New word' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Romans 8:9', exact: true }).click();
  await expect(sheet).toBeHidden();
  const verse = await page.locator('[data-verse="9"]').boundingBox();
  const main = await page.locator('[data-reader]').boundingBox();
  expect(verse?.y ?? -1).toBeGreaterThanOrEqual((main?.y ?? 0) - 1);
  expect(verse?.y ?? 9999).toBeLessThan((main?.y ?? 0) + 60);

  await strip.click();
  await expect(sheet.getByTestId('teach-lemma')).toHaveText('αὐτός');
  await expect(sheet.getByTestId('teach-translit')).not.toBeEmpty();
  await expect(sheet.getByTestId('teach-gloss')).toHaveText('it/s/he');
  await expect(sheet.getByTestId('teach-form')).not.toBeEmpty();
  await expect(sheet.locator('[data-new] [data-greek]')).not.toHaveCount(0);
  await expect(sheet.locator('[data-new] [data-hint]')).not.toHaveCount(0);
  const box = await sheet.boundingBox();
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  for (const name of ['Got it', 'I know this', 'Not now', 'Ask the tutor']) {
    const b = await sheet.getByRole('button', { name, exact: true }).boundingBox();
    expect(b?.height, name).toBeGreaterThanOrEqual(47.5);
    expect((b?.y ?? 0) + (b?.height ?? 0), name).toBeLessThanOrEqual(VIEWPORT.height);
  }
  const speaker = await sheet.getByRole('button', { name: 'Hear it' }).boundingBox();
  expect(speaker?.height).toBeGreaterThanOrEqual(43.5);
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, top: document.documentElement.scrollTop }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  expect(fits.top).toBe(0);

  await sheet.getByRole('button', { name: 'Not now', exact: true }).click();
  await expect(sheet.getByTestId('teach-lemma')).toHaveText('εἰς');
  await shot(page, 'teach-sheet');
});
