// 'Read this' (mw-9ji6ek0.24, src/reader/chosenReading.ts) at 390x844: a reading of Revelation 3:2 laid into the text in place from the variant sheet, marked with a thin solid line (data-chosen),
// with the brace after it holding the text's own reading under RP; it shows in Greek, Weave and English, a reload keeps it, a word of it opens its card, and Read this on the text's own
// puts it back. Revelation 3:7 reads '(and shutting)' in English. Shots: shots/variants-read-this-<english|weave|greek>.png.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const choice = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });
const chip = (page: Page) => page.getByRole('button', { name: /^Variants,/ });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Variant reading' });

/** The text of a verse as it reads in the text, braces left out. */
const inText = (page: Page, verse: number): Promise<string> =>
  page.locator(`[data-verse="${verse}"] [data-text]`).evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('[data-brace]').forEach((b) => b.remove());
    return (copy.textContent ?? '').replace(/\s+/g, ' ');
  });

/** The sheet's reading whose Greek is `greek`. */
const readingOf = (page: Page, greek: string): Locator => sheet(page).locator('[data-variant-reading]').filter({ has: page.locator('[data-reading-greek]', { hasText: greek }) });

/** Opens the sheet of the unit in verse `verse` whose brace holds `text` (the siglum of its first reading). */
async function openSheetOf(page: Page, verse: number, text: string | RegExp): Promise<void> {
  const brace = page.locator(`[data-verse="${verse}"] [data-brace]`).filter({ hasText: text }).first();
  await brace.locator('[data-witness]').first().click();
  await expect(sheet(page)).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}

test('Revelation 3:2: Read this on NA’s “I was about to die” lays it in place in the Greek, the Weave and the English; a reload keeps it; a word opens its card; Read this on the text’s reading puts it back', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=3&weave=solid');
  await expect(page.locator('[data-verse="2"] [data-text]')).toBeVisible();
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await choice(page, 'English').click();
  await expect(choice(page, 'English')).toHaveAttribute('aria-pressed', 'true');
  expect(await inText(page, 2)).toContain('is about to die');

  // the NA siglum after {I was about to die B NA} opens the sheet; the sheet says what Read this leaves alone
  await openSheetOf(page, 2, 'I was about to die');
  await expect(sheet(page).getByText('Read aloud, copy, Read check and the diagram keep the Byzantine words.')).toBeVisible();
  const na = readingOf(page, 'ἔμελλον ἀποθανεῖν');
  await expect(na.getByText('I was about to die', { exact: true })).toBeVisible();
  // no reading is in place yet: the text's own has no button, the others have
  await expect(sheet(page).getByText('Reading this', { exact: true })).toHaveCount(0);
  await na.getByRole('button', { name: 'Read this', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);

  // English: the reading's words with a thin solid line, the text's own words gone, the brace holding the text's reading under RP
  await expect(page.locator('[data-verse="2"] [data-chosen]').first()).toBeVisible();
  const english = await inText(page, 2);
  expect(english).toContain('I was about to die');
  expect(english).not.toContain('is about to die');
  const brace = page.locator('[data-verse="2"] [data-brace]').filter({ hasText: 'RP' });
  await expect(brace).toBeVisible();
  await expect(brace).toContainText('you were about to throw away');
  await expect(brace.locator('[data-witness]', { hasText: 'RP' })).toBeVisible();
  const run = page.locator('[data-verse="2"] [data-chosen-run]').first();
  expect(await run.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
  await shot(page, 'variants-read-this-english');

  // Weave
  await choice(page, 'Weave').click();
  await expect(choice(page, 'Weave')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-verse="2"] [data-chosen]').first()).toBeVisible();
  await shot(page, 'variants-read-this-weave');

  // Greek: ἔμελλον ἀποθανεῖν marked, in place of ἔμελλες ἀποβάλλειν
  await choice(page, 'Greek').click();
  await expect(choice(page, 'Greek')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-verse="2"] [data-chosen]').first()).toBeVisible();
  const greek = await inText(page, 2);
  expect(greek).toContain('ἔμελλον ἀποθανεῖν');
  expect(greek).not.toContain('ἔμελλες');
  expect(greek).not.toContain('ἀποβάλλειν');
  await expect(page.locator('[data-verse="2"] [data-chosen]', { hasText: 'ἀποθανεῖν' })).toBeVisible();
  await shot(page, 'variants-read-this-greek');

  // a reload keeps it
  await page.reload();
  await expect(page.locator('[data-verse="2"] [data-chosen]', { hasText: 'ἀποθανεῖν' })).toBeVisible();

  // a word of it opens its card
  await page.locator('[data-verse="2"] [data-chosen]', { hasText: 'ἀποθανεῖν' }).click();
  const card = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(card).toBeVisible();
  await expect(card).toContainText('ἀποθανεῖν');
  await card.getByRole('button', { name: 'Done' }).click();
  await expect(card).toHaveCount(0);

  // Variants Off: the reading stays in place, marked, and no brace is drawn
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-verse="2"] [data-chosen]', { hasText: 'ἀποθανεῖν' })).toBeVisible();
  await expect(page.locator('[data-brace]')).toHaveCount(0);
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');

  // the sheet now says Reading this on it, and Read this on the text's reading puts it back
  await openSheetOf(page, 2, 'RP');
  const inPlace = readingOf(page, 'ἔμελλον ἀποθανεῖν');
  await expect(inPlace.getByText('Reading this', { exact: true })).toBeVisible();
  await expect(inPlace.getByRole('button', { name: 'Read this' })).toHaveCount(0);
  await sheet(page).locator('[data-variant-reading]').first().getByRole('button', { name: 'Read this', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(page.locator('[data-verse="2"] [data-chosen]')).toHaveCount(0);
  expect(await inText(page, 2)).toContain('ἔμελλες ἀποβάλλειν');
});

test('Revelation 3:7: Read this on “and shutting” puts (and shutting) in the English where the text has (except Him who opens)', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=3');
  await expect(page.locator('[data-verse="7"] [data-text]')).toBeVisible();
  await chip(page).click();
  await expect(chip(page)).toHaveAttribute('aria-pressed', 'true');
  await choice(page, 'English').click();
  expect(await inText(page, 7)).toContain('(except Him who opens)');
  await openSheetOf(page, 7, 'and shutting');
  await readingOf(page, 'καὶ κλείων').getByRole('button', { name: 'Read this', exact: true }).first().click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(page.locator('[data-verse="7"] [data-chosen]').first()).toBeVisible();
  const text = await inText(page, 7);
  expect(text).toContain('(and shutting)');
  expect(text).not.toContain('except');
});
