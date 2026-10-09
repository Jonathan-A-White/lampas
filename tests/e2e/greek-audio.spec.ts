import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// The engine is a stand-in that records what the page asks of it (a headless Chromium has no Greek voice);
// whether a real phone's Greek voice sounds right is only a phone check (docs/pwa-best-practices.md section 12).
async function withGreekVoice(page: Page) {
  await openUnlocked(page);
  // a slow reader (2 s a word), so a verse is still being spoken when the spec looks at its button and taps it to stop
  await honestSpeech(page, { langs: ['el-GR'], msPerWord: 2000 });
}


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
  expect(await spoken(page)).toMatchObject([{ text: lemma, lang: 'el-GR' }]);
  await shot(page, 'words-audio');
});

test('each verse has a play button that speaks its Greek in the Greek view, and the tapped-word card has a speaker', async ({ page }) => {
  await withGreekVoice(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await page.getByRole('button', { name: 'Greek', exact: true }).click();
  await expect(page.locator('[data-reader]')).toHaveAttribute('data-view', 'greek');

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
  expect(spokenNow[spokenNow.length - 1]).toMatchObject({ text: 'Οὐδὲν', lang: 'el-GR' });
  await shot(page, 'word-card-audio');
});

test("without a Greek voice a word's speaker still shows and a tap puts one line of help on screen", async ({ page }) => {
  await openUnlocked(page);
  await honestSpeech(page, { langs: ['en-US'] });
  await page.goto('/#/words');
  await page.getByRole('button', { name: 'Hear it', exact: true }).first().click();
  const help = page.getByRole('status');
  await expect(help).toContainText('No Greek voice on this');
  const box = await help.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  await expectFitsPhone(page);
  await shot(page, 'speech-no-voice');
});
