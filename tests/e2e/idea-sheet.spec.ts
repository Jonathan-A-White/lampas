import { expect, test } from '@playwright/test';
import { swipe } from '../support/gesture';
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
  // the card teaches a beginner (mw-5r3p30.234): what it is, how to spot it with its table of endings, and a worked example, all inside the phone's width
  for (const part of ['What it is', 'How to spot it', 'Worked example']) await expect(idea.getByRole('heading', { name: part, exact: true })).toBeVisible();
  const table = idea.getByTestId('idea-table');
  await expect(table).toBeVisible();
  const tableFits = await table.evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
  expect(tableFits).toBe(true);
  await expect(idea.getByTestId('worked-respelling')).toBeVisible();
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
  // the slider is disabled until the sheet has found its examples, and a disabled control takes no focus or key (mw-5r3p30.485)
  await expect(idea.getByRole('slider', { name: 'Your level' })).toBeEnabled();
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

test('a tap on the middle of the "Your level" track leaves the level where it was, and a drag sets it', async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true }).click();
  await page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true }).click();
  await page.getByRole('dialog', { name: 'Grammar' }).getByRole('button', { name: 'Learn this idea' }).click();
  const idea = page.getByRole('dialog', { name: 'Idea' });
  const slider = idea.getByRole('slider', { name: 'Your level' });
  await expect(slider).toBeEnabled();
  await expect(slider).toHaveAttribute('aria-valuetext', 'Not yet');
  const box = await slider.boundingBox();
  if (!box) throw new Error('the slider has no box');
  const middle = [box.x + box.width / 2, box.y + box.height / 2] as const;
  const stay = page.getByRole('button', { name: 'Stay here', exact: true });

  // a tap on the middle of the track (with a mouse, then a finger) moves nothing and asks nothing
  await page.mouse.click(middle[0], middle[1]);
  await swipe(page, middle, middle, { with: 'touch', steps: 1 });
  await expect(slider).toHaveAttribute('aria-valuetext', 'Not yet');
  await expect(stay).toHaveCount(0);
  await expect(idea.getByTestId('idea-level')).toHaveCount(0);

  // a drag of the thumb to the middle sets the level and asks
  await swipe(page, [box.x + 22, middle[1]], [middle[0], middle[1]]);
  await expect(stay).toBeVisible();
  await expect(slider).toHaveAttribute('aria-valuetext', 'Learning');
  await stay.click();
  await expect(idea.getByTestId('idea-level')).toHaveText('Frontier since today');
  await shot(page, 'idea-sheet-track-tap');
});
