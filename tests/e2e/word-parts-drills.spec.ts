// A drill shows how a word is built from its parts, after the answer and never before (mw-5r3p30.987, his feedback: 'a part of the drills'): Drill it, the word flashcard and the word
// quiz at a phone's width, after a right answer and after a wrong one, nothing clipped or overlapped; a word with no entry draws no line.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { openIdea } from './large-text-titles';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
test.use({ viewport: VIEWPORT });

const PARTS = 'Built from: οὐδέ “and not” + μία “one”';

/** The parts stand whole inside the phone, clear of the line above and of the foot bar, and are not clipped. */
async function expectSet(parts: Locator, above: Locator, foot: Locator): Promise<void> {
  await parts.scrollIntoViewIfNeeded();
  const box = (await parts.boundingBox())!;
  expect(box.height, 'the parts have a height').toBeGreaterThan(15);
  expect(box.x, 'start inside the phone').toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, 'end inside the phone').toBeLessThanOrEqual(VIEWPORT.width + 0.5);
  expect(await parts.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), 'not clipped').toBe(true);
  const over = (await above.boundingBox())!;
  expect(box.y, 'under the line above').toBeGreaterThanOrEqual(over.y + over.height - 0.5);
  const bar = (await foot.boundingBox())!;
  expect(box.y + box.height, 'clear of the foot bar').toBeLessThanOrEqual(bar.y + 0.5);
}

/** Drill it on The negative, the questions fixed (the seed comes from Math.random): step 1 is answered right, and step 2 asks for οὐδεμία in 1 John 1:5. `pick` answers it. */
async function drillNegative(page: Page, pick: 'right' | 'wrong'): Promise<Locator> {
  await page.addInitScript(() => {
    Math.random = () => 0.75;
  });
  const idea = await openIdea(page, '1 John 1', 'The negative');
  await idea.getByRole('button', { name: 'Drill it', exact: true }).click();
  const drill = page.getByRole('dialog', { name: 'Drill it' });
  await expect(drill.getByTestId('grammar-prompt')).toBeVisible();
  // step 1 asks which idea this is; The negative is right
  await drill.getByRole('button', { name: 'The negative', exact: true }).click();
  await expect(drill.getByTestId('drill-next')).toBeVisible();
  await expect(drill.getByTestId('word-parts')).toHaveCount(0);
  await drill.getByTestId('drill-next').click();
  await expect(drill.getByTestId('grammar-prompt')).toHaveText('Tap the word that is singular negative');
  const words = drill.getByTestId('verse-words');
  // before the answer the parts are nowhere on the page
  await expect(drill.getByTestId('word-parts')).toHaveCount(0);
  expect(await drill.innerText()).not.toContain('Built from');
  await words.getByRole('button', { name: pick === 'right' ? 'οὐδεμία' : 'ἔστιν', exact: true }).first().click();
  return drill;
}

for (const pick of ['right', 'wrong'] as const) {
  test(`Drill it shows the parts of οὐδεμία after a ${pick} answer, and not before`, async ({ page }) => {
    const drill = await drillNegative(page, pick);
    await expect(drill.getByTestId('feedback')).toContainText(pick === 'right' ? 'Right.' : 'Not quite.');
    const parts = drill.getByTestId('word-parts');
    await expect(parts).toHaveText(PARTS);
    await expect(parts).toHaveCount(1);
    await expectSet(parts, drill.getByTestId('feedback'), drill.getByTestId('drill-next'));
    await shot(page, `word-parts-drill-it-${pick}`);
  });
}

test('Drill it draws no line for an answer that has no parts', async ({ page }) => {
  const drill = await drillNegative(page, 'right');
  await expect(drill.getByTestId('word-parts')).toHaveCount(1);
  await drill.getByTestId('drill-next').click();
  // step 2's next question asks for οὐ, a word with no entry of its own
  await expect(drill.getByTestId('grammar-prompt')).toHaveText('Tap the word that is negative');
  await drill.getByRole('button', { name: 'οὐ', exact: true }).first().click();
  await expect(drill.getByTestId('feedback')).toContainText('Right.');
  await expect(drill.getByTestId('word-parts')).toHaveCount(0);
});

