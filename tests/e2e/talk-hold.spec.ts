// tests/e2e/talk-hold.spec.ts — the Talk sheet holds with Postern's component (mw-06ggew.15): the sheet's input is voice-kit's Composer, as in Ask the tutor, with Settings > Talk
// (Tap to talk), the words of a hold that the recogniser drops are kept, in the sheet and on the Talk bar, and anything playing aloud pauses while he holds. The microphone and the
// speech are voice-kit's honest fakes (tests/support/honest-fakes.ts); how a phone really hears is only a phone check (docs/pwa-best-practices.md section 12).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { makeFakePostern, TALK_ANSWER } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { honestMic, honestSpeech, isSpeaking } from '../support/honest-fakes';
import { leaveSettings, openGroup } from './settings-group';
import { shot } from './shot';
import { talkField } from './talk-field';
import { openUnlocked } from './unlocked';
import { openTalkAbout } from './verse-view';

const VIEWPORT = { width: 390, height: 844 };
// the honest microphone's clip ("Please read me the first chapter"): its words come one by one as interim results while the bar is held

/** The recogniser fails under the hold, the way a phone takes the microphone from it (audio-capture). */
const dropRecogniser = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const recognitions = (window as unknown as { __bsvKitTesting: { mic: { recognitions: { onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null }[] } } }).__bsvKitTesting.mic.recognitions;
    const held = recognitions[recognitions.length - 1];
    held.onerror?.({ error: 'audio-capture' });
    held.onend?.();
  });

async function prepare(page: Page) {
  await page.setViewportSize(VIEWPORT);
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
  await routePostern(page, fake);
  return fake;
}

async function press(page: Page, target: Locator): Promise<void> {
  const box = await target.boundingBox();
  if (!box) throw new Error('nothing to press');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
}

test("the Talk sheet's input is the kit's Composer, and Settings > Talk > Tap makes it Tap to talk", async ({ page }) => {
  await prepare(page);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/#/settings');
  await openGroup(page, 'The tutor');
  await page.getByRole('group', { name: 'Talk', exact: true }).getByRole('button', { name: 'Tap', exact: true }).click();
  await leaveSettings(page);
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  // one composer, the kit's, with its paperclip and camera, and its bar saying what Talk is set to
  await expect(sheet.getByTestId('composer')).toHaveCount(1);
  await expect(sheet.getByRole('button', { name: 'Tap to talk', exact: true })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Attach a picture' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Take a photo' })).toBeVisible();
  await shot(page, 'talk-hold-tap');
});

test('a hold in the sheet whose recogniser drops after words were heard leaves them in the box, unsent', async ({ page }) => {
  const fake = await prepare(page);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await press(page, sheet.getByRole('button', { name: 'Hold to talk', exact: true }));
  await expect(sheet.getByTestId('live-transcript')).toContainText('Please read');
  await dropRecogniser(page);
  await page.mouse.up();
  const field = await talkField(sheet);
  await expect(field).toHaveValue(/^Please read/);
  await expect(sheet.getByText('Kept what you said: tap Send.')).toBeVisible();
  expect(fake.received).toHaveLength(0);
});

test('a hold of the Talk bar whose recogniser drops after words were heard keeps them in the sheet, unsent', async ({ page }) => {
  const fake = await prepare(page);
  await honestMic(page);
  await openUnlocked(page);
  await page.goto('/');
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  await press(page, page.getByRole('button', { name: 'Talk', exact: true }));
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  await expect(sheet.locator('[data-talk-live]')).toContainText('Please read');
  await dropRecogniser(page);
  await page.mouse.up();
  await expect(await talkField(sheet)).toHaveValue(/^Please read/);
  expect(fake.received).toHaveLength(0);
});

test('pressing Hold to talk while a tutor answer is read aloud pauses it before the recogniser starts', async ({ page }) => {
  await prepare(page);
  await honestSpeech(page, { langs: ['en-US', 'el-GR'], msPerWord: 250 });
  await honestMic(page);
  // whether the voice is speaking at the moment the recogniser is started
  await page.addInitScript(() => {
    const seen: { speaking: boolean; paused: boolean }[] = [];
    (window as unknown as { atStart: typeof seen }).atStart = seen;
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition'] as const) {
      const Recognition = (window as unknown as Record<string, { prototype: { start: (...a: unknown[]) => void } }>)[name];
      const start = Recognition.prototype.start;
      Recognition.prototype.start = function (...args: unknown[]) {
        seen.push({ speaking: window.speechSynthesis.speaking, paused: window.speechSynthesis.paused });
        return start.apply(this, args);
      };
    }
  });
  await openUnlocked(page);
  await page.goto('/');
  await openTalkAbout(page, 28);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8:28' });
  await (await talkField(sheet)).fill('What does this verse mean?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  const speaking = page.getByRole('region', { name: 'Speaking', exact: true });
  await expect(speaking.getByRole('button')).toHaveText(['Pause', 'Restart', 'Stop']);
  expect(await isSpeaking(page)).toBe(true);

  await press(page, sheet.getByRole('button', { name: 'Hold to talk', exact: true }));
  await expect(sheet.getByTestId('live-transcript')).toContainText('Please');
  // the answer is paused, not playing under the microphone
  await expect(speaking.getByRole('button')).toHaveText(['Resume', 'Restart', 'Stop']);
  const atStart = await page.evaluate(() => (window as unknown as { atStart: { speaking: boolean; paused: boolean }[] }).atStart);
  expect(atStart.length).toBeGreaterThan(0);
  // voice-kit's pause stops the voice and keeps the sentence reached (the bar offers Resume): nothing is speaking when the recogniser opens
  expect(atStart.every((seen) => !seen.speaking)).toBe(true);
  expect(await isSpeaking(page)).toBe(false);
  await shot(page, 'talk-hold-answer-paused');
  await page.mouse.up();
});
