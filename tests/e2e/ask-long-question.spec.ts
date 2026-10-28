// tests/e2e/ask-long-question.spec.ts — Ask the tutor takes a long question, spoken or typed (mw-5r3p30.462): 885 characters from verse 28 are each sent
// whole, show 'Waiting for the tutor…' and get an answer. The limit is MAX_QUESTION_CHARS (4000, src/services/requestBudget.ts; mw-5r3p30.413 raised it from 400);
// this spec is the regression test. The finding was made before 0.1.259; the spec passes on build 0.1.344 (main at the start of mw-5r3p30.601).
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { clips, honestMic } from '../support/honest-fakes';
import { longQuestion } from '../support/long-text';
import { askBar, composerOf, talkSheetOf, talkTurnsOf, typeQuestion } from './ask-composer';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

const LENGTH = 885;
const QUESTION = longQuestion(LENGTH);

async function start(page: Page, fake: FakePostern, transcript = QUESTION) {
  await page.setViewportSize({ width: 412, height: 915 });
  await routePostern(page, fake);
  await honestMic(page, { clip: { ...clips.english, transcript } });
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  return chooseAction(page, 28, 'Ask the tutor');
}

test('an 885-character spoken question from verse 28 is sent whole, waits and is answered', async ({ page }) => {
  const fake = makeFakePostern();
  await start(page, fake);
  const bar = await askBar(page).boundingBox();
  if (!bar) throw new Error('no bar');
  await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2);
  await page.mouse.down();
  await expect(composerOf(page).getByTestId('live-transcript')).toHaveText(QUESTION, { timeout: 20_000 });
  await page.mouse.up();

  await expect(talkSheetOf(page).getByText(/Waiting for the tutor…/)).toBeVisible();
  await expect(talkSheetOf(page)).toContainText(QUESTION.slice(0, 80));
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input.question).toBe(QUESTION);
  expect(String(fake.received[0].input.question)).toHaveLength(LENGTH);
  await shot(page, 'ask-long-question-spoken');
  await fake.answer({ status: 'answered', answer: SYNERGEI_ANSWER });
  await expect(talkTurnsOf(page)).toContainText(SYNERGEI_ANSWER.answer);
});

test('an 885-character typed question from verse 28 is sent whole, waits and is answered', async ({ page }) => {
  const fake = makeFakePostern();
  await start(page, fake);
  await typeQuestion(page, QUESTION);

  await expect(talkSheetOf(page).getByText(/Waiting for the tutor…/)).toBeVisible();
  expect(fake.received).toHaveLength(1);
  expect(fake.received[0].input.question).toBe(QUESTION);
  await fake.answer({ status: 'answered', answer: SYNERGEI_ANSWER });
  await expect(talkTurnsOf(page)).toContainText(SYNERGEI_ANSWER.answer);
  await expect(talkSheetOf(page).getByRole('alert')).toHaveCount(0);
});
