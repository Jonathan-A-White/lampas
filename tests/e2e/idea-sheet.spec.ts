import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('the idea sheet of the genitive fits the phone, its three buttons clear 48 px, and Got it shows the level', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  const learn = page.getByRole('dialog', { name: 'Grammar' }).getByRole('button', { name: 'Learn this idea' });
  expect((await learn.boundingBox())?.height).toBeGreaterThanOrEqual(47.5);
  await learn.click();

  const idea = page.getByRole('dialog', { name: 'Idea' });
  await expect(idea).toBeVisible();
  await expect(idea.getByRole('heading', { name: 'The genitive case' })).toBeVisible();
  await expect(idea.getByTestId('idea-example')).toHaveCount(3);
  await expect(idea.getByTestId('idea-paradigm')).toBeVisible();
  const sheet = await idea.boundingBox();
  expect((sheet?.x ?? 0) + (sheet?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  expect((sheet?.y ?? 0) + (sheet?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  for (const name of ['Got it', 'I know this', 'Ask the tutor']) {
    const box = await idea.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height, name).toBeGreaterThanOrEqual(47.5);
    expect((box?.y ?? 0) + (box?.height ?? 0), name).toBeLessThanOrEqual(VIEWPORT.height);
  }
  for (const speaker of await idea.getByRole('button', { name: /^Hear / }).all()) {
    expect((await speaker.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  }
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, top: document.documentElement.scrollTop }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  expect(fits.top).toBe(0);

  await idea.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(idea.getByTestId('idea-level')).toHaveText('Frontier since today');
  await shot(page, 'idea-sheet');

  await page.reload();
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  await page.getByRole('dialog', { name: 'Grammar' }).getByRole('button', { name: 'Learn this idea' }).click();
  await expect(page.getByRole('dialog', { name: 'Idea' }).getByTestId('idea-level')).toHaveText('Frontier since today');
});
