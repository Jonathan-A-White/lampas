// tests/e2e/recorded-voice.spec.ts — the recorded voice in a real Chromium (mw-82lb97i.3, src/speech/recordedVoice.ts): John 3 in English with timings is read by the one
// audio element, the verse marked as being read moves by itself as the recording plays, and the speaking bar (src/speech/RecordedBar.tsx, the same bar in the same slot
// as voice-kit's: mw-82lb97i.4) holds it: Pause, Resume and Stop by tap. The seam is set before the
// app loads; the timings are a stub giving each of John 3's 36 verses half a second after a half-second title, and the stub's recording is a WAV of silence made here.
// Nothing reaches openbible.com: its one URL is answered here and any other request to it is failed and counted. How the publisher's MP3 sounds on his phone is a phone check.
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

const VERSES = 36;
const EACH = 0.5;
const TITLE = 0.5;
const AUDIO = 'https://openbible.com/audio/test/jhn-3.wav';
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
  wav.writeUInt16LE(1, 20); // PCM
  wav.writeUInt16LE(1, 22); // mono
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate, 28); // bytes a second
  wav.writeUInt16LE(1, 32); // bytes a sample
  wav.writeUInt16LE(8, 34); // bits a sample
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

/** Serves the stub timings and the WAV; fails and counts every other request to openbible.com. Returns the count. */
async function stubRecording(page: Page): Promise<{ reached: string[] }> {
  const counted = { reached: [] as string[] };
  await page.route('**/data/audio/msb-david/index.json', (route) => route.fulfill({ json: { v: 1, edition: 'msb-david', voice: 'David', books: { jhn: [3] } } }));
  await page.route('**/data/audio/msb-david/jhn.json', (route) => route.fulfill({ json: timings }));
  const wav = silence(DURATION);
  await page.route(/^https?:\/\/([a-z0-9-]+\.)*openbible\.com\//, (route) => {
    if (route.request().url() === AUDIO) return route.fulfill({ status: 200, contentType: 'audio/wav', body: wav });
    counted.reached.push(route.request().url());
    return route.abort('failed');
  });
  return counted;
}

const readingBar = (page: Page) => page.locator('[data-reading-bar]');
const header = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const bar = (page: Page) => page.getByRole('region', { name: 'Speaking', exact: true });
const onBar = (page: Page, name: string) => bar(page).getByRole('button', { name, exact: true });

test('Play in John 3 is read by the recording: the speaking bar sits in the Reader\'s foot, Pause holds it, Resume goes on, Stop ends it', async ({ page }) => {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 5 });
  await page.addInitScript(() => window.localStorage.setItem('lampas:bibleVoice', 'msb-david'));
  const network = await stubRecording(page);
  await page.goto('/#/?b=jhn&c=3&view=english&weave=off');
  await expect(page.getByRole('heading', { name: 'John 3', level: 1 })).toBeVisible();
  await expect(page.locator('[data-verse="1"]')).toBeVisible();

  // the Reader loads the book's timings as the chapter opens, so the tap finds them with no wait
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some((e) => e.name.endsWith('/data/audio/msb-david/jhn.json')))).toBe(true);
  await header(page, 'Read from the top').click();
  await expect(readingBar(page)).toContainText('Reading verse 1');
  // by itself, with no tap, as the recording plays
  await expect
    .poll(async () => Number((await readingBar(page).textContent())?.match(/verse (\d+)/)?.[1] ?? 0), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(3);
  await expect(page.locator('[data-reader] [data-verse][data-reading]')).toHaveCount(1);

  // the same bar as the phone voice's, in the Reader's foot slot: whole in the viewport, above the bottom inset, covering no verse text; the header's Pause and Stop are gone
  await expect(bar(page)).toHaveCount(1);
  await expect(page.locator('[data-testid="speaking-bar"]')).toHaveAttribute('data-state', 'playing');
  await expect(bar(page).getByRole('button')).toHaveText(['Pause', 'Restart', 'Stop']);
  // the only Pause and the only Stop on the page are the bar's own
  await expect(header(page, 'Pause')).toHaveCount(1);
  await expect(header(page, 'Stop')).toHaveCount(1);
  await expect(bar(page).getByRole('button', { name: 'Pause', exact: true })).toHaveCount(1);
  await expect(bar(page).getByRole('button', { name: 'Stop', exact: true })).toHaveCount(1);
  const box = await bar(page).boundingBox();
  const main = await page.locator('[data-reader]').boundingBox();
  const slot = await page.locator('[data-speaking-slot="1"]').boundingBox();
  expect(box && main && slot).toBeTruthy();
  if (box && main && slot) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(box.y).toBeGreaterThanOrEqual(0);
    // the slot ends the screen and pads itself with the bar inset (48 px at the least): the bar is above it
    expect(box.y + box.height).toBeLessThanOrEqual(844 - 48 + 0.5);
    expect(box.y).toBeGreaterThanOrEqual(slot.y - 0.5);
    // under the reading box, in flow: no verse is covered
    expect(main.y + main.height).toBeLessThanOrEqual(box.y + 1);
  }
  for (const name of ['Pause', 'Restart', 'Stop']) {
    const b = await onBar(page, name).boundingBox();
    expect(b?.height).toBeGreaterThanOrEqual(43.5);
    expect(b?.width).toBeGreaterThanOrEqual(43.5);
  }
  // each verse's part inside the reading box (the box scrolls, so a verse may run past it): none touches the bar
  const verses = await page.locator('[data-reader] [data-verse]').evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as { top: number; bottom: number; left: number; right: number }));
  const covered = verses.filter((r) => {
    if (!box || !main) return false;
    const top = Math.max(r.top, main.y);
    const bottom = Math.min(r.bottom, main.y + main.height);
    return bottom > top && bottom > box.y + 1 && top < box.y + box.height - 1 && r.right > box.x && r.left < box.x + box.width;
  });
  expect(covered).toEqual([]);
  await shot(page, 'recorded-voice-bar');

  await onBar(page, 'Pause').click();
  await expect(readingBar(page)).toContainText('Paused at verse');
  const pausedAt = await readingBar(page).textContent();
  // a real-time wait: the recording would have gone on two verses in this second if Pause had not held it
  await page.waitForTimeout(1000);
  await expect(readingBar(page)).toHaveText(pausedAt ?? '');
  await expect(bar(page).getByRole('button')).toHaveText(['Resume', 'Restart', 'Stop']);
  await expect(page.locator('[data-testid="speaking-bar"]')).toHaveCount(1);

  await onBar(page, 'Resume').click();
  const from = Number(pausedAt?.match(/verse (\d+)/)?.[1] ?? 0);
  await expect
    .poll(async () => Number((await readingBar(page).textContent())?.match(/Reading verse (\d+)/)?.[1] ?? 0), { timeout: 15_000 })
    .toBeGreaterThan(from);

  await onBar(page, 'Stop').click();
  await expect(bar(page)).toHaveCount(0);
  await expect(readingBar(page)).toHaveCount(0);
  await expect(header(page, 'Read from the top')).toBeVisible();

  expect(await spoken(page)).toEqual([]);
  expect(network.reached).toEqual([]);
  await shot(page, 'recorded-voice');
});
