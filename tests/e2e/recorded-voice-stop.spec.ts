// tests/e2e/recorded-voice-stop.spec.ts — a single verse read by the recorded voice stops at its end (mw-82lb97i.18): his John 1:50 in David's voice ran on into
// 'Then He declar…' of verse 51. In a real Chromium, with John's real timings (public/data/audio/msb-david/jhn.json) and a SILENT MP3 of each chapter's length made
// here by ffmpeg (192 kbps CBR at 44.1 kHz, as the publisher's), the Verse view's Play of a verse must leave the element paused no more than 50 ms past the verse's
// end. The second the element is at is logged at each pause() (an init script wraps HTMLMediaElement.prototype.pause). Chromium's element moves its second in bursts
// (0.23 s, then 0.46 s, a 266 ms 'timeupdate' apart): the player judges the end by the sound, the second run on by the clock (src/speech/recordedVoice.ts soundAt), so the
// second at the pause may stand short of the end by up to END_SLACK + RUN_ON_MS, never more than 50 ms past it.
// John 1:50 and 3:16 (his check) are played whole; the other verses are moved, once playing, to a second and a half before their end (a seek the end timer is aimed again
// after). LAMPAS_ALL_JOHN=1 runs every verse of John (879, the story's sixth criterion) the same way, a test a chapter; it is outside the gate (a quarter of an hour on
// three workers). Nothing reaches openbible.com: its MP3 addresses are answered here, any other request to it is failed.
// mw-82lb97i.27 (he still heard the first 'th' of verse 51's 'Then'): the element's volume at each pause() is logged too, and a verse's stop must find it 0, the last
// 60 ms before the stop faded to silence (src/speech/recordedVoice.ts FADE). Each test of the LAMPAS_ALL_JOHN run starts on a freshly loaded page, where the first
// verses' stops came late before (John 9:1 +288 ms): its line gives the chapter's least and most ms past the end. Run it as
// `LAMPAS_ALL_JOHN=1 npx playwright test tests/e2e/recorded-voice-stop.spec.ts --project=shots --fully-parallel --workers=3` (without --fully-parallel one worker runs it all).
// What is left (measured 2026-11-12, traced): within two seconds of a seek headless Chromium's element can read slow (0.75 s of the recording a second of the clock) and
// then jump on 0.2 to 0.35 s between two looks 20 ms apart, so a stop that comes that soon after this spec's own seek (1.5 s before the end) can still land past the
// end (John 9:1, 4 of 36 fresh pages 58 to 112 ms past, once 791 ms); played whole from the verse's start, as he plays it, 60 of 60 stops were between 93 ms before and 7 ms past.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

type Triple = [number, number, number];
interface ChapterTimings {
  audio: string;
  duration: number;
  verses: Triple[];
}
const JOHN = JSON.parse(readFileSync(join(process.cwd(), 'public/data/audio/msb-david/jhn.json'), 'utf8')) as { chapters: Record<string, ChapterTimings> };

/** How far past a verse's end the recording may be when it is paused. */
const LATE_MS = 50;
/** How far short of it the element's second may stand at the pause: END_SLACK (50 ms) and RUN_ON_MS (300 ms) of src/speech/recordedVoice.ts. */
const SHORT_MS = 350;

const scratch = mkdtempSync(join(tmpdir(), 'lampas-silent-mp3-'));
const made = new Map<string, Buffer>();

/** A silent MP3 of `seconds`, 44.1 kHz mono at 192 kbps CBR (the publisher's own rate), made once a length. */
function silentMp3(seconds: number): Buffer {
  const key = seconds.toFixed(2);
  const known = made.get(key);
  if (known) return known;
  const out = join(scratch, `${key}.mp3`);
  // no Xing/Info seek table, as the publisher's files have none (Chromium then seeks a CBR file by its byte rate)
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', key, '-c:a', 'libmp3lame', '-b:a', '192k', '-write_xing', '0', out]);
  const mp3 = readFileSync(out);
  made.set(key, mp3);
  return mp3;
}

