// tests/e2e/large-text.spec.ts — Lampas honours the phone's own text size (mw-cwf538.5, the epic 'Lampas for every age and every ability'): the
// browser's default font size is set to 200% (32 px for 16, the way Android's Font size does it, through a Chromium profile's preferences) and the
// five main screens, Reader, Quick test, Talk, Settings and Placement, are opened at 390x844. On each, no control, heading or label is clipped (its
// scrollWidth within its clientWidth) or pushed off the screen, and a shot of the screen is attached.
import { chromium, expect, test as base, type Page } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { browserEnv } from '../support/browser-env';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

/** The browser's default font size at 200%: 2 x 16 px. */
const TEXT_PX = 32;
const VIEWPORT = { width: 390, height: 844 };

// A Chromium of its own, whose profile says the default font size is 200%: that is the preference the phone's Font size changes, and what `font-size: 100%`
// and every rem answer to. (The page cannot say it for itself: a test that set html's font-size would test its own rule, not the phone's.)
const test = base.extend({
  context: async ({ baseURL }, provide) => {
    const profile = mkdtempSync(join(tmpdir(), 'lampas-large-text-'));
    mkdirSync(join(profile, 'Default'));
    writeFileSync(join(profile, 'Default', 'Preferences'), JSON.stringify({ webkit: { webprefs: { default_font_size: TEXT_PX, default_fixed_font_size: TEXT_PX - 4 } } }));
    const context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      env: browserEnv,
      baseURL,
      viewport: VIEWPORT,
      serviceWorkers: 'block',
    });
    await provide(context);
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  },
  page: async ({ context }, provide) => {
    await provide(context.pages()[0] ?? (await context.newPage()));
  },
});

interface Screen {
  name: string;
  /** the shot's name under shots/ */
  shot: string;
  open: (page: Page) => Promise<void>;
}

const SCREENS: readonly Screen[] = [
  {
    name: 'Reader',
    shot: 'large-text-reader',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeAttached();
      await expect(page.locator('[data-verse="1"]')).toBeAttached();
    },
  },
  {
    name: 'Quick test',
    shot: 'large-text-quick-test',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/test');
      await expect(page.getByRole('heading', { name: 'Quick test', level: 1 })).toBeAttached();
      await expect(page.locator('[data-option]')).toHaveCount(4);
    },
  },
  {
    name: 'Talk',
    shot: 'large-text-talk',
    open: async (page) => {
      const fake = makeFakePostern();
      fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
      await routePostern(page, fake);
      await openUnlocked(page);
      await page.goto('/');
      await page.getByRole('button', { name: 'Talk', exact: true }).click();
      await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Your message' })).toBeAttached();
    },
  },
  {
    name: 'Settings',
    shot: 'large-text-settings',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/settings');
      await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeAttached();
    },
  },
  {
    name: 'Placement',
    shot: 'large-text-placement',
    open: async (page) => {
      await openUnlocked(page);
      await page.goto('/#/placement');
      await expect(page.getByRole('heading', { name: 'Placement', level: 1 })).toBeAttached();
    },
  },
];

/** Every control, heading and label on the open screen whose text is cut off, squeezed out or which sticks out of the window, one line each. A row that scrolls sideways
 * on purpose (the Reader's chips) may hold what is past its edge, but each thing in it is still whole. */
async function clipped(page: Page): Promise<string[]> {
  return page.evaluate((viewportWidth) => {
    const SELECTOR = 'button, a[href], input, select, textarea, summary, [role="button"], [role="tab"], [role="slider"], [role="switch"], h1, h2, h3, h4, label, legend, th';
    const named = (el: Element): string => {
      const text = (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
      return `<${el.tagName.toLowerCase()}> "${text}"`;
    };
    const scrollsSideways = (el: Element): boolean => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const x = getComputedStyle(p).overflowX;
        if ((x === 'auto' || x === 'scroll') && p.scrollWidth > p.clientWidth) return true;
      }
      return false;
    };
    const found: string[] = [];
    for (const el of Array.from(document.querySelectorAll(SELECTOR))) {
      if (el.getClientRects().length === 0 || getComputedStyle(el).visibility === 'hidden') continue;
      const box = el.getBoundingClientRect();
      if ((box.width === 0 || box.height === 0) && el.textContent?.trim()) {
        found.push(`${named(el)} is squeezed to nothing: ${box.width} x ${box.height}`);
        continue;
      }
      // scrollWidth within clientWidth, for an element that clips what is past its edge; for one that does not, the text itself within the element's own box
      // (scrollWidth would count an invisible tap area that reaches past a link, which is no cut-off label)
      const style = getComputedStyle(el);
      const clipsX = style.overflowX !== 'visible';
      const clipsY = style.overflowY !== 'visible';
      if (clipsX && el.scrollWidth > el.clientWidth + 1) found.push(`${named(el)} is cut off: scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}`);
      if (/^(hidden|clip)$/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 1) {
        found.push(`${named(el)} is cut off at the bottom: scrollHeight ${el.scrollHeight} > clientHeight ${el.clientHeight}`);
      }
      if (!clipsX || !clipsY) {
        const text = document.createRange();
        text.selectNodeContents(el);
        const t = text.getBoundingClientRect();
        if (t.width > 0 && (t.left < box.left - 1 || t.right > box.right + 1)) {
          found.push(`${named(el)} spills out of itself: its text spans ${Math.round(t.left)} to ${Math.round(t.right)}, the box ${Math.round(box.left)} to ${Math.round(box.right)}`);
        }
      }
      if (!scrollsSideways(el) && (box.left < -1 || box.right > viewportWidth + 1)) {
        found.push(`${named(el)} is off the screen: ${Math.round(box.left)} to ${Math.round(box.right)} of ${viewportWidth}`);
      }
    }
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth) found.push('the page itself scrolls sideways');
    return [...new Set(found)];
  }, VIEWPORT.width);
}

for (const screen of SCREENS) {
  test(`${screen.name} at 200% text: nothing is clipped or off the screen`, async ({ page }) => {
    await screen.open(page);
    // the phone's text size is really 200%: html's own size is twice the usual
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(`${TEXT_PX}px`);
    await shot(page, screen.shot);
    await test.info().attach(screen.shot, { path: `shots/${screen.shot}.png`, contentType: 'image/png' });
    expect(await clipped(page)).toEqual([]);
  });
}

test('the five main screens are the ones the story names', () => {
  expect(SCREENS.map((s) => s.name)).toEqual(['Reader', 'Quick test', 'Talk', 'Settings', 'Placement']);
});

// The canary: the check must see a label that is cut off, or it checks nothing.
test('the check fails on a label that is cut off', async ({ page }) => {
  await SCREENS[3].open(page);
  expect(await clipped(page)).toEqual([]);
  await page.getByRole('heading', { name: 'Settings', level: 1 }).evaluate((el) => {
    el.setAttribute('style', 'display:block;width:20px;overflow:hidden;white-space:nowrap');
  });
  expect((await clipped(page)).some((line) => line.includes('Settings') && line.includes('cut off'))).toBe(true);
});
