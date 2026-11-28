// tests/e2e/play-double-tap.spec.ts — a quick second tap on Play (mw-ar5k42b.27). A tap that starts a reading brings the speaking bar into the page (src/speech/SpeakingBarSlot.tsx),
// and the page is laid out again for it: in the Verse view a Stop stands in the foot where Play was; in the Reader the header's Play leaves, the English | Greek switch slides into
// its place and the chapter's name grows; in a sheet the bar pushes the text up. The second tap of a thumb's double tap, at the same point, then landed on what the first one put
// there: it stopped the reading (nothing heard), turned the Reader to Greek, or opened 'Choose a book' over the reading.
// At 390x844 with a touch screen and the settle moment as on his phone (lampas.settleMs is put back from openUnlocked's 0), John 2 in English is read by the recording (a stub: a WAV
// of silence and timings of 4 s a verse) and by the phone voice (the package's honest speech fake), and each Play is tapped twice (tapTwice, tests/support/gesture.ts, on the page's
// clock). Right: the reading goes on, the speaking bar is up, the recording's element is playing a second later, and nothing else on the page acted.
// The sweep (the story's second criterion): every Play that swaps the page into the speaking bar: the Verse view's 'Play verse 5' and 'Play again' (BarSlot level 2), the Reader
// header's 'Read from the top' and a verse's own 'Hear the verse' (level 1), a screen's 'Read aloud' at the shell's foot (level 0) and the Talk sheet's 'Read aloud' (level 3), by
// the recording's bar (RecordedBar) and by voice-kit's SpeakingBar alike. (The header's button is named 'Read from here' only while a verse is selected, which is while its Verse
// view covers the header: it is the same button and cannot be tapped then.)
import { expect, test, type Locator, type Page } from '@playwright/test';
import { honestSpeech, isSpeaking, spoken } from '../support/honest-fakes';
import { makeFakePostern } from '../support/fake-postern';
import { routePostern } from '../support/playwright-postern';
import { pageTime, tapTwice } from '../support/gesture';
import { openTutor } from './open-tutor';
import { shot } from './shot';
import { talkField } from './talk-field';
import { openUnlocked } from './unlocked';
import { openVerseView } from './verse-view';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

// tapTwice times the two taps, and the guard its moment, on the page's clock, so it is installed before the page opens.
test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

const VERSES = 25;
const EACH = 4;
const TITLE = 0.5;
const AUDIO = 'https://openbible.com/audio/test/jhn-2.wav';
const DURATION = TITLE + VERSES * EACH + 0.5;
/** The second of the recording verse `n` starts at. */
const startOf = (n: number): number => TITLE + (n - 1) * EACH;

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
    '2': {
      audio: AUDIO,
      duration: DURATION,
      verses: Array.from({ length: VERSES }, (_, i) => [i + 1, startOf(i + 1), startOf(i + 2)]),
    },
  },
};

/** Serves the stub timings and the WAV, with a file server's byte ranges (the element seeks to a verse's second); any other request to openbible.com is failed. */
async function stubRecording(page: Page): Promise<void> {
  await page.route('**/data/audio/msb-david/index.json', (route) => route.fulfill({ json: { v: 1, edition: 'msb-david', voice: 'David', books: { jhn: [2] } } }));
  await page.route('**/data/audio/msb-david/jhn.json', (route) => route.fulfill({ json: timings }));
  const wav = silence(DURATION);
  await page.route(/^https?:\/\/([a-z0-9-]+\.)*openbible\.com\//, (route) => {
    if (route.request().url() !== AUDIO) return route.abort('failed');
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers()['range'] ?? '');
    if (!range) return route.fulfill({ status: 200, contentType: 'audio/wav', headers: { 'accept-ranges': 'bytes' }, body: wav });
    const from = Number(range[1]);
    const to = range[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    return route.fulfill({ status: 206, contentType: 'audio/wav', headers: { 'accept-ranges': 'bytes', 'content-range': `bytes ${from}-${to}/${wav.length}` }, body: wav.subarray(from, to + 1) });
  });
}

/** Keeps the element the app plays the recording on as window.lampasAudio (the app makes it with new Audio(), outside the page's tree). */
async function watchAudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { lampasAudio?: HTMLMediaElement };
    const { play } = HTMLMediaElement.prototype;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      w.lampasAudio = this;
      return play.call(this);
    };
  });
}

/** The recording's element now: whether it is paused and the second it is at; null before the first play(). */
const audioNow = (page: Page): Promise<{ paused: boolean; at: number } | null> =>
  page.evaluate(() => {
    const a = (window as unknown as { lampasAudio?: HTMLMediaElement }).lampasAudio;
    return a ? { paused: a.paused, at: a.currentTime } : null;
  });

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

