// tests/e2e/recorded-voice-stop.spec.ts — a single verse read by the recorded voice stops at its end (mw-82lb97i.18): his John 1:50 in David's voice ran on into
// 'Then He declar…' of verse 51. In a real Chromium, with John's real timings (public/data/audio/msb-david/jhn.json) and a SILENT MP3 of each chapter's length made
// here by ffmpeg (192 kbps CBR at 44.1 kHz, as the publisher's), the Verse view's Play of a verse must leave the element paused no more than 50 ms past the verse's
// end. The second the element is at is logged at each pause() (an init script wraps HTMLMediaElement.prototype.pause). Chromium's element moves its second in bursts
// (0.23 s, then 0.46 s, a 266 ms 'timeupdate' apart): the player judges the end by the sound, the second run on by the clock (src/speech/recordedVoice.ts soundAt), so the
// second at the pause may stand short of the end by up to END_SLACK + RUN_ON_MS, never more than 50 ms past it.
// John 1:50 and 3:16 (his check) are played whole; the other verses are moved, once playing, to a second and a half before their end (a seek the end timer is aimed again
// after). LAMPAS_ALL_JOHN=1 runs every verse of John (879, the story's sixth criterion) the same way, a test a chapter; it is outside the gate (a quarter of an hour on
// three workers). Nothing reaches openbible.com: its MP3 addresses are answered here, any other request to it is failed.
// mw-82lb97i.27 (he still heard the first 'th' of verse 51's 'Then'): the element's volume at each pause() is logged too, and a verse's stop must find it silent (0.001, never exactly 0), the last
// 60 ms before the stop faded to silence (src/speech/recordedVoice.ts FADE). Each test of the LAMPAS_ALL_JOHN run starts on a freshly loaded page, where the first
// verses' stops came late before (John 9:1 +288 ms): its line gives the chapter's least and most ms past the end. Run it as
// `LAMPAS_ALL_JOHN=1 npx playwright test tests/e2e/recorded-voice-stop.spec.ts --project=shots --fully-parallel --workers=3` (without --fully-parallel one worker runs it all).
// A verse of the ten whose stop is outside the window is played again, up to TRIES times (settledLate): a loaded host's late timer (52 ms past at load 18, mw-fnvjof.17.115) is not repeated, a late player is.
// mw-ar5k42b.46: the sweep also runs at his speeds 1x and 1.25x (SPEEDS). It found, at both, a stop 0.84 to 1.16 s past the end in about 1 verse of 450 (John 2:18, 6:11, 7:50,
// 11:51, 5:31, 15:23...): the player stopped on time by the element's clock, and setting the volume to exactly 0 right before pause() snapped the element's second, which had run
// 0.8 to 1.1 s behind for two seconds after the seek, to the wall clock (headless Chromium takes volume 0 or muted for silent). The fade now ends at SILENT_VOLUME (0.001).
// A seek inside two seconds of a stop is what this spec's own seek (1.5 s before the end) is; played whole from the verse's start, as he plays it, 60 of 60 stops were between 93 ms before and 7 ms past (mw-ar5k42b.23).
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

/** His English speeds the stop is held at (mw-ar5k42b.46: the spec played at 1x only before): the recording plays at the speed, so its seconds go by `rate` times as fast. */
const SPEEDS = [1, 1.25];

/** Saves his English speed through raw IndexedDB, as the app writes it (tests/e2e/recorded-voice-margin.spec.ts keepRate), then loads the page again so the player takes it. */
async function keepRate(page: Page, rate: number): Promise<void> {
  // the app's own database exists once its page has loaded (opening it on a blank page is refused, and one opened before the app made it would be empty)
  await page.goto('/#/?b=jhn&c=1&view=english&weave=off');
  await expect(page.getByRole('heading', { name: 'John 1', level: 1 })).toBeVisible();
  await page.evaluate(
    (value) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('lampas');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ key: 'rate.english', value });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    String(rate),
  );
  await page.reload();
}

async function start(page: Page, rate = 1): Promise<string[]> {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 5 });
  await logPauses(page);
  const other = await silentJohn(page);
  if (rate !== 1) await keepRate(page, rate);
  return other;
}

/** Plays John `c`:`v` alone by the Verse view's Play (from its start; `whole` false moves it to 1.5 s before its end once it plays) and gives how far past the
 * verse's end, in ms, the element's second was when it was paused (below 0: short of it). */
