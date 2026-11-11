// The Reader's header title with the Septuagint's suffix ('Psalms 23 (Greek 22)') stands clear of the English | Greek switch (mw-u2w5klk.301): at 390x844 and Text size Normal, Large and Largest, no text rect of the
// title overlaps the Language switch's box, and the whole title is on the page. The Septuagint's files are the fixtures in tests/fixtures/data-lxx, answered to the page by route
// (as tests/e2e/septuagint-verse-label.spec.ts does).
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

/** Each text rect of the header's title that overlaps (more than a pixel each way) the box of any other control in the header (the Language switch, Play, the Menu), by what the rect says and what it hits. */
async function titleOverlaps(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const header = document.querySelector('header');
    const title = header?.querySelector('h1');
    if (!header || !title) return ['no header title'];
    const boxes = Array.from(header.children)
      .filter((c) => c !== title && c.getBoundingClientRect().width > 0)
      .map((c) => ({ name: c.getAttribute('aria-label') ?? c.tagName, rect: c.getBoundingClientRect() }));
    const out: string[] = [];
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of Array.from(range.getClientRects())) {
        if (r.width <= 0 || r.height <= 0) continue;
        for (const b of boxes) {
          const w = Math.min(r.right, b.rect.right) - Math.max(r.left, b.rect.left);
          const h = Math.min(r.bottom, b.rect.bottom) - Math.max(r.top, b.rect.top);
          if (w > 1 && h > 1) out.push(`"${n.textContent.trim()}" at x ${Math.round(r.left)}-${Math.round(r.right)} overlaps ${b.name} at x ${Math.round(b.rect.left)}-${Math.round(b.rect.right)}`);
        }
      }
    }
    return out;
  });
}

const SIZES = [
  ['Normal', '100'],
  ['Large', '130'],
  ['Largest', '160'],
] as const;

/** Opens a chapter by its address with the Septuagint On at a Text size, and waits for the header's title to read `title`. */
async function openTitled(page: Page, address: string, percent: string, title: RegExp, dial?: string, weave?: 'off' | 'solid'): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: 'On', exact: true }).click();
  await expect(row.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await keep(page, 'textSize', percent);
  if (dial) await keep(page, 'greekInterest', dial);
  // tapping 'Dipping a toe' (and every step above it) also sets the Weave to Solid (src/data/repositories/greekInterest.ts BRINGS), which draws English | Weave | Greek: the widest switch
  const woven = weave ?? (dial && Number(dial) >= 2 ? 'solid' : 'off');
  if (woven === 'solid') await keep(page, 'weave', 'solid');
  await page.goto(address);
  await page.reload();
  await expect(page.locator('header h1')).toContainText(title);
  await expect(page.getByRole('group', { name: 'Language', exact: true })).toBeVisible();
}

for (const [size, percent] of SIZES) {
  test(`Psalms 23 in the Septuagint, ${size} text at 390px: the title 'Psalms 23 (Greek 22)' is clear of the English | Greek switch`, async ({ page }) => {
    await openTitled(page, '/#/?b=psa&c=23', percent, /\(Greek 22\)/);
    expect(await titleOverlaps(page)).toEqual([]);
    await shot(page, `septuagint-header-title-${size.toLowerCase()}`);
  });
}

// The sweep: the longest suffix a title takes ('Psalms 116 (Greek 114 and 115)', where two Greek psalms are one) and the longest book names, at the sizes that hold least.
for (const [size, percent] of SIZES.slice(1)) {
  test(`Psalms 116 in the Septuagint, ${size} text at 390px: the title 'Psalms 116 (Greek 114 and 115)' is clear of the English | Greek switch`, async ({ page }) => {
    await openTitled(page, '/#/?b=psa&c=116', percent, /\(Greek 114 and 115\)/);
    expect(await titleOverlaps(page)).toEqual([]);
    await shot(page, `septuagint-header-title-116-${size.toLowerCase()}`);
  });
  for (const [code, name] of [
    ['sng', 'Song of Solomon'],
    ['1th', '1 Thessalonians'],
    ['2th', '2 Thessalonians'],
  ] as const) {
    test(`${name} 1, ${size} text at 390px: the title is clear of the English | Greek switch`, async ({ page }) => {
      await openTitled(page, `/#/?b=${code}&c=1`, percent, new RegExp(`${name} 1`));
      expect(await titleOverlaps(page)).toEqual([]);
      await shot(page, `septuagint-header-title-${code}-${size.toLowerCase()}`);
    });
  }
}

/** The title button's own least height (min-h-12): at a small title size two lines are shorter than it. */
const H1_FLOOR = 48;

/** The title's lines (the distinct tops of its text rects), the line's height in px, the title h1's height and the header's. */
async function titleLines(page: Page): Promise<{ lines: number; lineHeight: number; h1: number; header: number; text: string }> {
  return page.evaluate(() => {
    const header = document.querySelector('header') as HTMLElement;
    const h1 = header.querySelector('h1') as HTMLElement;
    const span = h1.querySelector('.title-wrap') as HTMLElement;
    const tops = new Set<number>();
    const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of Array.from(range.getClientRects())) if (r.width > 0 && r.height > 0) tops.add(Math.round(r.top / 4));
    }
    const lh = parseFloat(getComputedStyle(span).lineHeight);
    const fs = parseFloat(getComputedStyle(span).fontSize);
    return { lines: tops.size, lineHeight: Number.isNaN(lh) ? fs * 1.25 : lh, h1: h1.getBoundingClientRect().height, header: header.getBoundingClientRect().height, text: h1.textContent ?? '' };
  });
}

