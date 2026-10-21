import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern, READING_ANSWER, TALK_ANSWER } from '../support/fake-postern';
import { honestMic } from '../support/honest-fakes';
import { holdFor } from '../support/hold';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { chooseAction } from './verse-view';
import { talkField } from './talk-field';

// Lampas under TalkBack (mw-cwf538.3, the epic 'Lampas for every age and every ability'): a Greek span is read by a Greek voice, the tutor's
// answers, a grading result and the Read-it-aloud marks are announced once through one polite live region, and focus goes into a sheet when it
// opens and back to what opened it when it closes. Android's text to speech has a Greek voice under 'el', not under 'grc' (the ancient-Greek
// meaning stays in data-lang="grc"), so a Greek span is lang="el".
test.use({ viewport: { width: 390, height: 844 } });

/** The texts the page's one live region took, in order: a change that is not a new announcement would add one. */
async function watchLive(page: Page): Promise<void> {
  // the app draws once the phone is placed on the Greek dial (src/main.tsx), which can be just after the page's load
  await page.locator('[data-live-region]').waitFor({ state: 'attached' });
  await page.evaluate(() => {
    const region = document.querySelector('[data-live-region]');
    if (!region) throw new Error('no live region on the page');
    const heard: string[] = [];
    (window as unknown as { heard: string[] }).heard = heard;
    new MutationObserver(() => heard.push((region.textContent ?? '').trim())).observe(region, { subtree: true, childList: true, characterData: true });
  });
}
const heard = (page: Page): Promise<string[]> => page.evaluate(() => (window as unknown as { heard: string[] }).heard);

/** Makes every part of the page draw again without a word of it changing: the phone turns dark and the window is a little shorter, then back. */
async function redraw(page: Page): Promise<void> {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.setViewportSize({ width: 390, height: 800 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'light' });
}

test('a Greek span is lang el with data-lang grc, an English span has no lang', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/?b=rom&c=8&view=greek');
  const verse = page.locator('[data-verse="1"]');
  await expect(verse).toBeVisible();
  // the Greek text is read by a Greek voice, and its words, which carry no language of their own, are inside it
  await expect(verse).toHaveAttribute('lang', 'el');
  await expect(verse).toHaveAttribute('data-lang', 'grc');
  expect(await page.locator('[lang="grc"]').count()).toBe(0);
  // the word sheet's Greek
  await verse.locator('[data-word]').first().click();
  const sheet = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(sheet.getByTestId('sheet-word').first()).toHaveAttribute('lang', 'el');
  await expect(sheet.getByTestId('sheet-word').first()).toHaveAttribute('data-lang', 'grc');
  await expect(sheet.getByTestId('sheet-lemma')).toHaveAttribute('lang', 'el');
  expect(await page.locator('[lang="grc"]').count()).toBe(0);
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  // the English text and its chunks have no Greek tag
  await page.goto('/#/?b=rom&c=8&view=english');
  const english = page.locator('[data-verse="1"]');
  await expect(english).toHaveAttribute('lang', 'en');
  expect(await english.getAttribute('data-lang')).toBeNull();
  const chunk = english.locator('[data-chunk]').first();
  await expect(chunk).toBeVisible();
  expect(await chunk.getAttribute('lang')).toBeNull();
  expect(await chunk.getAttribute('data-lang')).toBeNull();
});

test('a tutor answer is announced once through the live region, and not again when the sheet draws again', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Talk', exact: true }).click();
  const sheet = page.getByRole('dialog');
  const live = page.locator('[data-live-region]');
  await expect(live).toHaveAttribute('role', 'status');
  await expect(live).toHaveAttribute('aria-live', 'polite');
  await watchLive(page);
  await (await talkField(sheet)).fill('What does συνεργεῖ mean here?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-turn]')).toContainText('works together');
  await expect(live).toContainText('works together');
  const once = await heard(page);
  expect(once.filter((t) => t.includes('works together'))).toHaveLength(1);
  await (await talkField(sheet)).fill('And what else?');
  await redraw(page);
  expect(await heard(page)).toEqual(once);
});

test('a Quick test grading result is announced once through the live region', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/#/test');
  await expect(page.locator('[data-option]')).toHaveCount(4);
  await watchLive(page);
  await page.locator('[data-option]').first().click();
  await expect(page.getByTestId('feedback')).not.toBeEmpty();
  const said = (await page.getByTestId('feedback').textContent())!.trim();
  await expect.poll(async () => (await heard(page)).filter((t) => t === said)).toHaveLength(1);
  const once = await heard(page);
  await redraw(page);
  expect(await heard(page)).toEqual(once);
});

test('the Read-it-aloud marks are announced once through the live region', async ({ page }) => {
  await page.clock.install();
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: READING_ANSWER };
  await routePostern(page, fake);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await watchLive(page);
  await chooseAction(page, 28, 'Read it aloud');
  await holdFor(page, page.getByRole('button', { name: 'Hold to read verse 28', exact: true }), 1200);
  await expect(page.getByRole('region', { name: 'Reading check' }).locator('[data-fix]')).toHaveText(['together', 'purpose']);
  await expect.poll(async () => (await heard(page)).filter((t) => t.includes('together') && t.includes('purpose')).length).toBe(1);
  const once = await heard(page);
  await redraw(page);
  expect(await heard(page)).toEqual(once);
});

test('a sheet takes focus to its heading when it opens and gives it back to what opened it when it closes', async ({ page }) => {
  await openUnlocked(page);
  await page.goto('/');
  // the word sheet, over the Reader
  const opener = page.locator('[data-verse="2"]').getByRole('button', { name: 'of the', exact: true });
  await opener.click();
  const word = page.getByRole('dialog', { name: 'Word', exact: true });
  await expect(word.getByRole('heading').first()).toBeFocused();
  // the Grammar sheet, over the word sheet
  const genitive = word.getByTestId('sheet-parse').getByRole('button', { name: 'genitive', exact: true });
  await genitive.click();
  const grammar = page.getByRole('dialog', { name: 'Grammar', exact: true });
  await expect(grammar.getByRole('heading', { name: 'genitive', exact: true })).toBeFocused();
  // Back closes only the Grammar sheet, and focus goes back to the term he tapped
  await page.goBack();
  await expect(grammar).toHaveCount(0);
  await expect(genitive).toBeFocused();
  // the idea sheet, over the Grammar sheet
  await genitive.click();
  await grammar.getByRole('button', { name: 'Learn this idea' }).click();
  const idea = page.getByRole('dialog', { name: 'Idea', exact: true });
  await expect(idea.getByRole('heading', { name: 'The genitive case' })).toBeFocused();
  await page.goBack();
  await expect(idea).toHaveCount(0);
  await expect(grammar.getByRole('button', { name: 'Learn this idea' })).toBeFocused();
  // Done on the Grammar sheet closes it and the word sheet under it (mw-5r3p30.514), and focus goes back to the word he tapped
  await grammar.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(grammar).toHaveCount(0);
  await expect(word).toHaveCount(0);
  await expect(opener).toBeFocused();
  // the Talk sheet
  const talk = page.getByRole('button', { name: 'Talk', exact: true });
  await talk.click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { level: 2 }).first()).toBeFocused();
  await sheet.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(talk).toBeFocused();
  await shot(page, 'talkback-reading');
});
