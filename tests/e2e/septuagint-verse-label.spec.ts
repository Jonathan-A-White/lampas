// The Septuagint's verse label with a second number ('1 (22:1)') stands clear of its verse's text (mw-u2w5klk.279): on Psalms 23 (Greek 22), in the English view and the Greek view, at the phone's width
// and at a desktop's, in both layouts (verse by verse and paragraph), no rect of the label's text overlaps a rect of the verse's own text, and the whole '(22:1)' is there. The Septuagint's files are the
// fixtures in tests/fixtures/data-lxx, answered to the page by route (as tests/e2e/septuagint.spec.ts does).
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.beforeEach(async ({ page }) => {
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    return route.fulfill({ status: 200, contentType: 'application/json', body: readFileSync(`tests/fixtures/data-lxx/${path}`, 'utf8') });
  });
});

interface Overlap {
  verse: string;
  label: string;
  hit: string;
}

/** For every verse on the page: the text of its number button, and the first text rect of the verse's own words that a rect of the label's text overlaps (more than a pixel each way). */
async function overlaps(page: Page): Promise<Overlap[]> {
  return page.evaluate(() => {
    const out: { verse: string; label: string; hit: string }[] = [];
    const textRects = (root: Node, skip: (n: Node) => boolean): { rect: DOMRect; text: string }[] => {
      const rects: { rect: DOMRect; text: string }[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim() || skip(n)) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const rect of Array.from(range.getClientRects())) if (rect.width > 0 && rect.height > 0) rects.push({ rect, text: n.textContent.trim() });
      }
      return rects;
    };
    for (const verse of Array.from(document.querySelectorAll('[data-verse]'))) {
      const button = verse.querySelector('[data-verse-number]');
      if (!button) continue;
      const label = textRects(button, () => false);
      const body = textRects(verse, (n) => button.contains(n) || !!(n.parentElement && n.parentElement.closest('button[aria-label^="Play"], button[aria-label^="Stop"]')));
      for (const l of label)
        for (const b of body) {
          const w = Math.min(l.rect.right, b.rect.right) - Math.max(l.rect.left, b.rect.left);
          const h = Math.min(l.rect.bottom, b.rect.bottom) - Math.max(l.rect.top, b.rect.top);
          if (w > 1 && h > 1) out.push({ verse: verse.getAttribute('data-verse') ?? '', label: l.text, hit: b.text });
        }
    }
    return out;
  });
}

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

async function openPsalm23(page: Page, view: 'English' | 'Greek', layout: 'verse' | 'paragraph'): Promise<void> {
  await openUnlocked(page);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await keep(page, 'layout', layout);
  await page.goto('/#/?b=psa&c=23');
  await page.reload();
  await expect(page.locator('[data-verse="1"] [data-verse-number]')).toHaveText(/^1\s*\(22:1\)$/);
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-layout', layout);
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: view, exact: true }).click();
}

for (const width of [390, 1280]) {
  for (const view of ['English', 'Greek'] as const) {
    for (const layout of ['verse', 'paragraph'] as const) {
      test(`Psalms 23 in the Septuagint, ${view} view, ${layout} layout at ${width}px: no verse label overlaps its verse text`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await openPsalm23(page, view, layout);
        for (const n of [1, 2, 3]) await expect(page.locator(`[data-verse="${n}"] [data-verse-number]`)).toHaveText(new RegExp(`^${n}\\s*\\(22:${n}\\)$`));
        expect(await overlaps(page)).toEqual([]);
        await shot(page, `septuagint-verse-label-${view.toLowerCase()}-${layout}-${width}`);
      });
    }
  }
}
