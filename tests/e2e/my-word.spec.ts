import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, READING_ANSWER, TIMED_READING_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { fakeMedia, type FakeWindow } from './fake-media';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };

async function holdFor(page: Page, button: ReturnType<Page['getByRole']>, ms: number): Promise<void> {
  const box = await button.boundingBox();
  if (!box) throw new Error('the button is not on the page');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** The Governor's screen of 2026-10-09 (mw-5r3p30.139): Hebrews 7:8, 'In the case of the Levites, mortal men collect the tenth; ...', with 'Levites,' (the
 * sixth word, with its comma) flagged and timed. */
const LEVITES_READING_ANSWER = {
  verdict: 'some-to-fix',
  focus_words: [{ word: 'Levites', index: 5, chunks: ['Lee', 'vites'], tip: 'The first part is lee; the second rhymes with kites.', start: 1.2, end: 1.7 }],
  note: 'Nearly there: one word to say again.',
};

/** Reads verse `verse` of the chapter at `hash` through the fake mill, which answers with `answer`, and waits for the result with the `marked` words.
 * The clip is as long as he holds the bar, 2.2 s here: the timed word (1.2 to 1.7 s) lies inside it. */
async function readVerse(page: Page, answer: unknown, { hash, verse, marked }: { hash: string; verse: number; marked: string[] }) {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer };
  await routePostern(page, fake);
  await fakeMedia(page, 2.2);
  await openUnlocked(page);
  await page.goto(hash);
  await chooseAction(page, verse, 'Read it aloud');
  const panel = page.getByRole('region', { name: 'Reading check' });
  await holdFor(page, page.getByRole('button', { name: `Hold to read verse ${verse}`, exact: true }), 2200);
  await expect(panel.locator('[data-fix]')).toHaveText(marked);
  return panel;
}

/** Romans 8:28 read through the fake mill: READING_ANSWER or TIMED_READING_ANSWER, which mark 'together' and 'purpose'. */
const readVerse28 = (page: Page, answer: unknown) => readVerse(page, answer, { hash: '/', verse: 28, marked: ['together', 'purpose'] });

const seen = (page: Page) => page.evaluate(() => (window as unknown as FakeWindow).plays);
const paused = (page: Page) => page.evaluate(() => (window as unknown as FakeWindow).pauses);

test("'Me' beside a timed word's speaker plays only that word of the clip, and stops at its end", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const panel = await readVerse28(page, TIMED_READING_ANSWER);

  const speaker = panel.getByRole('button', { name: 'Hear together', exact: true });
  const me = panel.getByRole('button', { name: 'Hear me say together', exact: true });
  await expect(me).toHaveText('Me');
  // the word that was not timed has the speaker and no Me
  await expect(panel.getByRole('button', { name: 'Hear purpose', exact: true })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Hear me say purpose' })).toHaveCount(0);
  await expect(panel.locator('[data-me]')).toHaveCount(1);

  // side by side with the speaker, a thumb's size
  const [s, m] = [await speaker.boundingBox(), await me.boundingBox()];
  expect(m?.height).toBeGreaterThanOrEqual(43.5);
  expect(m?.width).toBeGreaterThanOrEqual(43.5);
  expect(Math.abs((s?.y ?? 0) + (s?.height ?? 0) / 2 - ((m?.y ?? 0) + (m?.height ?? 0) / 2))).toBeLessThan(12);
  expect(m?.x).toBeGreaterThan((s?.x ?? 0) + (s?.width ?? 0) - 1);
  await shot(page, 'my-word');

  await me.click();
  await expect(panel.getByRole('button', { name: 'Stop hearing me say together', exact: true })).toHaveText('Stop');
  // it starts where the word starts in the recording ...
  const plays = await seen(page);
  expect(plays).toHaveLength(1);
  expect(plays[0].src).toMatch(/^blob:/);
  expect(plays[0].from).toBeCloseTo(1.2, 2);
  // ... and pauses where the word ends, not at the end of the clip, and the button says Me again
  await expect.poll(() => paused(page)).toHaveLength(1);
  const [at] = await paused(page);
  expect(at).toBeGreaterThanOrEqual(1.7);
  expect(at).toBeLessThan(1.7 + 0.2);
  await expect(me).toHaveText('Me');
});

test("A flagged word's comma stays with the word, before its speaker and Me, on one line at phone width: 'Levites,' in Hebrews 7:8", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const panel = await readVerse(page, LEVITES_READING_ANSWER, { hash: '/#/?b=heb&c=7', verse: 8, marked: ['Levites'] });
  const word = panel.locator('[data-fix="levites"]');
  const speaker = panel.getByRole('button', { name: 'Hear Levites', exact: true });
  const me = panel.getByRole('button', { name: 'Hear me say Levites', exact: true });
  // the text right after the word is its comma, drawn right after the word and before the speaker, all on the word's line
  const comma = await word.evaluate((el) => {
    const node = el.nextSibling;
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    return { text: node.textContent, x: box.x, right: box.right, middle: box.y + box.height / 2 };
  });
  const [w, s, m] = [await word.boundingBox(), await speaker.boundingBox(), await me.boundingBox()];
  expect(comma?.text).toBe(',');
  expect(comma?.x).toBeGreaterThanOrEqual((w?.x ?? 0) + (w?.width ?? 0) - 1);
  expect(s?.x).toBeGreaterThanOrEqual((comma?.right ?? 0) - 1);
  expect(m?.x).toBeGreaterThan((s?.x ?? 0) + (s?.width ?? 0) - 1);
  const line = (w?.y ?? 0) + (w?.height ?? 0) / 2;
  expect(Math.abs((comma?.middle ?? 0) - line)).toBeLessThan(12);
  expect(Math.abs((s?.y ?? 0) + (s?.height ?? 0) / 2 - line)).toBeLessThan(12);
  await shot(page, 'my-word-levites');
});

test('Stop ends a word before its end, and Play my reading still plays all of the clip', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const panel = await readVerse28(page, TIMED_READING_ANSWER);
  await panel.getByRole('button', { name: 'Hear me say together', exact: true }).click();
  await panel.getByRole('button', { name: 'Stop hearing me say together', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Hear me say together', exact: true })).toHaveText('Me');
  expect(await paused(page)).toHaveLength(1);

  await panel.getByRole('button', { name: 'Play my reading', exact: true }).click();
  const plays = await seen(page);
  expect(plays).toHaveLength(2);
  expect(plays[1].from).toBe(0);
});

test('A reading whose words came back with no times has no Me button', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  const panel = await readVerse28(page, READING_ANSWER);
  await expect(panel.getByRole('button', { name: 'Hear together', exact: true })).toBeVisible();
  await expect(panel.locator('[data-me]')).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Play my reading', exact: true })).toBeVisible();
});
