// tests/e2e/verse-tools-line.spec.ts — the Verse view's tools line stays one row where the controls stand pinned above the foot (mw-fnvjof.17.32). Luke 15:11 draws every door
// (Copy, Share, Memorize, Maps · N and Sermons · N): a fifth door wrapped the line onto a second row, the pinned controls grew 44 px and five layout specs lost their room (the
// Audio Bible link sideways, the Summary field with the keyboard up, a reading's message sideways, the Next word card at 360x740, Diagram under the ? at 390x400). Where the doors
// are wider than the line it scrolls sideways, each door still whole and a thumb's size when scrolled to.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const SIZES = [
  { name: '360x740', width: 360, height: 740 },
  { name: '390x844', width: 390, height: 844 },
  { name: '844x390', width: 844, height: 390 },
  { name: '390x400', width: 390, height: 400 },
];

for (const size of SIZES) {
  test(`${size.name}: the tools line of Luke 15:11 with every door is one row, and each door can be scrolled to whole`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true }));
    await routePostern(page, makeFakePostern());
    await openUnlocked(page);
    await page.goto('/#/?b=luk&c=15&v=11');
    await page.reload();
    const view = page.getByRole('region', { name: 'Verse view' });
    const tools = view.getByRole('group', { name: 'Tools', exact: true });
    for (const name of ['Copy', 'Share', 'Memorize']) await expect(tools.getByRole('button', { name, exact: true })).toBeVisible();
    await expect(tools.getByRole('button', { name: /^Maps · \d+$/ })).toBeVisible();
    await expect(tools.getByRole('button', { name: /^Sermons · \d+$/ })).toBeVisible();
    const doors = await tools.getByRole('button').all();
    // one row: every door's box has the same top
    const tops = new Set<number>();
    for (const door of doors) tops.add(Math.round((await door.boundingBox())?.y ?? -1));
    expect([...tops], 'the tools line is one row').toHaveLength(1);
    await shot(page, `verse-tools-line-${size.name}`);
    // each door, scrolled to, is whole inside the row (a box scrolled to its end may stop a fraction of a pixel short of a door's fractional edge) and in the window, and a thumb's size
    const line = view.locator('[data-verse-tools-line]');
    for (const door of doors) {
      const name = (await door.textContent()) ?? '';
      await door.evaluate((el) => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
      const box = await door.boundingBox();
      const row = await line.boundingBox();
      if (!box || !row) throw new Error(`no box for ${name} or its row`);
      expect(box.x, `${name} starts inside the row`).toBeGreaterThanOrEqual(row.x - 0.5);
      expect(box.x + box.width, `${name} ends inside the row`).toBeLessThanOrEqual(row.x + row.width + 0.5);
      expect(box.x, `${name} starts in the window`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${name} ends in the window`).toBeLessThanOrEqual(size.width);
      expect(box.height, `${name} height`).toBeGreaterThanOrEqual(43.5);
      expect(box.width, `${name} width`).toBeGreaterThanOrEqual(43.5);
    }
    const page2 = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    expect(page2.scrollWidth, 'the page never scrolls sideways').toBeLessThanOrEqual(page2.clientWidth);
  });
}
