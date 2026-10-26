// A tap on one word of an English chunk looks up that word alone (mw-5r3p30.782): 'of Nineveh' is one tap target, so the sheet is told which word the finger was on, from the click's place.
// The original-language word stays the chunk's one word. Real layout, at 390x844: jsdom has no word boxes.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { leaveSettings, openGroup } from './settings-group';

test.use({ viewport: { width: 390, height: 844 } });

async function turnOnLogos(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  await page.getByRole('region', { name: 'Study resources' }).getByRole('switch', { name: 'Logos', exact: true }).click();
  await leaveSettings(page);
}

/** A click on the middle of the first line of `word` inside `chunk`, where the browser draws it. */
async function tapWord(page: Page, chunk: Locator, word: string) {
  await chunk.scrollIntoViewIfNeeded();
  const at = await chunk.evaluate((el, w) => {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const i = (n.textContent ?? '').indexOf(w);
      if (i < 0) continue;
      const range = document.createRange();
      range.setStart(n, i);
      range.setEnd(n, i + w.length);
      const r = range.getClientRects()[0];
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return null;
  }, word);
  expect(at).not.toBeNull();
  await page.mouse.click(at!.x, at!.y);
}

test('Jonah 1:1 in English: "of" looks up only "of", "Amittai," only "amittai", the Hebrew word stays one', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=jon&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await turnOnLogos(page);
  const chunk = page.locator('[data-verse="1"] [data-chunk]', { hasText: /^of Amittai,\s*$/ });
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  const rows = sheet.getByRole('listitem');

  await tapWord(page, chunk, 'of');
  await expect(sheet.getByTestId('sheet-heading')).toContainText('of Amittai');
  await expect(sheet.getByTestId('sheet-lemma')).toHaveCount(1);
  await expect(rows).toHaveCount(1);
  await expect(sheet.getByRole('link', { name: 'Look it up in Logos: of', exact: true })).toBeVisible();
  await shot(page, 'tapped-english-word-of');
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();

  await tapWord(page, chunk, 'Amittai');
  await expect(rows).toHaveCount(1);
  await expect(sheet.getByRole('link', { name: 'Look it up in Logos: amittai', exact: true })).toBeVisible();
  await expect(sheet.getByTestId('sheet-lemma')).toHaveCount(1);
});

test('Matthew 12:41 in English: "of" looks up only "of", "Nineveh" only "nineveh"', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=mat&c=12&view=english');
  await expect(page.locator('[data-verse="41"]')).toBeVisible();
  await turnOnLogos(page);
  const chunk = page.locator('[data-verse="41"] [data-chunk]', { hasText: /^of Nineveh\s*$/ });
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  const lookups = sheet.getByRole('link', { name: /^Look it up in Logos \(English\)/ });

  await tapWord(page, chunk, 'of');
  await expect(sheet.getByTestId('sheet-heading')).toContainText('of Nineveh');
  await expect(lookups).toHaveText(['Look it up in Logos (English): of']);
  await expect(sheet.getByTestId('sheet-word')).toHaveCount(1);
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();

  await tapWord(page, chunk, 'Nineveh');
  await expect(lookups).toHaveText(['Look it up in Logos (English): nineveh']);
  await expect(sheet.getByTestId('sheet-word')).toHaveCount(1);
  await shot(page, 'tapped-english-word-nineveh');
});
