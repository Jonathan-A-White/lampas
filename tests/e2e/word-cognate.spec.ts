// The English cousin (mw-5r3p30.988, src/data/cognates.ts) at 390x844: under the gloss on the teach sheet's card that first teaches περί, a row on its word sheet, nothing for a word with no cousin,
// and nothing at all when the app's language is not English. Each ends with a screenshot.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };
test.use({ viewport: VIEWPORT });

const COUSIN = { name: 'An English cousin', exact: true } as const;

/** Whether `inner` lies wholly inside `outer`. */
async function within(inner: Locator, outer: Locator): Promise<boolean> {
  const a = await inner.boundingBox();
  const b = await outer.boundingBox();
  return !!a && !!b && a.x >= b.x - 0.5 && a.x + a.width <= b.x + b.width + 0.5 && a.y >= b.y - 0.5 && a.y + a.height <= b.y + b.height + 0.5;
}

/** Romans 8 with its teach sheet open on the first new word; each word is put by with Not now until the sheet is on `lemma`. */
async function teachSheetOn(page: Page, lemma: string) {
  await openUnlocked(page);
  await page.goto('/');
  await page.getByTestId('new-words').click();
  const sheet = page.getByRole('dialog', { name: 'New word' });
  for (let i = 0; i < 60 && (await sheet.getByTestId('teach-lemma').innerText()) !== lemma; i++) {
    await sheet.getByRole('button', { name: 'Not now', exact: true }).click();
    await expect(sheet.getByTestId('teach-lemma')).not.toHaveText('');
  }
  await expect(sheet.getByTestId('teach-lemma')).toHaveText(lemma);
  return sheet;
}

/** Romans 8 in the Greek view, `form` of verse `verse` tapped: the word's sheet. */
async function wordSheetOf(page: Page, verse: number, form: string) {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8&view=greek');
  await page.reload();
  await page.locator(`[data-verse="${verse}"]`).getByRole('button', { name: form, exact: true }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();
  return sheet;
}

test('the teach sheet shows perimeter under the gloss of περί, clear of the picture and the buttons', async ({ page }) => {
  const sheet = await teachSheetOn(page, 'περί');
  const cousin = sheet.getByRole('group', COUSIN);
  await expect(cousin).toBeVisible();
  await expect(cousin).toContainText('perimeter');
  await expect(cousin).toContainText('περι-');
  await expect(cousin).toContainText('the distance around');
  // under the gloss, not over it, and wholly inside the sheet's width
  const gloss = await sheet.getByTestId('teach-gloss').boundingBox();
  const box = await cousin.boundingBox();
  expect((box?.y ?? 0)).toBeGreaterThan((gloss?.y ?? 0) + (gloss?.height ?? 0) - 1);
  const panel = await sheet.boundingBox();
  expect(box && panel && box.x >= panel.x && box.x + box.width <= panel.x + panel.width).toBe(true);
  expect((panel?.y ?? 0) + (panel?.height ?? 0)).toBeLessThanOrEqual(VIEWPORT.height);
  // no text of it is clipped: the row is as tall as what is in it
  expect(await cousin.evaluate((el) => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
  for (const name of ['Got it', 'I know this', 'Not now']) {
    const b = await sheet.getByRole('button', { name, exact: true }).boundingBox();
    expect((b?.y ?? 0) + (b?.height ?? 0), name).toBeLessThanOrEqual(VIEWPORT.height);
  }
  // it stays out of the picture's way: nothing the row holds overlaps the verse link below it
  const link = await sheet.getByTestId('teach-verse-link').boundingBox();
  expect((link?.y ?? 0)).toBeGreaterThanOrEqual((box?.y ?? 0) + (box?.height ?? 0) - 1);
  await shot(page, 'word-cognate-teach');
});

test('the teach sheet of a word with no English cousin has no row and no empty line', async ({ page }) => {
  // ὅς has none
  const sheet = await teachSheetOn(page, 'ὅς');
  await expect(sheet.getByRole('group', COUSIN)).toHaveCount(0);
  await expect(sheet.getByTestId('word-cognate')).toHaveCount(0);
  // the gloss is followed straight by the next thing, with no blank box of its own between
  const gloss = await sheet.getByTestId('teach-gloss').boundingBox();
  const next = await sheet.getByTestId('teach-form').boundingBox();
  expect((next?.y ?? 0) - ((gloss?.y ?? 0) + (gloss?.height ?? 0))).toBeLessThan(40);
});

test("περί's word sheet has an 'An English cousin' row he can scroll to, inside the sheet", async ({ page }) => {
  const sheet = await wordSheetOf(page, 3, 'περὶ');
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('περί');
  const row = sheet.getByRole('group', COUSIN);
  await row.scrollIntoViewIfNeeded();
  await expect(row).toBeVisible();
  await expect(row).toContainText('perimeter');
  await expect(row).toContainText('the distance around');
  expect(await within(row, sheet)).toBe(true);
  const panel = await sheet.boundingBox();
  expect(panel && panel.y >= 0 && panel.y + panel.height <= VIEWPORT.height).toBe(true);
  expect(await row.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await shot(page, 'word-cognate-sheet');
});

test('the word sheet of a word with no English cousin has no row', async ({ page }) => {
  const sheet = await wordSheetOf(page, 3, 'γὰρ');
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('γάρ');
  await expect(sheet.getByRole('group', COUSIN)).toHaveCount(0);
  await expect(sheet.getByTestId('word-cognate')).toHaveCount(0);
});

test('with the app in another language, neither sheet shows a cousin', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8&view=greek');
  await page.reload();
  await page.evaluate(() => {
    document.documentElement.lang = 'es';
  });
  await page.locator('[data-verse="3"]').getByRole('button', { name: 'περὶ', exact: true }).first().click();
  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(word.getByTestId('sheet-lemma')).toHaveText('περί');
  await expect(word.getByRole('group', COUSIN)).toHaveCount(0);
  await word.getByRole('button', { name: 'Done', exact: true }).click();
  // and back in English it is there again
  await page.evaluate(() => {
    document.documentElement.lang = 'en';
  });
  await page.locator('[data-verse="3"]').getByRole('button', { name: 'περὶ', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true }).getByRole('group', COUSIN)).toBeVisible();
});
