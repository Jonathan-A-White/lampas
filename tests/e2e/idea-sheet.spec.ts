import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('the idea sheet of the genitive fits the phone, its slider and buttons clear their sizes, and sliding to Learning shows the level', async ({ page }) => {
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
  for (const name of ['Drill it', 'Ask the tutor']) {
    const box = await idea.getByRole('button', { name, exact: true }).boundingBox();
    expect(box?.height, name).toBeGreaterThanOrEqual(47.5);
    expect((box?.y ?? 0) + (box?.height ?? 0), name).toBeLessThanOrEqual(VIEWPORT.height);
  }
  const markKnown = await idea.getByRole('button', { name: 'Mark known without a drill', exact: true }).boundingBox();
  expect(markKnown?.height).toBeGreaterThanOrEqual(43.5);
  const slider = await idea.getByRole('slider', { name: 'Your level' }).boundingBox();
  expect(slider?.height).toBeGreaterThanOrEqual(43.5);
  expect((slider?.y ?? 0) + (slider?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  expect(await idea.getByRole('button', { name: 'Got it', exact: true }).count()).toBe(0);
  expect(await idea.getByRole('button', { name: 'I know this', exact: true }).count()).toBe(0);
  for (const speaker of await idea.getByRole('button', { name: /^Hear / }).all()) {
    expect((await speaker.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  }
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth, top: document.documentElement.scrollTop }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  expect(fits.top).toBe(0);

  // The nominative case is not solid yet, so sliding up first asks whether to go there: Stay here goes on
  await expect(idea.getByTestId('idea-builds-on')).toContainText('This builds on The nominative case');
  await idea.getByRole('slider', { name: 'Your level' }).focus();
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Stay here', exact: true }).click();
  await expect(idea.getByTestId('idea-level')).toHaveText('Frontier since today');
  await expect(idea.getByRole('slider', { name: 'Your level' })).toHaveAttribute('aria-valuetext', 'Learning');
  await shot(page, 'idea-sheet');

  await page.reload();
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  await page.getByRole('dialog', { name: 'Grammar' }).getByRole('button', { name: 'Learn this idea' }).click();
  await expect(page.getByRole('dialog', { name: 'Idea' }).getByTestId('idea-level')).toHaveText('Frontier since today');
});
