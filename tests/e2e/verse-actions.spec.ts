// tests/e2e/verse-actions.spec.ts — the Verse view's row of actions on the phones' narrow widths (mw-5r3p30.105): no label wraps past two lines, every
// button keeps a 44x44 target, and the page never scrolls sideways, with and without Share (a phone that has navigator.share draws six buttons).
// jsdom has no layout, so every size is measured here.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

const PHONES = [
  { name: '360x800', width: 360, height: 800 },
  { name: '412x915', width: 412, height: 915 },
];

async function start(page: Page, viewport: { width: number; height: number }, share: boolean): Promise<void> {
  await page.setViewportSize(viewport);
  if (share) await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true }));
  await routePostern(page, makeFakePostern());
  await openUnlocked(page);
  await page.goto('/#/?b=heb&c=7&view=english&weave=off');
}

for (const phone of PHONES) {
  for (const share of [false, true]) {
    test(`${phone.name}${share ? ' with Share' : ''}: every action is a 44 px target, no label is past two lines, nothing scrolls sideways`, async ({ page }) => {
      await start(page, phone, share);
      const view = await openVerseView(page, 1);
      const row = view.getByRole('group', { name: 'Actions' });
      const buttons = await row.getByRole('button').all();
      expect(buttons).toHaveLength(share ? 6 : 5);
      for (const button of buttons) {
        const name = (await button.textContent()) ?? '';
        const b = await button.boundingBox();
        if (!b) throw new Error(`no box for ${name}`);
        expect(b.width, `${name} width`).toBeGreaterThanOrEqual(43.5);
        expect(b.height, `${name} height`).toBeGreaterThanOrEqual(43.5);
        expect(b.x, `${name} left`).toBeGreaterThanOrEqual(0);
        expect(b.x + b.width, `${name} right`).toBeLessThanOrEqual(phone.width);
        // the label's line count: the distinct tops of the rectangles its text is drawn in
        const lines = await button.evaluate((el) => {
          const range = document.createRange();
          range.selectNodeContents(el);
          return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
        });
        expect(lines, `${name} lines`).toBeLessThanOrEqual(2);
      }
      const page2 = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(page2.scrollWidth).toBeLessThanOrEqual(page2.clientWidth);
      await shot(page, `verse-actions-${phone.width}${share ? '-share' : ''}`);
    });
  }
}
