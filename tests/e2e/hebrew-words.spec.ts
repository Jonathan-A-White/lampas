// Hebrew words taught while he reads (mw-gdcyf98.19) at 390x844: Genesis 1 offers its commonest Hebrew words on the teach sheet, large and right to left with the respelling and Hear it, all on the screen
// with 48 px buttons; Got it puts a word in Words under the Hebrew side of the Greek | Hebrew segment; the Quick test asks it among Hebrew glosses.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

const noSideways = async (page: Page): Promise<void> => {
  const wide = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(wide.scroll).toBeLessThanOrEqual(wide.client);
};

test('the teach sheet of a Hebrew word fits the phone: the word large at the right edge, its respelling, Hear it, four 48 px buttons', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1');
  const strip = page.getByTestId('new-words');
  await expect(strip).toHaveText('New 3');
  await strip.click();
  const sheet = page.getByRole('dialog', { name: 'New word' });
  await expect(sheet).toBeVisible();

  const word = sheet.getByTestId('teach-lemma');
  await expect(word).toHaveText('אֵת');
  await expect(word).toHaveAttribute('lang', 'he');
  await expect(word).toHaveAttribute('dir', 'rtl');
  expect(await word.evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(40);
  await expect(sheet.getByTestId('teach-translit')).not.toBeEmpty();
  await expect(sheet.getByTestId('teach-gloss')).toHaveText('[Obj.]');
  await expect(sheet.getByTestId('teach-form')).not.toBeEmpty();
  await expect(sheet.locator('[data-new]')).not.toHaveCount(0);
  const speaker = await sheet.getByRole('button', { name: 'Hear it' }).boundingBox();
  expect(speaker?.height).toBeGreaterThanOrEqual(43.5);

  const box = (await sheet.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  for (const name of ['Got it', 'I know this', 'Not now']) {
    const b = (await sheet.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(b.height, name).toBeGreaterThanOrEqual(47.5);
    expect(b.y + b.height, name).toBeLessThanOrEqual(844);
  }
  await noSideways(page);
  await shot(page, 'hebrew-teach-sheet');
});

test('Got it puts the word in Words under Hebrew, and the Quick test asks it among Hebrew glosses', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=1');
  await page.getByTestId('new-words').click();
  const sheet = page.getByRole('dialog', { name: 'New word' });
  await expect(sheet.getByTestId('teach-lemma')).toHaveText('אֵת');
  await sheet.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(sheet.getByTestId('teach-lemma')).toHaveText('עַל');
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();

  await page.evaluate(() => {
    window.location.hash = '#/words';
  });
  await expect(page.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();
  const segment = page.getByRole('group', { name: 'Words language' });
  await segment.getByRole('button', { name: 'Hebrew', exact: true }).click();
  const row = page.locator('[data-lemma="אֵת"]');
  await expect(row).toHaveAttribute('data-state', 'learning');
  await expect(row.locator('[lang="he"]')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('[data-lemma="αὐτός"]')).toHaveCount(0);
  await noSideways(page);
  await shot(page, 'hebrew-words');

  await page.evaluate(() => {
    window.location.hash = '#/test';
  });
  await expect(page.getByRole('heading', { name: 'Quick test', level: 1 })).toBeVisible();
  await expect(page.getByTestId('prompt').first()).toBeVisible();
  await noSideways(page);
});
