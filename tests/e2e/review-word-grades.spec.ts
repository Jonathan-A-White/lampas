// A word's three grades in Review at 390x844 (mw-5r3p30.787): 'Know it well', 'Kind of' and 'Don't know' under 'Right.' after a right pick on a word's multiple choice, and on a word's
// flashcard once it is shown. Each button is at least 44 px tall, the three sit in one row inside the phone, none of their words is cut off, and each spec ends with a screenshot.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const THELO = 'θέλω';
const NAMES = ['Know it well', 'Kind of', "Don't know"];

/** A Review round of one θέλω card, kept as a reload would keep it, so the card is the one asked (a later reload keeps the round it made). */
async function reviewOf(page: Page, mode: 'choice' | 'flashcard') {
  await openUnlocked(page);
  const item = {
    kind: 'word',
    id: THELO,
    mode,
    question: { lemma: THELO, prompt: THELO, gloss: 'to will, wish, desire', options: ['to will, wish, desire', 'to see, perceive', 'to say, speak', 'to go, depart'] },
  };
  await page.addInitScript(
    (kept) => !window.sessionStorage.getItem('lampas.reviewRound') && window.sessionStorage.setItem('lampas.reviewRound', JSON.stringify({ round: { status: 'running', items: [kept], index: 0, picked: null, right: 0, missed: [] }, at: Date.now() })),
    item,
  );
  await page.goto('/#/review');
  await expect(page.getByTestId('prompt')).toHaveText(THELO);
}

/** The three buttons are in one row, in the phone, 44 px tall at least, with their whole words showing. */
async function expectThreeInARow(page: Page, row: Locator) {
  const boxes = [];
  for (const name of NAMES) {
    const button = row.getByRole('button', { name, exact: true });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(await button.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
    boxes.push(box);
  }
  const [a, b, c] = boxes;
  expect(a && b && c && Math.abs(a.y - b.y) < 2 && Math.abs(b.y - c.y) < 2).toBe(true);
  expect(a && c && a.x >= 0 && c.x + c.width <= 390).toBe(true);
  // clear of the Next bar where it is drawn (after a pick), else inside the phone
  const barEl = page.locator('[data-next-bar]');
  const bar = (await barEl.count()) > 0 ? await barEl.boundingBox() : null;
  expect(a && a.y + a.height <= (bar?.y ?? 844)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}

test('a right pick on a word shows Know it well, Kind of and Don\'t know under Right., in one row on the phone', async ({ page }) => {
  await reviewOf(page, 'choice');
  await expect(page.getByTestId('word-grades')).toHaveCount(0);
  await page.getByRole('button', { name: 'to will, wish, desire', exact: true }).click();
  await expect(page.getByTestId('feedback')).toHaveText('Right.');
  await shot(page, 'review-word-grades');
  await expectThreeInARow(page, page.getByTestId('word-grades'));

  // Don't know after a right pick reads and shows the heart of the word as a wrong pick does
  await page.getByRole('button', { name: "Don't know", exact: true }).click();
  await expect(page.getByTestId('word-heart')).toBeVisible();
  await expect(page.getByTestId('feedback')).toHaveText('It comes back tomorrow.');
});

test('a reload after a right pick, before a grade, keeps him on the word with its three buttons', async ({ page }) => {
  await reviewOf(page, 'choice');
  await page.getByRole('button', { name: 'to will, wish, desire', exact: true }).click();
  await expect(page.getByTestId('word-grades')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('prompt')).toHaveText(THELO);
  await expect(page.getByTestId('word-grades')).toBeVisible();
  await page.getByRole('button', { name: 'Know it well', exact: true }).click();
  await expect(page.getByTestId('feedback')).toHaveText('Right.');
});

test('a wrong pick on a word shows no grades', async ({ page }) => {
  await reviewOf(page, 'choice');
  await page.getByRole('button', { name: 'to see, perceive', exact: true }).click();
  await expect(page.getByTestId('feedback')).toContainText('Not quite');
  await expect(page.getByTestId('word-grades')).toHaveCount(0);
});

test("a word's flashcard shows the same three buttons once it is shown", async ({ page }) => {
  await reviewOf(page, 'flashcard');
  await expect(page.getByTestId('word-grades')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expectThreeInARow(page, page.getByTestId('word-grades'));
  await shot(page, 'review-word-grades-flashcard');
});
