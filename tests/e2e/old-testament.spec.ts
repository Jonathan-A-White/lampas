import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

// 48 px is the floor for the picker's buttons (the Governor reads one-handed); a pixel of margin for sub-pixel layout.
const TAP = 47.5;

test('the picker lists the 66 books; Jonah 1 opens in the Reader in English, and a tap on a word opens the word sheet of its Hebrew word', async ({ page }) => {
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
  const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
  await expect(picker).toBeVisible();
  await expect(picker.locator('[data-book]')).toHaveCount(66);
  await expect(picker.locator('[data-in-logos]')).toHaveCount(0);

  // The list opens at the book he is in (Romans); the Old Testament is above it, in the same box: scroll to the top.
  const box = page.getByTestId('chapter-picker-box');
  await box.evaluate((el) => (el.scrollTop = 0));
  await expect(picker.locator('[data-book="gen"]')).toBeInViewport();
  const heights = await picker.locator('[data-book]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  for (const height of heights) expect(height).toBeGreaterThanOrEqual(TAP);
  const widths = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  await shot(page, 'old-testament-picker');

  // Jonah, then chapter 1: the chapter opens in the Reader, in English, with the switch English | Hebrew
  await picker.getByRole('button', { name: /^Jonah/ }).click();
  await expect(picker.locator('[data-chapter]')).toHaveCount(4);
  await picker.getByRole('button', { name: 'Chapter 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Jonah 1', level: 1 })).toBeVisible();
  await expect(picker).toHaveCount(0);
  const reader = page.locator('[data-reader]');
  await expect(reader).toHaveAttribute('data-view', 'english');
  await expect(reader).toHaveAttribute('data-weave', 'off');
  await expect(page.locator('[data-verse]')).toHaveCount(17);
  await expect(page.getByRole('group', { name: 'Language' }).getByRole('button')).toHaveText(['English', 'Hebrew']);
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);

  // a tap on a word: the word sheet of the Hebrew word it stands for (דָּג), the English word under it (mw-5vvlay.2)
  await page.locator('[data-verse="17"] [data-chunk]', { hasText: /^fish\s*$/ }).first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByTestId('sheet-heading')).toContainText('fish');
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('דָּג');
  await expect(page.getByRole('dialog', { name: 'English word' })).toHaveCount(0);
  await shot(page, 'old-testament-jonah');
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(sheet).toHaveCount(0);

  // the chapter's foot: the chapter buttons, in step with the canon
  const foot = page.getByRole('navigation', { name: 'Chapters' });
  await foot.scrollIntoViewIfNeeded();
  await expect(foot.getByRole('button', { name: '‹ Jonah 0' })).toHaveCount(0);
  await expect(foot.getByRole('button', { name: 'Jonah 2 ›' })).toBeVisible();
});

test('Malachi 4 runs into Matthew 1 and back, and an Old Testament chapter offers Read in Logos only while Logos is on', async ({ page }) => {
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/?b=mal&c=4');
  await expect(page.getByRole('heading', { name: 'Malachi 4', level: 1 })).toBeVisible();
  // Logos is off to start with: no Read in Logos
  await expect(page.locator('[data-chapter-actions]')).toHaveCount(0);
  const foot = page.getByRole('navigation', { name: 'Chapters' });
  await foot.scrollIntoViewIfNeeded();
  await foot.getByRole('button', { name: 'Matthew 1 ›' }).click();
  await expect(page.getByRole('heading', { name: 'Matthew 1', level: 1 })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Language' })).toBeVisible();
  const back = page.getByRole('navigation', { name: 'Chapters' });
  await back.scrollIntoViewIfNeeded();
  await back.getByRole('button', { name: '‹ Malachi 4' }).click();
  await expect(page.getByRole('heading', { name: 'Malachi 4', level: 1 })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Language' }).getByRole('button')).toHaveText(['English', 'Hebrew']);
});

/** Turns Logos and the Audio Bible on in the app's store through raw IndexedDB, as the app wrote them (Settings > Study resources and Audio Bible do the same). */
async function turnLogosAndAudioOn(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'resource.logos', value: 'on' });
          tx.objectStore('settings').put({ key: 'audioBible', value: 'word-of-promise' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

test('the foot of an Old Testament chapter has no Read in Logos and no Listen in Audible, though both are on; the Maps door stays and the verse has both (mw-5r3p30.1008)', async ({ page }) => {
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/?b=psa&c=23');
  await expect(page.getByRole('heading', { name: 'Psalms 23', level: 1 })).toBeVisible();
  await turnLogosAndAudioOn(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Psalms 23', level: 1 })).toBeVisible();
  const foot = page.getByRole('navigation', { name: 'Chapters' });
  await foot.scrollIntoViewIfNeeded();
  await expect(page.locator('[data-chapter-actions]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Read in Logos' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Listen in Audible/ })).toHaveCount(0);

  // the Maps door stays at a chapter's foot (Genesis 10 has maps, Psalms 23 has none)
  await page.goto('/#/?b=gen&c=10');
  await expect(page.getByRole('heading', { name: 'Genesis 10', level: 1 })).toBeVisible();
  await expect(page.locator('[data-reader]').getByRole('button', { name: /^Maps · \d+$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Read in Logos|Listen in Audible/ })).toHaveCount(0);

  // what the foot once had is on the verse: tap its number, and the Verse view has In Logos (the Tools line) and, under Listen, Listen in Audible
  await page.goto('/#/?b=psa&c=23');
  await page.getByRole('button', { name: 'Verse 1', exact: true }).click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('link', { name: 'In Logos' })).toHaveAttribute('href', 'logosres:lgcystndrdbblsb;ref=Bible.Ps23.1');
  await expect(view.getByRole('link', { name: /^Listen in Audible/ })).toBeVisible();
  await shot(page, 'old-testament-psalms');
});

// The view a verse, a passage and the whole chapter open is one Verse view: In Logos (its Tools line) and Listen in Audible (under Listen, the kept action's default) are on it for each
// unit, in both Testaments; the original-language view carries In Logos and no English audio (his word, mw-5r3p30.653).
const UNITS = [
  { name: 'a verse', ot: 'v=1', nt: 'v=1' },
  { name: 'a passage', ot: 'p=1&pt=3', nt: 'p=1&pt=4' },
  { name: 'the whole chapter', ot: 'p=1&pt=6', nt: 'p=1&pt=39' },
];
for (const [testament, book, code, chapter] of [
  ['Old Testament', 'Psalms 23', 'psa', 23],
  ['New Testament', 'Romans 8', 'rom', 8],
] as const) {
  for (const unit of UNITS) {
    for (const view of ['english', 'greek'] as const) {
      test(`${unit.name} of ${book} (${testament}) opens a view with In Logos${view === 'english' ? ' and Listen in Audible' : ' and no English audio'}, ${view} view`, async ({ page }) => {
        await routePostern(page, makeFakePostern());
        await openUnlocked(page);
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
        await turnLogosAndAudioOn(page);
        await page.goto(`/#/?b=${code}&c=${chapter}&${testament === 'Old Testament' ? unit.ot : unit.nt}&view=${view}&weave=off`);
        await page.reload();
        const region = page.getByRole('region', { name: 'Verse view' });
        await expect(region).toBeVisible();
        await expect(region.getByRole('button', { name: 'Listen', exact: true })).toBeVisible();
        await expect(region.getByRole('link', { name: 'In Logos' })).toBeVisible();
        const audible = region.getByRole('link', { name: /^Listen in Audible/ });
        await (view === 'english' ? expect(audible).toBeVisible() : expect(audible).toHaveCount(0));
      });
    }
  }
}
