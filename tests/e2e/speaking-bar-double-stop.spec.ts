// tests/e2e/speaking-bar-double-stop.spec.ts — a quick double tap on the speaking bar's Stop (mw-82lb97i.44). The bar leaves the page at the first tap and what lay under it
// (the text box, growing into its place) is under the thumb for the second: it opened a Word sheet for the word that stood there, or, on the five-button bar, the Reader's place
// line 'John 3 · 0%' and with it the whole chapter in the Verse view. At 390x844 with a touch screen and the settle moment as on his phone (lampas.settleMs is put back
// from openUnlocked's 0), John 3 in English is read by the recording (the stub of tests/e2e/recorded-voice.spec.ts: the same WAV of silence and timings) and by the phone
// voice (the package's honest speech fake), and the bar's Stop is tapped twice 100 ms and 300 ms apart (tapTwice, tests/support/gesture.ts, the page's clock). Right: the bar is
// gone and nothing that lay under it acted: no dialog on the page, the address still without a verse or a passage.
// The sweep (the story's second criterion): the bar is drawn into each BarSlot level (src/speech/SpeakingBarSlot.tsx): the shell's foot (0), the Reader's foot (1), the Verse
// view (2) and the Talk sheet (3); each one's Stop is tapped twice 100 ms apart, by the recording's bar (RecordedBar) and by voice-kit's SpeakingBar alike.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { honestSpeech } from '../support/honest-fakes';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { pageTime, tapTwice } from '../support/gesture';
import { openTutor } from './open-tutor';
import { openSettings, settingsHeading } from './openSettings';
import { shot } from './shot';
import { talkField } from './talk-field';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// tapTwice times the two taps, and the guard its moment, on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const VERSES = 36;
const EACH = 0.5;
const TITLE = 0.5;
const AUDIO = 'https://openbible.com/audio/test/jhn-3.wav';
// long enough that the reading is still going when the taps come: the page's clock runs only as the spec runs it, the recording's by the element's own
const DURATION = TITLE + VERSES * EACH + 0.5;

/** A mono 8-bit WAV of `seconds` of silence at 8000 Hz. */
function silence(seconds: number): Buffer {
  const rate = 8000;
  const samples = Math.ceil(seconds * rate);
  const wav = Buffer.alloc(44 + samples, 0x80);
  wav.write('RIFF', 0, 'ascii');
  wav.writeUInt32LE(36 + samples, 4);
  wav.write('WAVE', 8, 'ascii');
  wav.write('fmt ', 12, 'ascii');
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate, 28);
  wav.writeUInt16LE(1, 32);
  wav.writeUInt16LE(8, 34);
  wav.write('data', 36, 'ascii');
  wav.writeUInt32LE(samples, 40);
  return wav;
}

const timings = {
  v: 1,
  edition: 'msb-david',
  book: 'jhn',
  chapters: {
    '3': {
      audio: AUDIO,
      duration: DURATION,
      verses: Array.from({ length: VERSES }, (_, i) => [i + 1, TITLE + i * EACH, TITLE + (i + 1) * EACH]),
    },
  },
};

/** Serves the stub timings and the WAV of tests/e2e/recorded-voice.spec.ts; any other request to openbible.com is failed. */
async function stubRecording(page: Page): Promise<void> {
  await page.route('**/data/audio/msb-david/index.json', (route) => route.fulfill({ json: { v: 1, edition: 'msb-david', voice: 'David', books: { jhn: [3] } } }));
  await page.route('**/data/audio/msb-david/jhn.json', (route) => route.fulfill({ json: timings }));
  const wav = silence(DURATION);
  await page.route(/^https?:\/\/([a-z0-9-]+\.)*openbible\.com\//, (route) =>
    route.request().url() === AUDIO ? route.fulfill({ status: 200, contentType: 'audio/wav', body: wav }) : route.abort('failed'),
  );
}

/** Puts a setting in the app's store through raw IndexedDB, as the app wrote it (the page has been opened once, so the database exists). */
async function keep(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(
    ([k, v]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: k, value: v });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [key, value],
  );
}

type Voice = 'recording' | 'phone';
const VOICES: Array<[string, Voice]> = [
  ['the recording (David)', 'recording'],
  ['the phone voice', 'phone'],
];

/** A licensed phone with the settle moment as on his phone (openUnlocked's 0 put back by an init script that runs after it: unset, the moment is SETTLE_MS), John 3 in English opened. */
async function openJohn3(page: Page, voice: Voice): Promise<void> {
  await openUnlocked(page);
  await page.addInitScript(() => window.localStorage.removeItem('lampas.settleMs'));
  await honestSpeech(page, { msPerWord: 5 });
  await stubRecording(page);
  await page.goto('/');
  await keep(page, 'bibleVoice', voice === 'phone' ? 'phone' : 'msb-david');
  const timings = voice === 'recording' ? page.waitForResponse((r) => r.url().endsWith('/data/audio/msb-david/jhn.json')) : Promise.resolve(null);
  await page.goto('/#/?b=jhn&c=3&view=english&weave=off');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'John 3', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // the real settle is on: the moment of the page's own opening has to pass (the page's clock runs only as the spec runs it)
  await pageTime(page, 2000);
  // the Reader loads the book's timings as the chapter opens, so the tap finds them with no wait (the page's resource timing is not kept under its faked clock: the answer is waited for)
  if (voice === 'recording') await timings.then(() => pageTime(page, 500));
}

