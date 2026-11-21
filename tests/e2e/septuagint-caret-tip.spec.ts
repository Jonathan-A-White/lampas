// Brenton's plural "you^" keeps its caret and says what it means (mw-u2w5klk.378) at 390x844. Isaiah 12 in the Septuagint's English and Weave views: the mark after 'you' in verses 3 and 6 is a small raised
// mark of its own, at least 44 px tall to touch; a tap on it shows the tip, a tap elsewhere closes it, and the word beside it still does what a tap on it did (verse 3 is aligned, so its word opens the
// word sheet; verse 6 is one chunk with no pairing, so its word opens the Verse view). public/data-lxx ships no chapter in the gate: Isaiah 12 is the fixture of Genesis 1 (tests/fixtures/data-lxx)
// made into Isaiah's, its two verses given the English of the Governor's screenshot, carrying the caret as LXX2012 writes it (U+2303).
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SEPTUAGINT_YOU_TIP } from '../../src/reader/septuagint';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

type Verse = { n: number; ref: { book: string; chapter: number; verse: number }; g: { e?: number }[]; e: { t: string; g: number[]; y?: string; c?: number }[] };

test.beforeEach(async ({ page }) => {
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    let body = readFileSync(`tests/fixtures/data-lxx/${path === 'isa/12.json' ? 'gen/1.json' : path}`, 'utf8');
    if (path === 'index.json') {
      const index = JSON.parse(body) as { books: Record<string, unknown>[] };
      index.books.push({ code: 'isa', name: 'Isaiah', chapters: 12, verses: Array.from({ length: 12 }, () => 0), fingerprints: Array.from({ length: 12 }, () => ''), lang: 'grc', lampasChapters: Array.from({ length: 12 }, (_, i) => [i + 1]), lampas: 'isa' });
      body = JSON.stringify(index);
    } else if (path === 'isa/12.json') {
      const chapter = JSON.parse(body) as { book: string; code: string; chapter: number; verses: Verse[] };
      const words = chapter.verses[0].g.slice(0, 8);
      const make = (n: number, e: Verse['e']): Verse => {
        const g = words.map((w) => ({ ...w }));
        g.forEach((w, i) => {
          delete w.e;
          const at = e.findIndex((c) => c.g.includes(i));
          if (at >= 0) w.e = at;
        });
        return { n, ref: { book: 'isa', chapter: 12, verse: n }, g, e };
      };
      chapter.book = 'Isaiah';
      chapter.code = 'isa';
      chapter.chapter = 12;
      chapter.verses = [
        // aligned, as lxx:align writes a chapter: 'Draw you^ there-fore' is a chunk of three words
        make(3, [
          { t: 'Draw you⌃ there-fore', g: [0, 1, 2], y: 'align', c: 0.8 },
          { t: 'water with joy out of the wells of salvation.', g: [3, 4, 5, 6, 7], y: 'align', c: 0.8 },
        ]),
        // one chunk of the verse, paired to no word, as data:build:lxx writes it
        make(6, [{ t: 'Exalt and rejoice, you⌃ that dwell in Sion: for the Holy One of Israel is exalted in the midst of her.', g: [0, 1, 2, 3, 4, 5, 6, 7] }]),
      ];
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

/** A touch on the middle of `word` as the verse draws it (a chunk is one tap target over several lines, so the point is the word's own). */
async function tapWord(page: Page, verse: number, word: string): Promise<void> {
  const at = await page.evaluate(
    ([n, w]) => {
      const walker = document.createTreeWalker(document.querySelector(`[data-verse="${n}"] [data-text]`)!, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const i = (node.textContent ?? '').indexOf(w);
        if (i < 0) continue;
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + w.length);
        const r = range.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }
      throw new Error(`no ${w} in verse ${n}`);
    },
    [verse, word] as const,
  );
  await page.touchscreen.tap(at.x, at.y);
}

const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });

async function openIsaiah(page: Page, view: 'English' | 'Weave'): Promise<void> {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await keep(page, 'weave', 'solid');
  await page.goto('/#/?b=isa&c=12');
  await page.reload();
  await expect(page.locator('[data-verse="3"]')).toBeVisible();
  await choice(page, view).click();
  await expect(choice(page, view)).toHaveAttribute('aria-pressed', 'true');
}

for (const view of ['English', 'Weave'] as const) {
  test(`Isaiah 12 in the Septuagint, ${view} view: the mark after 'you' in verses 3 and 6 is its own tap target and a tap shows what it means`, async ({ page }) => {
    await openIsaiah(page, view);
    const tip = page.locator('[data-you-tip]');
    for (const verse of [3, 6]) {
      const mark = page.locator(`[data-verse="${verse}"] [data-you-mark]`);
      await expect(mark).toHaveCount(1);
      await expect(mark).toHaveText('⌃');
      const box = (await mark.boundingBox())!;
      expect(box.height, `verse ${verse}'s mark is 44 px tall to touch`).toBeGreaterThanOrEqual(43.5);
      await expect(tip).toHaveCount(0);
      await mark.tap();
      await expect(tip).toHaveText(SEPTUAGINT_YOU_TIP);
      const at = (await tip.boundingBox())!;
      expect(at.x).toBeGreaterThanOrEqual(0);
      expect(at.x + at.width).toBeLessThanOrEqual(390);
      expect(at.y).toBeGreaterThanOrEqual(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await shot(page, `septuagint-caret-tip-${view.toLowerCase()}-${verse}`);
      // a tap elsewhere closes it
      await page.touchscreen.tap(195, 3);
      await expect(tip).toHaveCount(0);
    }
  });
}

test("a tap on the word beside the mark does what it did: verse 3's opens the word sheet, verse 6's the Verse view, and neither shows the tip", async ({ page }) => {
  await openIsaiah(page, 'English');
  await tapWord(page, 3, 'Draw');
  await expect(page.getByRole('dialog', { name: 'Word' })).toBeVisible();
  await expect(page.locator('[data-you-tip]')).toHaveCount(0);
  await page.getByRole('dialog', { name: 'Word' }).getByRole('button', { name: 'Done' }).click();
  await tapWord(page, 6, 'rejoice');
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  await expect(page.locator('[data-you-tip]')).toHaveCount(0);
});

test("the Septuagint's sources sheet says the same, in a line of its own", async ({ page }) => {
  await openIsaiah(page, 'English');
  await page.locator('[data-reader-subtitle]').tap();
  const sheet = page.getByRole('dialog', { name: 'Whose texts these are' });
  await expect(sheet.locator('[data-lxx-note]').filter({ hasText: SEPTUAGINT_YOU_TIP })).toHaveCount(1);
  await shot(page, 'septuagint-caret-tip-sources');
});
