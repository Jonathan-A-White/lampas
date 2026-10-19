// tests/e2e/question-kept.spec.ts — a question is never lost (mw-5r3p30.602, folding mw-5r3p30.439 .441 .437 .493): a question that failed, or went and waits for its answer,
// comes back when he leaves the page and returns or the page reloads (src/pending/pendingAsks.ts); after Send the question, the wait and a failure stand in view above the
// composer on a phone held sideways; and a long question sent in Talk or Ask leaves the first line of the answer on screen, not his own words. mw-5r3p30.434 (the phone
// goes offline mid-wait) is in tutor-offline.spec.ts.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER, TALK_ANSWER, type FakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { longQuestion } from '../support/long-text';
import { composerOf, questionField, typeQuestion } from './ask-composer';
import { shot } from './shot';
import { expectInList } from './talk-list';
import { openUnlocked } from './unlocked';
import { chooseAction, openTalkAbout } from './verse-view';

const QUESTION = 'What is this verse about?';
const SIDEWAYS = { width: 844, height: 390 };
const UPRIGHT = { width: 390, height: 844 };

async function start(page: Page, fake: FakePostern, size = UPRIGHT): Promise<void> {
  await page.setViewportSize(size);
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  await expect(page.locator('[data-verse="28"]')).toBeAttached();
}

/** The Verse view's Ask the tutor action, whether the page still has the view open (the address names the verse, so a reload keeps it) or not. */
async function reopenAsk(page: Page): Promise<Locator> {
  await expect(page.locator('[data-verse="28"]')).toBeAttached();
  const view = page.getByRole('region', { name: 'Verse view' });
  if (!(await view.isVisible())) return chooseAction(page, 28, 'Ask the tutor');
  // the view comes back on the action it was on (src/verse/action.ts)
  const action = view.getByRole('button', { name: 'Ask the tutor', exact: true });
  if ((await action.getAttribute('aria-pressed')) !== 'true') await action.click();
  return view;
}

const talkSheet = (page: Page): Locator => page.getByRole('dialog', { name: 'Talk about Romans 8:28' });

async function sayInTalk(sheet: Locator, text: string): Promise<void> {
  await sheet.getByRole('textbox', { name: 'Your message' }).fill(text);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
}

/** Whole inside the box that scrolls (the Verse view's .screen) and above the composer. */
async function expectAboveComposer(page: Page, target: Locator, what: string): Promise<void> {
  await expect(target, `${what} is not drawn`).toBeVisible();
  const [at, screen, composer] = await Promise.all([target.boundingBox(), page.locator('.screen').last().boundingBox(), composerOf(page).boundingBox()]);
  if (!at || !screen || !composer) throw new Error('no box');
  expect(at.y, `${what} starts above the verse box`).toBeGreaterThanOrEqual(screen.y - 0.5);
  expect(at.y + at.height, `${what} ends below the verse box`).toBeLessThanOrEqual(screen.y + screen.height + 0.5);
  expect(at.y + at.height, `${what} ends under the composer`).toBeLessThanOrEqual(composer.y + 0.5);
}

