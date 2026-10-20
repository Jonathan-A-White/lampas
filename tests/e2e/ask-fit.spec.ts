// tests/e2e/ask-fit.spec.ts — Ask the tutor in the Verse view fits the phone (mw-5r3p30.170): at 390 x 844 the answer is scrolled into view when it comes, its
// first lines clear of the composer and of the speaking bar; at 844 x 390 (landscape) the whole composer, Type a question included, is inside the window, with
// the text box closed and open; and Type a question is a 44 px thumb target. jsdom has no layout, so it is proven here.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, SYNERGEI_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic, honestSpeech } from '../support/honest-fakes';
import { composerOf, typeQuestion } from './ask-composer';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// three sentences, as the story's report has it (mw-5r3p30.188)
const THREE_SENTENCES = {
  answer: 'Called means chosen by God for a purpose. It is the same word Paul uses for all who love him. So the call comes first, and the love answers it.',
  words: [] as { greek: string; lemma: string; note: string }[],
};

async function openAsk(
  page: Page,
  viewport: { width: number; height: number },
  answer: { answer: string; words: { greek: string; lemma: string; note: string }[] } = SYNERGEI_ANSWER,
): Promise<{ view: Locator; fake: ReturnType<typeof makeFakePostern> }> {
  await page.setViewportSize(viewport);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer };
  await routePostern(page, fake);
  await honestMic(page);
  await honestSpeech(page, { msPerWord: 400 });
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  await page.locator('[data-heading]', { hasText: 'Walking by the Spirit' }).getByRole('button').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('heading', { name: 'Walking by the Spirit, Romans 8:1-11' })).toBeVisible();
  await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  await expect(composerOf(page)).toBeVisible();
  return { view, fake };
}

async function box(el: Locator) {
  const b = await el.boundingBox();
  if (!b) throw new Error('no box');
  return b;
}

test('390 x 844: the answer is scrolled into view when it comes, clear of the composer and the speaking bar', async ({ page }) => {
  const { view } = await openAsk(page, { width: 390, height: 844 });
  await typeQuestion(page, 'What does called mean?');
  const card = view.locator('[data-answer]');
  await expect(card).toContainText(SYNERGEI_ANSWER.answer);
  const speaking = page.getByRole('region', { name: 'Speaking', exact: true });
  await expect(speaking).toBeVisible();
  const scroller = await box(view.locator('.screen'));
  const bar = await box(speaking);
  const composer = await box(composerOf(page));
  // the card's first lines are in the scrolling box once the answer has come (the box scrolls to it)
  await expect.poll(async () => (await box(card)).y + 100, { message: 'the answer is scrolled into view' }).toBeLessThanOrEqual(scroller.y + scroller.height);
  const c = await box(card);
  // its first lines (a heading line and two lines of answer) are inside the scrolling box, above the speaking bar and the composer
  expect(c.y).toBeGreaterThanOrEqual(scroller.y - 1);
  expect(c.y + 100).toBeLessThanOrEqual(scroller.y + scroller.height);
  expect(scroller.y + scroller.height).toBeLessThanOrEqual(bar.y + 1);
  expect(c.y + 100).toBeLessThanOrEqual(bar.y);
  expect(c.y + 100).toBeLessThanOrEqual(composer.y);
  await shot(page, 'ask-fit-answer');
});

test('844 x 390: the whole composer is inside the window, with the text box closed and open', async ({ page }) => {
  await openAsk(page, { width: 844, height: 390 });
  const typeInstead = composerOf(page).getByRole('button', { name: 'Type a question', exact: true });
  await expect(typeInstead).toBeVisible();
  const inside = async () => {
    const c = await box(composerOf(page));
    expect(c.y).toBeGreaterThanOrEqual(0);
    expect(c.y + c.height).toBeLessThanOrEqual(390);
  };
  await inside();
  const t = await box(typeInstead);
  expect(t.y + t.height).toBeLessThanOrEqual(390);
  await shot(page, 'ask-fit-landscape');
  await typeInstead.click();
  await expect(composerOf(page).getByRole('textbox', { name: 'Your question' })).toBeVisible();
  await inside();
  await shot(page, 'ask-fit-landscape-typing');
});

test('Type a question is a 44 px target', async ({ page }) => {
  await openAsk(page, { width: 390, height: 844 });
  const t = await box(composerOf(page).getByRole('button', { name: 'Type a question', exact: true }));
  expect(t.height).toBeGreaterThanOrEqual(43.5);
});

// mw-5r3p30.188: sideways, the passage and the answer shared a scroll box 28 px tall under the speaking bar; the question and the first answer line must be
// fully in view at once, with the card's top edge not cut off.
async function expectAnswerReadable(view: Locator, viewport: { width: number; height: number }): Promise<void> {
  const card = view.locator('[data-answer]');
  const scroller = view.locator('.screen');
  const settled = async () => {
    const s = await box(scroller);
    const q = await box(card.locator('[data-answer-question]'));
    const a = await box(card.locator('.markdown, p').nth(1));
    return { s, q, a };
  };
  // the box is tall enough to read in, and the question and the first answer line sit wholly inside it
  await expect
    .poll(async () => {
      const { s, q, a } = await settled();
      const c = await box(card);
      return s.height >= 100 && c.y >= s.y - 0.5 && q.y >= s.y - 0.5 && a.y + 24 <= s.y + s.height + 0.5 && q.y + q.height <= a.y + 0.5;
    }, { message: 'the answer card is in view with its top edge, its question and its first line' })
    .toBe(true);
  const { s } = await settled();
  expect(s.y + s.height).toBeLessThanOrEqual(viewport.height);
}

test('844 x 390: the answer is readable with the speaking bar showing, after Stop, and after rotating', async ({ page }) => {
  const sideways = { width: 844, height: 390 };
  const { view } = await openAsk(page, sideways, THREE_SENTENCES);
  await typeQuestion(page, 'What does called mean?');
  const card = view.locator('[data-answer]');
  await expect(card).toContainText('Called means chosen');
  const speaking = page.getByRole('region', { name: 'Speaking', exact: true });
  await expect(speaking).toBeVisible();
  await expectAnswerReadable(view, sideways);
  await shot(page, 'ask-fit-landscape-answer');
  await speaking.getByRole('button', { name: 'Stop', exact: true }).click();
  await expectAnswerReadable(view, sideways);
  await shot(page, 'ask-fit-landscape-answer-stopped');
  // rotate upright and back to sideways with the answer open
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize(sideways);
  await expect(card).toBeVisible();
  await expectAnswerReadable(view, sideways);
  await shot(page, 'ask-fit-landscape-answer-rotated');
});
