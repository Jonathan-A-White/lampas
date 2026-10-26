// The Reader's Hebrew view and weave on Genesis 1 (mw-5vvlay.1) at 390x844: the switch reads English | Hebrew, the Hebrew verse runs right to left in its face with the
// verse number at the right edge and every word a thumb-sized tap, the weave lays the English against the Hebrew (Order Hebrew: right to left), a long press on a Hebrew word says it
// in he-IL. The engine is voice-kit's honest fake (headless Chromium has no Hebrew voice); how a real voice sounds is only a phone check.
import { expect, test, type Page } from '@playwright/test';
import { holdFor } from '../support/hold';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });

/** Two Hebrew words of his, solid, written into the app's own store the moment it is first made (the pattern of tests/e2e/his-words.ts). */
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

const noSideways = async (page: Page): Promise<void> => {
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
};

test('Genesis 1 in the Hebrew view: right to left, pointed, in the Hebrew face, every word a tap', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR', 'he-IL'] });
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button')).toHaveText(['English', 'Hebrew']);
  await choice(page, 'Hebrew').click();
  await expect(choice(page, 'Hebrew')).toHaveAttribute('aria-pressed', 'true');

  const row = page.locator('[data-verse="1"]');
  await expect(row).toHaveAttribute('dir', 'rtl');
  await expect(row).toHaveAttribute('lang', 'he');
  await expect(row.locator('[data-word="0"]')).toHaveText(/^בְּרֵאשִׁ֖ית/);
  await expect(row.locator('[data-word]')).toHaveCount(7);
  expect(await row.evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
  expect(await row.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Noto Serif Hebrew');

  // the verse number stands at the right edge, then the words from the right to the left
  const rowBox = (await row.boundingBox())!;
  const number = (await row.getByRole('button', { name: 'Verse 1' }).boundingBox())!;
  const first = (await row.locator('[data-word="0"]').boundingBox())!;
  const last = (await row.locator('[data-word="6"]').boundingBox())!;
  expect(number.x + number.width).toBeGreaterThan(rowBox.x + rowBox.width - 12);
  expect(first.x).toBeLessThan(number.x);
  expect(last.x).toBeLessThan(first.x);
  for (const w of await row.locator('[data-word]').all()) expect((await w.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  await noSideways(page);

  // the heading sits at the right edge too, its English still left to right
  const heading = page.locator('[data-heading] button').first();
  await expect(heading).toHaveText('The Creation');
  expect(await heading.evaluate((el) => getComputedStyle(el).textAlign)).toBe('right');
  await shot(page, 'hebrew-genesis-1');

  // a tap on a word: its Hebrew word sheet (tests/e2e/hebrew-word-sheet.spec.ts has its layout)
  await row.locator('[data-word="4"]').click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('שָׁמַיִם');
  await sheet.getByRole('button', { name: 'Done' }).click();

  // a long press says the word in Hebrew, the cantillation marks off
  await holdFor(page, row.locator('[data-word="4"]'), 700);
  await expect.poll(async () => (await spoken(page)).map((u) => [u.text, u.lang])).toContainEqual(['הַשָּׁמַיִם', 'he-IL']);
});

test('the weave lays the English against the Hebrew; a long press on Weave lays it out right to left in the Hebrew order', async ({ page }) => {
  await giveHebrewWords(page, ['רֵאשִׁית', 'אֱלֹהִים']);
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1&weave=solid');
  const verse1 = page.locator('[data-verse="1"] [data-text]');
  await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button')).toHaveText(['English', 'Weave', 'Hebrew']);
  await expect(choice(page, 'Weave')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-verse="1"] [data-woven]')).toHaveCount(2);
  await expect(verse1).toHaveText(/^בְּרֵאשִׁ֖ית\s+אֱלֹהִ֑ים\s+created the heavens and the earth\./);
  await expect(page.getByTestId('weave-count')).toHaveText(/^\d+ words in Hebrew$/);
  await expect(page.locator('[data-verse="1"]')).not.toHaveAttribute('dir', 'rtl');
  await noSideways(page);
  await shot(page, 'hebrew-genesis-1-weave-english-order');

  await holdFor(page, choice(page, 'Weave'), 700);
  await expect(page.getByRole('status').filter({ hasText: 'Hebrew word order' })).toBeVisible();
  await expect(verse1).toHaveText(/^בְּרֵאשִׁ֖ית\s+created\s+אֱלֹהִ֑ים\s+the heavens and the earth\./);
  await expect(page.locator('[data-verse="1"]')).toHaveAttribute('dir', 'rtl');
  // the first chunk in the Hebrew order stands at the right edge, the later ones to its left
  const woven = await page.locator('[data-verse="1"] [data-woven]').all();
  const chunks = await page.locator('[data-verse="1"] [data-chunk]').all();
  const a = (await chunks[0].boundingBox())!;
  const b = (await chunks[1].boundingBox())!;
  expect(b.x + b.width).toBeLessThanOrEqual(a.x + 1);
  expect(woven).toHaveLength(2);
  await noSideways(page);
  await shot(page, 'hebrew-genesis-1-weave');
});

test('Read from the top in the Hebrew view speaks the Hebrew in he-IL, and a Greek chapter still reads English | Greek', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR', 'he-IL'] });
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1&view=greek');
  await expect(choice(page, 'Hebrew')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Read from the top' }).click();
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0);
  const first = (await spoken(page))[0];
  expect(first.lang).toBe('he-IL');
  expect(first.text.startsWith('בְּרֵאשִׁית')).toBe(true);

  await page.goto('/#/?b=rom&c=8&view=greek');
  await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button')).toHaveText(['English', 'Greek']);
  await expect(choice(page, 'Greek')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-verse="1"]')).toHaveAttribute('lang', 'el');
});
