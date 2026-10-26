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

/** Turns Logos on in the app's store through raw IndexedDB, as the app wrote it (Settings > Study resources does the same). */
async function turnLogosOn(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'resource.logos', value: 'on' });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
}

test('Read in Logos stands at the foot of an Old Testament chapter, a full-height tap target, once Logos is on', async ({ page }) => {
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/?b=psa&c=23');
  await expect(page.getByRole('heading', { name: 'Psalms 23', level: 1 })).toBeVisible();
  await turnLogosOn(page);
  await page.reload();
  const actions = page.locator('[data-chapter-actions]');
  await actions.scrollIntoViewIfNeeded();
  const link = actions.getByRole('link', { name: 'Read in Logos' });
  await expect(link).toHaveAttribute('href', 'logosres:lgcystndrdbblsb;ref=Bible.Ps23');
  expect(await link.evaluate((el) => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(TAP);
  await shot(page, 'old-testament-psalms');
});
