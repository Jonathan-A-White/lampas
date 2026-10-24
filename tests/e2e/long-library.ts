// tests/e2e/long-library.ts — a long Logos library for the specs that look at the word sheet's Study row (mw-rfjjzd.8): Logos and Strong's switched on, every lexicon
// On and three of them Pinned (BDAG, which starts pinned, and two with long titles). The row then draws 3 lexicons, Bible Word Study, the door 'All 21 lexicons ›' and Strong's
// number: 6 tiles, a long sheet.
import { expect, type Page } from '@playwright/test';
import { leaveSettings, openGroup } from './settings-group';

/** On the Reader: Logos and Strong's switched on (Settings > Study resources), then back to the Reader. */
export async function switchOnResources(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const section = page.getByRole('region', { name: 'Study resources' });
  for (const name of ['Logos', "Strong's"]) await section.getByRole('switch', { name, exact: true }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await leaveSettings(page);
}

/** Every lexicon On (All on) and BDAG, Lexham Theological Wordbook and NASB Dictionaries Pinned; ends on the Reader. */
export async function shelveLexicons(page: Page): Promise<void> {
  await page.goto('/#/library?kind=lexicon');
  await expect(page.getByRole('heading', { name: 'Lexicons', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'All on', exact: true }).click();
  for (const name of ['Lexham Theological Wordbook', 'NASB Dictionaries']) {
    const row = page.getByRole('radiogroup', { name, exact: true });
    await row.scrollIntoViewIfNeeded();
    await row.getByRole('radio', { name: 'Pin', exact: true }).click();
    await expect(row.getByRole('radio', { name: 'Pin', exact: true })).toHaveAttribute('aria-checked', 'true');
  }
  await expect(page.getByRole('radiogroup', { name: 'BDAG', exact: true }).getByRole('radio', { name: 'Pin', exact: true })).toHaveAttribute('aria-checked', 'true');
  // the app opens where he left off, which is the Library: the Reader is asked for by its address
  await page.goto('/#/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

/** The Reader with the long library set up. */
export async function openLongLibrary(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await switchOnResources(page);
  await shelveLexicons(page);
}
