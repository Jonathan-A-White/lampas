import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { shelveLexicons, switchOnResources } from './long-library';

// All lexicons > Manage (mw-5r3p30.1114): the Library's Lexicons page must show with no sheet over it, the first time and again after Back brings the word sheet back
// (the sheet WordReturn reopens is not the Reader's, so it is not unmounted with the Reader when the route changes). Back returns the held word sheet after the first Manage.

test.use({ viewport: { width: 390, height: 844 } });

/** Headless Chromium stops at a link to an app scheme; the tap itself still reaches the page. */
const holdAppLinks = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
};

const CASES = [
  { name: 'Psalm 23 (Hebrew)', hash: '/#/?b=psa&c=23', hebrew: true, word: '[data-verse="1"] [data-word="1"]', english: false },
  { name: 'Romans 8:1 (Greek)', hash: '/#/?b=rom&c=8', hebrew: false, word: '[data-verse="1"]', english: true },
];

for (const c of CASES) {
  test(`${c.name}: All lexicons > Manage shows the Lexicons page with no sheet over it, the first time and after Back`, async ({ page }) => {
    await openUnlocked(page);
    await holdAppLinks(page);
    await page.goto('/');
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    await switchOnResources(page);
    await shelveLexicons(page);
    await page.goto(c.hash);
    if (c.hebrew) await page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'Hebrew', exact: true }).click();
    if (c.english) await page.locator(c.word).getByRole('button', { name: 'condemnation', exact: true }).click();
    else await page.locator(c.word).click();

    const word = page.getByRole('dialog', { name: 'Word', exact: true });
    const all = page.getByRole('dialog', { name: 'All lexicons', exact: true });
    const lexicons = page.getByRole('heading', { name: 'Lexicons', level: 1 });
    const manage = async (): Promise<void> => {
      await expect(word).toBeVisible();
      await word.getByRole('button', { name: /^All \d+ lexicons ›$/ }).click();
      await expect(all).toBeVisible();
      await all.getByRole('button', { name: 'Manage', exact: true }).click();
      await expect(lexicons).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    };
    await manage();
    await shot(page, `all-lexicons-manage-${c.hebrew ? 'hebrew' : 'greek'}`);
    // Back returns the held word sheet, and Manage again shows the page again
    await page.goBack();
    await expect(word).toBeVisible();
    await manage();
  });
}

// The same sweep for the word sheet's other pages of its own: the Paradigm row, from the sheet that Back brought back, leaves no sheet over the table.
test('Romans 8:1 (Greek): the Paradigm row from the word sheet that came back shows the table with no sheet over it', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'condemnation', exact: true }).click();
  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  const row = word.getByTestId('sheet-paradigm').getByRole('button');
  const openTable = async (): Promise<void> => {
    await expect(word).toBeVisible();
    await row.click();
    await expect(page).toHaveURL(/#\/paradigms/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
  };
  await openTable();
  await page.goBack();
  await openTable();
});
