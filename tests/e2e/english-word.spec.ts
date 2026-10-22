// A tapped English word (mw-5r3p30.707): at Just English it opens a small English sheet (the word, Listen, and Look it up in Logos, his English dictionary),
// and at a Greek level the Greek word sheet carries the same Logos row. At 390x844. How Logos opens the link is only the Governor's phone to say.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { leaveSettings, openGroup } from './settings-group';
import { honestSpeech } from '../support/honest-fakes';

const LOVE = 'logosres:AMDICTENLANG;hw=love';

// a phone that starts where a new reader does: Just English
const justEnglish = { storageState: { cookies: [], origins: [] } };

/** 2 John 1, verse 5: "we love" and "one another." are English chunks of their own. */
async function openTwoJohn(page: Page) {
  await page.goto('/#/?b=2jn&c=1');
  await expect(page.locator('[data-verse="5"]')).toBeVisible();
}

const sheet = (page: Page) => page.getByRole('dialog', { name: 'English word', exact: true });

async function holdAppLinks(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
}

async function turnOnLogos(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  await page.getByRole('region', { name: 'Study resources' }).getByRole('switch', { name: 'Logos', exact: true }).click();
  await leaveSettings(page);
}

test.describe('at Just English', () => {
  test.use({ viewport: { width: 390, height: 844 }, ...justEnglish });

  test('a tap on an English word opens the English sheet: the word, Listen and Look it up in Logos', async ({ page }) => {
    await honestSpeech(page, { langs: ['en-US'] });
    await holdAppLinks(page);
    await openUnlocked(page);
    await openTwoJohn(page);
    await turnOnLogos(page);
    await page.locator('[data-verse="5"]').getByRole('button', { name: 'we love', exact: true }).click();
    const word = sheet(page);
    await expect(word).toBeVisible();
    await expect(word.getByTestId('english-word')).toHaveText('we love');
    await expect(word.getByRole('button', { name: 'Listen', exact: true })).toBeVisible();
    // no Greek on it
    await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toHaveCount(0);
    await expect(word.getByTestId('sheet-lemma')).toHaveCount(0);
    const link = word.getByRole('link', { name: 'Look it up in Logos: love', exact: true });
    await expect(link).toHaveAttribute('href', LOVE);
    await expect(link).toHaveAttribute('data-fallback', 'https://ref.ly/logosres/AMDICTENLANG?hw=love');
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(43.5);
    await expect(link).toBeInViewport();
    await shot(page, 'english-word-sheet');
    await word.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(word).toHaveCount(0);
  });

  test('a one-word chunk has a plain Look it up in Logos', async ({ page }) => {
    await holdAppLinks(page);
    await openUnlocked(page);
    await openTwoJohn(page);
    await turnOnLogos(page);
    await page.locator('[data-verse="5"]').getByRole('button', { name: 'commandment', exact: true }).click();
    await expect(sheet(page).getByRole('link', { name: 'Look it up in Logos', exact: true })).toHaveAttribute('href', 'logosres:AMDICTENLANG;hw=commandment');
  });

  test('with Logos off the sheet says to turn it on, and one tap turns it on and shows the link', async ({ page }) => {
    await openUnlocked(page);
    await openTwoJohn(page);
    await page.locator('[data-verse="5"]').getByRole('button', { name: 'commandment', exact: true }).click();
    const word = sheet(page);
    await expect(word.getByText('Turn on Logos to look words up', { exact: true })).toBeVisible();
    await expect(word.getByRole('link', { name: /Look it up in Logos/ })).toHaveCount(0);
    await word.getByRole('button', { name: 'Turn on Logos', exact: true }).click();
    await expect(word.getByRole('link', { name: 'Look it up in Logos', exact: true })).toHaveAttribute('href', 'logosres:AMDICTENLANG;hw=commandment');
    await expect(word.getByText('Turn on Logos to look words up')).toHaveCount(0);
  });
});

test.describe('at a Greek level', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the Greek word sheet of a tapped English word carries the English Logos row as well', async ({ page }) => {
    await holdAppLinks(page);
    await openUnlocked(page);
    await openTwoJohn(page);
    await turnOnLogos(page);
    await page.locator('[data-verse="5"]').getByRole('button', { name: 'we love', exact: true }).click();
    const word = page.getByRole('dialog', { name: 'Word', exact: true });
    await expect(word.getByTestId('sheet-heading')).toBeVisible();
    await expect(word.getByRole('link', { name: 'Look it up in Logos (English): love', exact: true })).toHaveAttribute('href', LOVE);
    await shot(page, 'english-word-greek-sheet');
  });
});
