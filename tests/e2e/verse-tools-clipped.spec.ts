// tests/e2e/verse-tools-clipped.spec.ts — mw-5r3p30.1228: on his phone (1 John 2:1, 0.7.304) the tools line read "Copy  Share  Memorize  In Log". Every label of the line is one line of text, never wrapped
// and never cut inside its own box (scrollWidth <= clientWidth); a door the row's edge cuts is the peek of src/ScrollMore.tsx (the row scrolls sideways) and shows whole when scrolled to.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openGroup } from './settings-group';
import { openSettings } from './openSettings';

for (const width of [360, 390]) {
  test(`${width}: 1 John 2:1's tools line keeps each label whole on one line, and each door shows whole when scrolled to`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true }));
    await routePostern(page, makeFakePostern());
    await openUnlocked(page);
    // his phone has Logos On (Settings > Study resources): the door 'In Logos' is drawn only then
    await page.goto('/');
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    await openSettings(page);
    await openGroup(page, 'Study resources');
    const logos = page.getByRole('region', { name: 'Study resources' }).getByRole('switch', { name: 'Logos', exact: true });
    if ((await logos.getAttribute('aria-checked')) !== 'true') await logos.click();
    await expect(logos).toHaveAttribute('aria-checked', 'true');
    await page.goto('/#/?b=1jn&c=2&v=1');
    await page.reload();
    const view = page.getByRole('region', { name: 'Verse view' });
    const line = view.locator('[data-verse-tools-line]');
    const inLogos = line.getByRole('link', { name: /^In Logos/ });
    await expect(inLogos).toBeAttached();
    const doors = await line.locator('button, a[href]').all();
    expect(doors.length).toBeGreaterThanOrEqual(4);
    for (const door of doors) {
      const label = ((await door.textContent()) ?? '').replace(/\s+/g, ' ').trim();
      const m = await door.evaluate((el) => {
        // the lines of text: the text nodes' own rects, joined when their middles are within a few pixels
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const middles: number[] = [];
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          if (!node.textContent?.trim()) continue;
          const r = document.createRange();
          r.selectNodeContents(node);
          for (const rect of r.getClientRects()) if (rect.width > 0) middles.push(rect.top + rect.height / 2);
        }
        const lines: number[] = [];
        for (const m of middles.sort((x, y) => x - y)) if (!lines.length || m - lines[lines.length - 1] > 4) lines.push(m);
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, lines: lines.length };
      });
      expect(m.scrollWidth, `${label} is not cut inside its own box`).toBeLessThanOrEqual(m.clientWidth);
      expect(m.lines, `${label} is on one line`).toBe(1);
      await door.evaluate((el) => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
      const box = await door.boundingBox();
      const row = await line.boundingBox();
      if (!box || !row) throw new Error(`no box for ${label}`);
      expect(box.x, `${label} starts inside the row`).toBeGreaterThanOrEqual(row.x - 0.5);
      expect(box.x + box.width, `${label} ends inside the row`).toBeLessThanOrEqual(row.x + row.width + 0.5);
    }
    await shot(page, `verse-tools-clipped-${width}`);
  });
}