const OUDEIS = 'οὐδείς';
const GLOSS = 'no one, nothing';
const OPTIONS = [GLOSS, 'to see, perceive', 'to say, speak', 'to go, depart'];
const PLAIN = 'λόγος';

/** A Review round of one word card, kept as a reload would keep it, so the card is the one asked. */
async function reviewOf(page: Page, mode: 'choice' | 'flashcard', lemma: string, gloss: string, options: string[]): Promise<void> {
  await openUnlocked(page);
  const item = { kind: 'word', id: lemma, mode, question: { lemma, prompt: lemma, gloss, options } };
  await page.addInitScript(
    (kept) => window.sessionStorage.setItem('lampas.reviewRound', JSON.stringify({ round: { status: 'running', items: [kept], index: 0, picked: null, right: 0, missed: [] }, at: Date.now() })),
    item,
  );
  await page.goto('/#/review');
  await expect(page.getByTestId('prompt')).toHaveText(lemma);
}

const ONE_PARTS = 'Built from: οὐδέ “and not” + εἷς “one”';

for (const pick of ['right', 'wrong'] as const) {
  test(`the word quiz shows the parts of οὐδείς after a ${pick} answer, and not before`, async ({ page }) => {
    await reviewOf(page, 'choice', OUDEIS, GLOSS, OPTIONS);
    expect(await page.locator('body').innerText()).not.toContain('Built from');
    await expect(page.getByTestId('word-parts')).toHaveCount(0);
    await page.getByRole('button', { name: pick === 'right' ? GLOSS : 'to see, perceive', exact: true }).click();
    await expect(page.getByTestId('feedback')).toContainText(pick === 'right' ? 'Right.' : 'Not quite');
    const parts = page.getByTestId('word-parts');
    await expect(parts).toHaveText(ONE_PARTS);
    await expectSet(parts, page.getByTestId('feedback'), page.locator('[data-next-bar]').first());
    await shot(page, `word-parts-quiz-${pick}`);
  });

  test(`the word flashcard shows the parts of οὐδείς after ${pick === 'right' ? 'Know it well' : "Don't know"}, and not before`, async ({ page }) => {
    await reviewOf(page, 'flashcard', OUDEIS, GLOSS, OPTIONS);
    await expect(page.getByTestId('word-parts')).toHaveCount(0);
    await page.getByRole('button', { name: 'Show', exact: true }).click();
    await expect(page.getByTestId('flash-gloss')).toHaveText(GLOSS);
    await expect(page.getByTestId('word-parts')).toHaveCount(0);
    await page.getByRole('button', { name: pick === 'right' ? 'Know it well' : "Don't know", exact: true }).click();
    await expect(page.getByTestId('feedback')).toHaveText(pick === 'right' ? 'Right.' : 'It comes back tomorrow.');
    const parts = page.getByTestId('word-parts');
    await expect(parts).toHaveText(ONE_PARTS);
    await expectSet(parts, page.getByTestId('feedback'), page.locator('[data-next-bar]').first());
    await shot(page, `word-parts-flashcard-${pick}`);
  });
}

test('a word with no entry draws no empty line in the quiz', async ({ page }) => {
  await reviewOf(page, 'choice', PLAIN, 'word, reason', ['word, reason', 'to see, perceive', 'to say, speak', 'to go, depart']);
  await page.getByRole('button', { name: 'to see, perceive', exact: true }).click();
  await expect(page.getByTestId('feedback')).toContainText('Not quite');
  await expect(page.getByTestId('word-parts')).toHaveCount(0);
  expect(await page.locator('body').innerText()).not.toContain('Built from');
});

test('a flashcard for a word with no entry draws no empty line', async ({ page }) => {
  await reviewOf(page, 'flashcard', PLAIN, 'word, reason', ['word, reason', 'to see, perceive', 'to say, speak', 'to go, depart']);
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await page.getByRole('button', { name: "Don't know", exact: true }).click();
  await expect(page.getByTestId('feedback')).toHaveText('It comes back tomorrow.');
  await expect(page.getByTestId('word-parts')).toHaveCount(0);
  expect(await page.locator('body').innerText()).not.toContain('Built from');
});
