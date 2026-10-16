import { expect, test } from '@playwright/test';
import { honestSpeech, spoken, voicesFor } from '../support/honest-fakes';
import { asSpoken } from '../support/lone-word';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

// Settings > Reading voices (mw-5r3p30.357): under the Greek voice picker, the name of the voice in use and a 44 px Test that says πατήρ, then ἀγάπη, as Tap
// to hear says a word; a voice picked there is named at once and kept. The engine is bsv-kit's honest fake (headless Chromium has no Greek voice), whose
// voices are named by their language; how a real voice stresses a word is only a phone check.
test('Settings names the Greek voice in use and Test says πατήρ, then ἀγάπη, at 390x844', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openUnlocked(page);
  await honestSpeech(page, { voices: voicesFor('en-US', 'el-GR', 'el-CY') });
  await page.goto('/#/settings');
  const inUse = page.getByTestId('greek-voice-in-use');
  await inUse.scrollIntoViewIfNeeded();
  await expect(inUse.getByRole('status')).toHaveText('In use: el-GR');

  await page.getByRole('combobox', { name: 'Greek voice' }).selectOption('el-CY');
  await expect(inUse.getByRole('status')).toHaveText('In use: el-CY');

  const test = inUse.getByRole('button', { name: 'Test the Greek voice' });
  const box = await test.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(43.5);
  expect(box?.width).toBeGreaterThanOrEqual(43.5);
  expect(box ? box.x + box.width : 0).toBeLessThanOrEqual(390);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  const before = (await spoken(page)).length;
  await test.click();
  await expect
    .poll(async () => (await spoken(page)).slice(before).map((u) => [u.text, u.lang]))
    .toEqual([
      [asSpoken('πατήρ'), 'el-GR'],
      [asSpoken('ἀγάπη'), 'el-GR'],
    ]);
  await shot(page, 'greek-voice-test');

  await page.reload();
  await page.getByTestId('greek-voice-in-use').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('greek-voice-in-use').getByRole('status')).toHaveText('In use: el-CY');
});
