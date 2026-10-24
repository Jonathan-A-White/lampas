// The Greek dial (mw-3ased2.2): "How much Greek?" at the top of the Settings home, six named steps, each a real change. A new phone starts at 0, Just English, with no Greek
// setting, Greek view or Greek word sheet anywhere; each step up brings in what its line says; down then up gives him back his own values. At 390x844.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openGroup, leaveSettings } from './settings-group';
import { openUnlocked } from './unlocked';

// a new phone: the specs before the dial start at 5, All in (playwright.config.ts); this one starts where a new reader does
test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

const STEPS = ['Just English', 'Curious', 'Dipping a toe', 'Learning', 'Reading in Greek', 'All in'];
/** What no page of Settings may mention at Just English. */
const GREEK_WORDS = /Weave|Greek voice|Greek speed|Greek pronunciation|New words|Handwriting|Read lessons|Hebrew in the tutor|Paradigms|Strong's|Quiz goal|Goal/;

const dial = (page: Page) => page.getByRole('group', { name: 'How much Greek?', exact: true });
const step = (page: Page, name: string) => dial(page).getByRole('button', { name, exact: true });
const language = (page: Page) => page.getByRole('group', { name: 'Language', exact: true });
const groupButtons = (page: Page) => page.getByRole('list', { name: 'Settings groups' }).locator('[data-group]');

async function openReader(page: Page) {
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible();
}

/** From the Reader: Settings, the dial moved to `name`, back to the Reader. */
async function setStep(page: Page, name: string) {
  await openSettings(page);
  await step(page, name).click();
  await expect(step(page, name)).toHaveAttribute('aria-pressed', 'true');
  await leaveSettings(page);
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

async function pageText(page: Page, group: string): Promise<string> {
  await openGroup(page, group);
  const text = (await page.locator('main').textContent()) ?? '';
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  return text;
}

test.beforeEach(async ({ page }) => {
  await openUnlocked(page);
});

test('a new phone starts at Just English: the dial on top, no Greek setting, view or word sheet anywhere', async ({ page }) => {
  await openReader(page);
  // the Reader: no English | Greek switch, and a tap on an English word opens no Greek word sheet, only the small English one (tests/e2e/english-word.spec.ts)
  await expect(language(page)).toHaveCount(0);
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'Therefore', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toHaveCount(0);
  const english = page.getByRole('dialog', { name: 'English word', exact: true });
  await expect(english).toBeVisible();
  await english.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(english).toHaveCount(0);

  await openSettings(page);
  // the dial is the first control, under the one door above it, Your Logos library (mw-5r3p30.752): six steps, each with its name; the chosen one says what it means
  await expect(dial(page)).toBeVisible();
  const box = await dial(page).boundingBox();
  const search = await page.getByRole('searchbox', { name: 'Search settings' }).boundingBox();
  expect(box!.y).toBeGreaterThan(search!.y);
  expect(box!.y).toBeLessThan(340);
  await expect(dial(page).locator('[data-step]')).toHaveCount(6);
  for (const name of STEPS) await expect(step(page, name)).toBeVisible();
  await expect(step(page, 'Just English')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('greek-line')).toContainText('A plain English Bible');
  for (const name of STEPS) expect((await step(page, name).boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
  await shot(page, 'greek-dial-0');

  // the groups: no Greek page
  await expect(groupButtons(page)).toHaveCount(6);
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Greek/ })).toHaveCount(0);
  // every page of Settings, walked: nothing Greek on any of them
  for (const group of ['Reading', 'The tutor', 'Listening', 'Daily', 'Study resources', 'Account']) {
    expect(await pageText(page, group), group).not.toMatch(GREEK_WORDS);
  }
  // the search finds the dial for a Greek word, and no Greek setting
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('weave');
  await expect(page.locator('[data-found]')).toHaveText(/How much Greek\?/);
  await expect(page.locator('[data-found]')).toHaveCount(1);
});

test('each step up brings in what it says, from Curious to All in', async ({ page }) => {
  await openReader(page);

  // 1 Curious: the English | Greek view, a word's Greek and its Strong's number, the Greek voice, speed and pronunciation; nothing to weave or learn
  await setStep(page, 'Curious');
  await expect(language(page).getByRole('button')).toHaveText(['English', 'Greek']);
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'Therefore', exact: true }).click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-word')).toHaveText('ἄρα');
  await expect(sheet.getByTestId('sheet-strongs')).toHaveText('G686');
  await sheet.getByRole('button', { name: 'Done' }).click();
  await openSettings(page);
  await expect(page.getByTestId('greek-line')).toContainText('Strong');
  const listening = await pageText(page, 'Listening');
  expect(listening).toMatch(/Greek voice/);
  expect(listening).toMatch(/Greek speed/);
  expect(listening).toMatch(/Pronunciation/);
  expect(await pageText(page, 'Reading')).not.toMatch(/Weave/);
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Greek/ })).toHaveCount(0);
  await leaveSettings(page);

  // 2 Dipping a toe: the Weave, with its Order and Grammar
  await setStep(page, 'Dipping a toe');
  await openSettings(page);
  await openGroup(page, 'Reading');
  await expect(page.getByRole('heading', { name: 'Weave', exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Weave', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Greek/ })).toHaveCount(0);
  await leaveSettings(page);
  await expect(language(page).getByRole('button')).toHaveText(['English', 'Weave', 'Greek']);

  // 3 Learning: the daily path
  await setStep(page, 'Learning');
  await openSettings(page);
  await openGroup(page, 'Greek');
  await expect(page.getByRole('group', { name: 'New words a day', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Handwriting drills', exact: true })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Goal', exact: true })).toHaveCount(0);
  await shot(page, 'greek-dial-3');
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await leaveSettings(page);

  // 4 Reading in Greek: the Reader opens in the Greek, and the Goal is there to set
  await setStep(page, 'Reading in Greek');
  await expect(language(page).getByRole('button', { name: 'Greek', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await expect(language(page).getByRole('button', { name: 'Greek', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await openSettings(page);
  await openGroup(page, 'Greek');
  await expect(page.getByRole('group', { name: 'Goal', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  expect(await pageText(page, 'Account')).not.toMatch(/Paradigms/);
  await leaveSettings(page);

  // 5 All in: everything, the paradigms and Hebrew in the tutor included
  await setStep(page, 'All in');
  await openSettings(page);
  expect(await pageText(page, 'Account')).toMatch(/Paradigms/);
  expect(await pageText(page, 'The tutor')).toMatch(/Hebrew/);
  await shot(page, 'greek-dial-5');
});

test('down and up again gives him back his own values', async ({ page }) => {
  await openReader(page);
  await setStep(page, 'Learning');
  await openSettings(page);
  await openGroup(page, 'Greek');
  await page.getByRole('group', { name: 'New words a day', exact: true }).getByRole('button', { name: '10', exact: true }).click();
  await expect(page.getByRole('group', { name: 'New words a day', exact: true }).getByRole('button', { name: '10', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();

  await step(page, 'Just English').click();
  await expect(step(page, 'Just English')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Greek/ })).toHaveCount(0);
  await step(page, 'Learning').click();
  await expect(step(page, 'Learning')).toHaveAttribute('aria-pressed', 'true');
  await openGroup(page, 'Greek');
  await expect(page.getByRole('group', { name: 'New words a day', exact: true }).getByRole('button', { name: '10', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'greek-dial-restored');
});
