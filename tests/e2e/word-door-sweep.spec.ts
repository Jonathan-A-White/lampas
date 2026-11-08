// tests/e2e/word-door-sweep.spec.ts — the sweep of mw-fnvjof.17.34: every door on a word sheet reaches the tutor holding the word that was tapped. The word sheet's doors are the floating ? (src/tutor/door.ts, the one door since
// mw-5r3p30.882: a two-finger tap opens nothing and the sheet has no Ask of its own, both proved in open-tutor.spec.ts, tutor-door-overlays.spec.ts and word-tip.spec.ts), so the sweep taps it over a Greek word's sheet (the Greek
// view) and over an English word's sheet (the default view, where mw-5r3p30.1121 made the English word the thing asked about) and reads what the tutor was sent: the first message and input.focus.
import { expect, test, type Page } from '@playwright/test';
import { GRAMMAR_HELP_ANSWER, makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { openTutor } from './open-tutor';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 } });

async function openReader(page: Page) {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_HELP_ANSWER };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  return fake;
}

const sent = (fake: ReturnType<typeof makeFakePostern>) => fake.received.filter((g) => g.grist.kind === 'bible-talk')[0]?.input as { question: string; focus?: unknown };

test('the floating ? over a Greek word\'s sheet sends the Greek word as tapped: its question and its focus', async ({ page }) => {
  const fake = await openReader(page);
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'συνεργεῖ', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  const talk = await openTutor(page);
  await expect(talk).toHaveAccessibleName('Talk about Romans 8:28');
  await expect(talk).toContainText('Tell me about the word συνεργεῖ (lemma συνεργέω');
  await expect.poll(() => sent(fake)).toBeTruthy();
  expect(sent(fake).question).toContain('Tell me about the word συνεργεῖ (lemma συνεργέω');
  expect(sent(fake).focus).toEqual({ form: 'συνεργεῖ', lemma: 'συνεργέω', parse: 'verb, present active indicative, 3rd person singular', kind: 'word' });
});

test('the floating ? over an English word\'s sheet sends the English word as tapped, the Greek word paired with it and its verse; the English word has no focus of its own', async ({ page }) => {
  const fake = await openReader(page);
  await page.locator('[data-verse="28"]').getByRole('button', { name: 'work together', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Word', exact: true })).toBeVisible();
  const talk = await openTutor(page);
  await expect(talk).toHaveAccessibleName('Talk about Romans 8:28');
  await expect.poll(() => sent(fake)).toBeTruthy();
  const { question, focus } = sent(fake);
  expect(question).toContain('I tapped the English word “together” (in the English “work together”) in Romans 8:28, on the English side of the text.');
  expect(question).toContain('paired with the Greek συνεργεῖ (lemma συνεργέω');
  // by design (src/reader/useReaderTutor.ts askAboutEnglishWord): the question names the word; there is no Greek form to focus on
  expect(focus).toBeUndefined();
});
