// mw-fnvjof.17.50 at 390x844: Settings > Learning > Grammar approach lists the Hebrew lessons, and a tap on one opens its Idea sheet (it threw "Unknown grammar idea: he-alphabet"
// and the whole app showed "Something went wrong"). "Mark known without a drill" moves the Next mark to Alef; with Greek and Hebrew chosen the Hebrew heading's lessons open too.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openGroup } from './settings-group';
import { settingsHeading } from './openSettings';

test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

const languages = (page: Page) => page.getByRole('group', { name: 'Which languages?', exact: true });
const hebrewDial = (page: Page) => page.getByRole('group', { name: 'How much Hebrew?', exact: true });
const path = (page: Page) => page.getByRole('group', { name: 'Hebrew grammar approach', exact: true });
const sheet = (page: Page) => page.getByRole('dialog', { name: 'Idea', exact: true });

test('a Hebrew lesson in Settings opens its Idea sheet, and marking it known moves Next to Alef', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  await expect(settingsHeading(page)).toBeVisible();
  await languages(page).getByRole('button', { name: 'Hebrew', exact: true }).click();
  await hebrewDial(page).getByRole('button', { name: 'Learning', exact: true }).click();
  await expect(hebrewDial(page).getByRole('button', { name: 'Learning', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await openGroup(page, 'Learning');

  const lessons = path(page);
  await lessons.scrollIntoViewIfNeeded();
  const first = lessons.getByRole('button', { name: 'The Hebrew alphabet', exact: true });
  await first.scrollIntoViewIfNeeded();
  await first.click();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await expect(sheet(page).getByRole('heading', { name: 'The Hebrew alphabet' })).toBeVisible();
  await shot(page, 'hebrew-approach-idea');

  await sheet(page).getByRole('button', { name: 'Mark known without a drill', exact: true }).click();
  await expect(sheet(page).getByTestId('idea-level')).toHaveText(/^Solid since today/);
  await sheet(page).getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet(page)).toHaveCount(0);
  await expect(lessons.locator('[data-next]')).toHaveCount(1);
  await expect(lessons.locator('li', { has: page.locator('[data-next]') })).toContainText('Alef');
});

test('with Greek and Hebrew chosen, a lesson under the Hebrew heading opens its Idea sheet', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/settings');
  await expect(settingsHeading(page)).toBeVisible();
  await languages(page).getByRole('button', { name: 'Greek and Hebrew', exact: true }).click();
  await page.getByRole('group', { name: 'How much Greek?', exact: true }).getByRole('button', { name: 'Learning', exact: true }).click();
  await hebrewDial(page).getByRole('button', { name: 'Learning', exact: true }).click();
  await openGroup(page, 'Learning');

  await expect(page.getByRole('heading', { name: 'Hebrew', exact: true, level: 3 })).toBeVisible();
  const alef = path(page).getByRole('button', { name: 'Alef', exact: true });
  await alef.scrollIntoViewIfNeeded();
  await alef.click();
  await expect(page.getByText('Something went wrong')).toHaveCount(0);
  await expect(sheet(page).getByRole('heading', { name: 'Alef' })).toBeVisible();
});