// How much Greek? 2, Dipping a toe, draws English | Weave | Greek: the widest switch, so the title has the least room beside it (mw-fnvjof.17.55). The title takes two lines at most, and the header
// is no taller than at Curious (English | Greek) by more than one title line.
test('Psalms 23 in the Septuagint at Dipping a toe, Normal text at 390px: the title is two lines at most and the header no taller than at Curious by a title line', async ({ page }) => {
  await openTitled(page, '/#/?b=psa&c=23', '100', /\(Greek 22\)/, '1');
  const curious = await titleLines(page);
  await openTitled(page, '/#/?b=psa&c=23', '100', /\(Greek 22\)/, '2');
  const dipping = await titleLines(page);
  expect(dipping.text.replace(/\s+/g, ' ').trim()).toBe('Psalms 23 (Greek 22)');
  expect(dipping.h1).toBeLessThan(Math.max(dipping.lineHeight * 2.5, H1_FLOOR + 1));
  expect(dipping.header).toBeLessThanOrEqual(curious.header + dipping.lineHeight + 1);
  expect(await titleOverlaps(page)).toEqual([]);
  await shot(page, 'septuagint-header-title-dipping');
});

// The sweep: every fixture chapter, the two dials that differ, the three text sizes.
for (const [address, title] of [
  ['/#/?b=gen&c=1', /Genesis 1/],
  ['/#/?b=psa&c=23', /\(Greek 22\)/],
] as const) {
  for (const dial of ['1', '2']) {
    for (const [size, percent] of SIZES) {
      test(`${address} at How much Greek? ${dial}, ${size} text at 390px: the title is two lines at most`, async ({ page }) => {
        await openTitled(page, address, percent, title, dial);
        const t = await titleLines(page);
        expect(t.lines).toBeLessThanOrEqual(2);
        expect(t.h1).toBeLessThan(Math.max(t.lineHeight * 2.5, H1_FLOOR + 1));
        expect(await titleOverlaps(page)).toEqual([]);
      });
    }
  }
}

/** The header's height and each control's top and bottom against the title's: a control "on a row of its own below the title" has its top at or under the title's bottom. */
async function headerRows(page: Page): Promise<{ header: number; below: string[]; boxes: string[] }> {
  return page.evaluate(() => {
    const header = document.querySelector('header') as HTMLElement;
    const h1 = header.querySelector('h1') as HTMLElement;
    const t = h1.getBoundingClientRect();
    const below: string[] = [];
    const boxes: string[] = [];
    for (const c of Array.from(header.children)) {
      const r = c.getBoundingClientRect();
      if (c === h1 || r.width <= 0) continue;
      const name = c.getAttribute('aria-label') ?? c.tagName;
      boxes.push(`${name} ${Math.round(r.left)}-${Math.round(r.right)} x ${Math.round(r.top)}-${Math.round(r.bottom)}`);
      if (r.top >= t.bottom - 1) below.push(name);
    }
    return { header: header.getBoundingClientRect().height, below, boxes };
  });
}

// Large and Largest text (mw-fnvjof.17.70): the title takes two lines, but the header must not double in height with the menu (or the whole switch) dropped to a row of its own. The header is
// no taller than at How much Greek? 1 plus one title line, and no control sits below the title.
for (const [size, percent] of SIZES) {
  for (const [address, title] of [
    ['/#/?b=psa&c=23', /\(Greek 22\)/],
    ['/#/?b=psa&c=116', /\(Greek 114 and 115\)/],
    ['/#/?b=gen&c=1', /Genesis 1/],
  ] as const) {
    test(`${address} at How much Greek? 2, ${size} text at 390px: the header is one row, no control alone below the title`, async ({ page }) => {
      await openTitled(page, address, percent, title, '1');
      const curious = await titleLines(page);
      await openTitled(page, address, percent, title, '2');
      const dipping = await titleLines(page);
      const rows = await headerRows(page);
      expect(rows.below, rows.boxes.join('; ')).toEqual([]);
      expect(dipping.header, rows.boxes.join('; ')).toBeLessThanOrEqual(curious.header + dipping.lineHeight + 1);
      if (address.endsWith('c=23')) expect(dipping.header).toBeLessThan(80);
      await shot(page, `septuagint-header-rows-${address.replace(/\W+/g, '')}-${size.toLowerCase()}`);
    });
  }
}

// The sweep (mw-fnvjof.17.73): every fixture chapter at How much Greek? 1 to 5, the Weave off and Solid, and the three text sizes: no control sits below the title, and the header is under 80 px.
for (const [size, percent] of SIZES) {
  for (const [address, title] of [
    ['/#/?b=gen&c=1', /Genesis 1/],
    ['/#/?b=psa&c=23', /\(Greek 22\)/],
    ['/#/?b=psa&c=116', /\(Greek 114 and 115\)/],
  ] as const) {
    for (const dial of ['1', '2', '3', '4', '5']) {
      for (const weave of ['off', 'solid'] as const) {
        test(`sweep ${address} at How much Greek? ${dial}, Weave ${weave}, ${size} text at 390px: the header is one row`, async ({ page }) => {
          await openTitled(page, address, percent, title, dial, weave);
          const rows = await headerRows(page);
          expect(rows.below, rows.boxes.join('; ')).toEqual([]);
          expect(rows.header, rows.boxes.join('; ')).toBeLessThan(80);
        });
      }
    }
  }
}
