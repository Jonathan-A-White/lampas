// tests/e2e/quiz-goal-offer.spec.ts — the Quiz me goal offer is in view when its answer arrives (mw-5r3p30.196): the question the app asks and both
// buttons, 'Yes, from now on' and 'Just this time', are inside the answers box without a scroll by him, at 390x844 and held sideways at 844x390.
// jsdom has no layout, so it is proven here.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, QUIZ_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const LONG = Array.from({ length: 4 }, (_, i) => `Part ${i + 1}: I will ask in plain English about what the verse says and leave the Greek out, one small step at a time.`).join('\n\n');

async function start(page: Page, viewport: { width: number; height: number }, options: { micDenied?: boolean } = {}): Promise<void> {
  await page.setViewportSize(viewport);
  // A recogniser the phone has not allowed: every hold ends with 'not-allowed' (the red microphone line).
  if (options.micDenied) {
    await page.addInitScript(() => {
      class Denied {
        lang = '';
        continuous = false;
        interimResults = false;
        onstart: (() => void) | null = null;
        onerror: ((e: { error: string }) => void) | null = null;
        onend: (() => void) | null = null;
        start() {
          setTimeout(() => {
            this.onstart?.();
            this.onerror?.({ error: 'not-allowed' });
            this.onend?.();
          }, 0);
        }
        stop() {}
        abort() {}
      }
      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = Denied;
    });
  }
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { ...QUIZ_ANSWER, answer: `${LONG}\n\nQuestion 1: how does the passage begin?`, quiz_goal_offer: 'understanding what the passage says' } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
}

/** The sheet, opened on the Quiz me answer. */
async function openQuiz(page: Page) {
  await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.getByRole('button', { name: 'Quiz me', exact: true }).click();
  await view.getByRole('button', { name: 'Start the quiz', exact: true }).click();
  return page.getByRole('dialog', { name: 'Quiz on Romans 8:1-11' });
}

/** True when the goal question and both buttons lie inside the answers box. */
function offerInBox(sheet: Locator): () => Promise<boolean> {
  const list = sheet.locator('[data-talk-list]');
  return async () => {
    const room = await list.boundingBox();
    const boxes = await Promise.all(
      [sheet.locator('[data-quiz-goal-question]'), sheet.getByRole('button', { name: 'Yes, from now on', exact: true }), sheet.getByRole('button', { name: 'Just this time', exact: true })].map((l) => l.boundingBox()),
    );
    if (!room || boxes.some((b) => !b)) return false;
    return boxes.every((b) => b!.y >= room.y - 0.5 && b!.y + b!.height <= room.y + room.height + 0.5);
  };
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });
    test(`${viewport.width}x${viewport.height}: the goal question and both buttons are in the answers box when the answer arrives`, async ({ page }) => {
      await start(page, viewport);
      const sheet = await openQuiz(page);
      await expect(sheet.getByRole('button', { name: 'Yes, from now on', exact: true })).toBeVisible();
      await expect.poll(offerInBox(sheet)).toBe(true);
      await shot(page, `quiz-goal-offer-${viewport.width}`);
    });
  });
}

test.describe('the offer stays in view (mw-5r3p30.211)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('turning the phone sideways and back upright keeps the question and both buttons in the answers box', async ({ page }) => {
    await start(page, { width: 390, height: 844 });
    const sheet = await openQuiz(page);
    await expect(sheet.getByRole('button', { name: 'Yes, from now on', exact: true })).toBeVisible();
    await expect.poll(offerInBox(sheet)).toBe(true);
    // wait past the first alignment's settling time, as he would
    await page.waitForTimeout(2000);
    for (const size of [{ width: 844, height: 390 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size);
      await expect.poll(offerInBox(sheet)).toBe(true);
    }
    await shot(page, 'quiz-goal-offer-back-upright');
  });

  test('the microphone line does not push the question and both buttons out of the answers box', async ({ page }) => {
    await start(page, { width: 390, height: 844 }, { micDenied: true });
    const sheet = await openQuiz(page);
    await expect(sheet.getByRole('button', { name: 'Yes, from now on', exact: true })).toBeVisible();
    await expect.poll(offerInBox(sheet)).toBe(true);
    await page.waitForTimeout(2000);
    const hold = sheet.getByRole('button', { name: 'Hold to talk' });
    const at = await hold.boundingBox();
    if (!at) throw new Error('no Hold to talk');
    await page.mouse.move(at.x + at.width / 2, at.y + at.height / 2);
    await page.mouse.down();
    await expect(sheet.getByText('The microphone is not allowed for Lampas.')).toBeVisible();
    await page.mouse.up();
    await expect.poll(offerInBox(sheet)).toBe(true);
    await shot(page, 'quiz-goal-offer-mic-line');
  });
});
