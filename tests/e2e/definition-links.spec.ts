// The word sheet's Definition (mw-5r3p30.1163) on Gershom in Exodus 2:22 at 390x844: its Bible reference 'Exo.2.22' is a link that opens the reader on that verse, the who-part stands apart from
// the meaning after '§', and each numbered sense takes a line of its own; light and dark.
import { expect, test } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`Gershom's Definition is laid out and its reference opens Exodus 2:22 (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openUnlocked(page);
    await page.goto('/#/?b=exo&c=2');
    await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Hebrew', exact: true }).click();
    await page.locator('[data-verse="22"] [data-word="5"]').click();
    const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
    await expect(sheet.getByTestId('sheet-lemma')).toHaveText('גֵּרְשֹׁם');
    const definition = sheet.getByTestId('sheet-definition');
    await expect(definition.getByTestId('definition-who')).toHaveCount(4);
    await expect(definition.getByTestId('definition-sense')).toHaveCount(4);
    // each sense is on a line of its own, below the one before
    const senses = await definition.getByTestId('definition-sense').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    expect(senses).toEqual([...senses].sort((a, b) => a - b));
    expect(new Set(senses).size).toBe(4);
    // the sheet's Definition is inside the sheet's scroll box: bring it into view for the shot
    await definition.scrollIntoViewIfNeeded();
    await shot(page, `definition-gershom-${scheme}`);

    const link = definition.getByRole('link', { name: 'Exo.2.22', exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Exodus/ }).first()).toBeVisible();
    await expect(page).toHaveURL(/b=exo&c=2/);
  });
}

// mw-5r3p30.1177: a reference outside the chapter he is reading must open its verse, not leave him where he was: the sheet's closing step went Back over the link's address.
const FAR_REFERENCES = [
  { name: 'Moses', verse: 10, word: 10, link: 'Jdg.18.30', heading: /Judges 18/, chapter: 'jdg', at: 30 },
  { name: 'Abraham', verse: 24, word: 9, link: 'Gen.11.26', heading: /Genesis 11/, chapter: 'gen', at: 26 },
];
for (const far of FAR_REFERENCES) {
  test(`${far.name}'s Definition link ${far.link} opens its chapter, not Exodus 2`, async ({ page }) => {
    await openUnlocked(page);
    await page.goto('/#/?b=exo&c=2');
    await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Hebrew', exact: true }).click();
    await page.locator(`[data-verse="${far.verse}"] [data-word="${far.word}"]`).click();
    const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
    const link = sheet.getByTestId('sheet-definition').getByRole('link', { name: far.link }).first();
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await expect(sheet).toHaveCount(0);
    await expect(page.getByRole('heading', { name: far.heading }).first()).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`b=${far.chapter}&c=`));
    await expect(page.locator(`[data-verse="${far.at}"]`).first()).toBeInViewport();
    await shot(page, `definition-far-${far.chapter}`);
  });
}

for (const scheme of ['light', 'dark'] as const) {
  test(`a Greek word's sheet is as it was: the Greek card draws no Definition (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await openUnlocked(page);
    await page.goto('/#/?b=mat&c=1');
    await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Greek', exact: true }).click();
    await page.locator('[data-verse="1"] [data-word="0"]').click();
    const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
    await expect(sheet.getByTestId('sheet-gloss')).toBeVisible();
    await shot(page, `definition-greek-${scheme}`);
  });
}
