// The Number sheet at 390x844 (mw-5r3p30.1127): in Genesis 14:14 the English chunk "the 318" holds the four Hebrew words that write the number; a tap opens a sheet with the whole phrase in
// source order, each word's value and the line '8 + 10 + 300 = 318', and each word opens its own word sheet. The Greek of John 21:11 ('153') does the same; a number of one word opens the word sheet.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const noSideways = async (page: Page): Promise<void> => {
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
};

const onScreen = async (page: Page, name: string): Promise<void> => {
  const box = (await page.getByRole('dialog', { name, exact: true }).boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(844 + 0.5);
};

test('Genesis 14:14: "the 318" opens the Number sheet with eight, ten, three, hundreds and 8 + 10 + 300 = 318; a word opens its sheet', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=14');
  await page.locator('[data-verse="14"] [data-chunk]', { hasText: /^the 318\s*$/ }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Number', exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('number-sum')).toHaveText('318');
  const words = sheet.getByRole('list', { name: 'Words of the number' }).getByRole('listitem');
  await expect(words).toHaveCount(4);
  await expect(words.nth(0)).toContainText('שְׁמֹנָה');
  await expect(words.nth(1)).toContainText('עָשָׂר');
  await expect(words.nth(2)).toContainText('שְׁלֹשׁ');
  await expect(words.nth(3)).toContainText('מֵאוֹת');
  await expect(sheet.getByTestId('number-value')).toHaveText(['8', '10', '3', '100']);
  await expect(sheet.getByTestId('number-line')).toHaveText('8 + 10 + 300 = 318');
  await noSideways(page);
  await onScreen(page, 'Number');
  // every row is a thumb-sized tap target
  for (const row of await words.all()) expect((await row.getByRole('button').boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  await shot(page, 'number-sheet');

  // a word opens its own word sheet over this one (eight, H8083)
  await words.nth(0).getByRole('button').click();
  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(word.getByTestId('sheet-lemma')).toHaveText('שְׁמֹנֶה');
  await expect(word.getByTestId('sheet-strongs')).toHaveText('H8083');
  await expect(word.getByTestId('sheet-gloss')).toHaveText(/eight/);
  await word.getByRole('button', { name: 'Done' }).click();
  await expect(word).toHaveCount(0);
  // closing the word brings the Number sheet back
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toHaveCount(0);
});

/** Hebrew words of his, solid, written into the app's own store the moment it is first made (the pattern of tests/e2e/hebrew-reader.spec.ts), so the weave draws them in Hebrew. */
async function giveHebrewWords(page: Page, lemmas: string[]): Promise<void> {
  const now = Date.now();
  const words = lemmas.map((lemma) => ({ lemma, lemmas: [lemma], gloss: '', lesson: 0, state: 'solid', since: now }));
  await page.addInitScript((words) => {
    const open = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (this: IDBFactory, name: string, version?: number) {
      const request = version === undefined ? open.call(this, name) : open.call(this, name, version);
      if (name !== 'lampas') return request;
      let created = false;
      request.addEventListener('upgradeneeded', (event) => {
        if ((event as IDBVersionChangeEvent).oldVersion === 0) created = true;
      });
      request.addEventListener('success', () => {
        if (!created) return;
        const tx = request.result.transaction(['words'], 'readwrite');
        for (const word of words) tx.objectStore('words').put(word);
      });
      return request;
    } as typeof IDBFactory.prototype.open;
  }, words);
}

test('in the weave the Hebrew words that stand where "the 318" was open the same Number sheet', async ({ page }) => {
  // a chunk is woven only when he knows every word it holds (src/data/weave.ts weaveVerse): all four of the number's
  await giveHebrewWords(page, ['שְׁמֹנֶה', 'עָשָׂר', 'שָׁלֹשׁ', 'מֵאָה']);
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=14&weave=solid');
  const woven = page.locator('[data-verse="14"] [data-woven][data-chunk="6"]');
  // the weave draws each word with its cantillation, each its own tap
  const words = woven.getByRole('button');
  await expect(words).toHaveText(['שְׁמֹנָ֤ה', 'עָשָׂר֙', 'וּשְׁלֹ֣שׁ', 'מֵא֔וֹת']);
  await words.first().click();
  const sheet = page.getByRole('dialog', { name: 'Number', exact: true });
  await expect(sheet.getByTestId('number-line')).toHaveText('8 + 10 + 300 = 318');
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toHaveCount(0);
});

test('"of thousands" in Genesis 24:60 holds a numeral word but says no number: the word sheet', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=24');
  await page.locator('[data-verse="60"] [data-chunk]', { hasText: /^of thousands\s*$/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Number', exact: true })).toHaveCount(0);
});

test('John 21:11: "153" opens the Number sheet with 100 + 50 + 3 = 153', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=jhn&c=21');
  await page.locator('[data-verse="11"] [data-chunk]', { hasText: /^153/ }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Number', exact: true });
  await expect(sheet.getByTestId('number-sum')).toHaveText('153');
  await expect(sheet.getByRole('list', { name: 'Words of the number' }).getByRole('listitem')).toHaveCount(3);
  await expect(sheet.getByTestId('number-value')).toHaveText(['100', '50', '3']);
  await expect(sheet.getByTestId('number-line')).toHaveText('100 + 50 + 3 = 153');
  await noSideways(page);
  await onScreen(page, 'Number');
  await shot(page, 'number-sheet-greek');

  await sheet.getByRole('list', { name: 'Words of the number' }).getByRole('button').nth(2).click();
  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(word.getByTestId('sheet-lemma')).toHaveText('τρεῖς');
});

test('a number of one word, "the seventh" (Genesis 2:2) and "a hundred" (Genesis 17:17), still opens the plain word sheet', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=2');
  await page.locator('[data-verse="2"] [data-chunk]', { hasText: /seventh/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Number', exact: true })).toHaveCount(0);
  await page.getByRole('dialog', { name: 'Word', exact: true }).getByRole('button', { name: 'Done' }).click();

  await page.goto('/#/?b=gen&c=17');
  await page.locator('[data-verse="17"] [data-chunk]', { hasText: /^a hundred\s*$/ }).first().click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Number', exact: true })).toHaveCount(0);
});
