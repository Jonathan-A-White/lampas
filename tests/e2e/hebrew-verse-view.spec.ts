// The Verse view of Jonah 1:1 in the Hebrew (mw-gdcyf98.4) at 390x844: the Hebrew verse as big as the Greek one, right to left, in the Hebrew face, every word a thumb-sized tap,
// Listen in he-IL (voice-kit's honest fake: headless Chromium has no Hebrew voice; how a real voice sounds is only a phone check), no Listen in Audible, and the English view as it was.
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });

const noSideways = async (page: Page): Promise<void> => {
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
};

test('Jonah 1:1 in the Hebrew view: big, right to left, in the Hebrew face, and Listen says it in he-IL', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR', 'he-IL'] });
  await openUnlocked(page);
  await page.goto('/#/?b=jon&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await choice(page, 'Hebrew').click();
  await expect(choice(page, 'Hebrew')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Verse 1', exact: true }).click();

  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view.getByRole('heading', { name: 'Jonah 1:1' })).toBeVisible();
  const verse = view.locator('[data-sheet-verse]');
  await expect(verse).toHaveAttribute('lang', 'he');
  await expect(verse).toHaveAttribute('dir', 'rtl');
  expect(await verse.evaluate((el) => getComputedStyle(el).direction)).toBe('rtl');
  expect(await verse.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Noto Serif Hebrew');
  // as big as the Greek verse: 2.25rem at the default text size
  expect(await verse.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(36);
  await expect(verse.locator('[data-word]')).toHaveCount(8);
  for (const w of await verse.locator('[data-word]').all()) expect((await w.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  // the first word stands at the right edge, the later ones to its left
  const first = (await verse.locator('[data-word="0"]').boundingBox())!;
  const last = (await verse.locator('[data-word="7"]').boundingBox())!;
  expect(last.x).toBeLessThan(first.x);
  expect(first.x + first.width).toBeGreaterThan(390 - 40);
  await expect(view.getByRole('link', { name: /^Listen in Audible/ })).toHaveCount(0);
  await noSideways(page);
  await shot(page, 'hebrew-jonah-1-1-verse-view');

  await view.getByRole('button', { name: /^Play / }).click();
  await expect.poll(async () => (await spoken(page)).map((u) => [u.text, u.lang])).toContainEqual(['וַיְהִי דְּבַר־ יְהוָה אֶל־ יוֹנָה בֶן־ אֲמִתַּי לֵאמֹר', 'he-IL']);
});

test('Jonah 1:1 in the English view is English, left to right', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=jon&c=1');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Verse 1', exact: true }).click();
  const verse = page.getByRole('region', { name: 'Verse view' }).locator('[data-sheet-verse]');
  await expect(verse).toHaveAttribute('lang', 'en');
  await expect(verse).not.toHaveAttribute('dir', 'rtl');
  await expect(verse).toContainText('Now the word of the LORD came to Jonah');
  await noSideways(page);
});
