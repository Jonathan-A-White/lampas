// The MSB's section headings in a Septuagint chapter (mw-u2w5klk.302) at 390x844: Swete's Greek and Brenton's English carry none, so the Reader lays the MSB's own (public/data/<book>/<n>.json, read at run
// time) on the Greek verse each heads. Genesis 12 in the English, Weave and Greek views shows 'The Call of Abram' above verse 1 and 'Abram and Sarai in Egypt' above verse 10; Section headings Off hides them;
// Psalms 23 (Greek 22) has its heading above the verse it heads. public/data-lxx ships no chapter in the gate: Genesis 12 is the fixture of Genesis 1 renumbered (as tutor-door-overlays.spec.ts does for
// Genesis 13), with each verse's `ref` answering Genesis 12, and the Psalms are the fixtures of tests/fixtures/data-lxx.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    let body = readFileSync(`tests/fixtures/data-lxx/${path === 'gen/12.json' ? 'gen/1.json' : path}`, 'utf8');
    if (path === 'index.json') {
      const index = JSON.parse(body) as { books: { code: string; chapters: number; verses: number[]; fingerprints: string[]; lampasChapters: number[][] }[] };
      const gen = index.books.find((b) => b.code === 'gen')!;
      gen.chapters = 12;
      gen.verses = Array.from({ length: 12 }, () => 31);
      gen.fingerprints = Array.from({ length: 12 }, () => gen.fingerprints[0]);
      gen.lampasChapters = Array.from({ length: 12 }, (_, i) => [i + 1]);
      body = JSON.stringify(index);
    } else if (path === 'gen/12.json') {
      const chapter = JSON.parse(body) as { chapter: number; verses: { ref: { chapter: number } }[] };
      chapter.chapter = 12;
      for (const verse of chapter.verses) verse.ref.chapter = 12;
      body = JSON.stringify(chapter);
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body });
  });
});

/** Puts a setting in the app's store through raw IndexedDB, as the app wrote it. */
async function keep(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: k, value: v });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [key, value],
  );
}

const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });
const settingRow = (page: Page, name: string) => page.getByRole('group', { name, exact: true });

/** The Septuagint On and Section headings as asked, set in Settings as the Governor does, then the chapter opened. */
async function openChapter(page: Page, address: string, headings: 'On' | 'Off'): Promise<void> {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const septuagint = settingRow(page, 'Old Testament in Greek (Septuagint)');
  await septuagint.getByRole('button', { name: 'On', exact: true }).click();
  await expect(septuagint.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await keep(page, 'weave', 'solid');
  await keep(page, 'sectionHeadings', headings.toLowerCase());
  await page.goto(address);
  await page.reload();
  await expect(page.locator('[data-reader-subtitle]')).toBeVisible();
}

/** Whether the heading stands directly above the verse it heads: it is a [data-heading] and the next thing in the chapter is the block that has the verse. */
async function headsVerse(heading: Locator, verse: number): Promise<boolean> {
  return heading.evaluate((el, n) => {
    const next = el.nextElementSibling;
    const box = el.getBoundingClientRect();
    const target = next?.matches(`[data-verse="${n}"]`) ? next : next?.querySelector(`[data-verse="${n}"]`);
    return !!target && box.bottom <= target.getBoundingClientRect().top + 1;
  }, verse);
}

for (const view of ['English', 'Weave', 'Greek'] as const) {
  test(`Genesis 12 in the Septuagint, ${view} view, Section headings On: 'The Call of Abram' is above verse 1 and 'Abram and Sarai in Egypt' above verse 10`, async ({ page }) => {
    await openChapter(page, '/#/?b=gen&c=12', 'On');
    await choice(page, view).click();
    await expect(choice(page, view)).toHaveAttribute('aria-pressed', 'true');
    const headings = page.locator('[data-heading]');
    await expect(headings).toHaveText(['The Call of Abram', 'Abram and Sarai in Egypt']);
    expect(await headsVerse(headings.nth(0), 1)).toBe(true);
    expect(await headsVerse(headings.nth(1), 10)).toBe(true);
    await shot(page, `septuagint-headings-${view.toLowerCase()}`);
  });
}

test('Genesis 12 in the Septuagint with Section headings Off shows no heading', async ({ page }) => {
  await openChapter(page, '/#/?b=gen&c=12', 'Off');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.locator('[data-heading]')).toHaveCount(0);
  await expect(page.getByText('The Call of Abram')).toHaveCount(0);
  await shot(page, 'septuagint-headings-off');
});

test("Psalms 23 (Greek 22) in the Septuagint has the MSB's heading above verse 1, whose number says 1 (22:1)", async ({ page }) => {
  await openChapter(page, '/#/?b=psa&c=23', 'On');
  await expect(page.locator('[data-heading]')).toHaveText(['The LORD Is My Shepherd']);
  expect(await headsVerse(page.locator('[data-heading]'), 1)).toBe(true);
  await expect(page.locator('[data-verse="1"] [data-verse-number]')).toHaveText(/^1\s*\(22:1\)$/);
});
