// The line under a Review word question's options ('Right.') shows whole above the Next bar, and Next ends where the option cards end (mw-indx1x6.13).
// He answered ἀπό on his phone: 'Right.' was cut off by the bottom bar and Next's right edge was not the cards'. Walked at 360x740 and 412x915, every kind of Review question.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const APO = 'ἀπό';
const GLOSSES = ['from, away from', 'to, toward', 'in, on, among', 'out of, from within'];

const PHONES = [
  { name: '360x740', size: { width: 360, height: 740 } },
  { name: '412x915', size: { width: 412, height: 915 } },
];

/** A Review round of one kept item, as a reload would keep it, so the card is the one asked. */
async function reviewOf(page: Page, item: object, ready: Locator) {
  await openUnlocked(page);
  await page.addInitScript(
    (kept) => !window.sessionStorage.getItem('lampas.reviewRound') && window.sessionStorage.setItem('lampas.reviewRound', JSON.stringify({ round: { status: 'running', items: [kept], index: 0, picked: null, right: 0, missed: [] }, at: Date.now() })),
    item,
  );
  await page.goto('/#/review');
  await expect(ready).toBeVisible();
}

/** The line's whole box is above the Next bar's top and inside the phone, with no scroll. */
async function expectFeedbackWhole(page: Page, where: string) {
  const feedback = page.getByTestId('feedback');
  await expect(feedback, where).toBeVisible();
  const line = await feedback.boundingBox();
  const bar = await page.locator('[data-next-bar]').boundingBox();
  const view = page.viewportSize();
  if (!line || !bar || !view) throw new Error(`${where}: no box`);
  expect(line.y + line.height, `${where}: the feedback ends at ${line.y + line.height}, the Next bar starts at ${bar.y}`).toBeLessThanOrEqual(bar.y + 0.5);
  expect(bar.y + bar.height, `${where}: the bar ends in the phone`).toBeLessThanOrEqual(view.height + 0.5);
}

