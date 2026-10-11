// tests/e2e/reader-sideways-room.spec.ts — held sideways (844 x 390) the Reader gives the text the room (mw-5r3p30.195): the reading box is at least
// 200 px tall and shows at least three whole lines of verse, the round Ask button and the Talk bar stay whole, and upright (390 x 844) nothing moves.
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
  await expect(page.locator('[data-talk-bar]')).toBeVisible();
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

test('844 x 390: the round Ask button and the Talk bar are whole and tappable', async ({ page }) => {
  const height = 390;
  await openReader(page, { width: 844, height });
  const bar = await box(page.locator('[data-talk-bar]'));
  expect(bar.y).toBeGreaterThanOrEqual(0);
  expect(bar.y + bar.height).toBeLessThanOrEqual(height + 0.5);
  const ask = page.locator('[data-ask-tutor]');
  const a = await box(ask);
  expect(a.y).toBeGreaterThanOrEqual(0);
  expect(a.y + a.height).toBeLessThanOrEqual(height + 0.5);
  expect(a.width).toBeGreaterThanOrEqual(43.5);
  expect(a.height).toBeGreaterThanOrEqual(43.5);
  // the button sits beside the text, in the gutter: no line of the reading box runs behind it
  const reader = await box(page.locator('[data-reader]'));
  expect(a.x).toBeGreaterThanOrEqual(reader.x + reader.width - 0.5);
  const talk = page.getByRole('button', { name: 'Talk', exact: true });
  expect((await box(talk)).height).toBeGreaterThanOrEqual(43.5);
  await ask.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('390 x 844: upright nothing moves', async ({ page }) => {
  await openReader(page, { width: 390, height: 844 });
  const reader = await box(page.locator('[data-reader]'));
  const bar = await box(page.locator('[data-talk-bar]'));
  const ask = await box(page.locator('[data-ask-tutor]'));
  // the box still ends 72 px above the Talk bar, where the round button sits
  expect(bar.y - (reader.y + reader.height)).toBeCloseTo(72, 0);
  expect(ask.y + ask.height).toBeLessThanOrEqual(bar.y + 0.5);
  expect(ask.y).toBeGreaterThanOrEqual(reader.y + reader.height - 0.5);
});
