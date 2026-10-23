import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { shelveLexicons, switchOnResources } from './long-library';

// The word sheet with a long Logos library (mw-5r3p30.135, then mw-rfjjzd.8: docs/design/library-at-scale.md 3.5): 21 lexicons On, three of them pinned, and Strong's and Accordance on. The Study
// row draws the 3 pinned, Bible Word Study, the door "All 21 lexicons ›" and the two other resources; the sheet behind the door lists all 21 with a search and ends with Manage.

/** Headless Chromium stops at a link to an app scheme; the tap itself still reaches the page. */
const holdAppLinks = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
};

/** A tile or row says all its words: its text is not cut off and runs to at most `lines` lines. */
const sayswhole = async (el: Locator, lines: number): Promise<void> => {
  const fits = await el.evaluate((node) => {
    const label = node.querySelector('span') as HTMLElement;
    const lineCount = Math.round(label.getBoundingClientRect().height / parseFloat(getComputedStyle(label).lineHeight));
    return { cut: label.scrollWidth > label.clientWidth, lines: lineCount };
  });
  expect(fits.cut).toBe(false);
  expect(fits.lines, (await el.textContent()) ?? '').toBeLessThanOrEqual(lines);
};

for (const VIEWPORT of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
test(`The word sheet with 21 Logos lexicons On at ${VIEWPORT.width}x${VIEWPORT.height}: the pinned ones, a door to the rest, every tile in reach, Close at the thumb`, async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await switchOnResources(page);
  await shelveLexicons(page);
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'condemnation', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(dialog).toBeVisible();
  const study = dialog.getByRole('group', { name: 'Study', exact: true });
  const links = study.getByRole('link');
  const door = study.getByRole('button', { name: 'All 21 lexicons ›', exact: true });
  // Strong's number, then Logos' 3 pinned, Bible Word Study and the door, then Accordance's one: 7 tiles
  await expect(links).toHaveCount(6);
  await expect(door).toHaveCount(1);
  const names = await links.allTextContents();
  expect(names.slice(1, 4)).toEqual(['BDAG', 'Lexham Theological Wordbook', 'NASB Dictionaries']);
  expect(names).toContain('Bible Word Study');
  const scroll = dialog.getByTestId('sheet-scroll');
  const fade = dialog.getByTestId('sheet-scroll-fade');
  const close = dialog.getByRole('button', { name: 'Close', exact: true });
  const done = dialog.getByRole('button', { name: 'Done', exact: true });

  // The sheet itself stays inside the phone and below the top third.
  const sheet = await dialog.boundingBox();
  expect(sheet && sheet.y + sheet.height).toBeLessThanOrEqual(VIEWPORT.height);
  expect(sheet && sheet.y).toBeGreaterThan(VIEWPORT.height * 0.2);
  const overflow = await scroll.evaluate((el) => ({ over: el.scrollHeight - el.clientHeight, y: getComputedStyle(el).overflowY }));
  expect(overflow.y).toBe('auto');
  expect(overflow.over).toBeGreaterThan(0);

  // Top: the fade says there is more, Done is at the top, Close at the foot, both thumb-sized and on screen.
  await expect(fade).toBeVisible();
  for (const control of [done, close]) {
    await expect(control).toBeInViewport({ ratio: 1 });
    expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  }
  const closeBox = await close.boundingBox();
  expect(closeBox && closeBox.y).toBeGreaterThan(VIEWPORT.height * 0.75);
  if (VIEWPORT.width === 390) await shot(page, 'word-sheet-many-top');

  // Every tile (the door too) can be scrolled into view, is as wide as half a row, a thumb high, within the screen, and says its whole title.
  const tiles = study.locator('a, button');
  await expect(tiles).toHaveCount(7);
  const titles: string[] = [];
  for (let i = 0; i < 7; i++) {
    const tile = tiles.nth(i);
    await tile.scrollIntoViewIfNeeded();
    await expect(tile).toBeInViewport({ ratio: 1 });
    const b = await tile.boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(47.5);
    expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
    await sayswhole(tile, 2);
    titles.push((await tile.textContent()) ?? '');
  }
  expect(titles).toContain('Lexham Theological Wordbook');
  expect(titles).toContain('NASB Dictionaries');
  expect(titles).toContain('All 21 lexicons ›');
  // no two tiles of Logos say the same (Accordance's tile names its own module, BDAG)
  const logosTitles = (await study.getByRole('group', { name: 'Logos', exact: true }).locator('a, button').allTextContents());
  expect(logosTitles).toHaveLength(5);
  expect(new Set(logosTitles).size).toBe(logosTitles.length);

  // Scrolled to the end: the fade is gone, Close and Done are still on screen.
  await scroll.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await expect(fade).toHaveCount(0);
  await expect(close).toBeInViewport({ ratio: 1 });
  await expect(done).toBeInViewport({ ratio: 1 });
  const fitsPhone = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fitsPhone).toBe(true);
  if (VIEWPORT.width === 390) await shot(page, 'word-sheet-many-scrolled');

  await close.click();
  await expect(dialog).toBeHidden();
});