test.describe('a question that failed or waits is kept (mw-5r3p30.439, mw-5r3p30.441)', () => {
  test('Ask: a failed question, its red box and Retry are still there after leaving the page and coming back, and Retry asks it', async ({ page }) => {
    const fake = makeFakePostern();
    fake.gateway = 503;
    await start(page, fake);
    await chooseAction(page, 28, 'Ask the tutor');
    await typeQuestion(page, QUESTION);
    await expect(page.locator('[data-ask-failed]').getByText('Could not reach the tutor')).toBeVisible();

    await page.goto('about:blank');
    await page.goBack();
    await reopenAsk(page);
    const box = page.locator('[data-ask-failed]');
    await expect(box.getByText('Could not reach the tutor')).toBeVisible();
    await expect(box.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(await questionField(page)).toHaveValue(QUESTION);
    await shot(page, 'question-kept-ask-failed');

    fake.gateway = undefined;
    fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
    await box.getByRole('button', { name: 'Retry' }).click();
    await expect(page.locator('[data-answer]')).toContainText(SYNERGEI_ANSWER.answer);
    await expect(page.locator('[data-ask-failed]')).toHaveCount(0);
  });

  test('Talk: a question sent while the tutor is held is still in the talk after a reload, and its answer shows under it', async ({ page }) => {
    const fake = makeFakePostern();
    await start(page, fake);
    await openTalkAbout(page, 28);
    await sayInTalk(talkSheet(page), QUESTION);
    await expect(talkSheet(page).locator('[data-talk-pending]')).toContainText(QUESTION);
    await expect.poll(() => fake.received.length).toBe(1);

    await page.reload();
    await expect(page.locator('[data-verse="28"]')).toBeAttached();
    await (await reopenAsk(page)).getByRole('button', { name: 'Talk about verse 28', exact: true }).click();
    const sheet = talkSheet(page);
    await expect(sheet.locator('[data-talk-pending]')).toContainText(QUESTION);
    await expect(sheet.getByText(/Waiting for the tutor…/)).toBeVisible();
    await fake.answer({ status: 'answered', answer: TALK_ANSWER });
    const turn = sheet.locator('[data-turn]');
    await expect(turn).toHaveCount(1);
    await expect(turn.locator('[data-talk-q]')).toHaveText(QUESTION);
    await expect(turn).toContainText(TALK_ANSWER.answer);
    expect(fake.received, 'the reload must not send a second grist').toHaveLength(1);
    await shot(page, 'question-kept-talk-reloaded');
  });

  test('Ask: a question sent while the tutor is held is still waiting after a reload, and its answer comes', async ({ page }) => {
    const fake = makeFakePostern();
    await start(page, fake);
    await chooseAction(page, 28, 'Ask the tutor');
    await typeQuestion(page, QUESTION);
    await expect(page.locator('[data-ask-pending]')).toContainText(QUESTION);
    await expect.poll(() => fake.received.length).toBe(1);

    await page.reload();
    await expect(page.locator('[data-verse="28"]')).toBeAttached();
    const view = await reopenAsk(page);
    await expect(view.locator('[data-ask-pending]')).toContainText(QUESTION);
    await expect(view.getByText(/Waiting for the tutor…/)).toBeVisible();
    await fake.answer({ status: 'answered', answer: SYNERGEI_ANSWER });
    await expect(view.locator('[data-answer]')).toContainText(SYNERGEI_ANSWER.answer);
    await expect(view.locator('[data-ask-pending]')).toHaveCount(0);
    expect(fake.received, 'the reload must not send a second grist').toHaveLength(1);
  });
});

test.describe('after Send, what was sent and its wait or failure are in view, sideways (mw-5r3p30.437)', () => {
  test('Ask: the question and Waiting for the tutor are above the composer, and so are a failure and Retry', async ({ page }) => {
    const fake = makeFakePostern();
    await start(page, fake, SIDEWAYS);
    await chooseAction(page, 28, 'Ask the tutor');
    await typeQuestion(page, QUESTION);
    const pending = page.locator('[data-ask-pending]');
    await expectAboveComposer(page, pending.getByText(QUESTION, { exact: true }), 'the question');
    await expectAboveComposer(page, pending.getByText(/Waiting for the tutor…/), 'Waiting for the tutor');
    await shot(page, 'question-kept-ask-waiting-sideways');

    await fake.answer({ status: 'failed', reason: 'no' });
    const failed = page.locator('[data-ask-failed]');
    await expectAboveComposer(page, failed.getByText('Could not reach the tutor'), 'the failure');
    await expectAboveComposer(page, failed.getByRole('button', { name: 'Retry' }), 'Retry');
    await shot(page, 'question-kept-ask-failed-sideways');
  });

  test('Talk: the question and Waiting for the tutor are in the box, and so are a failure and Retry', async ({ page }) => {
    const fake = makeFakePostern();
    await start(page, fake, SIDEWAYS);
    await openTalkAbout(page, 28);
    const sheet = talkSheet(page);
    await sayInTalk(sheet, QUESTION);
    const pending = sheet.locator('[data-talk-pending]');
    await expectInList(sheet, pending.getByText(QUESTION, { exact: true }), 'the question');
    await expectInList(sheet, pending.getByText(/Waiting for the tutor…/), 'Waiting for the tutor');

    await fake.answer({ status: 'failed', reason: 'no' });
    await expect(sheet.locator('[data-talk-failed]')).toBeVisible();
    await expectInList(sheet, sheet.locator('[data-talk-failed] p.text-bad'), 'the failure');
    await expectInList(sheet, sheet.getByRole('button', { name: 'Retry' }), 'Retry');
  });

  test('the tutor sheet (About): the question and the wait are in the box, and so is a failure', async ({ page }) => {
    const fake = makeFakePostern();
    await page.setViewportSize(SIDEWAYS);
    await routePostern(page, fake);
    await openUnlocked(page);
    await page.goto('/#/about');
    await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
    const sheet = page.getByRole('dialog', { name: 'Ask the tutor: About' });
    await sayInTalk(sheet, QUESTION);
    const pending = sheet.locator('[data-talk-pending]');
    await expectInList(sheet, pending.getByText(QUESTION, { exact: true }), 'the question');
    await expectInList(sheet, pending.getByText(/Waiting for the tutor…/), 'Waiting for the tutor');
    await fake.answer({ status: 'failed', reason: 'no' });
    await expectInList(sheet, sheet.locator('[data-talk-failed] p.text-bad'), 'the failure');
    await expectInList(sheet, sheet.getByRole('button', { name: 'Retry' }), 'Retry');
  });
});

test('Share: a shared note taken into a new talk, sent, shows the question and the wait in the box sideways, and a failure with Retry', async ({ page }) => {
  const fake = makeFakePostern();
  await page.setViewportSize(SIDEWAYS);
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse]').first()).toBeVisible();
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(['shares'], 'readwrite');
          tx.objectStore('shares').add({ id: 'kept', createdAt: Date.now(), text: 'A note to keep', files: [] });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.goto('/#/share?s=kept');
  await page.getByRole('dialog', { name: 'Share to Lampas' }).getByRole('button', { name: 'New talk', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Talk with the tutor' });
  await expect(sheet.getByRole('textbox', { name: 'Your message' })).toHaveValue('A note to keep');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const pending = sheet.locator('[data-talk-pending]');
  await expectInList(sheet, pending.getByText('A note to keep', { exact: true }), 'the question');
  await expectInList(sheet, pending.getByText(/Waiting for the tutor…/), 'Waiting for the tutor');
  await fake.answer({ status: 'failed', reason: 'no' });
  await expectInList(sheet, sheet.locator('[data-talk-failed] p.text-bad'), 'the failure');
  await expectInList(sheet, sheet.getByRole('button', { name: 'Retry' }), 'Retry');
});

test.describe('a long question leaves the first line of the answer on screen (mw-5r3p30.493)', () => {
  const LONG = longQuestion(3800);
  const ONE_LINE = 'What does this verse mean?';
  const inWindow = async (page: Page, target: Locator, what: string): Promise<void> => {
    await expect(target, `${what} is not drawn`).toBeVisible();
    const at = await target.boundingBox();
    if (!at) throw new Error('no box');
    const height = await page.evaluate(() => window.innerHeight);
    expect(at.y, `${what} starts above the window`).toBeGreaterThanOrEqual(0);
    expect(at.y + Math.min(at.height, 24), `the first line of ${what} is below the window`).toBeLessThanOrEqual(height);
  };

  for (const [name, question] of [['a 3800-character question', LONG], ['a one-line question', ONE_LINE]] as const) {
    test(`Talk: ${name}, the answer's first line is in view`, async ({ page }) => {
      const fake = makeFakePostern();
      fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
      await start(page, fake);
      await openTalkAbout(page, 28);
      const sheet = talkSheet(page);
      await sheet.getByRole('textbox', { name: 'Your message' }).fill(question);
      await sheet.getByRole('button', { name: 'Send', exact: true }).click();
      const answer = sheet.locator('[data-turn] [data-answer-text]');
      await expect(answer).toContainText(TALK_ANSWER.answer.slice(0, 20));
      await expect.poll(async () => {
        const [a, list] = await Promise.all([answer.boundingBox(), sheet.locator('[data-talk-list]').boundingBox()]);
        return a && list ? a.y >= list.y - 0.5 && a.y + 24 <= list.y + list.height : false;
      }, { message: 'the first line of the answer is not inside the conversation box' }).toBe(true);
      await inWindow(page, answer, 'the answer');
      // and what he asked is kept in the turn
      await expect(sheet.locator('[data-turn] [data-talk-q]')).toBeAttached();
      await shot(page, `question-kept-talk-${question === LONG ? 'long' : 'short'}`);
    });

    test(`Ask: ${name}, the answer's first line is in view`, async ({ page }) => {
      const fake = makeFakePostern();
      fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
      await start(page, fake);
      await chooseAction(page, 28, 'Ask the tutor');
      await typeQuestion(page, question);
      const answer = page.locator('[data-answer] .text-lg').first();
      await expect(answer).toContainText(SYNERGEI_ANSWER.answer.slice(0, 20));
      await expect.poll(async () => {
        const [a, screen, composer] = await Promise.all([answer.boundingBox(), page.locator('.screen').last().boundingBox(), composerOf(page).boundingBox()]);
        return a && screen && composer ? a.y >= screen.y - 0.5 && a.y + 24 <= Math.min(screen.y + screen.height, composer.y) : false;
      }, { message: 'the first line of the answer is not in the verse box above the composer' }).toBe(true);
      await inWindow(page, answer, 'the answer');
      await expect(page.locator('[data-answer-question]')).toBeAttached();
      await shot(page, `question-kept-ask-${question === LONG ? 'long' : 'short'}`);
    });
  }
});
