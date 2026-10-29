// Reading sets (mw-9ji6ek0.25, src/reader/ReadingSetSheet.tsx) at 390x844: the variants chip's long-press sheet has 'Read as' (Byzantine | NA | ECM, then his own sets). On Revelation 3,
// NA lays 'I was about to die' into 3:2 and '(and shutting)' into 3:7, each marked (data-chosen), with Variants Off; 'Save as…' names a copy of NA ('My Rev'); Byzantine reads plain;
// 'My Rev' reads NA again; it is deleted after 'Delete this set?', and Byzantine is read again. Shot: shots/reading-sets.png.
import { expect, test, type Page } from '@playwright/test';
import { holdFor } from '../support/hold';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const language = (page: Page, name: string) => page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name, exact: true });
const chip = (page: Page) => page.getByRole('button', { name: /^Variants,/ });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Variants', exact: true });
const readAs = (page: Page) => sheet(page).getByRole('group', { name: 'Read as', exact: true });
const setButton = (page: Page, name: string) => readAs(page).getByRole('button', { name, exact: true });

/** The text of a verse as it reads in the text, braces left out. */
const inText = (page: Page, verse: number): Promise<string> =>
  page.locator(`[data-verse="${verse}"] [data-text]`).evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelectorAll('[data-brace]').forEach((b) => b.remove());
    return (copy.textContent ?? '').replace(/\s+/g, ' ');
  });

const marked = (page: Page, verse: number) => page.locator(`[data-verse="${verse}"] [data-chosen]`);

test('Revelation 3: Read as NA lays NA’s readings in 3:2 and 3:7, marked; Save as My Rev; Byzantine reads plain; My Rev reads NA again; Delete this set', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rev&c=3');
  await expect(page.locator('[data-verse="7"] [data-text]')).toBeVisible();
  await language(page, 'English').click();
  await expect(language(page, 'English')).toHaveAttribute('aria-pressed', 'true');
  expect(await inText(page, 2)).toContain('is about to die');
  expect(await inText(page, 7)).toContain('(except Him who opens)');

  // the chip's long press: Read as, Byzantine chosen, the three built-in sets and nothing of his own to rename or delete
  await holdFor(page, chip(page), 700);
  await expect(sheet(page)).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  await expect(readAs(page).getByRole('button')).toHaveText(['Byzantine', 'NA', 'ECM']);
  await expect(setButton(page, 'Byzantine')).toHaveAttribute('aria-pressed', 'true');
  await expect(sheet(page).getByText('ECM where the apparatus gives it (18 places in Acts); elsewhere NA')).toBeVisible();
  await expect(sheet(page).getByRole('button', { name: 'Rename', exact: true })).toHaveCount(0);
  await expect(sheet(page).getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);

  // NA: 3:2 and 3:7 read NA, marked, though Variants is Off
  await setButton(page, 'NA').click();
  await expect(setButton(page, 'NA')).toHaveAttribute('aria-pressed', 'true');
  await expect(marked(page, 2).first()).toBeAttached();
  await expect(marked(page, 7).first()).toBeAttached();
  expect(await inText(page, 2)).toContain('I was about to die');
  expect(await inText(page, 7)).toContain('(and shutting)');
  expect(await inText(page, 7)).not.toContain('except');

  // Save as… names a copy of NA
  await sheet(page).getByRole('button', { name: 'Save as…', exact: true }).click();
  const name = sheet(page).getByRole('textbox', { name: 'Name this set', exact: true });
  await expect(name).toBeVisible();
  await expect(sheet(page).getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await name.fill('My Rev');
  await sheet(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(readAs(page).getByRole('button')).toHaveText(['Byzantine', 'NA', 'ECM', 'My Rev']);
  await expect(setButton(page, 'My Rev')).toHaveAttribute('aria-pressed', 'true');
  expect(await inText(page, 2)).toContain('I was about to die');
  await shot(page, 'reading-sets');

  // Byzantine: plain; My Rev: NA again
  await setButton(page, 'Byzantine').click();
  await expect(marked(page, 2)).toHaveCount(0);
  await expect(marked(page, 7)).toHaveCount(0);
  expect(await inText(page, 2)).toContain('is about to die');
  await setButton(page, 'My Rev').click();
  await expect(marked(page, 2).first()).toBeAttached();
  expect(await inText(page, 2)).toContain('I was about to die');
  expect(await inText(page, 7)).toContain('(and shutting)');

  // a reload keeps the set in force
  await page.reload();
  await expect(marked(page, 2).first()).toBeAttached();

  // Delete this set? Cancel keeps it; Delete my set removes it and Byzantine is read again
  await holdFor(page, chip(page), 700);
  await expect(sheet(page)).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  await sheet(page).getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(sheet(page).getByText('Delete this set?', { exact: true })).toBeVisible();
  await sheet(page).getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(setButton(page, 'My Rev')).toHaveAttribute('aria-pressed', 'true');
  await sheet(page).getByRole('button', { name: 'Delete', exact: true }).click();
  await sheet(page).getByRole('button', { name: 'Delete my set', exact: true }).click();
  await expect(readAs(page).getByRole('button')).toHaveText(['Byzantine', 'NA', 'ECM']);
  await expect(setButton(page, 'Byzantine')).toHaveAttribute('aria-pressed', 'true');
  await expect(marked(page, 2)).toHaveCount(0);
  expect(await inText(page, 2)).toContain('is about to die');
});
