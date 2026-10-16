import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { asSpoken } from '../support/lone-word';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The page never scrolls and never grows wider than the window.
async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

test('a Quick test question shows its glosses and, once tapped, the answer and Next in reach at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/test');
  await expect(page.getByRole('heading', { name: 'Quick test', level: 1 })).toBeVisible();
  const prompt = page.getByTestId('prompt');
  await expect(prompt).toBeVisible();
  expect((await prompt.boundingBox())?.height).toBeGreaterThanOrEqual(48);

  const options = page.locator('[data-option]');
  await expect(options).toHaveCount(4);
  for (const box of await options.all()) expect((await box.boundingBox())?.height).toBeGreaterThanOrEqual(48);

  await options.first().click();
  await expect(page.locator('[data-option][data-result="right"]')).toHaveCount(1);
  const next = page.getByTestId('next');
  await expect(next).toBeVisible();
  const box = await next.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(844);
  expect(box?.height).toBeGreaterThanOrEqual(48);
  await expectFitsPhone(page);

  await shot(page, 'test-question');
});

test('a Quick test round ends with N of 10 and the words missed at phone width', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/test');
  for (let i = 0; i < 10; i += 1) {
    await page.locator('[data-option]').first().click();
    await page.getByTestId('next').click();
  }
  await expect(page.getByTestId('score')).toHaveText(/^\d+ of 10$/);
  await expect(page.getByRole('button', { name: 'Another round' })).toBeVisible();
  await expectFitsPhone(page);

  await shot(page, 'test-end');
});

test('a Quick test question shows the picture beside a word that has one, and fits the phone', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/test');
  const prompt = page.getByTestId('prompt');
  await expect(prompt).toBeVisible();
  const lemma = await prompt.getAttribute('data-lemma');
  const picture = page.getByTestId('picture');
  // Every word of the seed list asked here but eleven has one; the picture is there or the word has none.
  if (await picture.count()) {
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    expect((await picture.boundingBox())?.width).toBeGreaterThanOrEqual(64);
  } else {
    expect(['ἀλλά', 'ἀμήν', 'γάρ', 'δέ', 'εἰ μή', 'μου', 'ὁ', 'ὅτι', 'οὐδέ', 'οὖν', 'οὔτε']).toContain(lemma);
  }
  await expect(page.locator('[data-option]')).toHaveCount(4);
  await expectFitsPhone(page);
});

// The engine is bsv-kit's honest fake (tests/support/honest-fakes.ts; headless Chromium has no Greek voice). A slow reader
// (2 s a word), so the word is still being spoken while the bar is held.
const stubSpeech = (page: Page) => honestSpeech(page, { langs: ['el-GR'], msPerWord: 2000 });

test('Tap to hear speaks the word on a tap, a second tap stops it, shifts nothing and leaves the glosses tappable', async ({ page }) => {
  await openUnlocked(page);
  await stubSpeech(page);
  await page.goto('/#/test');
  const bar = page.getByTestId('tap-to-hear');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('Tap to hear');
  const box = await bar.boundingBox();
  await expect(bar).toHaveAttribute('data-tap-bar', '');
  expect(box?.height).toBe(96);
  expect(box?.width).toBeGreaterThan(300);
  const first = page.locator('[data-option]').first();
  const before = await first.boundingBox();

  const lemma = await page.getByTestId('prompt').textContent();
  const calls = async () => (await spoken(page)).map((e) => ({ text: e.text, lang: e.lang, outcome: e.outcome }));
  if (!box) throw new Error('no bar');
  await bar.click();
  await expect.poll(calls).toEqual([{ text: asSpoken(lemma ?? ''), lang: 'el-GR', outcome: 'speaking' }]);
  expect(await first.boundingBox()).toEqual(before);
  await shot(page, 'test-tap-to-hear');
  await bar.click();
  await expect.poll(calls).toEqual([{ text: asSpoken(lemma ?? ''), lang: 'el-GR', outcome: 'interrupted' }]);

  await first.click();
  await expect(page.locator('[data-option][data-result="right"]')).toHaveCount(1);
  await expectFitsPhone(page);
});

