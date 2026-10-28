// The Greek dial (mw-3ased2.2): "How much Greek?" on the Settings home under "Which languages?" (mw-gdcyf98.2), six named steps (Just English is "English only" of the row above,
// never a button of the dial), each a real change. A new phone starts at English only, with no Greek setting, Greek view or Greek word sheet anywhere; choosing Greek puts
// the dial at Curious; each step up brings in what its line says; down then up gives him back his own values. At 390x844.
import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openGroup, leaveSettings } from './settings-group';
import { openUnlocked } from './unlocked';

// a new phone: the specs before the dial start at 5, All in (playwright.config.ts); this one starts where a new reader does
test.use({ viewport: { width: 390, height: 844 }, storageState: { cookies: [], origins: [] } });

/** What no page of Settings may mention at Just English. */
const GREEK_WORDS = /Weave|Greek voice|Greek speed|Greek pronunciation|New words|Handwriting|Read lessons|Hebrew in the tutor|Paradigms|Strong's|Quiz goal|Goal/;

const dial = (page: Page) => page.getByRole('group', { name: 'How much Greek?', exact: true });
const step = (page: Page, name: string) => dial(page).getByRole('button', { name, exact: true });
const languages = (page: Page) => page.getByRole('group', { name: 'Which languages?', exact: true });
const choose = (page: Page, name: string) => languages(page).getByRole('button', { name, exact: true });
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

/** From the Reader: Settings, Greek chosen (when it is not), the dial moved to `name`, back to the Reader. */
async function setStep(page: Page, name: string) {
  await openSettings(page);
  if ((await dial(page).count()) === 0) await choose(page, 'Greek').click();
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

test('a new phone starts at English only: Which languages? on top, no dial, no Greek setting, view or word sheet anywhere', async ({ page }) => {
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
  // Which languages? is the first control, under the search field (the library door is in Study resources, mw-5r3p30.837): four choices, English only chosen, and no dial under it
  await expect(languages(page)).toBeVisible();
  const box = await languages(page).boundingBox();
  const search = await page.getByRole('searchbox', { name: 'Search settings' }).boundingBox();
  expect(box!.y).toBeGreaterThan(search!.y);
  expect(box!.y).toBeLessThan(340);
  await expect(languages(page).getByRole('button')).toHaveText(['English only', 'Greek', 'Hebrew', 'Greek and Hebrew']);
  await expect(choose(page, 'English only')).toHaveAttribute('aria-pressed', 'true');
  for (const name of ['English only', 'Greek', 'Hebrew', 'Greek and Hebrew']) expect((await choose(page, name).boundingBox())!.height).toBeGreaterThanOrEqual(47.5);
  await expect(dial(page)).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'How much Hebrew?', exact: true })).toHaveCount(0);
  await shot(page, 'greek-dial-0');

  // the groups: no Greek page
  await expect(groupButtons(page)).toHaveCount(6);
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Learning/ })).toHaveCount(0);
  // every page of Settings, walked: nothing Greek on any of them
  for (const group of ['Reading', 'The tutor', 'Listening', 'Daily', 'Study resources', 'Account']) {
    expect(await pageText(page, group), group).not.toMatch(GREEK_WORDS);
  }
  // the search finds Which languages? for a Greek word, and no Greek setting
  await page.getByRole('searchbox', { name: 'Search settings' }).fill('weave');
  await expect(page.locator('[data-found="languages"]')).toHaveText(/Which languages\?/);
  await expect(page.locator('[data-found="weave"]')).toHaveCount(0);
});

test('each step up brings in what it says, from Curious to All in', async ({ page }) => {
  await openReader(page);

  // choosing Greek puts the dial at Curious
  await openSettings(page);
  await choose(page, 'Greek').click();
  await expect(step(page, 'Curious')).toHaveAttribute('aria-pressed', 'true');
  await expect(dial(page).locator('[data-step]')).toHaveCount(5);
  await leaveSettings(page);

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
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Learning/ })).toHaveCount(0);
  await leaveSettings(page);

  // 2 Dipping a toe: the Weave, with its Order and Grammar
  await setStep(page, 'Dipping a toe');
  await openSettings(page);
  await openGroup(page, 'Reading');
  await expect(page.getByRole('heading', { name: 'Weave', exact: true, level: 2 })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Weave', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Learning/ })).toHaveCount(0);
  await leaveSettings(page);
  await expect(language(page).getByRole('button')).toHaveText(['English', 'Weave', 'Greek']);

  // 3 Learning: the daily path
  await setStep(page, 'Learning');
  await openSettings(page);
  await openGroup(page, 'Learning');
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
  await openGroup(page, 'Learning');
  await expect(page.getByRole('group', { name: 'Goal', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  expect(await pageText(page, 'Account')).not.toMatch(/Paradigms/);
  await leaveSettings(page);

  // 5 All in: everything Greek, the paradigms included (Hebrew in the tutor is the Hebrew dial's, from Curious up)
  await setStep(page, 'All in');
  await openSettings(page);
  expect(await pageText(page, 'Account')).toMatch(/Paradigms/);
  expect(await pageText(page, 'Learning')).not.toMatch(/Hebrew in the tutor/);
  await shot(page, 'greek-dial-5');
});

test('down and up again gives him back his own values', async ({ page }) => {
  await openReader(page);
  await setStep(page, 'Learning');
  await openSettings(page);
  await openGroup(page, 'Learning');
  await page.getByRole('group', { name: 'New words a day', exact: true }).getByRole('button', { name: '10', exact: true }).click();
  await expect(page.getByRole('group', { name: 'New words a day', exact: true }).getByRole('button', { name: '10', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();

  await choose(page, 'English only').click();
  await expect(choose(page, 'English only')).toHaveAttribute('aria-pressed', 'true');
  await expect(dial(page)).toHaveCount(0);
  await expect(page.getByRole('list', { name: 'Settings groups' }).getByRole('button', { name: /^Learning/ })).toHaveCount(0);
  await choose(page, 'Greek').click();
  await expect(step(page, 'Learning')).toHaveAttribute('aria-pressed', 'true');
  await openGroup(page, 'Learning');
  await expect(page.getByRole('group', { name: 'New words a day', exact: true }).getByRole('button', { name: '10', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await shot(page, 'greek-dial-restored');
});
