import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

// Try it on a verse (mw-emk3xt.4): the idea sheet's button opens three questions on one verse, then 'Read it' opens that verse with every sheet closed.
test('Try it on a verse fits the phone, asks three questions on one verse, and Read it opens that verse with no sheet open', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  await page.getByRole('dialog', { name: 'Grammar' }).getByRole('button', { name: 'Learn this idea' }).click();
  const idea = page.getByRole('dialog', { name: 'Idea' });
  const tryIt = idea.getByRole('button', { name: 'Try it on a verse', exact: true });
  await expect(tryIt).toBeVisible();
  const button = await tryIt.boundingBox();
  expect(button?.height).toBeGreaterThanOrEqual(47.5);
  expect((button?.y ?? 0) + (button?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  await tryIt.click();

  const sheet = page.getByRole('dialog', { name: 'Try it' });
  await expect(sheet).toBeVisible();
  const title = await sheet.getByTestId('try-it-title').textContent();
  expect(title).toMatch(/^Try it: .+ \d+:\d+$/);
  const verse = title!.replace('Try it: ', '');
  await expect(sheet.getByTestId('grammar-prompt')).toHaveText('What does this say?');
  const options = sheet.locator('[data-option]');
  await expect(options).toHaveCount(4);
  for (const option of await options.all()) {
    const box = await option.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }
  await shot(page, 'try-it');

  // every question is about the one verse; the first option of each is tapped (right or wrong), a parsing's steps until it ends
  for (let n = 1; n <= 3; n += 1) {
    await expect(sheet.getByTestId('try-it-step')).toContainText(`Question ${n} of 3`);
    await expect(sheet.getByTestId('grammar-ref')).toHaveText(verse);
    for (let guard = 0; guard < 8 && !(await sheet.getByTestId('try-it-next').isVisible()); guard += 1) {
      await sheet.locator('[data-option]:not([disabled])').first().click();
    }
    await sheet.getByTestId('try-it-next').click();
  }
  await expect(sheet.getByTestId('try-it-result')).toHaveText(/You got \d of 3/);
  const read = sheet.getByRole('button', { name: 'Read it', exact: true });
  const done = sheet.getByRole('button', { name: 'Done', exact: true });
  for (const control of [read, done]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(47.5);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  }
  await read.click();
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