async function lateOf(page: Page, c: number, v: number, whole: boolean, rate = 1): Promise<number> {
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
  // the speed he keeps is the speed the element plays at (a stop judged at 1x would say nothing of 1.25x)
  expect(await page.evaluate(() => (window as unknown as { lampasAudio?: HTMLMediaElement }).lampasAudio?.playbackRate), `John ${c}:${v}: the element's playbackRate`).toBe(rate);
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
  // (a volume of exactly 0 is never given: headless Chromium then snaps the element's second to the wall clock, up to 1.1 s on, mw-ar5k42b.46)
  const volume = (await pauseVolumes(page)).pop();
  expect.soft(volume, `John ${c}:${v}: the element's volume when it was paused at its end`).toBeGreaterThan(0);
  expect.soft(volume, `John ${c}:${v}: the element's volume when it was paused at its end`).toBeLessThanOrEqual(0.001);
  return Math.round((at[at.length - 1] - span[2]) * 1000);
}

/** How many times a verse of the ten is played before its stop is judged late: a stop past the end by 52 ms on a host at load 18 (mw-fnvjof.17.115, the nightly whole suite)
 * was the timer firing late, which a second play of the verse does not repeat; a stop that is late because of the player is late each time and still fails. */
const TRIES = 3;
const inWindow = (ms: number): boolean => ms <= LATE_MS && ms >= -SHORT_MS;

