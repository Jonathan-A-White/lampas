// tests/e2e/quiz-goal-offer.spec.ts — the Quiz me goal offer is in view when its answer arrives (mw-5r3p30.196): the question the app asks and both
// buttons, 'Yes, from now on' and 'Just this time', are inside the answers box without a scroll by him, at 390x844 and held sideways at 844x390.
// jsdom has no layout, so it is proven here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, QUIZ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const LONG = Array.from({ length: 4 }, (_, i) => `Part ${i + 1}: I will ask in plain English about what the verse says and leave the Greek out, one small step at a time.`).join('\n\n');

async function start(page: Page, viewport: { width: number; height: number }): Promise<void> {
  await page.setViewportSize(viewport);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { ...QUIZ_ANSWER, answer: `${LONG}\n\nQuestion 1: how does the passage begin?`, quiz_goal_offer: 'understanding what the passage says' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });
    test(`${viewport.width}x${viewport.height}: the goal question and both buttons are in the answers box when the answer arrives`, async ({ page }) => {
    await start(page, viewport);
    await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
    const view = page.getByRole('region', { name: 'Verse view' });
    await view.getByRole('button', { name: 'Quiz me', exact: true }).click();
    await view.getByRole('button', { name: 'Start the quiz', exact: true }).click();
    const sheet = page.getByRole('dialog', { name: 'Quiz on Romans 8:1-11' });
    const yes = sheet.getByRole('button', { name: 'Yes, from now on', exact: true });
    await expect(yes).toBeVisible();
    const list = sheet.locator('[data-talk-list]');
    await expect
      .poll(async () => {
        const room = await list.boundingBox();
        const boxes = await Promise.all([sheet.locator('[data-quiz-goal-question]'), yes, sheet.getByRole('button', { name: 'Just this time', exact: true })].map((l) => l.boundingBox()));
        if (!room || boxes.some((b) => !b)) return false;
        return boxes.every((b) => b!.y >= room.y - 0.5 && b!.y + b!.height <= room.y + room.height + 0.5);
      })
      .toBe(true);
    await shot(page, `quiz-goal-offer-${viewport.width}`);
  });
  });
}