/** Next's right edge is the option cards' right edge (the rightmost card's, where a card draws its options in a grid). */
async function expectNextAlignedWithCards(page: Page, where: string) {
  const next = await page.getByTestId('next').boundingBox();
  const cards = await page.locator('[data-option]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right));
  if (!next) throw new Error(`${where}: no Next`);
  const right = Math.max(...cards);
  expect(Math.abs(next.x + next.width - right), `${where}: Next ends at ${next.x + next.width}, the cards at ${right}`).toBeLessThanOrEqual(0.5);
}

for (const phone of PHONES) {
  test.describe(`at ${phone.name}`, () => {
    test.use({ viewport: phone.size });

    test('a word question: Right. shows whole above the Next bar and Next lines up with the cards', async ({ page }) => {
      const item = { kind: 'word', id: APO, mode: 'choice', question: { lemma: APO, prompt: APO, gloss: GLOSSES[0], options: GLOSSES } };
      await reviewOf(page, item, page.getByTestId('prompt'));
      await page.getByRole('button', { name: GLOSSES[0], exact: true }).click();
      await expect(page.getByTestId('feedback')).toHaveText('Right.');
      await expectFeedbackWhole(page, `word right ${phone.name}`);
      await expectNextAlignedWithCards(page, `word right ${phone.name}`);
      await shot(page, `review-feedback-room-word-right-${phone.name}`);
    });

    test('a word question missed: the feedback shows whole above the Next bar', async ({ page }) => {
      const item = { kind: 'word', id: APO, mode: 'choice', question: { lemma: APO, prompt: APO, gloss: GLOSSES[0], options: GLOSSES } };
      await reviewOf(page, item, page.getByTestId('prompt'));
      await page.getByRole('button', { name: GLOSSES[1], exact: true }).click();
      await expect(page.getByTestId('feedback')).toContainText('Not quite');
      await expectFeedbackWhole(page, `word missed ${phone.name}`);
      await expectNextAlignedWithCards(page, `word missed ${phone.name}`);
      await shot(page, `review-feedback-room-word-missed-${phone.name}`);
    });
  });
}

// The sweep: every kind of Review question, answered at 360x740, has its feedback line whole above the Next bar (and, where it has option cards, Next ends where they do).
const GRAMMAR_QUESTION = {
  kind: 'ending',
  ideaId: 'words-sound-alike',
  prompt: 'Which ending makes the word a noun of the second declension, the nominative plural?',
  options: ['οι', 'ου', 'ων', 'οις'],
  right: 'οι',
  form: 'λογ_',
};

/** Starts a Review round of one kept item; `picked` keeps it answered, as a reload keeps a round. */
async function keptRound(page: Page, item: object, ready: Locator, picked: string | null = null) {
  await openUnlocked(page);
  await page.addInitScript(
    ([kept, answer]) => !window.sessionStorage.getItem('lampas.reviewRound') && window.sessionStorage.setItem('lampas.reviewRound', JSON.stringify({ round: { status: 'running', items: [kept], index: 0, picked: answer, right: 0, missed: [] }, at: Date.now() })),
    [item, picked] as const,
  );
  await page.goto('/#/review');
  await expect(ready).toBeVisible();
}

test.describe('every kind of question at 360x740', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('a grammar idea, multiple choice, right and missed', async ({ page }) => {
    await keptRound(page, { kind: 'grammar', id: 'words-sound-alike', mode: 'choice', question: GRAMMAR_QUESTION }, page.getByTestId('grammar-prompt'));
    await page.getByRole('button', { name: 'οι', exact: true }).click();
    await expectFeedbackWhole(page, 'grammar right');
    await expectNextAlignedWithCards(page, 'grammar right');
    await shot(page, 'review-feedback-room-grammar-right');
  });

  test('a grammar idea, multiple choice, missed', async ({ page }) => {
    await keptRound(page, { kind: 'grammar', id: 'words-sound-alike', mode: 'choice', question: GRAMMAR_QUESTION }, page.getByTestId('grammar-prompt'));
    await page.getByRole('button', { name: 'ων', exact: true }).click();
    await expectFeedbackWhole(page, 'grammar missed');
    await expectNextAlignedWithCards(page, 'grammar missed');
  });

  test('a paradigm cell, multiple choice', async ({ page }) => {
    await keptRound(page, { kind: 'paradigm', id: 'article', mode: 'choice', question: { ...GRAMMAR_QUESTION, kind: 'cell', ideaId: 'article' } }, page.getByTestId('grammar-prompt'));
    await page.getByRole('button', { name: 'ων', exact: true }).click();
    await expectFeedbackWhole(page, 'paradigm missed');
    await expectNextAlignedWithCards(page, 'paradigm missed');
  });

  test('a grammar flashcard', async ({ page }) => {
    await keptRound(page, { kind: 'grammar', id: 'words-sound-alike', mode: 'flashcard', question: GRAMMAR_QUESTION }, page.getByRole('button', { name: 'Show', exact: true }));
    await page.getByRole('button', { name: 'Show', exact: true }).click();
    await page.getByRole('button', { name: 'Not yet', exact: true }).click();
    await expectFeedbackWhole(page, 'grammar flashcard');
  });

  test('a word flashcard', async ({ page }) => {
    const question = { lemma: APO, prompt: APO, gloss: GLOSSES[0], options: GLOSSES };
    await keptRound(page, { kind: 'word', id: APO, mode: 'flashcard', question }, page.getByRole('button', { name: 'Show', exact: true }));
    await page.getByRole('button', { name: 'Show', exact: true }).click();
    await page.getByRole('button', { name: "Don't know", exact: true }).click();
    await expectFeedbackWhole(page, 'word flashcard');
  });

  test('a sound word', async ({ page }) => {
    await keptRound(page, { kind: 'sound', id: 'en:thoroughly', question: null, word: 'thoroughly', mode: 'flashcard' }, page.getByTestId('sound-word'));
    await page.getByRole('button', { name: 'Show', exact: true }).click();
    await page.getByRole('button', { name: 'Not yet', exact: true }).click();
    await expectFeedbackWhole(page, 'sound word');
  });

  test('a sound of the Greek, multiple choice', async ({ page }) => {
    await keptRound(page, { kind: 'sound', id: 'el:diphthong-ou', word: null, mode: 'choice', question: { ...GRAMMAR_QUESTION, kind: 'sound', say: 'ου' } }, page.getByTestId('grammar-prompt'));
    await page.getByRole('button', { name: 'ων', exact: true }).click();
    await expectFeedbackWhole(page, 'sound missed');
    await expectNextAlignedWithCards(page, 'sound missed');
  });

  test('a step of Your drill plan, answered', async ({ page }) => {
    const item = { kind: 'drill-plan', id: 'words-sound-alike|prove', ideaId: 'words-sound-alike', planAt: 1, item: { kind: 'prove', id: 'prove' }, questions: [], passage: [] };
    await keptRound(page, item, page.getByTestId('feedback'), 'Not yet');
    await expectFeedbackWhole(page, 'drill plan');
  });
});
