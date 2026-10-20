// The Ask the tutor sheet on a phone held sideways (mw-vtjxh4.44): at 844x390 the conversation box keeps room to read in, the three suggested
// questions can be seen and tapped, and an answer shows at least three lines without scrolling the sheet. The same checks at 390x844 (portrait).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { honestSpeech } from '../support/honest-fakes';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { expectInList } from './talk-list';
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
  await expect(page.getByRole('heading', { name: 'About', exact: true, level: 1 })).toBeVisible();
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

const SIDEWAYS = { width: 844, height: 390 };

test('a two-line question sideways leaves three lines of the answer in view while it is read aloud (mw-5r3p30.488)', async ({ page }) => {
  await page.setViewportSize(SIDEWAYS);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: LONG_ANSWER };
  await routePostern(page, fake);
  await honestSpeech(page, { msPerWord: 400 });
  const sheet = await openAbout(page);
  const question = 'Why do you credit every one of these libraries and texts, and what would happen to Lampas if one of them changed?';
  expect(question.length).toBeGreaterThan(105);
  await sheet.getByRole('textbox', { name: 'Your message' }).fill(`${question} Tell me all of it please.`);
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const answer = sheet.locator('[data-turn] [data-answer-text]');
  await expect(answer).toBeVisible();
  await expect(page.getByRole('region', { name: 'Speaking', exact: true })).toBeVisible();

  const lineHeight = await answer.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
  await expect
    .poll(async () => {
      const text = await rectOf(answer);
      const box = await rectOf(sheet.locator('[data-talk-list]'));
      return Math.min(text.y + text.height, box.y + box.height) - Math.max(text.y, box.y);
    }, { message: 'less than three lines of the answer are in the box while it is read aloud' })
    .toBeGreaterThanOrEqual(3 * lineHeight - 0.5);
  await shot(page, 'talk-landscape-long-question-speaking');
});

test('sideways, his question and its Copy are on one line while the answer is coming, and Copy does not move when the answer lands (mw-5r3p30.489)', async ({ page }) => {
  await page.setViewportSize(SIDEWAYS);
  const fake = makeFakePostern();
  await routePostern(page, fake);
  const sheet = await openAbout(page);
  const first = sheet.locator('[data-suggestion]').first();
  const said = ((await first.textContent()) ?? '').trim();
  await first.click();

  const pending = sheet.locator('[data-talk-pending]');
  const copy = pending.getByRole('button', { name: 'Copy my question' });
  await expect(copy).toBeVisible();
  // a fake Postern that answers 1.5 s after the call
  await page.waitForTimeout(1500);
  const asked = await rectOf(pending.getByText(said, { exact: true }));
  const before = await rectOf(copy);
  expect(before.y < asked.y + asked.height && asked.y < before.y + before.height, 'Copy is under the pending question, not beside it').toBe(true);
  await shot(page, 'talk-landscape-pending');

  await fake.answer({ status: 'answered', answer: LONG_ANSWER });
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);
  const after = await rectOf(sheet.locator('[data-turn]').getByRole('button', { name: 'Copy my question' }));
  expect(Math.abs(after.y - before.y), 'Copy moved when the answer landed').toBeLessThan(1);
});

test('a failed send sideways has its red message and Copy in the box, and again turned back upright (mw-5r3p30.443)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: LONG_ANSWER };
  await routePostern(page, fake);
  const sheet = await openAbout(page);
  await sheet.locator('[data-suggestion]').first().click();
  await expect(sheet.locator('[data-turn]')).toHaveCount(1);
  fake.licensed = false;
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Why do you credit all these?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const alert = sheet.getByRole('alert');
  await expect(alert).toContainText('No licence');

  for (const size of [SIDEWAYS, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    await expectInList(sheet, alert.locator('p.text-bad'), `the red message at ${size.width}x${size.height}`);
    await expectInList(sheet, alert.getByRole('button', { name: 'Copy my question' }), `the Copy at ${size.width}x${size.height}`);
  }
  await shot(page, 'talk-landscape-failed');
});

test('sideways, the Hold to talk label ends well inside its button (mw-5r3p30.490)', async ({ page }) => {
  await page.setViewportSize(SIDEWAYS);
  await routePostern(page, makeFakePostern());
  const sheet = await openAbout(page);
  const hold = sheet.getByRole('button', { name: 'Hold to talk' });
  await expect(hold).toBeVisible();
  const gap = await hold.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const text = Array.from(range.getClientRects()).reduce((right, r) => Math.max(right, r.right), 0);
    return el.getBoundingClientRect().right - text;
  });
  expect(gap, 'the label ends too close to the right edge of the button').toBeGreaterThanOrEqual(12);
});
