import { expect, test, type Page } from '@playwright/test';
import { GRAMMAR_HELP_ANSWER, makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

// A finger on a word of the reader, as a phone has it: touch points, not the mouse. The engine is bsv-kit's honest fake
// (tests/support/honest-fakes.ts; headless Chromium has no Greek voice).
test.use({ hasTouch: true, viewport: VIEWPORT });

async function openReader(page: Page) {
  await openUnlocked(page);
  await honestSpeech(page, { langs: ['el-GR'] });
  await page.addInitScript(() => {
    const seen: boolean[] = [];
    document.addEventListener('contextmenu', (e) => seen.push(e.defaultPrevented));
    Object.assign(window, { __contextmenus: seen });
  });
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}


/** A touch that stays on `selector` for `ms`, through the browser's own touch input (CDP), then lifts. */
async function touchHold(page: Page, selector: string, ms: number) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`no ${selector}`);
  const point = [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point });
  await page.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test('a touch long-press on a word says it, selects no text and raises no menu of the browser', async ({ page }) => {
  await openReader(page);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  const word = '[data-verse="1"] [data-word="0"]';
  await touchHold(page, word, 900);
  await expect.poll(() => spoken(page)).toMatchObject([{ text: 'Οὐδὲν', lang: 'el-GR' }]);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const selection = await page.evaluate(() => ({ text: window.getSelection()?.toString() ?? '', collapsed: window.getSelection()?.isCollapsed ?? true }));
  expect(selection).toEqual({ text: '', collapsed: true });
  // any contextmenu the browser raised on the word was cancelled by the page
  const menus = await page.evaluate(() => (window as unknown as { __contextmenus: boolean[] }).__contextmenus);
  expect(menus.every(Boolean)).toBe(true);
  const style = await page.locator(word).evaluate((el) => {
    const css = getComputedStyle(el) as CSSStyleDeclaration & { webkitUserSelect?: string };
    return { select: css.userSelect, callout: css.getPropertyValue('-webkit-touch-callout') };
  });
  expect(style.select).toBe('none');
});

test('the first tap on a word shows the tip once; Got it keeps it away; the sheet has Ask the tutor, and it opens the tutor holding the word', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_HELP_ANSWER };
  await routePostern(page, fake);
  await openReader(page);
  const word = page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true });
  await word.tap();

  const sheet = page.getByRole('dialog', { name: 'Word' });
  const tip = sheet.getByRole('note');
  await expect(tip).toContainText('Long-press a word to hear it');
  const got = tip.getByRole('button', { name: 'Got it' });
  expect((await got.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  const ask = sheet.getByRole('button', { name: 'Ask the tutor' });
  // the tip is wholly in view and the Ask the tutor button is in reach without scrolling the sheet (with the tip up, the facts' box is
  // a little shorter, so the button's last pixels wait under the fold until he scrolls or dismisses the tip)
  await expect(tip).toBeInViewport({ ratio: 1 });
  await expect(ask).toBeInViewport({ ratio: 0.7 });
  const box = await ask.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  const fits = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
  expect(fits.w).toBeLessThanOrEqual(fits.c);
  await shot(page, 'word-tip');

  await got.tap();
  await expect(tip).toHaveCount(0);
  await sheet.getByRole('button', { name: 'Done' }).tap();
  await word.tap();
  await expect(page.getByRole('dialog', { name: 'Word' })).toBeVisible();
  await expect(page.getByRole('note')).toHaveCount(0);

  await page.getByRole('dialog', { name: 'Word' }).getByRole('button', { name: 'Ask the tutor' }).tap();
  const talk = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(talk).toBeVisible();
  await expect(talk.locator('[data-turn]')).toContainText(GRAMMAR_HELP_ANSWER.answer);
  expect(fake.received[0].input.focus).toEqual({
    form: 'συνεργεῖ',
    lemma: 'συνεργέω',
    parse: 'verb, present active indicative, 3rd person singular',
    kind: 'word',
  });
});