/** A licensed phone with the settle moment as on his phone (openUnlocked's 0 put back by an init script that runs after it: unset, the moment is SETTLE_MS), John 2 opened
 * at `address` (English, nothing woven, unless it says otherwise). */
async function openJohn2(page: Page, voice: Voice, address = 'view=english&weave=off'): Promise<void> {
  await openUnlocked(page);
  await page.addInitScript(() => window.localStorage.removeItem('lampas.settleMs'));
  // slow enough that a verse is still being read a second after its Play
  await honestSpeech(page, { msPerWord: 400 });
  await watchAudio(page);
  await stubRecording(page);
  await page.goto('/');
  await keep(page, 'bibleVoice', voice === 'phone' ? 'phone' : 'msb-david');
  const loaded = voice === 'recording' ? page.waitForResponse((r) => r.url().endsWith('/data/audio/msb-david/jhn.json')) : Promise.resolve(null);
  await page.goto(`/#/?b=jhn&c=2&${address}`);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'John 2', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();
  // the real settle is on: the moment of the page's own opening has to pass
  await pageTime(page, 2000);
  // the Reader loads the book's timings as the chapter opens, so the tap finds them with no wait (the page's resource timing is not kept under its faked clock: the answer is waited for)
  if (voice === 'recording') await loaded.then(() => pageTime(page, 500));
}

const bar = (page: Page) => page.getByRole('region', { name: 'Speaking', exact: true });
const barIn = (page: Page, level: number) => page.locator(`[data-speaking-slot="${level}"] [data-testid="speaking-bar"]`);
const hashOf = (page: Page): Promise<string> => page.evaluate(() => window.location.hash);

/** A second after the taps the reading is still going: the bar is up in the slot of `level` and says it plays; the recording's element is not paused and has played a second on
 * from `from` (the recording's own clock, so a loaded host cannot shorten the second); the phone voice is speaking after a second of the page's clock. */
async function playsOn(page: Page, voice: Voice, level: number, from: number): Promise<void> {
  if (voice === 'recording') {
    await expect
      .poll(async () => {
        const now = await audioNow(page);
        return now !== null && !now.paused && now.at >= from + 1;
      }, 'the recording is playing a second after the taps')
      .toBe(true);
  } else {
    await pageTime(page, 1000);
    expect(await isSpeaking(page), 'the phone voice is speaking a second after the taps').toBe(true);
  }
  await expect(barIn(page, level)).toHaveCount(1);
  await expect(barIn(page, level)).toHaveAttribute('data-state', 'playing');
}

/** The Verse view of John 2:5 on Listen, its opening moment (600 ms, src/VerseView.tsx) passed. */
async function listenAtVerse5(page: Page): Promise<Locator> {
  const view = await openVerseView(page, 5);
  await pageTime(page, 2000);
  await view.getByRole('button', { name: 'Listen', exact: true }).click();
  await pageTime(page, 1000);
  return view;
}

for (const gap of [150, 60, 300]) {
  test(`the Verse view, John 2:5 read by the recording (David): 'Play verse 5' tapped twice ${gap} ms apart plays on, the speaking bar up and the recording playing a second later`, async ({ page }) => {
    await openJohn2(page, 'recording');
    const view = await listenAtVerse5(page);
    await tapTwice(page, view.getByRole('button', { name: 'Play verse 5', exact: true }), gap, { touch: true });
    await playsOn(page, 'recording', 2, startOf(5));
    // the foot never went back to Play: the second tap did not stop it
    await expect(view.locator('[data-listen-stop]')).toBeVisible();
    await expect(view.getByRole('button', { name: 'Play verse 5', exact: true })).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    if (gap === 150) await shot(page, 'play-double-tap');
  });
}

test("the Verse view, John 2:5 read by the phone voice: 'Play verse 5' tapped twice 150 ms apart plays on", async ({ page }) => {
  await openJohn2(page, 'phone');
  const view = await listenAtVerse5(page);
  await tapTwice(page, view.getByRole('button', { name: 'Play verse 5', exact: true }), 150, { touch: true });
  await playsOn(page, 'phone', 2, 0);
  await expect(view.locator('[data-listen-stop]')).toBeVisible();
  await expect(view.getByRole('button', { name: 'Play verse 5', exact: true })).toHaveCount(0);
});

