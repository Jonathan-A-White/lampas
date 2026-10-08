import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

const VIEWPORT = { width: 390, height: 844 };

test('Study resources at phone width: thumb-sized switches in Settings, and a Study row on the word sheet', async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();

  const section = page.getByRole('region', { name: 'Study resources' });
  await section.scrollIntoViewIfNeeded();
  for (const name of ["Strong's", 'Logos', 'Accordance']) {
    const control = section.getByRole('switch', { name, exact: true });
    await expect(control).toHaveAttribute('aria-checked', 'false');
    const box = await control.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    expect(box?.width).toBeGreaterThanOrEqual(43.5);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  }
  await section.getByRole('switch', { name: "Strong's", exact: true }).click();
  await section.getByRole('switch', { name: 'Logos', exact: true }).click();
  const bdag = section.getByRole('checkbox', { name: 'BDAG', exact: true });
  await expect(bdag).toHaveAttribute('aria-checked', 'true');
  const louw = section.getByRole('checkbox', { name: 'Louw-Nida', exact: true });
  await louw.scrollIntoViewIfNeeded();
  await louw.click();
  await expect(louw).toHaveAttribute('aria-checked', 'true');
  const tick = await louw.boundingBox();
  expect(tick?.height).toBeGreaterThanOrEqual(43.5);
  expect((tick?.x ?? 0) + (tick?.width ?? 0)).toBeLessThanOrEqual(VIEWPORT.width);
  await shot(page, 'settings-resources');

  await page.reload();
  await expect(section.getByRole('switch', { name: "Strong's", exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
  const study = page.getByRole('dialog', { name: 'Word' }).getByRole('group', { name: 'Study' });
  await expect(study).toBeInViewport();
  await expect(study.getByRole('link', { name: 'G4903', exact: true })).toHaveAttribute('href', 'https://www.stepbible.org/?q=strong=G4903');
  const logos = study.getByRole('link', { name: 'Open in Logos: BDAG', exact: true });
  await expect(logos).toHaveAttribute('href', /^logosres:bdag;hw=/);
  await expect(logos).toHaveAttribute('data-fallback', /^https:\/\/ref\.ly\/logosres\/bdag\?hw=/);
  await expect(study.getByRole('link', { name: 'Open in Logos: Louw-Nida', exact: true })).toHaveAttribute('href', /^logosres:louwnida;hw=/);
  await expect(study.getByRole('link', { name: 'Bible Word Study in Logos', exact: true })).toHaveAttribute('href', /;ref=Bible\.Ro8\.28$/);
  await expect(study.getByText('G4903')).toHaveCount(1);
  await expect(page.getByRole('dialog', { name: 'Word' }).getByTestId('sheet-strongs')).toHaveCount(0);
  const box = await logos.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await shot(page, 'word-sheet-study');
});

test('The Logos lexicons are a compact list at 360 px: bounded height, its own scroll, a search, and Accordance below it in reach', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const section = page.getByRole('region', { name: 'Study resources' });
  const logosSwitch = section.getByRole('switch', { name: 'Logos', exact: true });
  await logosSwitch.click();

  const list = section.getByRole('group', { name: 'Logos lexicons' });
  const box = list.getByTestId('searchable-list-box');
  const size = await box.evaluate((el) => ({ client: el.clientHeight, scroll: el.scrollHeight, overflowY: getComputedStyle(el).overflowY }));
  expect(size.overflowY).toBe('auto');
  expect(size.client).toBeLessThanOrEqual(300);
  expect(size.scroll).toBeGreaterThan(size.client * 2);

  // The setting below the Logos card is one screen away, not 21 rows away.
  await logosSwitch.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await expect(section.getByRole('switch', { name: 'Accordance', exact: true })).toBeInViewport();

  // BDAG (ticked) leads; the last lexicon is out of sight until the box scrolls.
  await expect(list.getByRole('checkbox').first()).toHaveAccessibleName('BDAG');
  const last = list.getByRole('checkbox', { name: 'A Greek-English Lexicon of the New Testament', exact: true });
  await expect(last).not.toBeInViewport();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();

  const search = list.getByRole('searchbox', { name: 'Search Logos lexicons' });
  const field = await search.boundingBox();
  expect(field?.height).toBeGreaterThanOrEqual(43.5);
  await search.fill('louw');
  await expect(list.getByRole('checkbox')).toHaveCount(1);
  await list.getByRole('checkbox', { name: 'Louw-Nida', exact: true }).click();
  await expect(list.getByRole('checkbox', { name: 'Louw-Nida', exact: true })).toHaveAttribute('aria-checked', 'true');
  await search.fill('');
  await expect(list.getByRole('checkbox')).toHaveCount(21);
  await expect(list.getByRole('checkbox').first()).toHaveAccessibleName('BDAG');
  await expect(list.getByRole('checkbox').nth(1)).toHaveAccessibleName('Louw-Nida');
  const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(fits).toBe(true);
  await logosSwitch.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await shot(page, 'settings-logos-list');
});
