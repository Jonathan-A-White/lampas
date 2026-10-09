// A Hebrew word in the tutor's answer is tappable (mw-5r3p30.98) at phone width: with a he-IL voice a tap speaks it with lang he-IL and opens the
// guide; with none the line 'No Hebrew voice on this phone' shows and nothing is spoken. The engine is a stand-in that records what the page asks
// of it (headless Chromium has no Hebrew voice); how a real voice sounds is only a phone check.
import { expect, test, type Page } from '@playwright/test';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { shot } from './shot';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };
const ANSWER = { answer: "Paul's word for righteousness echoes the Hebrew צֶדֶק (tsedeq), which is about being in the right before God.", words: [] };
const SOUND = { answer: 'Say it TSE-dek, the stress on the first part.', words: [], syllables: ['צֶ', 'דֶק'], transliteration: ['TSE', 'dek'] };

async function fakeSpeech(page: Page, langs: string[]) {
  await page.addInitScript((voiceLangs) => {
    const spoken: { text: string; lang: string }[] = [];
    const synth = {
      speaking: false,
      pending: false,
      getVoices: () => voiceLangs.map((lang) => ({ lang, name: lang, voiceURI: lang })),
      addEventListener: () => {},
      removeEventListener: () => {},
      resume: () => {},
      cancel: () => {
        synth.speaking = false;
      },
      speak: (u: { text: string; lang: string }) => {
        spoken.push({ text: u.text, lang: u.lang });
        synth.speaking = true;
      },
    };
    class Utterance {
      lang = '';
      rate = 1;
      voice = null;
      text: string;
      constructor(text: string) {
        this.text = text;
      }
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
    (window as unknown as { __spoken: typeof spoken }).__spoken = spoken;
  }, langs);
}

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: { text: string; lang: string }[] }).__spoken);

async function askAbout(page: Page, reply: object) {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: reply as never };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await sheet.getByRole('textbox', { name: 'Your message' }).fill('Where does righteousness come from?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(sheet.locator('[data-turn] [lang="he"]')).toHaveCount(1);
  return { sheet, fake };
}

test('tapping a Hebrew word speaks it with lang he-IL and opens the guide, a thumb-sized target', async ({ page }) => {
  await fakeSpeech(page, ['en-US', 'el-GR', 'he-IL']);
  const { sheet, fake } = await askAbout(page, ANSWER);
  const word = sheet.locator('[data-turn] button:has([lang="he"])');
  const box = await word.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  // the answer itself is read aloud when it arrives: only what the tap adds counts
  const before = (await spoken(page)).length;
  await word.click();
  expect((await spoken(page)).slice(before)).toEqual([{ text: 'צֶדֶק', lang: 'he-IL' }]);
  const guide = page.getByRole('dialog', { name: 'How to say it' });
  await expect(guide).toBeVisible();
  await expect(guide.locator('[lang="he"]')).toHaveText('צֶדֶק');
  await shot(page, 'hebrew-guide');

  // the guide asks the tutor and the answer carries the syllables over their sounds
  fake.autoReply = { status: 'answered', answer: SOUND };
  await guide.getByRole('button', { name: 'Syllables and sounds' }).click();
  await expect(guide).toBeHidden();
  const card = sheet.locator('[data-hebrew-guide]');
  await expect(card.locator('[data-syllable]')).toHaveCount(2);
  await expect(card.locator('[data-sound]')).toHaveText(['TSE', 'dek']);
  const syllable = card.getByRole('button', { name: 'Hear דֶק' });
  expect((await syllable.boundingBox())?.height).toBeGreaterThanOrEqual(43.5);
  await syllable.click();
  expect((await spoken(page)).at(-1)).toEqual({ text: 'דֶק', lang: 'he-IL' });
  await shot(page, 'hebrew-guide-sounds');
});

test('with no Hebrew voice the tap says so and speaks nothing', async ({ page }) => {
  await fakeSpeech(page, ['en-US', 'el-GR']);
  const { sheet } = await askAbout(page, ANSWER);
  const before = (await spoken(page)).length;
  await sheet.locator('[data-turn] button:has([lang="he"])').click();
  await expect(page.getByText('No Hebrew voice on this phone')).toBeVisible();
  expect((await spoken(page)).slice(before)).toEqual([]);
  await shot(page, 'hebrew-no-voice');
});
