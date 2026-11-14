// A long book name beside English | Weave | Greek, Play and the Menu (mw-fnvjof.17.79): the name is wider than the title's room (89 px at 390 px), so it may break between its words or shrink to the
// 11 px floor, but the Menu never drops to a row of its own and the header never doubles in height. At 390 and 360 px wide, at Large and Largest text, How much Greek? 2 (the Weave Solid), the
// Septuagint on and off: the header is as tall as at Normal text on Genesis 1 (one row at 390 px; under 390 px the switch is a line of its own by design, mw-5r3p30.768, so two lines there, and the title's own line must not make it taller), and the Menu is on Play's row.
import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { putAtLevels } from './greek-start';
import { openUnlocked } from './unlocked';
import { appReady } from './app-ready';
import { shot } from './shot';
import { BOOKS } from '../../src/data/books';

test.beforeEach(async ({ page }) => {
  await page.route('**/data-lxx/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/data-lxx\//, '');
    const file = `tests/fixtures/data-lxx/${path}`;
    return existsSync(file) ? route.fulfill({ status: 200, contentType: 'application/json', body: readFileSync(file, 'utf8') }) : route.fallback();
  });
});

/** Opens a chapter at How much Greek? 2 with the Weave Solid at a Text size and width, the Septuagint On or Off, and waits for the header's title and the switch. */
async function openTitled(page: Page, width: number, address: string, percent: string, title: RegExp, septuagint: 'On' | 'Off'): Promise<void> {
  await page.setViewportSize({ width, height: 844 });
  await openUnlocked(page);
  await page.goto('/#/settings');
  const row = page.getByRole('group', { name: 'Old Testament in Greek (Septuagint)', exact: true });
  await row.getByRole('button', { name: septuagint, exact: true }).click();
  await expect(row.getByRole('button', { name: septuagint, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await putAtLevels(page, { greek: 2 }, { textSize: percent, weave: 'solid' });
  await page.goto(address);
  await page.reload();
  await expect(page.locator('header h1')).toContainText(title);
  await expect(page.getByRole('group', { name: 'Language', exact: true })).toBeVisible();
  // the fonts are in and the header holds still before its boxes are measured
  await appReady(page, { reader: { weave: 'solid' } });
}

/** The header's height, and the vertical middles of Play and the Menu (the buttons are found by their labels; Play is 44 px tall and the Menu 48, so their tops differ by 2 where their middles do not). */
async function headerRows(page: Page): Promise<{ header: number; play: number | null; menu: number | null; boxes: string }> {
  return page.evaluate(() => {
    const header = document.querySelector('header') as HTMLElement;
    const top = (label: RegExp): number | null => {
      const b = Array.from(header.querySelectorAll('button')).find((x) => label.test(x.getAttribute('aria-label') ?? x.textContent ?? ''));
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return Math.round(r.top + r.height / 2);
    };
    const boxes = Array.from(header.children)
      .map((c) => {
        const r = c.getBoundingClientRect();
        return `${c.getAttribute('aria-label') ?? c.tagName} ${Math.round(r.left)}-${Math.round(r.right)} x ${Math.round(r.top)}-${Math.round(r.bottom)}`;
      })
      .join('; ');
    return { header: header.getBoundingClientRect().height, play: top(/^Read from/i), menu: top(/^Menu/i), boxes };
  });
}

/** Whether a title's text is cut mid-word: the h1's text is wider than its box where a unit is clipped (scrollWidth over clientWidth of any span of the title). */
async function cutOff(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const h1 = document.querySelector('header h1') as HTMLElement;
    const out: string[] = [];
    for (const el of Array.from(h1.querySelectorAll('span'))) {
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).display !== 'inline') out.push(`${el.textContent} scroll ${el.scrollWidth} > ${el.clientWidth}`);
    }
    const box = h1.getBoundingClientRect();
    const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of Array.from(range.getClientRects())) if (r.right > box.right + 1 || r.left < box.left - 1) out.push(`"${n.textContent.trim()}" ${Math.round(r.left)}-${Math.round(r.right)} outside the title ${Math.round(box.left)}-${Math.round(box.right)}`);
    }
    return out;
  });
}

