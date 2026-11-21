// tests/e2e/verse-tools-clipped.spec.ts — every word of the Verse view's tools line shows whole on one line (mw-5r3p30.1228). On his phone at 1 John 2:1 the line read
// 'Copy  Share  Memorize  In Log': 'In Logos' sits in a group drawn with display: contents, so the row's rule that no door is squeezed did not reach it, and it wrapped
// and was cut. The line scrolls sideways when the doors are wider than it; a door is never narrower than its own words.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const SIZES = [
  { name: '360x740', width: 360, height: 740 },
  { name: '390x844', width: 390, height: 844 },
];

for (const size of SIZES) {
  test(`${size.name}: with Logos On, each door of the tools line at 1 John 2:1 shows its words whole on one line`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true }));
    await routePostern(page, makeFakePostern());
    await openUnlocked(page);
    await page.addInitScript(() => {
      const open = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function (this: IDBFactory, name: string, version?: number) {
        const request = version === undefined ? open.call(this, name) : open.call(this, name, version);
        if (name !== 'lampas') return request;
        request.addEventListener('success', () => {
          const tx = request.result.transaction(['settings'], 'readwrite');
          tx.objectStore('settings').put({ key: 'resource.logos', value: 'on' });
        });
        return request;
      } as typeof IDBFactory.prototype.open;
    });
    await page.goto('/#/?b=1jn&c=2&v=1');
    await page.reload();
    const view = page.getByRole('region', { name: 'Verse view' });
    const tools = view.getByRole('group', { name: 'Tools', exact: true });
    await expect(tools.getByRole('link', { name: /^In Logos/ })).toBeVisible();
    for (const name of ['Copy', 'Share', 'Memorize']) await expect(tools.getByRole('button', { name, exact: true })).toBeVisible();
    // each door's words are on one line: the box is no taller than one line of its own text, and its words are not cut inside it
    for (const door of await tools.locator('button, a').all()) {
      const name = ((await door.textContent()) ?? '').trim();
      const lines = await door.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        // the words' boxes are on one line when they all overlap the first one's height (the arrow's box has other font metrics, so its top differs by a pixel)
        const rects = [...range.getClientRects()].filter((r) => r.width > 0);
        const first = rects[0];
        const lines = rects.filter((r) => r.top >= first.bottom - 1 || r.bottom <= first.top + 1).length + 1;
        return { lines, rects: JSON.stringify(rects.map((r) => [r.left, r.top, r.width, r.height])), scroll: el.scrollWidth, client: el.clientWidth };
      });
      expect(lines.lines, `${name} is on one line: ${lines.rects}`).toBe(1);
      expect(lines.scroll, `${name} is not cut`).toBeLessThanOrEqual(lines.client);
    }
    await shot(page, `verse-tools-clipped-${size.name}`);
  });
}
