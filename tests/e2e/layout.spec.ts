import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// 44 px is the floor; a word must clear it by a pixel so one font's metrics can shave a little and it still holds.
const TAP_WITH_MARGIN = 45;

async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth, scrollTop } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollTop: document.documentElement.scrollTop,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  expect(scrollTop).toBe(0);
}

async function openReader(page: Page) {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

async function setInSettings(page: Page, group: string, label: string) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await page.getByRole('group', { name: group }).getByRole('button', { name: label, exact: true }).click();
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

test('Settings offers Layout and Section headings with 44 px choices, Verse by verse and On to begin with', async ({ page }) => {
  await openReader(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  const layout = page.getByRole('group', { name: 'Layout' });
  const headings = page.getByRole('group', { name: 'Section headings' });
  await expect(layout.getByRole('button', { name: 'Verse by verse', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(headings.getByRole('button', { name: 'On', exact: true })).toHaveAttribute('aria-pressed', 'true');
  for (const control of [
    layout.getByRole('button', { name: 'Verse by verse', exact: true }),
    layout.getByRole('button', { name: 'Paragraph', exact: true }),
    headings.getByRole('button', { name: 'On', exact: true }),
    headings.getByRole('button', { name: 'Off', exact: true }),
  ]) {
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect(box && box.x + box.width).toBeLessThanOrEqual(390);
  }
  await expectFitsPhone(page);
});

test('Paragraph runs the verses on with superscript numbers, every word and number a 44 px tap', async ({ page }) => {
  await openReader(page);
  await setInSettings(page, 'Layout', 'Paragraph');
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-layout', 'paragraph');

  const paragraph = page.locator('[data-paragraph]').first();
  await expect(paragraph.locator('[data-verse]')).toHaveCount(4);
  await expect(page.locator('[data-paragraph]')).toHaveCount(12);

  // verse 2 follows verse 1 on the same line or the next: the paragraph is one block, not a block per verse
  const one = await page.locator('[data-verse="1"]').boundingBox();
  const two = await page.locator('[data-verse="2"] [data-chunk="0"]').boundingBox();
  const block = await paragraph.boundingBox();
  if (!one || !two || !block) throw new Error('the paragraph is missing');
  expect(block.height).toBeLessThan(one.height * 4);
  expect(two.y).toBeLessThan(one.y + one.height + 60);

  const number = page.getByRole('button', { name: 'Verse 2', exact: true });
  const numberBox = await number.boundingBox();
  expect(numberBox?.height).toBeGreaterThanOrEqual(43.5);
  expect(numberBox?.width).toBeGreaterThanOrEqual(43.5);
  const sizes = await number.evaluate((el) => ({
    sup: parseFloat(getComputedStyle(el.querySelector('sup')!).fontSize),
    text: parseFloat(getComputedStyle(el.closest('[data-paragraph]')!).fontSize),
  }));
  expect(sizes.sup).toBeLessThan(sizes.text * 0.75);

  const word = await page.locator('[data-verse="1"] [data-chunk="0"]').boundingBox();
  expect(word?.height).toBeGreaterThanOrEqual(TAP_WITH_MARGIN);

  await page.locator('[data-verse="1"]').getByRole('button', { name: 'Therefore', exact: true }).click();
  await expect(page.getByRole('dialog').getByTestId('sheet-word')).toHaveText('ἄρα');
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await number.click();
  await expect(page.locator('[data-verse="2"]')).toHaveAttribute('data-selected', 'true');
  await expect(page.getByRole('region', { name: 'Verse view' })).toBeVisible();
  await page.getByRole('button', { name: '‹ Reader' }).click();
  await expect(page.locator('[data-verse="2"]')).toHaveAttribute('data-selected', 'false');

  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  const greekWord = await page.locator('[data-verse="1"] [data-word="1"]').boundingBox();
  expect(greekWord?.height).toBeGreaterThanOrEqual(TAP_WITH_MARGIN);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'english');

  await page.reload();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-layout', 'paragraph');
  await expectFitsPhone(page);
  await page.locator('[data-reader]').evaluate((el) => el.scrollTo(0, 0));
  await shot(page, 'reader-paragraph');
});

test('Section headings stand above their verse in English and in Greek, and Off takes them away', async ({ page }) => {
  await openReader(page);
  const heading = page.getByRole('heading', { name: 'Walking by the Spirit', level: 2 });
  await expect(heading).toBeVisible();
  await expect(page.locator('[data-heading]')).toHaveCount(5);

  const above = async () => {
    const h = await heading.boundingBox();
    const v = await page.locator('[data-verse="1"]').boundingBox();
    if (!h || !v) throw new Error('heading or verse missing');
    expect(h.y + h.height).toBeLessThanOrEqual(v.y + 1);
  };
  await above();
  const style = await heading.evaluate((el) => ({ weight: getComputedStyle(el).fontWeight, size: parseFloat(getComputedStyle(el).fontSize) }));
  expect(Number(style.weight)).toBeGreaterThanOrEqual(600);
  expect(style.size).toBeGreaterThanOrEqual(18);
  await expectFitsPhone(page);
  await shot(page, 'reader-headings');

  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await expect(heading).toBeVisible();
  expect(await heading.evaluate((el) => getComputedStyle(el).fontFamily)).not.toContain('Gentium');
  await above();

  await setInSettings(page, 'Section headings', 'Off');
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-headings', 'off');
  await expect(page.locator('[data-heading]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(page.locator('[data-heading]')).toHaveCount(0);
});