const SIZES = [
  ['Large', '130'],
  ['Largest', '160'],
] as const;

const CASES = [
  ['/#/?b=1th&c=1', /1 Thessalonians 1/],
  ['/#/?b=sng&c=1', /Song of Solomon 1/],
  ['/#/?b=2ch&c=1', /2 Chronicles 1/],
  ['/#/?b=psa&c=23', /Psalms 23/],
  ['/#/?b=psa&c=116', /Psalms 116/],
] as const;

for (const width of [390, 360]) {
  for (const septuagint of ['On', 'Off'] as const) {
    for (const [size, percent] of SIZES) {
      for (const [address, title] of CASES) {
        test(`${address} at ${width}px, ${size} text, Septuagint ${septuagint}, How much Greek? 2: the header is one row, the Menu level with Play`, async ({ page }) => {
          // from 390 px the baseline is Genesis 1 at Normal text (one row). Under 390 px the switch is a line of its own whenever the title and the switch do not fit side by side, which for a long name
          // is always (a name's longest word needs 64 px at 8 px type and 59 are left), so the baseline is the same chapter at Normal text: Large and Largest text make it no taller.
          await (width >= 390 ? openTitled(page, width, '/#/?b=gen&c=1', '100', /Genesis 1/, septuagint) : openTitled(page, width, address, '100', title, septuagint));
          const normal = await headerRows(page);
          await openTitled(page, width, address, percent, title, septuagint);
          const rows = await headerRows(page);
          expect(rows.header, rows.boxes).toBeLessThanOrEqual(normal.header + 2);
          expect(rows.play, rows.boxes).not.toBeNull();
          expect(Math.abs((rows.menu ?? -99) - (rows.play ?? 99)), rows.boxes).toBeLessThanOrEqual(1);
          expect(await cutOff(page)).toEqual([]);
          await shot(page, `header-long-book-${address.replace(/\W+/g, '')}-${width}-${size.toLowerCase()}-${septuagint.toLowerCase()}`);
        });
      }
    }
  }
}

// The sweep: every book's chapter 1, Largest text, How much Greek? 2 (the Weave Solid), the Septuagint on and off. From 390 px up the header is one row and the Menu is on Play's row; at 360 px the switch may
// be a line of its own (two rows at most), the title with Play and the Menu above it. One page walks the 66 books by the address, so the settings are put once. The Septuagint's files are the fixtures of
// Genesis and Psalms (Psalms 23 for its chapter), so Psalms is opened at 23.
const BOOK_CODES = BOOKS.map((b) => [b.code, b.name] as const);

for (const width of [390, 360]) {
  for (const septuagint of ['On', 'Off'] as const) {
    test(`sweep: every book's chapter 1 at ${width}px, Largest text, Septuagint ${septuagint}: the Menu stays on Play's row and the header is not taller than ${width >= 390 ? 'one row' : 'two'}`, async ({ page }) => {
      test.setTimeout(240_000);
      await openTitled(page, width, '/#/?b=gen&c=1', '160', /Genesis 1/, septuagint);
      const bad: string[] = [];
      for (const [code, name] of BOOK_CODES) {
        await page.evaluate((hash) => (window.location.hash = hash), `#/?b=${code}&c=${code === 'psa' ? 23 : 1}`);
        await expect(page.locator('header h1')).toContainText(name);
        await expect(page.getByRole('group', { name: 'Language', exact: true })).toBeVisible();
        await appReady(page);
        const rows = await headerRows(page);
        const tall = width >= 390 ? 80 : 120;
        if (rows.header >= tall || rows.play === null || Math.abs((rows.menu ?? -99) - rows.play) > 1) bad.push(`${name}: header ${Math.round(rows.header)}, ${rows.boxes}`);
        for (const cut of await cutOff(page)) bad.push(`${name}: ${cut}`);
      }
      expect(bad).toEqual([]);
    });
  }
}
