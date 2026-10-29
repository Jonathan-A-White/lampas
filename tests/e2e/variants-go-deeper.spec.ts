// 'Go deeper' on the variant sheet (mw-9ji6ek0.20, src/reader/goDeeper.ts) at 390x844: under the readings of Revelation 3:2 the lessons, the apparatus of Revelation at v3.3.2 and the 2005
// edition's scan, the web links opened outside; and 'In your Logos library…' only while Logos is On and a Greek text of his shelf is On, whose chooser lists the SBLGNT apparatus and opens
// Logos at the verse. Shot: shots/variants-go-deeper.png.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openGroup } from './settings-group';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

/** Headless Chromium stops at a link to an app scheme; the tap itself still reaches the page. */
const holdAppLinks = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
};

/** Logos On (Settings > Study resources), then every Greek text On from the Library's page. */
async function shelfHoldsGreekTexts(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const logos = page.getByRole('region', { name: 'Study resources' }).getByRole('switch', { name: 'Logos', exact: true });
  if ((await logos.getAttribute('aria-checked')) !== 'true') await logos.click();
  await expect(logos).toHaveAttribute('aria-checked', 'true');
  await page.goto('/#/library?kind=greek-text');
  await expect(page.getByRole('heading', { name: 'Greek texts', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'All on', exact: true }).click();
  await expect(page.getByTestId('kind-status')).not.toHaveText('none on');
}

/** Revelation 3 with Variants on, the sheet of verse 2's unit open. */
async function openSheet(page: Page) {
  await page.goto('/#/?b=rev&c=3');
  await expect(page.locator('[data-verse="2"] [data-text]')).toBeVisible();
  await page.getByRole('button', { name: /^Variants,/ }).click();
  await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();
  const brace = page.locator('[data-verse="2"] [data-brace]').first();
  await expect(brace).toBeVisible();
  await brace.locator('[data-witness]').first().click();
  const sheet = page.getByRole('dialog', { name: 'Variant reading' });
  await expect(sheet).toBeVisible();
  return sheet;
}

test('Revelation 3:2 sheet has Go deeper with the lessons, the apparatus and the 2005 edition, and no Logos door while Logos is Off', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  const sheet = await openSheet(page);

  const deeper = sheet.locator('[data-go-deeper]');
  await deeper.scrollIntoViewIfNeeded();
  await expect(deeper.getByRole('heading', { name: 'Go deeper', level: 3 })).toBeVisible();
  const apparatus = deeper.getByRole('link', { name: 'The apparatus: Robinson-Pierpont 2018 (GitHub)' });
  await expect(apparatus).toHaveAttribute('href', 'https://github.com/byztxt/byzantine-majority-text/blob/v3.3.2/csv-unicode/ccat/with-variants/REV.csv');
  const edition = deeper.getByRole('link', { name: 'The 2005 edition and its introduction' });
  await expect(edition).toHaveAttribute('href', 'https://archive.org/details/RP2005KoineGreekNTinByzantineTextform');
  for (const link of [apparatus, edition]) {
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noreferrer/);
    expect((await link.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  }
  const lessons = deeper.getByRole('button', { name: 'Lessons on variant readings ›' });
  expect((await lessons.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  // Logos is Off: no door, and no prompt to turn it on
  await expect(deeper.getByRole('button', { name: 'In your Logos library…' })).toHaveCount(0);
  await expect(deeper.getByText(/Logos/)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

  // the lessons row leaves the sheet for the lessons' list
  await lessons.click();
  await expect(sheet).toHaveCount(0);
  await expect(page).toHaveURL(/#\/lessons\/variants$/);
  await expect(page.getByRole('heading', { name: 'Lessons on variant readings', exact: true, level: 1 })).toBeVisible();
});

test('with Logos On and the SBLGNT apparatus On the Logos door shows, and its chooser lists the SBLGNT apparatus and opens Logos at the verse', async ({ page }) => {
  await openUnlocked(page);
  await holdAppLinks(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await shelfHoldsGreekTexts(page);
  const sheet = await openSheet(page);

  const deeper = sheet.locator('[data-go-deeper]');
  await deeper.scrollIntoViewIfNeeded();
  const door = deeper.getByRole('button', { name: 'In your Logos library…', exact: true });
  await expect(door).toBeVisible();
  expect((await door.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
  // the sheet and its backdrop have finished coming in (src/index.css lp-sheet-in, lp-fade-in)
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  await shot(page, 'variants-go-deeper');

  await door.click();
  const chooser = page.getByRole('dialog', { name: 'Revelation 3:2 in Logos' });
  await expect(chooser).toBeVisible();
  // the group of Greek texts is folded to three: 'N more' unfolds it
  await chooser.getByRole('group', { name: 'Greek texts (8)' }).getByRole('button', { name: '5 more', exact: true }).click();
  const row = chooser.getByRole('link', { name: /SBLGNT apparatus/ });
  await expect(row).toBeVisible();
  await expect(row).toHaveAttribute('href', /^logosres:LLS:SBLGNTAPP;ref=Bible\.Re3\.2$/);
});
