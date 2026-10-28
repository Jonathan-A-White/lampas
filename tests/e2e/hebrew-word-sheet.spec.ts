// The Hebrew word sheet on Genesis 1 (mw-5vvlay.2) at 390x844: a tap on בְּרֵאשִׁ֖ית opens a sheet whose Hebrew form is large and runs right to left at the right edge, its
// transliteration, lemma, meaning, parsing and Strong's number follow, the sheet never scrolls the page sideways and its Done, Listen and Study tiles are thumb-sized; an English tap
// opens the same sheet with the English words under the Hebrew; #/?word=H7225 opens the sheet of a word by itself.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { shelveLexicons, switchOnResources } from './long-library';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const noSideways = async (page: Page): Promise<void> => {
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
};

test('a tap on the first Hebrew word of Genesis 1 opens its sheet: large, right to left, every row on the screen', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1');
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Hebrew', exact: true }).click();
  await page.locator('[data-verse="1"] [data-word="0"]').click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();

  const form = sheet.getByTestId('sheet-word');
  await expect(form).toHaveText('בְּרֵאשִׁ֖ית');
  await expect(form).toHaveAttribute('lang', 'he');
  await expect(form).toHaveAttribute('dir', 'rtl');
  expect(await form.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(30);
  // the Hebrew stands at the right edge of its row, Listen at the left
  const box = (await form.boundingBox())!;
  const listen = (await sheet.getByRole('button', { name: 'Listen', exact: true }).boundingBox())!;
  expect(listen.x).toBeLessThan(box.x);
  expect(listen.width).toBeGreaterThanOrEqual(43.5);
  expect(listen.height).toBeGreaterThanOrEqual(43.5);

  await expect(sheet.getByTestId('sheet-respelling')).toHaveText('be-reh-SHEET');
  await expect(sheet.getByTestId('sheet-transliteration')).toHaveCount(0);
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('רֵאשִׁית');
  await expect(sheet.getByTestId('sheet-gloss')).toHaveText('first, beginning');
  await expect(sheet.getByTestId('sheet-parse')).toHaveText('Preposition-b | Noun - feminine singular');
  await expect(sheet.getByTestId('sheet-strongs')).toHaveText('H7225');
  await noSideways(page);
  // the whole sheet is on the screen
  const dialog = (await sheet.boundingBox())!;
  expect(dialog.y).toBeGreaterThanOrEqual(0);
  expect(dialog.y + dialog.height).toBeLessThanOrEqual(844 + 0.5);
  await shot(page, 'hebrew-word-sheet');

  const done = (await sheet.getByRole('button', { name: 'Done' }).boundingBox())!;
  expect(done.height).toBeGreaterThanOrEqual(43.5);
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toHaveCount(0);
});

test('an English tap opens the sheet with the Hebrew word of the chunk and the English words under it', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1');
  await page.locator('[data-verse="1"] [data-chunk]', { hasText: /^the heavens\s*$/ }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-heading')).toContainText('the heavens');
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('שָׁמַיִם');
  await expect(sheet.getByRole('listitem')).toHaveCount(1);
  await expect(sheet.getByRole('button', { name: 'Listen: heavens' })).toBeVisible();
  await noSideways(page);
  await shot(page, 'hebrew-word-sheet-english-tap');
});

test('#/?word=H7225 opens the sheet of רֵאשִׁית with no parsing', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?word=H7225');
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('רֵאשִׁית');
  await expect(sheet.getByTestId('sheet-gloss')).toHaveText('first, beginning');
  await expect(sheet.getByTestId('sheet-parse')).toHaveCount(0);
  await noSideways(page);
});

test('the sheet of וַיְהִי in Jonah 1:1 has the Paradigm row, Help with this word and All lexicons, each Hebrew and on the screen', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await switchOnResources(page);
  await shelveLexicons(page);
  await page.goto('/#/?b=jon&c=1');
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Hebrew', exact: true }).click();
  await page.locator('[data-verse="1"] [data-word="0"]').click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-paradigm')).toBeVisible();

  // each term of the parsing is a link, thumb-sized
  const term = sheet.getByTestId('sheet-parse').getByRole('button', { name: 'Verb', exact: true });
  await expect(term).toBeVisible();

  // Help with this word: Grammar, Syllables and sounds, Ask the tutor
  const help = sheet.getByRole('group', { name: 'Help with this word', exact: true });
  for (const name of ['Grammar', 'Syllables and sounds', 'Ask the tutor']) {
    const button = help.getByRole('button', { name });
    await button.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible();
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  }

  // the door to every Hebrew lexicon, whose sheet draws the word right to left in the Hebrew face
  const door = sheet.getByRole('group', { name: 'Study', exact: true }).getByRole('button', { name: /^All \d+ lexicons ›$/ });
  await door.scrollIntoViewIfNeeded();
  await door.click();
  const all = page.getByRole('dialog', { name: 'All lexicons', exact: true });
  const drawn = all.locator('.script-he').first();
  await expect(drawn).toBeVisible();
  await expect(drawn).toHaveAttribute('lang', 'he');
  await all.getByRole('button', { name: 'Done', exact: true }).click();

  const dialog = (await sheet.boundingBox())!;
  expect(dialog.y).toBeGreaterThanOrEqual(0);
  expect(dialog.y + dialog.height).toBeLessThanOrEqual(844 + 0.5);
  await noSideways(page);
  await shot(page, 'hebrew-word-sheet-full');
});
