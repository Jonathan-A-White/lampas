import { expect, test, type Page } from '@playwright/test';
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

// The engine is a stand-in that records what the page asks of it (headless Chromium has no Greek voice).
async function stubSpeech(page: Page) {
  await page.addInitScript(() => {
    const calls: string[] = [];
    const synth = {
      speaking: false,
      pending: false,
      getVoices: () => [{ lang: 'el-GR', name: 'Greek' }],
      addEventListener: () => {},
      removeEventListener: () => {},
      resume: () => {},
      cancel: () => {
        calls.push('cancel');
        synth.speaking = false;
      },
      speak: (u: { text: string; lang: string }) => {
        calls.push(`speak ${u.text} ${u.lang}`);
        synth.speaking = true;
      },
    };
    class Utterance {
      lang = '';
      rate = 1;
      voice = null;
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
    (window as unknown as { __calls: string[] }).__calls = calls;
  });
}

test('Hold to hear speaks the word while held, stops on release, shifts nothing and leaves the glosses tappable', async ({ page }) => {
  await openUnlocked(page);
  await stubSpeech(page);
  await page.goto('/#/test');
  const bar = page.getByTestId('hold-to-hear');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('Hold to hear');
  const box = await bar.boundingBox();
  await expect(bar).toHaveAttribute('data-hold-bar', '');
  expect(box?.height).toBe(96);
  expect(box?.width).toBeGreaterThan(300);
  const first = page.locator('[data-option]').first();
  const before = await first.boundingBox();

  const lemma = await page.getByTestId('prompt').textContent();
  const calls = () => page.evaluate(() => (window as unknown as { __calls: string[] }).__calls);
  if (!box) throw new Error('no bar');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(calls).toEqual([`speak ${lemma} el-GR`]);
  expect(await first.boundingBox()).toEqual(before);
  await shot(page, 'test-hold-to-hear');
  await page.mouse.up();
  await expect.poll(calls).toEqual([`speak ${lemma} el-GR`, 'cancel']);

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
  const calls = () => page.evaluate(() => (window as unknown as { __calls: string[] }).__calls);
  expect(await calls()).toEqual([]);
  await expect(page.getByRole('button', { name: 'Ask the tutor' })).toHaveCount(0);
  const first = page.locator('[data-option]').first();
  const before = await first.boundingBox();

  // the first gloss may be right or wrong: either way the word speaks, and the test waits for Next
  await first.click();
  await expect(page.locator('[data-option][data-result]')).not.toHaveCount(0);
  await expect.poll(calls).toContain(`speak ${word} el-GR`);
  expect((await calls()).filter((c) => c.startsWith('speak '))).toHaveLength(1);
  expect(await first.boundingBox()).toEqual(before);

  const next = page.getByTestId('next');
  const ask = page.getByRole('button', { name: 'Ask the tutor' });
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

  await ask.click();
  await expect(page.getByRole('textbox', { name: 'Your question' })).toBeVisible();
  expect(await page.getByRole('textbox', { name: 'Your question' }).inputValue()).toContain(word ?? '');
});
