// tests/e2e/quiz-me.spec.ts — Quiz me in the Verse view (mw-5r3p30.74) at phone width, on the passage under a heading: the fifth action fits the row,
// the Start the quiz button stands where the hold bar stands, and the quiz opens in the Talk sheet with a stubbed tutor's first question. jsdom has
// no layout, so every size and place is proven here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, QUIZ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
const BAR_HEIGHT = 96;
const HEADING = 'Walking by the Spirit';

async function start(page: Page): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: QUIZ_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
}

test.use({ viewport: VIEWPORT });

test('Quiz me on a passage: the action fits the row, the button stands at the foot, the quiz opens in the Talk sheet', async ({ page }) => {
  await start(page);
  await page.locator('[data-heading]', { hasText: HEADING }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();

  // five actions on one line, each inside the phone and a thumb tall
  const row = view.getByRole('group', { name: 'Actions' });
  const tops = new Set<number>();
  const buttons = await row.getByRole('button').all();
  expect(buttons).toHaveLength(5);
  for (const button of buttons) {
    const b = await button.boundingBox();
    if (!b) throw new Error('no button box');
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(VIEWPORT.width);
    expect(b.height).toBeGreaterThanOrEqual(43.5);
    tops.add(Math.round(b.y));
  }
  expect(tops.size).toBe(1);

  await view.getByRole('button', { name: 'Quiz me', exact: true }).click();
  await expect(view.getByRole('button', { name: 'Quiz me', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const begin = view.getByRole('button', { name: 'Start the quiz', exact: true });
  await expect(begin).toBeVisible();
  const box = await begin.boundingBox();
  if (!box) throw new Error('no button box');
  expect(box.height).toBeGreaterThanOrEqual(BAR_HEIGHT - 0.5);
  expect(box.width).toBeGreaterThan(VIEWPORT.width - 40);
  expect(box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
  await expect(page.locator('[data-hold-bar]')).toHaveCount(0);
  await shot(page, 'quiz-me-view');

  await begin.click();
  const sheet = page.getByRole('dialog', { name: `Quiz on Romans 8:1-11` });
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Quiz me on Romans 8:1-11.');
  await expect(sheet).toContainText(QUIZ_ANSWER.answer);
  const s = await sheet.boundingBox();
  if (!s) throw new Error('no sheet box');
  expect(s.x).toBeGreaterThanOrEqual(0);
  expect(s.x + s.width).toBeLessThanOrEqual(VIEWPORT.width);
  expect(s.y + s.height).toBeLessThanOrEqual(VIEWPORT.height + 0.5);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await shot(page, 'quiz-me-sheet');

  // Done returns to the Verse view, whose button now continues the quiz
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(view.getByRole('button', { name: 'Continue the quiz', exact: true })).toBeVisible();
});