test.afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** Answers each chapter MP3 of John with silence of its length; fails and counts any other openbible.com request. */
async function silentJohn(page: Page): Promise<string[]> {
  const other: string[] = [];
  const byAudio = new Map(Object.values(JOHN.chapters).map((c) => [c.audio, c.duration]));
  await page.route(/^https?:\/\/([a-z0-9-]+\.)*openbible\.com\//, (route) => {
    const duration = byAudio.get(route.request().url());
    if (duration === undefined) {
      other.push(route.request().url());
      return route.abort('failed');
    }
    // a file server's byte ranges, as the publisher's sends: with none the element cannot seek to a verse and plays from second 0
    const body = silentMp3(duration);
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers()['range'] ?? '');
    if (!range) return route.fulfill({ status: 200, contentType: 'audio/mpeg', headers: { 'accept-ranges': 'bytes' }, body });
    const from = Number(range[1]);
    const to = range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
    return route.fulfill({
      status: 206,
      contentType: 'audio/mpeg',
      headers: { 'accept-ranges': 'bytes', 'content-range': `bytes ${from}-${to}/${body.length}` },
      body: body.subarray(from, to + 1),
    });
  });
  return other;
}

/** Logs the element's second at each pause() into window.lampasPauses and its volume then into window.lampasPauseVolumes, counts each play() in window.lampasPlays, and
 * keeps the element play() was called on as window.lampasAudio. */
async function logPauses(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as unknown as { lampasPauses: number[]; lampasPauseVolumes: number[]; lampasPlays: number; lampasAudio?: HTMLMediaElement };
    w.lampasPauses = [];
    w.lampasPauseVolumes = [];
    w.lampasPlays = 0;
    const { play, pause } = HTMLMediaElement.prototype;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      w.lampasAudio = this;
      w.lampasPlays++;
      return play.call(this);
    };
    HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
      w.lampasPauses.push(this.currentTime);
      w.lampasPauseVolumes.push(this.volume);
      return pause.call(this);
    };
  });
}

const pauses = (page: Page): Promise<number[]> => page.evaluate(() => (window as unknown as { lampasPauses: number[] }).lampasPauses.slice());
const pauseVolumes = (page: Page): Promise<number[]> => page.evaluate(() => (window as unknown as { lampasPauseVolumes: number[] }).lampasPauseVolumes.slice());
const plays = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { lampasPlays: number }).lampasPlays);

/** Opens John `c`:`v` in the Verse view on Listen, in English with nothing woven, the book's timings loaded. */
async function openVerse(page: Page, c: number, v: number): Promise<void> {
  await page.goto(`/#/?b=jhn&c=${c}&v=${v}&view=english&weave=off`);
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some((e) => e.name.endsWith('/data/audio/msb-david/jhn.json')))).toBe(true);
  const listen = view.getByRole('button', { name: 'Listen', exact: true });
  if ((await listen.getAttribute('aria-pressed')) !== 'true') await listen.click();
}

async function start(page: Page): Promise<string[]> {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 5 });
  await logPauses(page);
  return silentJohn(page);
}

/** Plays John `c`:`v` alone by the Verse view's Play (from its start; `whole` false moves it to 1.5 s before its end once it plays) and gives how far past the
 * verse's end, in ms, the element's second was when it was paused (below 0: short of it). */
