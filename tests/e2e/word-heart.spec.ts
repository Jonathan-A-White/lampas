// The heart of the word (mw-bsf54t.14, src/data/wordHeart.ts) at 390x844: a row on the word's sheet for a word that has a note and none for one that has not; under the gloss on the
// teach sheet's card that first teaches the word; under the answer of a Review card he missed. Each ends with a screenshot.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
test.use({ viewport: VIEWPORT });

const THELO = 'θέλω';
const THREAD = 'One thread ties them together: the heart leaning toward something.';

/** Romans 7 in the Greek view, `form` of verse 15 tapped: the word's sheet. */
async function openSheetOf(page: Page, form: string) {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=7&view=greek');
  await page.reload();
  await page.locator('[data-verse="15"]').getByRole('button', { name: form, exact: true }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();
  return sheet;
}

test("θέλω's sheet has a 'The heart of the word' row he can scroll to and read, and a word without a note has none", async ({ page }) => {
  const sheet = await openSheetOf(page, THELO);
  const row = sheet.getByRole('group', { name: 'The heart of the word', exact: true });
  await row.scrollIntoViewIfNeeded();
  await expect(row).toBeVisible();
  await expect(row).toContainText(THREAD);
  // the sheet stays on the phone (its scroll box is capped, so the row costs it no height), and the row is inside it, in its width
  const box = await sheet.boundingBox();
  expect(box && box.y >= 0 && box.y + box.height <= VIEWPORT.height).toBe(true);
  const rowBox = await row.boundingBox();
  expect(rowBox && rowBox.x >= 0 && rowBox.x + rowBox.width <= VIEWPORT.width && rowBox.y >= (box?.y ?? 0)).toBe(true);
  await shot(page, "word-heart-sheet");

  // πράσσω has no note
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toBeHidden();
  await page.locator('[data-verse="15"]').getByRole('button', { name: 'πράσσω', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true }).getByTestId('sheet-lemma')).toHaveText('πράσσω');
  await expect(page.getByRole('group', { name: 'The heart of the word', exact: true })).toHaveCount(0);
});

/** A Review round of one θέλω card, kept as a reload would keep it, so the card is the one asked. */
async function reviewOf(page: Page, mode: 'choice' | 'flashcard') {
  await openUnlocked(page);
  const item = {
    kind: 'word',
    id: THELO,
    mode,
    question: { lemma: THELO, prompt: THELO, gloss: 'to will, wish, desire', options: ['to will, wish, desire', 'to see, perceive', 'to say, speak', 'to go, depart'] },
  };
  await page.addInitScript(
    (kept) => window.sessionStorage.setItem('lampas.reviewRound', JSON.stringify({ round: { status: 'running', items: [kept], index: 0, picked: null, right: 0, missed: [] }, at: Date.now() })),
    item,
  );
  await page.goto('/#/review');
  await expect(page.getByTestId('prompt')).toHaveText(THELO);
}

test('a Review card he misses shows the heart of the word under the answer, and a right one shows none', async ({ page }) => {
  await reviewOf(page, 'choice');
  await expect(page.getByTestId('word-heart')).toHaveCount(0);
  await page.getByRole('button', { name: 'to see, perceive', exact: true }).click();
  const heart = page.getByTestId('word-heart');
  await expect(heart).toBeVisible();
  await expect(heart).toContainText(THREAD);
  await expect(page.getByTestId('feedback')).toContainText('Not quite');
  // the card scrolls above the sticky Next bar: the note scrolls into view whole, clear of the bar, and Next stays in reach
  await page.locator('main.screen').evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  const box = await heart.boundingBox();
  const bar = await page.locator('[data-next-bar]').boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= VIEWPORT.width).toBe(true);
  expect(box && bar && box.y + box.height <= bar.y + 1).toBe(true);
  expect(bar && bar.y + bar.height).toBeLessThanOrEqual(VIEWPORT.height);
  await shot(page, 'word-heart-review');
});

test('a Review card answered right shows no note', async ({ page }) => {
  await reviewOf(page, 'choice');
  await page.getByRole('button', { name: 'to will, wish, desire', exact: true }).click();
  await expect(page.getByTestId('feedback')).toHaveText('Right.');
  await expect(page.getByTestId('word-heart')).toHaveCount(0);
});

test('a flashcard answered Not yet shows the note under the answer', async ({ page }) => {
  await reviewOf(page, 'flashcard');
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(page.getByTestId('word-heart')).toHaveCount(0);
  await page.getByRole('button', { name: 'Not yet', exact: true }).click();
  await expect(page.getByTestId('word-heart')).toContainText(THREAD);
});

test("the teach sheet shows αὐτός's note under its gloss and the buttons stay on the phone", async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await page.getByTestId('new-words').click();
  const sheet = page.getByRole('dialog', { name: 'New word' });
  await expect(sheet.getByTestId('teach-lemma')).toHaveText('αὐτός');
  const heart = sheet.getByTestId('word-heart');
  await expect(heart).toContainText('αὐτός has three jobs');
  const gloss = await sheet.getByTestId('teach-gloss').boundingBox();
  const note = await heart.boundingBox();
  expect((note?.y ?? 0)).toBeGreaterThan((gloss?.y ?? 0) + (gloss?.height ?? 0) - 1);
  const panel = await sheet.boundingBox();
  expect((panel?.y ?? 0) + (panel?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  for (const name of ['Got it', 'I know this', 'Not now', 'Ask the tutor']) {
    const b = await sheet.getByRole('button', { name, exact: true }).boundingBox();
    expect((b?.y ?? 0) + (b?.height ?? 0), name).toBeLessThanOrEqual(VIEWPORT.height);
  }
  await shot(page, 'word-heart-teach');
  // εἰς, the next word, has no note
  await sheet.getByRole('button', { name: 'Not now', exact: true }).click();
  await expect(sheet.getByTestId('teach-lemma')).toHaveText('εἰς');
  await expect(sheet.getByTestId('word-heart')).toHaveCount(0);
});