test("the Verse view, John 2:5 heard to its end by the recording: 'Play again' tapped twice 150 ms apart plays it again and on", async ({ page }) => {
  await openJohn2(page, 'recording');
  const view = await listenAtVerse5(page);
  await view.getByRole('button', { name: 'Play verse 5', exact: true }).click();
  await expect(barIn(page, 2)).toHaveCount(1);
  // the verse is 4 s of the recording: it ends by itself and the foot offers it again
  const again = view.getByRole('button', { name: 'Play again', exact: true });
  await expect(again).toBeVisible();
  await pageTime(page, 1000);
  await tapTwice(page, again, 150, { touch: true });
  await playsOn(page, 'recording', 2, startOf(5));
  await expect(view.locator('[data-listen-stop]')).toBeVisible();
  await expect(again).toHaveCount(0);
});

/** The Reader of John 2 is as it was but for the reading: no sheet opened (no 'Choose a book'), the address still English with no verse, English still the lit side of the switch. */
async function readerOnlyReads(page: Page, before: string): Promise<void> {
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText('Choose a book')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Language', exact: true }).getByRole('button', { name: 'English', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await hashOf(page), 'the address').toBe(before);
}

for (const [name, voice] of VOICES) {
  for (const gap of [60, 150, 300]) {
    test(`the Reader, John 2 read by ${name}: 'Read from the top' tapped twice ${gap} ms apart reads on in English and opens nothing`, async ({ page }) => {
      await openJohn2(page, voice);
      const before = await hashOf(page);
      await tapTwice(page, page.getByRole('button', { name: 'Read from the top', exact: true }), gap, { touch: true });
      await playsOn(page, voice, 1, 0);
      await expect(page.locator('[data-reading-bar]')).toContainText('Reading verse 1');
      await readerOnlyReads(page, before);
      // the phone voice reads the English text: nothing it was given is Greek
      if (voice === 'phone') expect((await spoken(page)).filter((said) => !said.lang.startsWith('en'))).toEqual([]);
      if (voice === 'recording' && gap === 150) await shot(page, 'play-double-tap-reader');
    });
  }

  test(`the Reader with the Weave on, John 2 read by ${name}: 'Read from the top' tapped twice 150 ms apart reads on and opens nothing`, async ({ page }) => {
    // English | Weave | Greek is wider: the header is laid out another way, and what slides under the thumb is another control
    await openJohn2(page, voice, 'view=english');
    const before = await hashOf(page);
    await tapTwice(page, page.getByRole('button', { name: 'Read from the top', exact: true }), 150, { touch: true });
    await expect(bar(page)).toHaveCount(1);
    await pageTime(page, 1000);
    await expect(bar(page)).toHaveAttribute('data-state', 'playing');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Choose a book')).toHaveCount(0);
    expect(await hashOf(page), 'the address').toBe(before);
  });
}

for (const [name, voice] of VOICES) {
  test(`the Reader, John 2:3 read by ${name}: the verse's own 'Hear the verse' tapped twice 150 ms apart reads the verse on and opens nothing`, async ({ page }) => {
    await openJohn2(page, voice);
    const before = await hashOf(page);
    await tapTwice(page, page.locator('[data-verse="3"]').getByRole('button', { name: 'Hear the verse', exact: true }), 150, { touch: true });
    await playsOn(page, voice, 1, startOf(3));
    await expect(page.locator('[data-reading-bar]')).toContainText('Reading verse 3');
    await readerOnlyReads(page, before);
  });
}

test("a screen's 'Read aloud' (the shell's foot, level 0) tapped twice 150 ms apart by the phone voice reads on and nothing else acts", async ({ page }) => {
  await openUnlocked(page);
  await page.addInitScript(() => window.localStorage.removeItem('lampas.settleMs'));
  await honestSpeech(page, { msPerWord: 400 });
  await page.goto('/#/preface');
  const read = page.getByRole('button', { name: 'Read aloud', exact: true }).first();
  await expect(read).toBeVisible();
  await pageTime(page, 2000);
  const before = await hashOf(page);
  await tapTwice(page, read, 150, { touch: true });
  await playsOn(page, 'phone', 0, 0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await hashOf(page), 'the address').toBe(before);
});

test("the Talk sheet's 'Read aloud' (level 3) tapped twice 150 ms apart by the phone voice reads the answer on and nothing else acts", async ({ page }) => {
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
  const read = sheet.getByRole('button', { name: 'Read aloud', exact: true });
  await expect(read).toBeVisible();
  const before = await hashOf(page);
  await tapTwice(page, read, 150, { touch: true });
  await playsOn(page, 'phone', 3, 0);
  // the sheet is still the one sheet, on the same address
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect(sheet).toBeVisible();
  expect(await hashOf(page), 'the address').toBe(before);
});
