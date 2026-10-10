import { expect, test, type Page } from '@playwright/test';
import { logos } from '../../src/resources/logos';
import { shot } from './shot';
import { openUnlocked } from './unlocked';


/** Headless Chromium stops at a link to an app scheme; the tap itself still reaches the page. */
const holdAppLinks = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
};

/** Logos switched on with every one of its lexicons ticked (Settings > Study resources), then back to the Reader. */
const tickEveryLexicon = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const section = page.getByRole('region', { name: 'Study resources' });
  await section.getByRole('switch', { name: 'Logos', exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  for (const { name } of logos.choices?.items ?? []) {
    const box = section.getByRole('checkbox', { name, exact: true });
    await box.scrollIntoViewIfNeeded();
    if ((await box.getAttribute('aria-checked')) !== 'true') await box.click();
    await expect(box).toHaveAttribute('aria-checked', 'true');
  }
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
};

for (const VIEWPORT of [{ width: 390, height: 844 }, { width: 360, height: 740 }]) {
test(`The word sheet with every Logos lexicon at ${VIEWPORT.width}x${VIEWPORT.height}: every tile in reach, each names its book, Close at the thumb`, async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await tickEveryLexicon(page);
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'condemnation', exact: true }).click();

  const dialog = page.getByRole('dialog', { name: 'Word' });
  await expect(dialog).toBeVisible();
  const tiles = dialog.getByRole('group', { name: 'Study', exact: true }).getByRole('link');
  await expect(tiles).toHaveCount(22);
  const scroll = dialog.getByTestId('sheet-scroll');
  const fade = dialog.getByTestId('sheet-scroll-fade');
  const close = dialog.getByRole('button', { name: 'Close', exact: true });
  const done = dialog.getByRole('button', { name: 'Done', exact: true });

  // The sheet itself stays inside the phone and below the top third, as with one tile.
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

  // Every tile can be scrolled into view, is as wide as half a row, a thumb high, within the screen, and says its whole title.
  const titles: string[] = [];
  for (let i = 0; i < 22; i++) {
    const tile = tiles.nth(i);
    await tile.scrollIntoViewIfNeeded();
    await expect(tile).toBeInViewport({ ratio: 1 });
    const b = await tile.boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(47.5);
    expect((b?.x ?? 0) + (b?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
    const fits = await tile.evaluate((el) => {
      const label = el.querySelector('span') as HTMLElement;
      const lines = Math.round(label.getBoundingClientRect().height / parseFloat(getComputedStyle(label).lineHeight));
      return { cut: label.scrollWidth > label.clientWidth, lines };
    });
    expect(fits.cut).toBe(false);
    expect(fits.lines, (await tile.textContent()) ?? "").toBeLessThanOrEqual(2);
    titles.push((await tile.textContent()) ?? '');
  }
  expect(titles).toContain('Lexham Theological Wordbook');
  expect(titles).toContain('NASB Dictionaries');
  expect(titles).toContain('Intermediate Greek-English Lexicon');
  expect(new Set(titles).size).toBe(titles.length);

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
}
