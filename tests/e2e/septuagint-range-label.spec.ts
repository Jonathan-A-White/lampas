// A Septuagint English row that stands for two Greek verses (englishRows, mw-u2w5klk.307) is labelled with a range: '8-9', '15-16' (mw-u2w5klk.329). A range of two-digit numbers is wider than the
// 44 px a single number is given, and its text started 4 px after it ('15-16And an angel'), 5 px to the right of its neighbours'. At the phone's width, in both layouts (verse by verse and paragraph),
// the gap between the number's text and the row's first word is a clear space (12 px or more), and, verse by verse, the row's text starts where the unfolded rows' do. The chapter is a fixture made here: Genesis 22 of the Septuagint
// with Greek verses 9 and 16 holding no English (folded into 8 and 15), its words those of tests/fixtures/data-lxx/psa/22.json, answered to the page by route.
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const fixture = (path: string): string => readFileSync(`tests/fixtures/data-lxx/${path}`, 'utf8');

/** Genesis 22 as a Greek chapter of seventeen verses: Psalm 22's verses over again, the Lampas verse of each its own number, verses 9 and 16 with no English. */
function genesis22(): string {
  const psalm = JSON.parse(fixture('psa/22.json'));
  const verses = Array.from({ length: 17 }, (_, i) => {
    const n = i + 1;
    const v = JSON.parse(JSON.stringify(psalm.verses[i % psalm.verses.length]));
    return { ...v, n, ref: { book: 'gen', chapter: 22, verse: n }, e: n === 9 || n === 16 ? [] : v.e };
  });
  return JSON.stringify({ ...psalm, book: 'Genesis', code: 'gen', chapter: 22, verses });
}

/** The fixtures' index with Genesis shipped to chapter 22 (every earlier Greek chapter empty but 22 itself, which is the one file the page asks for). */
function index(): string {
  const all = JSON.parse(fixture('index.json'));
  const gen = all.books.find((b: { code: string }) => b.code === 'gen');
  gen.chapters = 22;
  gen.verses = Array.from({ length: 22 }, (_, i) => (i === 21 ? 17 : 0));
  gen.fingerprints = Array.from({ length: 22 }, () => '');
  gen.lampasChapters = Array.from({ length: 22 }, (_, i) => (i === 21 ? [22] : []));
  return JSON.stringify(all);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    const body = path === 'index.json' ? index() : path === 'gen/22.json' ? genesis22() : fixture(path);
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

interface Row {
  verse: string;
  label: string;
  /** the right edge of the number's text and the left edge of the verse's first word, in px */
  gap: number;
  start: number;
}

/** For every row on the page: its number's text, the space between that text and the row's first word, and where the first word starts. */
async function rows(page: Page): Promise<Row[]> {
  return page.evaluate(() => {
    const out: { verse: string; label: string; gap: number; start: number }[] = [];
    for (const verse of Array.from(document.querySelectorAll('[data-verse]'))) {
      const button = verse.querySelector('[data-verse-number]');
      if (!button) continue;
      const rect = (root: Node, skip: (n: Node) => boolean): DOMRect | null => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.textContent?.replace(/⁠/g, '').trim() || skip(n)) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          const found = Array.from(range.getClientRects()).find((r) => r.width > 0 && r.height > 0);
          if (found) return found;
        }
        return null;
      };
      const label = rect(button, () => false);
      const first = rect(verse, (n) => button.contains(n) || !!(n.parentElement && n.parentElement.closest('button[aria-label^="Play"], button[aria-label^="Stop"]')));
      if (!label || !first) continue;
      out.push({ verse: verse.getAttribute('data-verse') ?? '', label: button.textContent?.trim() ?? '', gap: first.left - label.right, start: first.left });
    }
    return out;
  });
}

for (const layout of ['verse', 'paragraph'] as const) {
  test(`Genesis 22 in the Septuagint, English view, ${layout} layout at 390px: a range number stands clear of its verse's text and the text starts where the others do`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openUnlocked(page);
    await page.goto('/#/settings');
    const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
    await row.getByRole('button', { name: 'On', exact: true }).click();
    await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await keep(page, 'layout', layout);
    await page.goto('/#/?b=gen&c=22');
    await page.reload();
    await expect(page.locator('[data-reader]')).toHaveAttribute('data-layout', layout);
    await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.locator('[data-verse="15"] [data-verse-number]')).toHaveText(/^15-16$/);
    await expect(page.locator('[data-verse="8"] [data-verse-number]')).toHaveText(/^8-9$/);
    const all = await rows(page);
    const folded = all.filter((r) => /-/.test(r.label));
    const plain = all.filter((r) => !/-/.test(r.label) && r.label.length === 2);
    expect(folded.map((r) => r.label)).toEqual(['8-9', '15-16']);
    expect(plain.length).toBeGreaterThan(0);
    for (const r of folded) expect(r.gap, `${r.label} to its first word`).toBeGreaterThanOrEqual(12);
    // verse by verse, the text starts at the same x as the unfolded two-digit rows' (a pixel of rounding allowed); in a paragraph the words run on, so only the space counts
    if (layout === 'verse') {
      const base = plain[0].start;
      for (const r of [...folded, ...plain]) expect(Math.abs(r.start - base), `${r.label} text start ${r.start} against ${base}`).toBeLessThanOrEqual(1);
    }
    await page.locator('[data-verse="15"]').scrollIntoViewIfNeeded();
    await shot(page, layout === 'verse' ? 'septuagint-range-label' : `septuagint-range-label-${layout}`);
  });
}
