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
