// The Study resources follow the 'How much Greek?' dial (mw-5r3p30.710, PROVISIONAL): every resource is marked Greek or English (src/resources/types.ts lang),
// and Settings > Study resources, the word sheet's look-ups and the tutor's links all go through one selector (src/resources/resourcesForLevel.ts). At Just English the
// Greek ones (Strong's, the Black grammar) are hidden; between, the English ones and the apps that open both (Logos) come first; at All in nothing changes.
// A resource the dial hides keeps its switch. At 390x844, from a phone placed at All in (the config's storage state).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { leaveSettings, openGroup } from './settings-group';
import { talkField } from './talk-field';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

test.use({ viewport: { width: 390, height: 844 } });

/** Headless Chromium stops at a link to an app scheme (an unanswered prompt eats the clicks that follow); the tap itself still reaches the page. */
const holdAppLinks = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.addEventListener('click', (e) => {
      const link = (e.target as Element).closest('a');
      if (link && !/^https?:/.test(link.href)) e.preventDefault();
    }, true);
  });
};

const openReader = async (page: Page): Promise<void> => {
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
};

/** From the Reader: Settings, the dial moved to `name` (Just English is "English only" of Which languages?, never a button of the dial; any other step brings the dial back with "Greek"), back to the Reader. */
async function setStep(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const languages = page.getByRole('group', { name: 'Which languages?', exact: true });
  if (name === 'Just English') {
    await languages.getByRole('button', { name: 'English only', exact: true }).click();
    await expect(languages.getByRole('button', { name: 'English only', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    return;
  }
  const dial = page.getByRole('group', { name: 'How much Greek?', exact: true });
  if ((await dial.count()) === 0) await languages.getByRole('button', { name: 'Greek', exact: true }).click();
  await dial.getByRole('button', { name, exact: true }).click();
  await expect(dial.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '‹ Reader', exact: true }).click();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
}

const studySection = async (page: Page): Promise<Locator> => {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await openGroup(page, 'Study resources');
  const section = page.getByRole('region', { name: 'Study resources' });
  await section.scrollIntoViewIfNeeded();
  return section;
};

/** The names of the resource switches the section draws, in the order drawn. */
const resourceSwitches = async (section: Locator): Promise<string[]> => {
  const names = await section.getByRole('switch').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
  return names.filter((n) => ["Strong's", 'Logos'].includes(n));
};

test('Just English lists no Greek resource in Study resources, and no book at any step, and a switch he made comes back with the dial', async ({ page }) => {
  await openUnlocked(page);
  await holdAppLinks(page);
  await openReader(page);
  // at All in the list is as it was: Strong's, Logos; the library door is on the Settings home, not here
  let section = await studySection(page);
  expect(await resourceSwitches(section)).toEqual(["Strong's", 'Logos']);
  await section.getByRole('switch', { name: "Strong's", exact: true }).click();
  await expect(section.getByRole('switch', { name: "Strong's", exact: true })).toHaveAttribute('aria-checked', 'true');
  await section.getByRole('switch', { name: 'Logos', exact: true }).click();
  await expect(section.getByRole('button', { name: /^Your Logos library/ })).toHaveCount(0);
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Your Logos library · \d+ books on$/ })).toBeVisible();
  await leaveSettings(page);

  await setStep(page, 'Just English');
  section = await studySection(page);
  expect(await resourceSwitches(section)).toEqual(['Logos']);
  await expect(section.getByRole('switch', { name: "Strong's", exact: true })).toHaveCount(0);
  // Logos is On: no book is listed in Settings, Greek or English (the books are Your Logos library's, whose door is on the home)
  await expect(section.getByRole('button', { name: /^Your Logos library/ })).toHaveCount(0);
  await expect(section.getByRole('checkbox')).toHaveCount(0);
  await section.getByRole('switch', { name: 'Logos', exact: true }).scrollIntoViewIfNeeded();
  await shot(page, 'study-resources-just-english');
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await leaveSettings(page);

  // back at All in the Greek ones return as he left them
  await setStep(page, 'All in');
  section = await studySection(page);
  expect(await resourceSwitches(section)).toEqual(["Strong's", 'Logos']);
  await expect(section.getByRole('switch', { name: "Strong's", exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(section.getByRole('button', { name: /^Your Logos library/ })).toHaveCount(0);
});

test('at a step between, the English resources come before the Greek in Study resources', async ({ page }) => {
  await openUnlocked(page);
  await holdAppLinks(page);
  await openReader(page);
  await setStep(page, 'Dipping a toe');
  const section = await studySection(page);
  expect(await resourceSwitches(section)).toEqual(['Logos', "Strong's"]);
  await section.getByRole('switch', { name: "Strong's", exact: true }).scrollIntoViewIfNeeded();
  await shot(page, 'study-resources-dipping-a-toe');
});

test("the word sheet's Study links put Logos before Strong's at a step between", async ({ page }) => {
  await openUnlocked(page);
  await holdAppLinks(page);
  await openReader(page);
  let section = await studySection(page);
  await section.getByRole('switch', { name: "Strong's", exact: true }).click();
  await section.getByRole('switch', { name: 'Logos', exact: true }).click();
  await expect(section.getByRole('switch', { name: 'Logos', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await leaveSettings(page);

  const linkNames = async (): Promise<string[]> => {
    await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
    const study = page.getByRole('dialog', { name: 'Word', exact: true }).getByRole('group', { name: 'Study', exact: true });
    await expect(study.getByRole('link', { name: 'G4903', exact: true })).toBeVisible();
    const names = await study.getByRole('link').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? el.textContent ?? ''));
    await page.getByRole('dialog', { name: 'Word', exact: true }).getByRole('button', { name: 'Done' }).click();
    return names;
  };
  // All in: as before, Strong's first
  const allIn = await linkNames();
  expect(allIn.indexOf('G4903')).toBeLessThan(allIn.findIndex((n) => n.startsWith('Open in Logos')));
  await setStep(page, 'Curious');
  const curious = await linkNames();
  expect(curious.findIndex((n) => n.startsWith('Open in Logos'))).toBeLessThan(curious.indexOf('G4903'));
  expect(curious).toContain('G4903');
  await shot(page, 'word-sheet-study-curious');
  section = await studySection(page);
  await expect(section.getByRole('switch', { name: "Strong's", exact: true })).toHaveAttribute('aria-checked', 'true');
});

test("the tutor's links leave out Strong's at Just English, and put Logos first at a step between", async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = {
    status: 'answered',
    answer: { answer: 'Love, ἀγάπη, is the thread of the chapter.', words: [], links: [{ kind: 'word', lemma: 'ἀγάπη' }] },
  };
  await routePostern(page, fake);
  await openUnlocked(page);
  await holdAppLinks(page);
  await openReader(page);
  const section = await studySection(page);
  await section.getByRole('switch', { name: "Strong's", exact: true }).click();
  await section.getByRole('switch', { name: 'Logos', exact: true }).click();
  await expect(section.getByRole('switch', { name: 'Logos', exact: true })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('button', { name: '‹ Settings', exact: true }).click();
  await leaveSettings(page);

  const ask = async (): Promise<string[]> => {
    await openTalkAbout(page, 28);
    const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
    await (await talkField(sheet)).fill('Where does love come back?');
    await sheet.getByRole('button', { name: 'Send', exact: true }).click();
    const links = sheet.locator('[data-tutor-links]');
    await expect(links).toBeVisible();
    const names = await links.getByRole('link').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label') ?? ''));
    await shot(page, 'tutor-links-dial');
    await sheet.getByRole('button', { name: 'Done', exact: true }).click();
    await expect(sheet).toBeHidden();
    await page.goto('/#/');
    await page.reload();
    await expect(page.locator('[data-verse="1"]')).toBeVisible();
    return names;
  };

  await setStep(page, 'Dipping a toe');
  const between = await ask();
  expect(between).toEqual(['Open in Logos: BDAG for ἀγάπη', 'G26 for ἀγάπη']);

  await setStep(page, 'Just English');
  const justEnglish = await ask();
  expect(justEnglish).toEqual(['Open in Logos: BDAG for ἀγάπη']);
});
