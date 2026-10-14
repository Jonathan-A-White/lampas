// The round Ask the tutor button floats over the foot of every full screen that shows it. As on the Reader (mw-5r3p30.115), nothing on the screen
// may ever be left behind it: his Quick test showed the button over an answer, and Settings over a help line (mw-5r3p30.279, mw-5r3p30.147). Each
// screen is scrolled through from the top to its end and no drawn thing (a word of text, a button, a field) may meet the button; at the end
// the last thing on the screen is clear of it too. At a 412x915 phone.
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });

const BUTTON = 'button[data-ask-tutor]';

type Box = { x: number; y: number; width: number; height: number };
const meets = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** Every drawn thing in the screen's scroll box as it is on screen now (what the box clips is not counted): each word of text, each button, field and image. */
const thingsOnScreen = (page: Page) =>
  page.locator('main.screen').evaluate((main) => {
    const bounds = main.getBoundingClientRect();
    const out: { what: string; x: number; y: number; width: number; height: number }[] = [];
    const add = (what: string, r: DOMRect) => {
      const top = Math.max(r.top, bounds.top);
      const bottom = Math.min(r.bottom, bounds.bottom);
      if (r.width < 2 || bottom - top < 2) return;
      out.push({ what, x: r.x, y: top, width: r.width, height: bottom - top });
    };
    for (const el of main.querySelectorAll<HTMLElement>('button, input, select, textarea, a, img, svg')) add(el.tagName.toLowerCase() + ' ' + (el.textContent ?? '').trim().slice(0, 30), el.getBoundingClientRect());
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      for (const m of text.matchAll(/\S+/g)) {
        const range = document.createRange();
        range.setStart(node, m.index ?? 0);
        range.setEnd(node, (m.index ?? 0) + m[0].length);
        for (const r of range.getClientRects()) add(m[0], r);
      }
    }
    return out;
  });

/** Scrolls the screen from its top to its end and fails the moment anything is behind the button; returns how far it scrolled. */
async function expectNothingBehind(page: Page, place: string) {
  const main = page.locator('main.screen');
  const button = await page.locator(BUTTON).boundingBox();
  if (!button) throw new Error('no button');
  const room = await main.evaluate((el) => el.scrollHeight - el.clientHeight);
  for (let at = 0; ; at += 120) {
    const to = Math.min(at, room);
    await main.evaluate((el, t) => {
      el.scrollTop = t;
    }, to);
    const behind = (await thingsOnScreen(page)).filter((t) => meets(t, button)).map((t) => t.what);
    expect(behind, `${place}, scrolled to ${to} of ${room}`).toEqual([]);
    if (to >= room) break;
  }
  return room;
}

test('Quick test: no answer is ever behind the Ask the tutor button, asked or answered, at any scroll', async ({ page }) => {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 300 });
  // a short phone: the question does not fit and has to scroll
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/#/test');
  await expect(page.locator('[data-option]')).toHaveCount(4);
  expect(await expectNothingBehind(page, 'asked')).toBeGreaterThan(0);
  await page.locator('[data-option]').first().click();
  await expect(page.getByTestId('next')).toBeVisible();
  await expectNothingBehind(page, 'answered');
  await shot(page, 'ask-button-room-quiz');
});

test('Quick test at 412x915: the last answer scrolled to the end is clear of the button', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/test');
  await expect(page.locator('[data-option]')).toHaveCount(4);
  const button = await page.locator(BUTTON).boundingBox();
  if (!button) throw new Error('no button');
  await page.locator('main.screen').evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const options = page.locator('[data-option]');
  const last = await options.nth((await options.count()) - 1).boundingBox();
  if (!last) throw new Error('no last answer');
  expect(meets(last, button)).toBe(false);
});

test('Settings: no help line is ever behind the Ask the tutor button, from its top to its last line', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  expect(await expectNothingBehind(page, 'Settings')).toBeGreaterThan(1500);
  await shot(page, 'ask-button-room-settings');
});

test('Settings sideways: the button has a gutter, nothing is behind it from top to end', async ({ page }) => {
  await openUnlocked(page);
  await page.setViewportSize({ width: 740, height: 360 });
  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  expect(await expectNothingBehind(page, 'Settings sideways')).toBeGreaterThan(1500);
});

test('Import: the button above the Add bar has nothing behind it either', async ({ page }) => {
  await openUnlocked(page);
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/#/import');
  await expect(page.locator(BUTTON)).toBeVisible();
  await expectNothingBehind(page, 'Import');
});
