// tests/e2e/lesson-strip.spec.ts — the Lesson strip and the Check sheet at phone width (mw-z370x5.2): the strip under the heading of a passage lesson's range, its chips and
// Check inside the window and a thumb tall, the row of actions still in reach under the text, and the Check sheet filling the window with its Stop button in reach.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

async function start(page: Page): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=1&p=1&pt=4&view=english&weave=off');
}

test('the Lesson strip sits under the heading with its chips and a Check a thumb tall, and the actions stay in reach', async ({ page }) => {
  await start(page);
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('heading', { name: '1 John 1:1-4', level: 2 })).toBeVisible();
  const strip = view.getByRole('region', { name: 'Lesson strip' });
  await expect(strip).toBeVisible();
  const check = strip.getByRole('button', { name: 'Check', exact: true });
  const checkBox = await check.boundingBox();
  const stripBox = await strip.boundingBox();
  const actions = await view.getByRole('group', { name: 'Actions', exact: true }).boundingBox();
  if (!checkBox || !stripBox || !actions) throw new Error('no boxes');
  expect(checkBox.height).toBeGreaterThanOrEqual(47.5);
  expect(stripBox.x).toBeGreaterThanOrEqual(0);
  expect(stripBox.x + stripBox.width).toBeLessThanOrEqual(VIEWPORT.width);
  // the chips are thumb tall, and the row of actions is on screen under the text
  for (const chip of await strip.locator('[data-idea]').all()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  const bar = await view.locator('[data-verse-bar]').boundingBox();
  expect(actions.y + actions.height).toBeLessThanOrEqual(bar!.y);
  await shot(page, 'lesson-strip');
});

test('Check opens a sheet over the whole window with its question and Stop in reach', async ({ page }) => {
  await start(page);
  await page.getByRole('region', { name: 'Lesson strip' }).getByRole('button', { name: 'Check', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Check', exact: true });
  await expect(sheet.getByTestId('check-title')).toHaveText('Check: 1 John 1:1-4');
  await expect(sheet.getByTestId('check-step')).toHaveText(/Question 1 of \d/);
  const box = await sheet.boundingBox();
  const stop = await sheet.getByRole('button', { name: 'Stop', exact: true }).boundingBox();
  if (!box || !stop) throw new Error('no boxes');
  expect(box.width).toBe(VIEWPORT.width);
  expect(box.height).toBe(VIEWPORT.height);
  expect(stop.height).toBeGreaterThanOrEqual(43.5);
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  await shot(page, 'lesson-check');
});