async function lateOf(page: Page, c: number, v: number, whole: boolean): Promise<number> {
  const span = JOHN.chapters[String(c)].verses.find(([n]) => n === v);
  if (!span) throw new Error(`no timing for John ${c}:${v}`);
  // the chapter's silent MP3 is made here, before the page asks for it: made inside the route on a loaded host, ffmpeg held the answer past the player's 8 s wait for
  // 'playing' (PLAYING_WAIT_MS), the reading went to the phone's voice and was over before a Stop was seen (attempt 1's failure on John 6:35 at load 30)
  silentMp3(JOHN.chapters[String(c)].duration);
  await openVerse(page, c, v);
  const view = page.getByRole('region', { name: 'Verse view' });
  const before = (await pauses(page)).length;
  const played = await plays(page);
  // The Verse view drops a tap for its first 600 ms (src/ui/settle.ts useOpeningGuard): Play is tapped until the tap is TAKEN, which is the element's play() (called
  // straight from the tap, src/speech/recordedVoice.ts playRecording), never by a Stop seen: a short reading can come and go between two looks, and its Play is then
  // 'Play again', which this loop would never tap. A tap is tapped again only when no play() followed it.
  await expect(async () => {
    if ((await plays(page)) > played) return;
    const play = view.getByRole('button', { name: `Play verse ${v}`, exact: true });
    if (await play.isVisible()) await play.click();
    expect(await plays(page), `John ${c}:${v}: the Play tap was taken`).toBeGreaterThan(played);
  }).toPass({ intervals: [250, 500, 1000], timeout: 30_000 });
  if (!whole && span[2] - span[1] > 2) {
    // once the sound has started from the verse's start
    await page.waitForFunction(
      (from) => {
        const a = (window as unknown as { lampasAudio?: HTMLMediaElement }).lampasAudio;
        return !!a && !a.paused && a.currentTime > from;
      },
      span[1],
      { polling: 20, timeout: 30_000 },
    );
    await page.evaluate((to) => {
      const a = (window as unknown as { lampasAudio?: HTMLMediaElement }).lampasAudio;
      if (a) a.currentTime = to;
    }, span[2] - 1.5);
  }
  await expect(view.getByRole('button', { name: 'Play again', exact: true })).toBeVisible({ timeout: 60_000 });
  // a recording that did not start in time goes to the phone's voice (and its Play again comes at once): say so here, by the verse, rather than as a stop short of its end
  expect(await spoken(page), `John ${c}:${v} was read by the recording, not the phone's voice`).toEqual([]);
  const at = (await pauses(page)).slice(before);
  expect(at.length, `John ${c}:${v} was paused`).toBeGreaterThan(0);
  // the stop cannot leak: the recording was faded to silence before it was paused
  expect.soft((await pauseVolumes(page)).pop(), `John ${c}:${v}: the element's volume when it was paused at its end`).toBe(0);
  return Math.round((at[at.length - 1] - span[2]) * 1000);
}

const TEN: Array<[number, number, boolean]> = [
  [1, 50, true],
  [3, 16, true],
  [1, 14, false],
  [5, 24, false],
  [6, 35, false],
  [8, 12, false],
  [11, 35, false],
  [14, 6, false],
  [17, 3, false],
  [20, 31, false],
];

test('the Verse view’s Play of one verse in David’s voice stops at the verse’s end, not in the next verse (John 1:50, 3:16 and eight more)', async ({ page }) => {
  test.setTimeout(180_000);
  const other = await start(page);
  const report: string[] = [];
  for (const [c, v, whole] of TEN) {
    const late = await lateOf(page, c, v, whole);
    report.push(`John ${c}:${v} ${late} ms`);
    expect.soft(late, `John ${c}:${v}: ms past its end`).toBeLessThanOrEqual(LATE_MS);
    expect.soft(late, `John ${c}:${v}: ms past its end`).toBeGreaterThanOrEqual(-SHORT_MS);
    if (c === 1 && v === 50) await shot(page, 'recorded-voice-stop-john-1-50');
  }
  console.log(`stopped past the verse's end: ${report.join(', ')}`);
  expect(await spoken(page)).toEqual([]);
  expect(other).toEqual([]);
});

// Every verse of John, outside the gate (mw-82lb97i.18's sixth criterion, mw-82lb97i.27's fourth: each chapter on a freshly loaded page, under three workers).
test.describe('every verse of John stops within 50 ms of its end (LAMPAS_ALL_JOHN=1)', () => {
  test.skip(process.env.LAMPAS_ALL_JOHN !== '1', 'outside the gate: LAMPAS_ALL_JOHN=1 runs it');
  for (const c of Object.keys(JOHN.chapters).map(Number)) {
    test(`John ${c}`, async ({ page }) => {
      test.setTimeout(30 * 60_000);
      const other = await start(page);
      const late: string[] = [];
      const all: number[] = [];
      for (const [v] of JOHN.chapters[String(c)].verses) {
        const ms = await lateOf(page, c, v, false);
        all.push(ms);
        if (ms > LATE_MS || ms < -SHORT_MS) late.push(`${c}:${v} ${ms} ms`);
      }
      console.log(`John ${c}: ${all.length} verses, ms past the end min ${Math.min(...all)} max ${Math.max(...all)}; outside: ${late.join(', ') || 'none'}`);
      expect(late).toEqual([]);
      expect(other).toEqual([]);
    });
  }
});