/** lateOf, played again (up to TRIES plays) while the stop stands outside the window; the report is every play's ms. */
async function settledLate(page: Page, c: number, v: number, whole: boolean, rate = 1): Promise<{ late: number; tries: number[] }> {
  const tries: number[] = [];
  do tries.push(await lateOf(page, c, v, whole, rate));
  while (!inWindow(tries[tries.length - 1]) && tries.length < TRIES);
  return { late: tries[tries.length - 1], tries };
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

for (const rate of SPEEDS) test(`the Verse view’s Play of one verse in David’s voice stops at the verse’s end, not in the next verse (John 1:50, 3:16 and eight more) at ${rate}x`, async ({ page }) => {
  test.setTimeout(300_000);
  const other = await start(page, rate);
  const report: string[] = [];
  for (const [c, v, whole] of TEN) {
    const { late, tries } = await settledLate(page, c, v, whole, rate);
    report.push(`John ${c}:${v} ${tries.join(' then ')} ms`);
    expect.soft(late, `John ${c}:${v}: ms past its end`).toBeLessThanOrEqual(LATE_MS);
    expect.soft(late, `John ${c}:${v}: ms past its end`).toBeGreaterThanOrEqual(-SHORT_MS);
    if (c === 1 && v === 50) await shot(page, 'recorded-voice-stop-john-1-50');
  }
  console.log(`stopped past the verse's end at ${rate}x: ${report.join(', ')}`);
  expect(await spoken(page)).toEqual([]);
  expect(other).toEqual([]);
});

// Every verse of John, outside the gate (mw-82lb97i.18's sixth criterion, mw-82lb97i.27's fourth: each chapter on a freshly loaded page, under three workers).
test.describe('every verse of John stops within 50 ms of its end (LAMPAS_ALL_JOHN=1)', () => {
  test.skip(process.env.LAMPAS_ALL_JOHN !== '1', 'outside the gate: LAMPAS_ALL_JOHN=1 runs it');
  for (const rate of SPEEDS) for (const c of Object.keys(JOHN.chapters).map(Number)) {
    test(`John ${c} at ${rate}x`, async ({ page }) => {
      test.setTimeout(30 * 60_000);
      const other = await start(page, rate);
      const late: string[] = [];
      const all: number[] = [];
      for (const [v] of JOHN.chapters[String(c)].verses) {
        const ms = await lateOf(page, c, v, false, rate);
        all.push(ms);
        if (ms > LATE_MS || ms < -SHORT_MS) late.push(`${c}:${v} ${ms} ms`);
      }
      console.log(`John ${c} at ${rate}x: ${all.length} verses, ms past the end min ${Math.min(...all)} max ${Math.max(...all)}; outside: ${late.join(', ') || 'none'}`);
      expect(late).toEqual([]);
      expect(other).toEqual([]);
    });
  }
});

// mw-82lb97i.28: playing John 1:1 alone (his screenshot) first said 'Audio Bible, John chapter one': every chapter's verse 1 starts 4.5 to 6.8 s into the recording, after the
// announcement, and a cold element sounds from second 0 until its seek lands. The element's second is logged whenever it can be HEARD (playing, not muted, volume above 0): a
// verse's Play must never be heard before the verse's start (less END_SLACK, 50 ms), and its first 'playing' must stand at it. A chapter from its beginning still has it.
test.describe('a verse’s Play in David’s voice is silent until its start, and has no announcement (mw-82lb97i.28)', () => {
  /** Logs, 10 ms apart and at each 'timeupdate'/'playing', the element's second whenever it is audible, in window.lampasHeard, and its second at each 'playing' in window.lampasPlayingAt. */
  async function logHeard(page: Page): Promise<void> {
    await page.addInitScript(() => {
      const w = window as unknown as { lampasHeard: number[]; lampasPlayingAt: number[]; lampasAudio?: HTMLMediaElement };
      w.lampasHeard = [];
      w.lampasPlayingAt = [];
      const look = (): void => {
        const a = w.lampasAudio;
        if (a && !a.paused && !a.muted && a.volume > 0 && a.readyState >= 3) w.lampasHeard.push(a.currentTime);
      };
      setInterval(look, 10);
      // the player's element is never in the page, so its events do not reach window: they are listened to on it, the first time it plays
      const seen = new WeakSet<HTMLMediaElement>();
      const { play } = HTMLMediaElement.prototype;
      HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
        w.lampasAudio = this;
        if (!seen.has(this)) {
          seen.add(this);
          for (const type of ['timeupdate', 'seeked']) this.addEventListener(type, look);
          this.addEventListener('playing', () => {
            w.lampasPlayingAt.push(this.currentTime);
            look();
          });
        }
        return play.call(this);
      };
    });
  }
  const heard = (page: Page): Promise<number[]> => page.evaluate(() => (window as unknown as { lampasHeard: number[] }).lampasHeard.slice());
  const playingAt = (page: Page): Promise<number[]> => page.evaluate(() => (window as unknown as { lampasPlayingAt: number[] }).lampasPlayingAt.slice());

  async function playVerse(page: Page, c: number, v: number): Promise<void> {
    const other = await start(page);
    await logHeard(page);
    silentMp3(JOHN.chapters[String(c)].duration);
    await openVerse(page, c, v);
    const view = page.getByRole('region', { name: 'Verse view' });
    const played = await plays(page);
    await expect(async () => {
      if ((await plays(page)) > played) return;
      const play = view.getByRole('button', { name: `Play verse ${v}`, exact: true });
      if (await play.isVisible()) await play.click();
      expect(await plays(page), 'the Play tap was taken').toBeGreaterThan(played);
    }).toPass({ intervals: [250, 500, 1000], timeout: 30_000 });
    await expect(view.getByRole('button', { name: 'Play again', exact: true })).toBeVisible({ timeout: 60_000 });
    expect(await spoken(page)).toEqual([]);
    expect(other).toEqual([]);
  }

  for (const [c, v] of [[1, 1], [3, 16]] as const) {
    test(`John ${c}:${v} played cold: nothing is heard before the verse's start, and it starts there`, async ({ page }) => {
      test.setTimeout(120_000);
      const span = JOHN.chapters[String(c)].verses.find(([n]) => n === v);
      if (!span) throw new Error('no timing');
      await playVerse(page, c, v);
      const sounds = await heard(page);
      expect(sounds.length, 'the verse was heard').toBeGreaterThan(0);
      expect(Math.min(...sounds), `the least second heard (the verse starts at ${span[1]})`).toBeGreaterThanOrEqual(span[1] - 0.05);
      const first = (await playingAt(page))[0];
      expect(first, `the second at the first 'playing' (the verse starts at ${span[1]})`).toBeGreaterThanOrEqual(span[1] - 0.05);
      expect(first).toBeLessThanOrEqual(span[1] + 0.5);
    });
  }

  test('then the chapter from its top, on the same element (its src has a fragment), still begins with the announcement', async ({ page }) => {
    test.setTimeout(120_000);
    await playVerse(page, 1, 1);
    expect(Math.min(...(await heard(page)))).toBeGreaterThanOrEqual(6.74);
    await page.goto('/#/?b=jhn&c=1&view=english&weave=off');
    await expect(page.getByRole('heading', { name: 'John 1', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: 'Read from the top', exact: true }).click();
    // the announcement ('Audio Bible, John chapter one') is the recording's first seconds, before verse 1 at 6.79 s
    await expect.poll(async () => Math.min(...(await heard(page))), { timeout: 30_000 }).toBeLessThan(5);
    await page.getByRole('button', { name: 'Stop', exact: true }).first().click();
  });
});