test(`All 21 lexicons at ${VIEWPORT.width}x${VIEWPORT.height}: a search, every lexicon a thumb-high row, Done and Manage in reach, Back closes it, Manage opens the Lexicons page`, async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await switchOnResources(page);
  await shelveLexicons(page);
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'condemnation', exact: true }).click();
  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  await word.getByRole('button', { name: 'All 21 lexicons ›', exact: true }).click();

  const all = page.getByRole('dialog', { name: 'All lexicons', exact: true });
  await expect(all).toBeVisible();
  await expect(all.getByRole('heading', { name: 'All 21 lexicons' })).toBeVisible();
  const search = all.getByRole('searchbox', { name: 'Search lexicons' });
  const done = all.getByRole('button', { name: 'Done', exact: true });
  const manage = all.getByRole('button', { name: 'Manage', exact: true });
  const rows = all.getByRole('link');
  await expect(rows).toHaveCount(21);
  // the sheet stays inside the phone with its field, Done and Manage on screen at once
  const box = await all.boundingBox();
  expect(box && box.y + box.height).toBeLessThanOrEqual(VIEWPORT.height);
  expect(box && box.y).toBeGreaterThanOrEqual(0);
  for (const control of [search, done, manage]) {
    await expect(control).toBeInViewport({ ratio: 1 });
    expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  }
  // the pinned ones first, then the rest
  expect((await rows.evaluateAll((els) => els.map((el) => el.getAttribute('data-lexicon')))).slice(0, 3)).toEqual(['BDAG', 'Lexham Theological Wordbook', 'NASB Dictionaries']);
  if (VIEWPORT.width === 390) await shot(page, 'word-sheet-all-lexicons');

  // each row, scrolled to, is a thumb high, within the sheet's width, and says its whole name
  for (let i = 0; i < 21; i++) {
    const row = rows.nth(i);
    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeInViewport({ ratio: 1 });
    const b = await row.boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(47.5);
    expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
    await sayswhole(row, 3);
  }
  await expect(manage).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  // the search narrows the rows and says so when nothing matches
  await search.fill('nasb');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('NASB Dictionaries');
  await search.fill('zzzz');
  await expect(rows).toHaveCount(0);
  await expect(all.getByText('No lexicon matches')).toBeVisible();
  await search.fill('');
  await expect(rows).toHaveCount(21);

  // Back closes the sheet and leaves the word sheet
  await page.goBack();
  await expect(all).toBeHidden();
  await expect(word).toBeVisible();

  // Manage opens the Lexicons page, and Back brings the word sheet back
  await word.getByRole('button', { name: 'All 21 lexicons ›', exact: true }).click();
  await page.getByRole('dialog', { name: 'All lexicons', exact: true }).getByRole('button', { name: 'Manage', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Lexicons', level: 1 })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
});
}
