// tests/e2e/verse-makeover.spec.ts — the Verse view's makeover (mw-5r3p30.896) on a 360x740 phone, at the phone's own text size and at 200%: a passage (Revelation 10:1-11)
// and one verse (Revelation 10:1), each as it opens (Listen) and with Ask the tutor chosen. One primary at a time (one button filled in the accent), every action and tool
// on screen without a scroll, no action label clipped or wrapped, and with the Ask composer open at least six lines of the text in view. jsdom has no layout, so it is proven
// here; the shots are the before/after of the closing comment.
import { expect, test as base, chromium, type Locator, type Page } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { browserEnv } from '../support/browser-env';
import { makeFakePostern } from '../support/fake-postern';
import { honestMic } from '../support/honest-fakes';
import { routePostern } from '../support/playwright-postern';
import { startAtAllIn } from './greek-start';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 360, height: 740 };
/** The browser's default font size at 200%: 2 x 16 px. */
const LARGE_PX = 32;

type Box = { x: number; y: number; width: number; height: number };

const boxOf = async (target: Locator): Promise<Box> => {
  const box = await target.boundingBox();
  if (!box) throw new Error('no box');
  return box;
};

/** Opens the Verse view on `ref` with a licence, a phone that can share and a recogniser (so the composer shows its Hold to ask bar). */
async function open(page: Page, ref: string): Promise<Locator> {
  await page.addInitScript(() => Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true }));
  await routePostern(page, makeFakePostern());
  await honestMic(page);
  await openUnlocked(page);
  await page.goto(`/#/?ref=${ref}`);
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  await expect(view.getByRole('button', { name: 'Listen', exact: true })).toBeVisible();
  return view;
}

/** The buttons on the view whose background is the accent: the primaries. */
const filledButtons = (view: Locator): Promise<string[]> =>
  view.evaluate((root) => {
    const accent = getComputedStyle(root).getPropertyValue('--lp-accent').trim();
    const probe = document.createElement('span');
    probe.style.color = accent;
    root.appendChild(probe);
    const accentRgb = getComputedStyle(probe).color;
    probe.remove();
    const out: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>('button, a[href]')) {
      if (el.getClientRects().length === 0) continue;
      if (getComputedStyle(el).backgroundColor === accentRgb) out.push((el.getAttribute('aria-label') ?? el.textContent ?? '').trim());
    }
    return out;
  });

/** The number of lines of the text that are wholly in view inside the text's own box. */
const linesInView = (view: Locator): Promise<number> =>
  view.locator('[data-sheet-verse]').evaluate((el) => {
    const box = (el.closest('[data-verse-text]') ?? el).getBoundingClientRect();
    const top = Math.max(box.top, 0);
    const bottom = Math.min(box.bottom, window.innerHeight);
    const tops: number[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        if (r.width < 1 || r.height < 1 || r.top < top - 1 || r.bottom > bottom + 1) continue;
        if (!tops.some((t) => Math.abs(t - r.top) < r.height / 2)) tops.push(r.top);
      }
    }
    return tops.length;
  });

/** Every action and tool is on screen without a scroll (the controls stand outside the scroll box, between the text and the foot), a thumb tall, its label on one line and not cut. At 200% text
 * (`large`, a window of 20 rem or less) the controls are the end of the scrolling flow instead: each is reached by that scroll, and a label may take two lines (never more, never cut), as the
 * row's cells are two to a row there. */
async function expectActionsInReach(view: Locator, viewport: { width: number; height: number }, large = false) {
  const foot = view.locator('[data-verse-bar]');
  const footTop = (await foot.count()) > 0 && (await foot.isVisible()) ? (await boxOf(foot)).y : viewport.height;
  const screen = await boxOf(view.locator('.screen'));
  for (const group of ['Actions', 'Tools']) {
    const buttons = await view.getByRole('group', { name: group, exact: true }).getByRole('button').all();
    expect(buttons.length, group).toBeGreaterThan(0);
    for (const button of buttons) {
      const name = (await button.textContent()) ?? '';
      if (large) await button.scrollIntoViewIfNeeded();
      const b = await boxOf(button);
      expect(b.height, `${name} height`).toBeGreaterThanOrEqual(43.5);
      expect(b.x, `${name} left`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, `${name} right`).toBeLessThanOrEqual(viewport.width);
      expect(b.y, `${name} top: ${large ? 'on screen' : "under the text's scroll box"}`).toBeGreaterThanOrEqual((large ? screen.y : screen.y + screen.height) - 0.5);
      expect(b.y + b.height, `${name} bottom: above the foot`).toBeLessThanOrEqual(footTop + 0.5);
      const label = await button.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return { lines: new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size, cut: el.scrollWidth > el.clientWidth + 1 };
      });
      expect(label.lines, `${name} lines`).toBeLessThanOrEqual(large ? 2 : 1);
      expect(label.cut, `${name} cut off`).toBe(false);
    }
  }
}

