// tests/e2e/reader-sideways-room.spec.ts — held sideways (844 x 390) the Reader gives the text the room (mw-5r3p30.195): the reading box is at least
// 200 px tall and shows at least three whole lines of verse, the floating ? stays whole, and upright (390 x 844) the box runs down to the phone's bar (the Talk bar went in mw-5r3p30.882).
// jsdom has no layout, so it is proven here.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

async function openReader(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/?c=8&view=english&weave=off');
  await expect(page.locator('[data-floating-tutor]')).toBeVisible();
  await expect(page.locator('[data-reader] [data-verse]').first()).toBeVisible();
}

async function box(el: Locator) {
  const b = await el.boundingBox();
  if (!b) throw new Error('no box');
  return b;
}

/** How many lines of verse text lie whole inside the reading box (a line is the distinct rows of a verse's text rects). */
async function wholeLines(page: Page): Promise<number> {
  return page.evaluate(() => {
    const reader = document.querySelector('[data-reader]');
    if (!reader) return 0;
    const frame = reader.getBoundingClientRect();
    const rows = new Set<string>();
    for (const verse of reader.querySelectorAll('[data-verse]')) {
      const range = document.createRange();
      range.selectNodeContents(verse);
      for (const r of range.getClientRects()) {
        if (r.height < 10 || r.height > 60) continue;
        if (r.top >= frame.top - 0.5 && r.bottom <= frame.bottom + 0.5) rows.add(`${Math.round(r.top / 8)}`);
      }
    }
    return rows.size;
  });
}

test('844 x 390: the reading box is 200 px tall and shows three whole lines of verse', async ({ page }) => {
  await openReader(page, { width: 844, height: 390 });
  expect((await box(page.locator('[data-reader]'))).height).toBeGreaterThanOrEqual(200);
  expect(await wholeLines(page)).toBeGreaterThanOrEqual(3);
  await shot(page, 'reader-sideways-room');
});

test('844 x 390: the floating ? is whole and tappable', async ({ page }) => {
  const height = 390;
  await openReader(page, { width: 844, height });
  const door = page.locator('[data-floating-tutor]');
  const a = await box(door);
  expect(a.y).toBeGreaterThanOrEqual(0);
  expect(a.y + a.height).toBeLessThanOrEqual(height + 0.5);
  expect(a.width).toBeGreaterThanOrEqual(43.5);
  expect(a.height).toBeGreaterThanOrEqual(43.5);
  await door.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('390 x 844: upright the reading box runs down to the phone\'s bar', async ({ page }) => {
  await openReader(page, { width: 390, height: 844 });
  const reader = await box(page.locator('[data-reader]'));
  expect(reader.y + reader.height).toBeGreaterThan(844 - 120);
  expect(reader.y + reader.height).toBeLessThanOrEqual(844 + 0.5);
});
