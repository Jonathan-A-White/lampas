// tests/e2e/play-to.spec.ts — Play to and listening by what he tapped (mw-5r3p30.705): the header's Play goes on to the end of the book (2 John 1 stops at its end)
// or to the end of the Bible (it goes on into 3 John 1, and past the end of that book too, and the Reader turns to each); a verse's Listen reads that verse only, a section heading's view reads that section only,
// the place line's chapter view reads that chapter only. A phone-width spec (390x844) on the honest speech of voice-kit: a verse takes the time it takes to say.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

interface Verse {
  n: number;
  h?: string;
  e: { t: string }[];
}
const versesOf = (path: string): Verse[] => (JSON.parse(readFileSync(`public/data/${path}.json`, 'utf8')) as { verses: Verse[] }).verses;
const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
/** What the English view says of these verses: their chunks in order, one space apart. */
const englishOf = (verses: Verse[]): string => squash(verses.map((v) => v.e.map((c) => c.t).join(' ')).join(' '));

const JOHN2 = versesOf('2jn/1');
const JOHN3 = versesOf('3jn/1');

/** Puts settings in the app's store through raw IndexedDB, as the app wrote them. */
async function keep(page: Page, values: Record<string, string>) {
  await page.evaluate(
    (pairs) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          for (const [key, value] of Object.entries(pairs)) tx.objectStore('settings').put({ key, value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    values,
  );
}

/** A licensed phone with a fast reader, open on 2 John 1 in the English view with these settings. */
async function start(page: Page, settings: Record<string, string> = {}) {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 5 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await keep(page, { immersiveHint: 'off', ...settings });
  await page.goto('/#/?b=2jn&c=1&view=english&weave=off');
  await page.reload();
  await expect(page.getByRole('heading', { name: '2 John 1', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

/** Everything the voice has said since the page opened, as the one text it came to. */
const said = async (page: Page): Promise<string> => squash((await spoken(page)).map((s) => s.text).join(' '));

/** The reading is over: no speaking bar, no verse being read. */
const over = (page: Page) => expect(page.locator('[data-reading-bar]')).toHaveCount(0);

test('End of the book: the header Play on 2 John 1 reads to the end of 2 John and stops there', async ({ page }) => {
  await start(page, { readSpan: 'book' });
  await page.getByRole('button', { name: 'Read from the top', exact: true }).click();
  await expect.poll(() => said(page), { timeout: 30_000 }).toContain(englishOf(JOHN2.slice(-1)));
  await over(page);
  // it did not go on: the Reader is still on 2 John 1 and 3 John was not read
  expect(await said(page)).toBe(englishOf(JOHN2));
  await expect(page.getByRole('heading', { name: '2 John 1', level: 1 })).toBeVisible();
  await shot(page, 'play-to-book');
});

test('End of the Bible: the header Play on 2 John 1 goes on into 3 John 1 and the Reader turns to it', async ({ page }) => {
  await start(page, { readSpan: 'bible' });
  await page.getByRole('button', { name: 'Read from the top', exact: true }).click();
  await expect(page.getByRole('heading', { name: '3 John 1', level: 1 })).toBeVisible({ timeout: 30_000 });
  // all of 2 John, then all of 3 John, and on into Jude: the Bible goes on past a book's end until Revelation 22 or Stop
  await expect.poll(async () => (await said(page)).startsWith(englishOf([...JOHN2, ...JOHN3])), { timeout: 30_000 }).toBe(true);
  await expect(page.getByRole('heading', { name: /^(3 John 1|Jude 1)$/, level: 1 })).toBeVisible();
  await shot(page, 'play-to-bible');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await over(page);
});

test('an old saved span (Chapter) reads as End of the book', async ({ page }) => {
  await start(page, { readSpan: 'chapter' });
  await page.goto('/#/settings?group=listening');
  const group = page.getByRole('group', { name: 'Play to' });
  await expect(group.getByRole('button', { name: 'End of the book', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(group.getByRole('button', { name: 'End of the Bible', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('a verse: its Listen reads that verse only, even with End of the Bible', async ({ page }) => {
  await start(page, { readSpan: 'bible' });
  await page.locator('[data-verse="5"]').getByRole('button', { name: 'Verse 5' }).click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.locator('[data-verse-bar]').getByRole('button', { name: 'Play verse 5', exact: true }).click();
  await expect.poll(() => said(page), { timeout: 30_000 }).toContain(englishOf(JOHN2.filter((v) => v.n === 5)));
  await over(page);
  expect(await said(page)).toBe(englishOf(JOHN2.filter((v) => v.n === 5)));
});

test('a section heading: its view plays that section only, even with End of the Bible', async ({ page }) => {
  await start(page, { readSpan: 'bible' });
  await page.getByRole('button', { name: 'Beware of Deceivers', exact: true }).click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.locator('[data-verse-bar]').getByRole('button', { name: 'Play verses 7-11', exact: true }).click();
  const section = JOHN2.filter((v) => v.n >= 7 && v.n <= 11);
  await expect.poll(() => said(page), { timeout: 30_000 }).toContain(englishOf(section.slice(-1)));
  await over(page);
  expect(await said(page)).toBe(englishOf(section));
  await shot(page, 'play-to-section');
});

test('the place line: its chapter view plays that chapter only, even with End of the Bible', async ({ page }) => {
  await start(page, { readSpan: 'bible', readingMode: 'pages' });
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-paging', 'pages');
  await page.locator('[data-place-line]').click();
  const view = page.getByRole('region', { name: 'Verse view' });
  await view.locator('[data-verse-bar]').getByRole('button', { name: 'Play verses 1-13', exact: true }).click();
  await expect.poll(() => said(page), { timeout: 30_000 }).toContain(englishOf(JOHN2.slice(-1)));
  await over(page);
  expect(await said(page)).toBe(englishOf(JOHN2));
});
