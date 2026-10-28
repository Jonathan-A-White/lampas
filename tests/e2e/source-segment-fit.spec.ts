// The Greek | Hebrew segment (src/ui/SourceSegment.tsx) on each of the five screens that draw it (Goal, Words, Paradigms, Placement, Review), with both languages on, in a
// third of a phone's height (390 x 260) and in a third of its width held sideways (280 x 390, mw-5r3p30.831): both buttons whole (each label fits inside its button, the
// buttons inside the segment, the segment inside the window) and neither under the round Ask the tutor button.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const SIZES = [
  { name: 'portrait-third', width: 390, height: 260 },
  { name: 'landscape-third', width: 280, height: 390 },
];

const SCREENS = [
  { name: 'goal', path: '/#/goal', group: 'Goal language' },
  { name: 'words', path: '/#/words', group: 'Words language' },
  { name: 'paradigms', path: '/#/paradigms', group: 'Language of the tables' },
  { name: 'placement', path: '/#/placement', group: 'Placement language' },
  { name: 'review', path: '/#/review', group: 'Review language' },
];

async function measure(page: Page, group: string) {
  return page.evaluate((label) => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, right: r.right, bottom: r.bottom };
    };
    const segment = document.querySelector(`[role="group"][aria-label="${label}"]`)!;
    const ask = document.querySelector('[data-ask-tutor]');
    const buttons = [...segment.querySelectorAll('button')].map((b) => ({ name: b.textContent ?? '', box: box(b), whole: b.scrollWidth <= b.clientWidth }));
    return {
      window: { w: document.documentElement.clientWidth, h: document.documentElement.clientHeight },
      segment: box(segment),
      buttons,
      ask: ask ? box(ask) : null,
    };
  }, group);
}

for (const size of SIZES) {
  for (const screen of SCREENS) {
    test(`${screen.name} at ${size.width} x ${size.height} (${size.name}): both language buttons are whole and overlap nothing`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await routePostern(page, makeFakePostern());
      await openUnlocked(page);
      await page.goto(screen.path);
      const group = page.getByRole('group', { name: screen.group, exact: true });
      await expect(group.getByRole('button', { name: 'Hebrew', exact: true })).toBeVisible();
      const seen = await measure(page, screen.group);
      await shot(page, `source-segment-fit-${screen.name}-${size.name}`);

      expect(seen.buttons.map((b) => b.name)).toEqual(['Greek', 'Hebrew']);
      for (const b of seen.buttons) {
        expect(b.whole, `${b.name}'s label fits inside its button`).toBe(true);
        expect(b.box.x, `${b.name} inside the segment (left)`).toBeGreaterThanOrEqual(seen.segment.x - 0.5);
        expect(b.box.right, `${b.name} inside the segment (right)`).toBeLessThanOrEqual(seen.segment.right + 0.5);
        expect(b.box.bottom - b.box.y, `${b.name} is a 48 px button`).toBeGreaterThanOrEqual(47.5);
      }
      expect(seen.segment.x).toBeGreaterThanOrEqual(0);
      expect(seen.segment.right).toBeLessThanOrEqual(seen.window.w);
      if (seen.ask) {
        const a = seen.ask;
        for (const b of seen.buttons) {
          const across = Math.min(b.box.right, a.right) - Math.max(b.box.x, a.x);
          const down = Math.min(b.box.bottom, a.bottom) - Math.max(b.box.y, a.y);
          expect(across > 0 && down > 0, `${b.name} is not under the Ask button`).toBe(false);
        }
      }
    });
  }
}
