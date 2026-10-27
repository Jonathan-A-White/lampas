// The tutor says a Hebrew word in the Hebrew voice (mw-gdcyf98.27): an Old Testament Bible talk answer with רוּחַ in it is read aloud when it arrives, the Hebrew word
// as an utterance of its own with lang he-IL, in order with the English around it in en-US; a Greek word in the same answer goes to el-GR. The engine is voice-kit's
// honest fake (tests/support/honest-fakes.ts; headless Chromium has no Hebrew voice); how a real voice sounds is only a phone check.
import { expect, test } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { openUnlocked } from './unlocked';
import { talkField } from './talk-field';

test.use({ viewport: { width: 390, height: 844 } });

const ANSWER = { answer: 'The "breeze of the day" is from רוּחַ ruach, which the Greek writes πνεῦμα, and means spirit or wind.', words: [] };

test('an Old Testament answer with a Hebrew word is read with the Hebrew voice for that word, the Greek voice for the Greek', async ({ page }) => {
  await honestSpeech(page, { langs: ['en-US', 'el-GR', 'he-IL'], msPerWord: 20 });
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: ANSWER as never };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/#/?b=gen&c=3');
  await expect(page.locator('[data-verse="8"]')).toBeVisible();
  await page.getByRole('button', { name: 'Ask the tutor about this screen' }).click();
  const sheet = page.getByRole('dialog', { name: 'Talk about Genesis 3' });
  await (await talkField(sheet)).fill('What is the breeze of the day?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-turn] [lang="he"]')).toHaveCount(1);

  await expect.poll(async () => (await spoken(page)).filter((s) => s.lang === 'he-IL').length).toBeGreaterThan(0);
  await expect.poll(async () => (await spoken(page)).filter((s) => s.lang === 'el-GR').length).toBeGreaterThan(0);
  const said = await spoken(page);
  const hebrew = said.filter((s) => s.lang === 'he-IL');
  expect(hebrew.map((s) => s.text.replace(/[֑-ׇ]/g, '')).join(' ')).toContain('רוח');
  expect(said.filter((s) => s.lang === 'en-US').every((s) => !/\p{Script=Hebrew}/u.test(s.text))).toBe(true);
  // in order: the English before the word, the Hebrew word, then the Greek
  const at = (lang: string) => said.findIndex((s) => s.lang === lang);
  expect(at('en-US')).toBeLessThan(at('he-IL'));
  expect(at('he-IL')).toBeLessThan(at('el-GR'));
});
