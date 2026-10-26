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
    await expect(picker.locator('[data-book]')).toHaveCount(66);
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
  await picker.getByRole('button', { name: 'Jude', exact: true }).click();
  await expect(picker.locator('[data-chapter]')).toHaveCount(1);
  await picker.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(picker).toHaveCount(0);
  await context.setOffline(true);
  await page.getByRole('heading', { level: 1 }).getByRole('button').click();
  await picker.getByRole('button', { name: 'Jude', exact: true }).click();
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

  // mw-5r3p30.711: the sheet opens with the search field focused (the phone's keyboard comes up with it), not the Done button
  for (const scheme of ['light', 'dark'] as const) {
    test(`Choose a book opens with the search field focused, so typing filters at once (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      const picker = await openPicker(page);
      const search = picker.getByRole('searchbox', { name: 'Search books' });
      await expect(search).toBeFocused();
      expect(await page.evaluate(() => (document.activeElement as HTMLInputElement | null)?.getAttribute('aria-label'))).toBe('Search books');
      await page.keyboard.type('Heb');
      await expect(search).toHaveValue('Heb');
      await expect(picker.locator('[data-book]')).toHaveCount(1);
      await expect(picker.getByRole('button', { name: 'Hebrews' })).toBeVisible();
      await page.keyboard.press('Control+a');
      await page.keyboard.press('Backspace');
      await shot(page, `chapter-picker-focused-${scheme}-390x844`);

      // scrolling the list does not steal the focus
      await picker.getByTestId('chapter-picker-box').evaluate((el) => (el.scrollTop = el.scrollHeight));
      await expect(search).toBeFocused();
      // a book, then back to the books: the field is drawn again and focused again
      await picker.getByRole('button', { name: '1 John' }).click();
      await picker.getByRole('button', { name: '‹ Books' }).click();
      await expect(picker.getByRole('searchbox', { name: 'Search books' })).toBeFocused();
      // Done and Escape still close; the backdrop too
      await picker.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(picker).toHaveCount(0);
    });
  }

  test('Escape and the backdrop close Choose a book while the search field is focused', async ({ page }) => {
    const picker = await openPicker(page);
    await expect(picker.getByRole('searchbox', { name: 'Search books' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(picker).toHaveCount(0);
    await page.getByRole('heading', { name: 'Romans 8', level: 1 }).getByRole('button').click();
    await expect(picker).toBeVisible();
    await page.getByTestId('sheet-backdrop').click({ position: { x: 195, y: 20 } });
    await expect(picker).toHaveCount(0);
  });

  // mw-5r3p30.678: Go to is a way into the Bible: the Reader on the chapter with the verse at the top of the reading area, the whole chapter there for context
  test('Go to John 18:2 opens John 18 in the Reader with verse 2 at the top, verse 1 above it, not the Verse view', async ({ page }) => {
    const picker = await openPicker(page);
    const search = picker.getByRole('searchbox', { name: 'Search books' });
    await search.fill('John 18:2');
    await expect(picker.getByText('No book matches')).toHaveCount(0);
    await expect(picker.getByRole('button', { name: 'Go to John 18:2' })).toBeVisible();
    await search.press('Enter');
    await expect(picker).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'John 18', level: 1 })).toBeVisible();
    expect(page.url()).not.toContain('v=');
    // no Verse view: the reading text is not inert and has no Read-aloud panel over it
    await expect(page.locator('[data-reader]')).not.toHaveAttribute('inert', /.*/);
    await expect(page.locator('[data-verse="1"]')).toHaveCount(1);
    const box = page.locator('[data-reader]');
    await expect
      .poll(async () => {
        const top = (await page.locator('[data-verse="2"]').boundingBox())!.y - (await box.boundingBox())!.y;
        return Math.abs(top) <= 12;
      })
      .toBe(true);
    // verse 1 is above verse 2, reachable by scrolling up; the later verses by scrolling down
    expect((await page.locator('[data-verse="1"]').boundingBox())!.y).toBeLessThan((await page.locator('[data-verse="2"]').boundingBox())!.y);
    await box.evaluate((el) => (el.scrollTop = 0));
    await expect(page.locator('[data-verse="1"]')).toBeInViewport();
    await box.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(page.locator('[data-verse="40"]')).toBeInViewport();
    await box.evaluate((el) => (el.scrollTop = 0));
    await shot(page, 'chapter-picker-reference-390x844');
  });

  // mw-5r3p30.683: a start of a book's name finds it, with a chapter and verse
  test('ep 4:15 offers Go to Ephesians 4:15 and Enter opens Ephesians 4 with verse 15 at the top; Ph 1 guesses nothing and lists both books', async ({ page }) => {
    const picker = await openPicker(page);
    const search = picker.getByRole('searchbox', { name: 'Search books' });
    for (const typed of ['ep 4:15', 'Eph 4:15', 'ephe 4 15', 'EP 4:15']) {
      await search.fill(typed);
      await expect(picker.getByRole('button', { name: 'Go to Ephesians 4:15' }), typed).toBeVisible();
    }
    await search.fill('Ph 1');
    await expect(picker.locator('[data-go-to]')).toHaveCount(0);
    await expect(picker.getByRole('button', { name: 'Philippians' })).toBeVisible();
    await expect(picker.getByRole('button', { name: 'Philemon' })).toBeVisible();
    await search.fill('phlm');
    await expect(picker.getByRole('button', { name: 'Philemon' })).toBeVisible();
    await search.fill('ep 4:15');
    await search.press('Enter');
    await expect(picker).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Ephesians 4', level: 1 })).toBeVisible();
    const box = page.locator('[data-reader]');
    await expect
      .poll(async () => Math.abs((await page.locator('[data-verse="15"]').boundingBox())!.y - (await box.boundingBox())!.y) <= 12)
      .toBe(true);
    await shot(page, 'chapter-picker-start-of-book-390x844');
  });

  test('a verse of the chapter he is in is brought to the top without opening the Verse view', async ({ page }) => {
    const picker = await openPicker(page);
    await picker.getByRole('searchbox', { name: 'Search books' }).fill('Rom 8:30');
    await picker.getByRole('searchbox', { name: 'Search books' }).press('Enter');
    await expect(picker).toHaveCount(0);
    expect(page.url()).not.toContain('v=');
    const box = page.locator('[data-reader]');
    await expect
      .poll(async () => Math.abs((await page.locator('[data-verse="30"]').boundingBox())!.y - (await box.boundingBox())!.y) <= 12)
      .toBe(true);
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
    // an Old Testament chapter opens in the Reader like any other (mw-uqlxea.2)
    await expect(page.getByRole('heading', { name: 'Psalms 23', level: 1 })).toBeVisible();
    await expect(picker).toHaveCount(0);

    await page.getByRole('heading', { name: 'Psalms 23', level: 1 }).getByRole('button').click();
    const again = page.getByRole('dialog', { name: 'Choose a chapter' });
    await expect(again).toBeVisible();
    await again.getByRole('searchbox', { name: 'Search books' }).fill('1 Jn 2:1');
    await again.getByRole('searchbox', { name: 'Search books' }).press('Enter');
    await expect(page.getByRole('heading', { name: '1 John 2', level: 1 })).toBeVisible();
    await expect(picker).toHaveCount(0);
  });

  test('jn18 opens John 18, and a verse of the chapter he is in brings that verse to the top', async ({ page }) => {
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
    expect(page.url()).not.toContain('v=');
    await expect(page.locator('[data-verse="36"]')).toBeVisible();
  });
});
