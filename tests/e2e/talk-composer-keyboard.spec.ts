// tests/e2e/talk-composer-keyboard.spec.ts — the Talk sheet's composer (voice-kit's Composer since mw-06ggew.15) with the keyboard up (mw-5r3p30.258), proving the
// scenarios of features/ask-composer.feature that need layout: at 390x844 and with the height cut to 450 (the keyboard), the typing box keeps most of the row, 'es' and
// 'links' stay on one line, Send is drawn with the words, the box grows upward to the kit's 200 px and then scrolls, nothing sits on Hold to talk, and a picture's
// thumbnail is above the row and not in it.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';
import { pictureInput, talkField } from './talk-field';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const SIZES = [
  { name: 'keyboard down', height: 844 },
  { name: 'keyboard up', height: 450 },
];

type Rect = { x: number; y: number; width: number; height: number };
const rectOf = async (target: Locator): Promise<Rect> => {
  const box = await target.boundingBox();
  if (!box) throw new Error('no box');
  return box;
};
const overlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5 && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;

async function open(page: Page, height: number) {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await expect(sheet).toBeVisible();
  // the keyboard comes up: the window loses its height
  await page.setViewportSize({ width: 390, height });
  return sheet;
}

/** Lines of text the box holds: its content height over its line height. */
const linesIn = (field: Locator): Promise<number> =>
  field.evaluate((el) => {
    // the text set in a copy of the box with no minimum height, so a box that is two lines tall when empty still counts what it holds
    const style = getComputedStyle(el);
    const copy = document.createElement('div');
    copy.style.cssText = `position:absolute;visibility:hidden;white-space:pre-wrap;overflow-wrap:break-word;box-sizing:content-box;font:${style.font};letter-spacing:${style.letterSpacing};width:${el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)}px`;
    copy.textContent = (el as HTMLTextAreaElement).value || ' ';
    document.body.append(copy);
    const lines = Math.round(copy.getBoundingClientRect().height / parseFloat(style.lineHeight));
    copy.remove();
    return lines;
  });

const bar = (sheet: Locator): Locator => sheet.getByRole('button', { name: 'Hold to talk', exact: true });

/** Nothing sits on the bar: no sibling's box meets it, and what is under each corner and the middle is the bar itself. */
async function expectNothingOn(page: Page, sheet: Locator): Promise<void> {
  const mine = await rectOf(bar(sheet));
  // every other control in the composer (the foot of the sheet), not only the bar's own siblings: Send sits in another box
  const rects = await sheet.locator('[data-composer]').evaluate(
    (foot) =>
      Array.from(foot.querySelectorAll('button, textarea, img'))
        .filter((el) => !el.matches('.bk-composer__bar') && !el.closest('.bk-composer__bar'))
        .map((el) => el.getBoundingClientRect().toJSON() as Rect),
  );
  for (const r of rects) if (r.width > 0 && r.height > 0) expect(overlap(mine, r), 'a control overlaps Hold to talk').toBe(false);
  const points = [
    [mine.x + 10, mine.y + 10],
    [mine.x + mine.width - 10, mine.y + 10],
    [mine.x + 10, mine.y + mine.height - 10],
    [mine.x + mine.width - 10, mine.y + mine.height - 10],
    [mine.x + mine.width / 2, mine.y + mine.height / 2],
  ];
  for (const [x, y] of points) {
    const top = await page.evaluate(([px, py]) => {
      const el = document.elementFromPoint(px, py);
      return el?.closest('.bk-composer__bar') ? 'bar' : `${el?.tagName} ${el?.getAttribute('aria-label') ?? el?.className}`;
    }, [x, y]);
    expect(top, `something covers Hold to talk at ${Math.round(x)},${Math.round(y)}`).toBe('bar');
  }
}

for (const size of SIZES) {
  test(`the composer at 390x${size.height} (${size.name}): the box keeps the row, Send comes with the words`, async ({ page }) => {
    const sheet = await open(page, size.height);
    // the kit's Composer opens on its bar (nothing sits on it) and Type a message brings the box out, with the mic and Send in its row
    await expectNothingOn(page, sheet);
    const wide = await rectOf(bar(sheet));
    expect(wide.width).toBeGreaterThan(wide.height * 1.5);
    const field = await talkField(sheet);
    const row = sheet.locator('.bk-composer__field-row');
    await expect(field).toBeVisible();
    await expect(sheet.getByRole('button', { name: 'Send', exact: true })).toHaveCount(0);

    // 'es' is on one line in a box that keeps at least half of the row, and Send is a thumb tall beside it
    await field.fill('es');
    expect(await linesIn(field)).toBe(1);
    // (the kit's row holds the mic and Send beside the box, a thumb wide each)
    expect((await rectOf(field)).width / (await rectOf(row)).width).toBeGreaterThanOrEqual(0.5);
    const send = await rectOf(sheet.getByRole('button', { name: 'Send', exact: true }));
    expect(send.width).toBeGreaterThanOrEqual(43.5);
    expect(send.height).toBeGreaterThanOrEqual(43.5);
    expect(overlap(send, await rectOf(field))).toBe(false);
    expect(send.x + send.width).toBeLessThanOrEqual(390);
    await shot(page, `talk-composer-keyboard-${size.height}-text`);
  });

  test(`the composer at 390x${size.height} (${size.name}): the box grows upward line by line, then scrolls`, async ({ page }) => {
    const sheet = await open(page, size.height);
    const field = await talkField(sheet);
    await field.fill('one');
    const one = await rectOf(field);
    await field.fill('one\ntwo\nthree');
    const three = await rectOf(field);
    expect(three.height).toBeGreaterThan(one.height);
    // it grew upward: the bottom stayed, the top moved up
    expect(Math.abs(three.y + three.height - (one.y + one.height))).toBeLessThanOrEqual(1);
    expect(three.y).toBeLessThan(one.y);
    expect(await linesIn(field)).toBe(3);

    await field.fill('one\ntwo\nthree\nfour\nfive\nsix\nseven\neight\nnine\nten\neleven\ntwelve');
    const many = await rectOf(field);
    // the kit holds the box at 200 px (--bk-composer-field-max-height) and it scrolls from there
    expect(many.height).toBeLessThanOrEqual(200.5);
    expect(await field.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    expect(await field.evaluate((el) => getComputedStyle(el).overflowY)).toMatch(/auto|scroll/);
    // the box stays inside the window
    expect(many.y).toBeGreaterThanOrEqual(0);
    await shot(page, `talk-composer-keyboard-${size.height}-lines`);
  });
}

test('the composer at 390x450 with a picture attached: links stays on one line and the thumbnail is above the row', async ({ page }) => {
  const sheet = await open(page, 450);
  await pictureInput(sheet).setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: PNG });
  const thumb = sheet.getByRole('group', { name: 'Pictures to send' }).getByRole('img', { name: 'p.png' });
  await expect(thumb).toBeVisible();
  const field = await talkField(sheet);
  await field.fill('links');
  expect(await linesIn(field)).toBe(1);
  const row = await rectOf(sheet.locator('.bk-composer__field-row'));
  const box = await rectOf(field);
  expect(box.width / row.width).toBeGreaterThanOrEqual(0.5);
  const picture = await rectOf(thumb);
  // not in the row of the box: above it
  expect(picture.y + picture.height).toBeLessThanOrEqual(row.y + 0.5);
  expect(overlap(picture, box)).toBe(false);
  await shot(page, 'talk-composer-keyboard-picture');
});