/** The screen as it opens, before any scroll the checks made. */
const toTop = (view: Locator) =>
  view.locator('.screen').evaluate((el) => {
    el.scrollTop = 0;
  });

async function checkView(page: Page, view: Locator, name: string, viewport: { width: number; height: number }, lines: number, large = false) {
  await shot(page, `verse-makeover-${name}-listen`);
  await expectActionsInReach(view, viewport, large);
  expect(await filledButtons(view), 'on Listen the one primary is Play').toHaveLength(1);
  await view.getByRole('button', { name: 'Ask the tutor', exact: true }).click();
  await expect(page.getByTestId('composer')).toBeVisible();
  await expect(page.getByTestId('composer').getByRole('button', { name: 'Hold to ask', exact: true })).toBeVisible();
  await toTop(view);
  await shot(page, `verse-makeover-${name}-ask`);
  expect(await filledButtons(view), 'with Ask the tutor chosen the one primary is Hold to ask').toEqual(['Hold to ask']);
  expect(await linesInView(view), 'lines of the text in view with the composer open').toBeGreaterThanOrEqual(lines);
  await expectActionsInReach(view, viewport, large);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

base.describe('at the phone\'s own text size', () => {
  base.use({ viewport: VIEWPORT });

  base('Revelation 10:1-11: one primary, every action in reach, six lines of the passage with the composer open', async ({ page }) => {
    const view = await open(page, 'Rev.10.1-11');
    await expect(view.getByRole('heading', { name: 'Revelation 10, Revelation 10:1-11' })).toBeVisible();
    await checkView(page, view, 'passage-360', VIEWPORT, 6);
  });

  base('Revelation 10:1: the same for one verse', async ({ page }) => {
    const view = await open(page, 'Rev.10.1');
    await expect(view.getByRole('heading', { name: 'Revelation 10:1' })).toBeVisible();
    await checkView(page, view, 'verse-360', VIEWPORT, 6);
  });
});

// A Chromium of its own whose profile says the default font size is 200%, the way the phone's Font size does it (tests/e2e/large-text.spec.ts).
const large = base.extend({
  context: async ({ baseURL }, provide) => {
    const profile = mkdtempSync(join(tmpdir(), 'lampas-verse-makeover-'));
    mkdirSync(join(profile, 'Default'));
    writeFileSync(join(profile, 'Default', 'Preferences'), JSON.stringify({ webkit: { webprefs: { default_font_size: LARGE_PX, default_fixed_font_size: LARGE_PX - 4 } } }));
    const context = await chromium.launchPersistentContext(profile, { channel: 'chromium', env: browserEnv, baseURL, viewport: VIEWPORT, serviceWorkers: 'block' });
    await startAtAllIn(context);
    await provide(context);
    await context.close();
    rmSync(profile, { recursive: true, force: true });
  },
  page: async ({ context }, provide) => {
    await provide(context.pages()[0] ?? (await context.newPage()));
  },
});

large.describe('at 200% text', () => {
  large('Revelation 10:1-11 at 200%: one primary, every action in reach, the text still has lines in view with the composer open', async ({ page }) => {
    const view = await open(page, 'Rev.10.1-11');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(`${LARGE_PX}px`);
    await checkView(page, view, 'passage-200', VIEWPORT, 3, true);
  });

  large('Revelation 10:1 at 200%: the same for one verse', async ({ page }) => {
    const view = await open(page, 'Rev.10.1');
    await checkView(page, view, 'verse-200', VIEWPORT, 3, true);
  });
});
