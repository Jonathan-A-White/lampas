import { expect, test, type Page } from '@playwright/test';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The engine is a stand-in that records what the page asks of it (a headless Chromium has no Greek voice);
// whether a real phone's Greek voice sounds right is only a phone check (docs/pwa-best-practices.md section 12).
async function withGreekVoice(page: Page) {
  await openUnlocked(page);
  await page.addInitScript(() => {
    const spoken: { text: string; lang: string }[] = [];
    const synth = {
      speaking: false,
      pending: false,
      getVoices: () => [{ lang: 'el-GR', name: 'Greek' }],
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
  });
}

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: { text: string; lang: string }[] }).__spoken);

async function expectFitsPhone(page: Page) {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
}

test('the Words screen has a speaker beside each lemma that speaks it in Greek', async ({ page }) => {
  await withGreekVoice(page);
  await page.goto('/#/words');
  await expect(page.getByRole('heading', { name: 'Words', level: 1 })).toBeVisible();
  const speakers = page.getByRole('button', { name: 'Hear it', exact: true });
  await expect(speakers).toHaveCount(63);

  const box = await speakers.first().boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(43.5);
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  const row = await page.locator('[data-lemma]').first().boundingBox();
  expect(row?.height).toBeGreaterThanOrEqual(48);
  await expectFitsPhone(page);

  const lemma = await page.locator('[data-lemma]').first().getAttribute('data-lemma');
  await speakers.first().click();
  expect(await spoken(page)).toEqual([{ text: lemma, lang: 'el-GR' }]);
  await shot(page, 'words-audio');
});

test('each verse has a play button that speaks its Greek, and the tapped-word card has a speaker', async ({ page }) => {
  await withGreekVoice(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  const play = page.locator('[data-verse="1"]').getByRole('button', { name: 'Hear the verse' });
  const box = await play.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(43.5);
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  await expectFitsPhone(page);
  await play.click();
  await expect(play).toHaveAttribute('aria-pressed', 'true');
  const [first] = await spoken(page);
  expect(first.lang).toBe('el-GR');
  expect(first.text).toContain('Οὐδὲν ἄρα νῦν κατάκριμα');
  await shot(page, 'verse-audio');

  await play.click();
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  expect(await spoken(page)).toHaveLength(1);

  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await page.locator('[data-verse="1"] [data-word="0"]').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const speaker = dialog.getByRole('button', { name: 'Hear it' });
  const sbox = await speaker.boundingBox();
  expect(sbox?.width).toBeGreaterThanOrEqual(43.5);
  expect(sbox?.height).toBeGreaterThanOrEqual(43.5);
  const done = await dialog.getByRole('button', { name: 'Done' }).boundingBox();
  expect(done && sbox && done.y + done.height <= sbox.y).toBe(true);
  await expectFitsPhone(page);
  await speaker.click();
  const spokenNow = await spoken(page);
  expect(spokenNow[spokenNow.length - 1]).toEqual({ text: 'Οὐδὲν', lang: 'el-GR' });
  await shot(page, 'word-card-audio');
});

test('without a Greek voice the button still shows and a tap puts one line of help on screen', async ({ page }) => {
  await openUnlocked(page);
  await page.addInitScript(() => {
    const synth = {
      speaking: false,
      pending: false,
      getVoices: () => [{ lang: 'en-US', name: 'English' }],
      addEventListener: () => {},
      removeEventListener: () => {},
      resume: () => {},
      cancel: () => {},
      speak: () => {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  });
  await page.goto('/');
  await page.locator('[data-verse="1"]').getByRole('button', { name: 'Hear the verse' }).click();
  const help = page.getByRole('status');
  await expect(help).toContainText('No Greek voice on this');
  const box = await help.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  await expectFitsPhone(page);
  await shot(page, 'speech-no-voice');
});