test('the word speaks by itself once, a wrong answer waits for Next, and Ask the tutor sits beside Next without moving the glosses', async ({ page }) => {
  await openUnlocked(page);
  await stubSpeech(page);
  await page.goto('/#/test');
  const prompt = page.getByTestId('prompt');
  await expect(prompt).toBeVisible();
  const word = await prompt.textContent();
  const calls = async () => (await spoken(page)).map((e) => ({ text: e.text, lang: e.lang, outcome: e.outcome }));
  expect(await calls()).toEqual([]);
  await expect(page.getByRole('button', { name: 'Ask the tutor', exact: true })).toHaveCount(0);
  const first = page.locator('[data-option]').first();
  const before = await first.boundingBox();

  // the first gloss may be right or wrong: either way the word speaks, and the test waits for Next
  await first.click();
  await expect(page.locator('[data-option][data-result]')).not.toHaveCount(0);
  await expect.poll(async () => (await calls()).map((c) => `${c.text} ${c.lang}`)).toEqual([`${asSpoken(word ?? '')} el-GR`]);
  expect(await first.boundingBox()).toEqual(before);

  const next = page.getByTestId('next');
  const ask = page.getByRole('button', { name: 'Ask the tutor', exact: true });
  await expect(next).toBeVisible();
  await expect(ask).toBeVisible();
  const nextBox = await next.boundingBox();
  const askBox = await ask.boundingBox();
  expect(nextBox && nextBox.y + nextBox.height).toBeLessThanOrEqual(844);
  expect(nextBox?.height).toBeGreaterThanOrEqual(48);
  expect(askBox?.height).toBeGreaterThanOrEqual(48);
  expect(askBox?.y).toBe(nextBox?.y);
  await page.waitForTimeout(800);
  await expect(prompt).toHaveText(word ?? '');
  await expectFitsPhone(page);
  await shot(page, 'test-answered');

  // Ask the tutor opens the Talk sheet on the word's verse with the first question already sent (no backend here: it says so)
  await ask.click();
  const talk = page.getByRole('dialog', { name: /^Talk about / });
  await expect(talk).toBeVisible();
  await expect(talk).toContainText(word ?? '');
});

// mw-5r3p30.324: the word an answer says by itself is the bar's word too: the bar shows the stop square while it speaks, and one tap stops it (never says
// it again from the start).
test('while the answered word speaks by itself, Tap to hear shows the stop square and one tap stops it', async ({ page }) => {
  await openUnlocked(page);
  await stubSpeech(page);
  await page.goto('/#/test');
  const bar = page.getByTestId('tap-to-hear');
  await expect(bar).toBeVisible();
  await expect(bar).toHaveAttribute('aria-pressed', 'false');
  const word = await page.getByTestId('prompt').textContent();
  const calls = async () => (await spoken(page)).map((e) => ({ text: e.text, lang: e.lang, outcome: e.outcome }));

  await page.locator('[data-option]').first().click();
  await expect.poll(calls).toEqual([{ text: asSpoken(word ?? ''), lang: 'el-GR', outcome: 'speaking' }]);
  await expect(bar).toHaveAttribute('aria-pressed', 'true');
  await expect(bar.locator('svg path')).toHaveAttribute('d', 'M6 6h12v12H6V6Z');
  await shot(page, 'test-answered-speaking');

  await bar.click();
  await expect.poll(calls).toEqual([{ text: asSpoken(word ?? ''), lang: 'el-GR', outcome: 'interrupted' }]);
  await expect(bar).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(500);
  expect(await calls()).toEqual([{ text: asSpoken(word ?? ''), lang: 'el-GR', outcome: 'interrupted' }]);
});
