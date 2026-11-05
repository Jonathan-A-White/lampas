// Revelation 10:2 at 390x844: βιβλαρίδιον, the NA reading's word that the text never has (STEPBible's TAGNT gives it G0974, mw-9ji6ek0.44; it once had no Strong's number), opens a word sheet whose Study row has no empty tile
// (mw-5r3p30.926: it drew an empty STEP tile that opened STEP at Genesis 1). Shot: shots/study-tiles-whole.png.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { leaveSettings, openGroup } from './settings-group';
import { openSettings } from './openSettings';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const chip = (page: Page) => page.getByRole('button', { name: /^Variants,/ });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Variant reading' });

test('Revelation 10:2, Weave: the word sheet of βιβλαρίδιον (NA) has no empty tile in its Study row', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=10&weave=solid');
  await expect(page.locator('[data-verse="2"] [data-text]')).toBeVisible();
  // both resources on: Strong's (the tile that was empty) and Logos
  await openSettings(page);
  await openGroup(page, 'Study resources');
  const resources = page.getByRole('region', { name: 'Study resources' });
  for (const name of ["Strong's", 'Logos']) {
    const toggle = resources.getByRole('switch', { name, exact: true });
    if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  }
  await leaveSettings(page);
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');

  // lay the NA reading in place, then tap its word
  const brace = page.locator('[data-verse="2"] [data-brace]').filter({ hasText: 'little scroll opened' }).first();
  await brace.locator('[data-witness]').first().click();
  await expect(sheet(page)).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const na = sheet(page).locator('[data-variant-reading]').filter({ has: page.locator('[data-reading-greek]', { hasText: 'βιβλαρίδιον' }) });
  await na.getByRole('button', { name: 'Read this', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
  // in the Weave the reading stands as English chunks; the chunk's words open the Greek word they stand for
  await page.locator('[data-verse="2"]').getByRole('button', { name: 'little', exact: true }).nth(1).click();

  const card = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(card).toBeVisible();
  const study = card.getByRole('group', { name: 'Study', exact: true });
  // the chunk 'little scroll opened' is two Greek words: a Study row for each
  await expect(study.first()).toBeVisible();
  const tiles = study.locator('a, button');
  expect(await tiles.count()).toBeGreaterThan(0);
  for (const tile of await tiles.all()) {
    expect(((await tile.textContent()) ?? '').trim()).not.toBe('');
    const href = await tile.getAttribute('href');
    if (href) expect(href).not.toMatch(/strong=(\||$)/);
  }
  // STEPBible's TAGNT tags both words now (mw-9ji6ek0.44: G0974 and G0455), so each has its STEP tile, and each one carries its number
  const step = study.locator('a[href*="stepbible.org"]');
  await expect(step).toHaveCount(2);
  for (const href of await step.evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))) expect(href).toMatch(/strong=G\d+$/);
  await shot(page, 'study-tiles-whole');
});
