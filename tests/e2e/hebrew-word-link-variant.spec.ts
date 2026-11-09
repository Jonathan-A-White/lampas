// A #/?word= link by a Hebrew lemma TBESH spells two ways under one Strong's number (mw-fnvjof.17.40): H3384 is יָרָא in the text and יָרָה (yarah) as the dictionaries
// spell it; both spellings, pointed or not, open the sheet of H3384, and a lemma that is no word of Lampas still says so.
import { expect, test } from '@playwright/test';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

for (const [name, word] of [
  ['pointed', 'יָרָה'],
  ['unpointed', 'ירה'],
] as const) {
  test(`#/?word= by יָרָה, ${name}, opens the sheet of H3384 and no notice`, async ({ page }) => {
    await openUnlocked(page);
    await page.goto(`/#/?word=${encodeURIComponent(word)}`);
    const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
    await expect(sheet.getByTestId('sheet-lemma')).toHaveText('יָרָה');
    await expect(sheet.getByTestId('sheet-gloss')).toHaveText('to show');
    await expect(page.locator('[data-link-notice]')).toHaveCount(0);
    await expect(page.getByText('is not in Lampas')).toHaveCount(0);
  });
}

test('#/?word=H3384 still opens the sheet of the text’s own spelling יָרָא', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?word=H3384');
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-lemma')).toHaveText('יָרָא');
  await expect(sheet.getByTestId('sheet-gloss')).toHaveText('to shoot');
});