const bar = (page: Page) => page.getByRole('region', { name: 'Speaking', exact: true });
const stop = (page: Page) => bar(page).getByRole('button', { name: 'Stop', exact: true });

const hashOf = (page: Page): Promise<string> => page.evaluate(() => window.location.hash);

/** The Stop of the bar, tapped twice `gap` ms apart by a finger; then the bar is gone and nothing that lay under it acted: no dialog, and the address as it was. */
async function stopTwice(page: Page, gap: number, where: Locator = stop(page)): Promise<void> {
  await expect(where).toBeVisible();
  const before = await hashOf(page);
  await tapTwice(page, where, gap, { touch: true });
  // the page's clock runs on (a moment longer than the settle) so nothing that was only waiting is missed
  await pageTime(page, 1000);
  await expect(bar(page)).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(await hashOf(page), 'the address').toBe(before);
}

/** The Reader's address names no verse and no passage: nothing opened the Verse view. */
async function readerStill(page: Page): Promise<void> {
  await expect(page.getByRole('region', { name: 'Verse view' })).toHaveCount(0);
  expect(await hashOf(page), 'the address').not.toMatch(/[?&](v|p|passage|verse)=/);
}

for (const [name, voice] of VOICES) {
  for (const gap of [100, 300]) {
    test(`John 3 read by ${name}: Stop on the Reader's bar tapped twice ${gap} ms apart stops the reading and opens nothing`, async ({ page }) => {
      await openJohn3(page, voice);
      await page.getByRole('button', { name: 'Read from the top', exact: true }).click();
      await expect(page.locator('[data-reading-bar]')).toContainText('Reading verse 1');
      await expect(page.locator('[data-speaking-slot="1"] [data-testid="speaking-bar"]')).toHaveCount(1);
      await stopTwice(page, gap);
      await readerStill(page);
      await expect(page.getByRole('button', { name: 'Read from the top', exact: true })).toBeVisible();
      await shot(page, `speaking-bar-double-stop-${voice}-${gap}`);
    });
  }
}

// The sweep: the bar at every other BarSlot level, by both bars, Stop tapped twice 100 ms apart.
for (const [name, voice] of VOICES) {
  test(`the shell's foot (level 0), John 3 read by ${name} and the Reader left for Settings: Stop tapped twice 100 ms apart acts on nothing under the bar`, async ({ page }) => {
    await openJohn3(page, voice);
    await page.getByRole('button', { name: 'Read from the top', exact: true }).click();
    await expect(page.locator('[data-reading-bar]')).toContainText('Reading verse 1');
    await openSettings(page);
    await expect(settingsHeading(page)).toBeVisible();
    await pageTime(page, 1000);
    await expect(page.locator('[data-speaking-slot="0"] [data-testid="speaking-bar"]')).toHaveCount(1);
    await stopTwice(page, 100);
    await expect(settingsHeading(page)).toBeVisible();
  });

  test(`the Verse view (level 2), John 3:16 read by ${name}: Stop tapped twice 100 ms apart acts on nothing under the bar`, async ({ page }) => {
    await openJohn3(page, voice);
    const view = await openVerseView(page, 16);
    await pageTime(page, 2000);
    await view.getByRole('button', { name: 'Listen', exact: true }).click();
    await view.getByRole('button', { name: 'Play verse 16', exact: true }).click();
    await expect(page.locator('[data-speaking-slot="2"] [data-testid="speaking-bar"]')).toHaveCount(1);
    await stopTwice(page, 100);
    await expect(view).toBeVisible();
  });
}

test('the Talk sheet (level 3), the tutor’s answer read aloud by the phone voice: Stop tapped twice 100 ms apart acts on nothing under the bar', async ({ page }) => {
  const fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer: 'Greek can be hard to follow at full speed. I can read it a little slower for you, and you can change it back in Settings.', words: [] } };
  await routePostern(page, fake);
  await openUnlocked(page);
  await page.addInitScript(() => window.localStorage.removeItem('lampas.settleMs'));
  await honestSpeech(page, { msPerWord: 400 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
  await pageTime(page, 2000);
  await openTutor(page);
  const sheet = page.getByRole('dialog', { name: 'Talk about Romans 8' });
  // the app-wide guard drops a tap for a moment as the sheet opens and as the field comes out: the page's clock runs through each
  await pageTime(page, 1000);
  const field = await talkField(sheet);
  await pageTime(page, 1000);
  await field.fill('Can the Greek be slower?');
  await sheet.getByRole('button', { name: 'Send', exact: true }).click();
  await pageTime(page, 1000);
  await sheet.getByRole('button', { name: 'Read aloud', exact: true }).click();
  await expect(page.locator('[data-speaking-slot="3"] [data-testid="speaking-bar"]')).toHaveCount(1);
  const before = await hashOf(page);
  await tapTwice(page, stop(page), 100, { touch: true });
  await pageTime(page, 1000);
  await expect(bar(page)).toHaveCount(0);
  // the sheet is still the one sheet, on the same address, and nothing under the bar was acted on (no second sheet)
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(sheet).toBeVisible();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(await hashOf(page), 'the address').toBe(before);
});
