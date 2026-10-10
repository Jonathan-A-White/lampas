// The Ask the tutor sheet on a phone held sideways (mw-vtjxh4.44): at 844x390 the conversation box keeps room to read in, the three suggested
// questions can be seen and tapped, and an answer shows at least three lines without scrolling the sheet. The same checks at 390x844 (portrait).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const LONG_ANSWER = {
  answer:
    'About is where Lampas names the texts and tools it is built on. The Greek is the Byzantine text of Robinson and Pierpont, the English is the Majority Standard Bible, ' +
    'and each credit says what it is used for and under which licence. Tap a link there to read the licence itself. Nothing here changes how you read; it is the thanks and the small print, in plain words.',
  words: [],
};

const SIZES = [
  { name: 'landscape', width: 844, height: 390 },
  { name: 'portrait', width: 390, height: 844 },
];

type Rect = { x: number; y: number; width: number; height: number };
const rectOf = async (target: Locator): Promise<Rect> => {
  const box = await target.boundingBox();
  if (!box) throw new Error('no box');
  return box;
};

/** Inside the conversation box: the whole of the box's top edge to bottom edge holds it. */
const within = (inner: Rect, outer: Rect): boolean => inner.y >= outer.y - 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;

async function openAbout(page: Page) {
  await openUnlocked(page);
  await page.goto('/#/about');
  await expect(page.getByRole('heading', { name: 'About', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Ask the tutor: About' });
  await expect(sheet).toBeVisible();
  return sheet;
}

for (const size of SIZES) {
  test(`Ask the tutor from About at ${size.width}x${size.height}: room for the questions and for an answer`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    const fake = makeFakePostern();
    fake.autoReply = { status: 'answered', answer: LONG_ANSWER };
    await routePostern(page, fake);
    const sheet = await openAbout(page);

    // the conversation box is the one that scrolls, between the header and the foot
    const box = sheet.locator('[data-talk-list]');
    const boxRect = await rectOf(box);
    expect(boxRect.height).toBeGreaterThanOrEqual(150);
    // the sheet stays inside the window
    const sheetRect = await rectOf(sheet);
    expect(sheetRect.y).toBeGreaterThanOrEqual(0);
    expect(sheetRect.y + sheetRect.height).toBeLessThanOrEqual(size.height + 0.5);

    const questions = sheet.locator('[data-suggestion]');
    await expect(questions).toHaveCount(3);
    await shot(page, `talk-${size.name}-empty`);
    for (const q of await questions.all()) {
      await expect(q).toBeVisible();
      expect(within(await rectOf(q), boxRect), 'a suggestion is cut off by the conversation box').toBe(true);
    }

    // a tap on the last one sends it
    await questions.last().click();
    const turn = sheet.locator('[data-turn]');
    await expect(turn).toHaveCount(1);
    expect(fake.received).toHaveLength(1);

    // at least three lines of the answer are on show without moving the sheet
    const answer = turn.locator('[data-answer-text]');
    await expect(answer).toBeVisible();
    const lineHeight = await answer.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    const text = await rectOf(answer);
    const after = await rectOf(box);
    const shown = Math.min(text.y + text.height, after.y + after.height) - Math.max(text.y, after.y);
    expect(shown, 'less than three lines of the answer are in the box').toBeGreaterThanOrEqual(3 * lineHeight);
    await shot(page, `talk-${size.name}-answered`);
  });
}
