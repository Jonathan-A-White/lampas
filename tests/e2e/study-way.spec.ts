// tests/e2e/study-way.spec.ts — My study way (mw-5r3p30.76) at phone width: the tutor's quiz answer proposes a line with Keep this (the shot), the tap keeps it,
// and Settings > My study way lists it with Edit and Delete a thumb tall (the shot). jsdom has no layout, so every size and place is proven here.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, QUIZ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
const LINE = 'Ask me about the Greek grammar of each verse before you ask what it means, and skip the map.';

async function start(page: Page): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { ...QUIZ_ANSWER, study_way_line: LINE } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
}

async function insidePhone(target: Locator, minHeight = 43.5): Promise<void> {
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

test('Keep this on the tutor\'s proposed line keeps it, and Settings > My study way shows it', async ({ page }) => {
  await start(page);
  await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: 'Quiz me', exact: true }).click();
  await view.getByRole('button', { name: 'Start the quiz', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Quiz on Romans 8:1-11' });
  const proposed = sheet.locator('[data-study-way]');
  await expect(proposed).toContainText(LINE);
  const keep = proposed.getByRole('button', { name: 'Keep this', exact: true });
  await expect(keep).toBeVisible();
  await insidePhone(keep);
  const s = await sheet.boundingBox();
  if (!s) throw new Error('no sheet box');
  expect(s.y + s.height).toBeLessThanOrEqual(VIEWPORT.height + 0.5);
  await noSideways(page);
  await shot(page, 'study-way-keep');

  await keep.click();
  await expect(proposed).toContainText('Kept');
  await expect(proposed.getByRole('button', { name: 'Keep this' })).toHaveCount(0);

  await page.goto('/#/settings');
  await page.getByRole('button', { name: 'My study way' }).click();
  await expect(page.getByRole('heading', { name: 'My study way', level: 1 })).toBeVisible();
  const rows = page.locator('[data-study-way-line]');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText(LINE);
  for (const row of await rows.all()) {
    await insidePhone(row, 47.5);
    for (const name of [/^Edit/, /^Delete/]) await insidePhone(row.getByRole('button', { name }), 47.5);
  }
  await noSideways(page);
  await shot(page, 'study-way-page');

  await rows.first().getByRole('button', { name: /^Delete/ }).click();
  await expect(rows).toHaveCount(0);
});
