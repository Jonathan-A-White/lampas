import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// 48 px is the floor for the picker's buttons (the Governor reads one-handed); a pixel of margin for sub-pixel layout.
const TAP = 47.5;

const SIZES = [
  { name: '390x844', width: 390, height: 844 },
  { name: '360x780', width: 360, height: 780 },
];

async function expectFitsPhone(page: Page, width: number) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(clientWidth).toBe(width);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

async function expectTall(page: Page, selector: string) {
  const boxes = await page.locator(selector).evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  expect(boxes.length).toBeGreaterThan(0);
  for (const height of boxes) expect(height).toBeGreaterThanOrEqual(TAP);
}

for (const size of SIZES) {
  test(`the picker opens 1 John 1 from the title at ${size.name}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await openUnlocked(page);
    await page.goto('/');
    const title = page.getByRole('heading', { name: 'Romans 8', level: 1 });
    await expect(title).toBeVisible();
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    const titleBox = await title.getByRole('button').boundingBox();
    expect(titleBox?.height).toBeGreaterThanOrEqual(TAP);

    await title.getByRole('button').click();
    const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
    await expect(picker).toBeVisible();
    await expect(picker.locator('[data-book]')).toHaveCount(27);
    await expectTall(page, '[data-book]');
    await expectFitsPhone(page, size.width);
    await shot(page, `chapter-picker-books-${size.name}`);

    await picker.getByRole('button', { name: '1 John' }).click();
    await expect(picker.locator('[data-chapter]')).toHaveCount(5);
    await expectTall(page, '[data-chapter]');
    await expectFitsPhone(page, size.width);
    await shot(page, `chapter-picker-1jn-${size.name}`);

    await picker.getByRole('button', { name: 'Chapter 1' }).click();
    await expect(page.getByRole('heading', { name: '1 John 1', level: 1 })).toBeVisible();
    await expect(picker).toHaveCount(0);
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    await expect(page.locator('[data-verse]')).toHaveCount(10);
    expect(await page.locator('[data-reader]').evaluate((el) => el.scrollTop)).toBe(0);
    await expectFitsPhone(page, size.width);
    await shot(page, `chapter-1jn-1-${size.name}`);

    // reload: still 1 John 1
    await page.reload();
    await expect(page.getByRole('heading', { name: '1 John 1', level: 1 })).toBeVisible();
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
  });
}

test('a bare open reads the chapter last open, and a chapter fetched once reads again with the network cut', async ({ page, context }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=1jn&c=2');
  await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // the open chapter is kept: a bare address (the home-screen icon) opens it
  await page.evaluate(() => window.localStorage.removeItem('lampas.lastRoute'));
  await page.evaluate(() => window.localStorage.removeItem('lampas.trail'));
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();

  // Scrolled to the bottom, then the network is cut: Jude 1 was never fetched and says so; 1 John 2 was, and reads again at the top.
  await page.locator('[data-reader]').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  // (the worker's precache holds index.json on a phone; with no worker here, the picker has read it once before the cut)
  await page.getByRole('heading', { level: 1 }).getByRole('button').click();
  const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
  await picker.getByRole('button', { name: 'Jude' }).click();
  await expect(picker.locator('[data-chapter]')).toHaveCount(1);
  await picker.getByRole('button', { name: 'Done' }).click();
  await expect(picker).toHaveCount(0);
  await context.setOffline(true);
  await page.getByRole('heading', { level: 1 }).getByRole('button').click();
  await picker.getByRole('button', { name: 'Jude' }).click();
  await picker.getByRole('button', { name: 'Chapter 1' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Jude 1 is not on this phone yet');
  await expect(alert.getByRole('button', { name: 'Choose another chapter' })).toBeVisible();
  const tryAgain = await alert.getByRole('button', { name: 'Try again' }).boundingBox();
  expect(tryAgain?.height).toBeGreaterThanOrEqual(TAP);
  await shot(page, 'chapter-offline');

  await alert.getByRole('button', { name: 'Choose another chapter' }).click();
  await picker.getByRole('button', { name: '1 John' }).click();
  await picker.getByRole('button', { name: 'Chapter 2' }).click();
  // 1 John 2 was fetched while the network was up: it is held, and reads with the network cut, at the top
  await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  expect(await page.locator('[data-reader]').evaluate((el) => el.scrollTop)).toBe(0);
  await context.setOffline(false);
});

test.describe('a reference typed in Choose a book (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  async function openPicker(page: Page) {
    await openUnlocked(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
    const picker = page.getByRole('dialog', { name: 'Choose a chapter' });
    await expect(picker).toBeVisible();
    return picker;
  }

  test('John 18:36 opens John 18 at verse 36', async ({ page }) => {
    const picker = await openPicker(page);
    const search = picker.getByRole('searchbox', { name: 'Search books' });
    await search.fill('John 18:36');
    await expect(picker.getByText('No book matches')).toHaveCount(0);
    await search.press('Enter');
    await expect(picker).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'John 18', level: 1 })).toBeVisible();
    await expect(page.locator('[data-verse="36"]')).toBeVisible();
    expect(page.url()).toContain('v=36');
    await shot(page, 'chapter-picker-reference-390x844');
  });

  test('a chapter past the book end says how many it has, and a book name alone still filters', async ({ page }) => {
    const picker = await openPicker(page);
    const search = picker.getByRole('searchbox', { name: 'Search books' });
    await search.fill('John 99');
    await expect(picker.getByText('John has 21 chapters')).toBeVisible();
    await search.press('Enter');
    await expect(picker).toBeVisible();
    await expect(picker.getByText('John has 21 chapters')).toBeVisible();

    await search.fill('John');
    await expect(picker.getByText('John has 21 chapters')).toHaveCount(0);
    await expect(picker.locator('[data-book]')).toHaveCount(4);
    await search.press('Enter');
    await expect(picker).toBeVisible();
  });

  test('jn18, 1 Jn 2:1 and Ps 23 open their chapters', async ({ page }) => {
    const picker = await openPicker(page);
    const search = picker.getByRole('searchbox', { name: 'Search books' });
    await search.fill('Ps 23');
    await search.press('Enter');
    await expect(picker.getByRole('heading', { name: 'Psalms' })).toBeVisible();

    await picker.getByRole('button', { name: '‹ Books' }).click();
    await picker.getByRole('searchbox', { name: 'Search books' }).fill('1 Jn 2:1');
    await picker.getByRole('searchbox', { name: 'Search books' }).press('Enter');
    await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();
    await expect(picker).toHaveCount(0);
  });

  test('jn18 opens John 18, and a verse of the chapter he is in opens that verse', async ({ page }) => {
    const picker = await openPicker(page);
    await picker.getByRole('searchbox', { name: 'Search books' }).fill('jn18');
    await picker.getByRole('button', { name: 'Go to John 18' }).click();
    await expect(page.getByRole('heading', { name: 'John 18', level: 1 })).toBeVisible();
    await expect(picker).toHaveCount(0);

    await page.getByRole('heading', { name: 'John 18', level: 1 }).getByRole('button').click();
    const again = page.getByRole('dialog', { name: 'Choose a chapter' });
    await again.getByRole('searchbox', { name: 'Search books' }).fill('John 18:36');
    await again.getByRole('searchbox', { name: 'Search books' }).press('Enter');
    await expect(again).toHaveCount(0);
    expect(page.url()).toContain('v=36');
  });
});
