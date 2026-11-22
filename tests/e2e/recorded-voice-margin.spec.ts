// tests/e2e/recorded-voice-margin.spec.ts — David's player holds a stated margin (mw-ar5k42b.2, docs/audio-player-margin.md): what the PAGE EMITS is heard, sample by
// sample, and no sound from outside the verse (or the section) comes more than the margin before its start or after its end.
// covers: the real clock: the element's own second, its timers, its pause() and its volume, against the sound the browser renders (a timing test: it needs a real clock).
// HOW IT HEARS: the recording is tests/e2e/fixtures/tone-verses.mp3 (made by make-tone-verses.ts beside it), Titus 2 and Titus 3 both, served for openbible.com here: every
// verse is steady tone, every quarter second of it (a step) has a pitch of its own, and between verses there is digital silence or none (3:7 runs on from 3:6 and into 3:8,
// 3:8 into 3:9, 3:11 into 3:12). In THIS TEST ONLY the player's one element is given crossOrigin (the route answers with CORS; the app's element has none, so Web Audio
// would hear it as silence) and is routed through Web Audio into an AudioWorklet, which cuts what the page renders into 5 ms windows and gives each its loudness and pitch.
// A window as loud as a person hears (HEARD_DB under the tone's level) is placed in the recording by its pitch, and the windows of one run of playing are tied together
// by the speed (the recording's seconds go by `rate` times as fast as the page's), so each window heard has the second of the recording it came from, to a few ms.
// From those: the START ERROR of a play is the first second heard less the span's start (below 0: sound from before it), the END ERROR the last second heard less its end
// (above 0: sound from after it). Each must be within the margin of scripts/audio-timings/player-margin.json, and the span's own tone must be heard whole from start plus
// the margin to end less the margin and the fade.
// LAMPAS_MARGIN_PLAYS (2 in the gate: the first play of each case on a fresh page, the next by 'Play again') sets the plays a case; LAMPAS_MARGIN_OUT=<file> appends one
// JSON line a play to it, the table of docs/audio-player-margin.md. Run the measure as
// `LAMPAS_MARGIN_PLAYS=30 LAMPAS_MARGIN_OUT=/tmp/margin.jsonl npx playwright test tests/e2e/recorded-voice-margin.spec.ts --project=shots --workers=2`.
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { honestSpeech, spoken } from '../support/honest-fakes';
import { shot } from './shot';
import { openUnlocked } from './unlocked';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
// the sound is the same at any width: it is heard once, under the phone-width project
test.beforeEach(({ browserName }, testInfo) => test.skip(testInfo.project.name === 'chromium' && browserName === 'chromium', 'heard once, under the shots project'));

type Triple = [number, number, number];
interface Tones {
  duration: number;
  step: number;
  peak: number;
  title: [number, number];
  verses: Triple[];
  steps: Triple[];
}
const TONES = JSON.parse(readFileSync(join(process.cwd(), 'tests/e2e/fixtures/tone-verses.json'), 'utf8')) as Tones;
const MP3 = readFileSync(join(process.cwd(), 'tests/e2e/fixtures/tone-verses.mp3'));

/** The margin the player is held to, seconds each side: the one place for the number (the judge and the timing maker read it too). */
const MARGIN = JSON.parse(readFileSync(join(process.cwd(), 'scripts/audio-timings/player-margin.json'), 'utf8')) as { lead: number; tail: number; inside: { lead: number } };
/** The fade the player ends a span with (src/speech/recordedVoice.ts FADE): the tone may be quiet in it. */
const FADE = 0.06;

/** A window is heard when its loudness is no more than this many dB under the tone's: 50 dB under a full voice is still heard on a phone in a quiet room. */
const HEARD_DB = -50;
const TONE_RMS = TONES.peak / Math.SQRT2;
const HEARD_RMS = TONE_RMS * 10 ** (HEARD_DB / 20);
/** How far, Hz, a window's pitch may be from a step's for it to be that step (the steps are 25 Hz apart). */
const PITCH_SLOP = 10;
/** How far, seconds of the recording, a window may sit from where its run puts it: a window that straddles two steps, and the time-stretch at a speed other than 1. */
const PLACE_SLOP = 0.012;
/** Two pieces of sound whose clocks differ by no more than this are one run of playing, and two seconds heard this close are heard as one (the time-stretch's jitter). */
const RUN_JOIN = 0.03;
/** A window is steady, and its pitch is read, when its loudness and each neighbour's are within this ratio (3 dB). */
const STEADY = 0.7;
/** The seconds at each end of a verse's tone that are not asked to be heard: the fixture's 5 ms ramp and a window. */
const EDGE = 0.01;

const PLAYS = Number(process.env.LAMPAS_MARGIN_PLAYS ?? 2);
const OUT = process.env.LAMPAS_MARGIN_OUT;

const AUDIO = (chapter: number): string => `https://openbible.com/audio/test/tone-verses-${chapter}.mp3`;
const timingsOf = (chapter: number) => ({ audio: AUDIO(chapter), duration: TONES.duration, verses: TONES.verses });
const spanOf = (n: number): Triple => {
  const span = TONES.verses.find(([v]) => v === n);
  if (!span) throw new Error(`no verse ${n}`);
  return span;
};

/** Serves Titus 2 and 3's timings and the tone MP3 for both (byte ranges, and CORS for the test's Web Audio); fails and counts any other openbible.com request. */
async function serveTones(page: Page): Promise<string[]> {
  const other: string[] = [];
  await page.route('**/data/audio/msb-david/index.json', (route) => route.fulfill({ json: { v: 1, edition: 'msb-david', voice: 'David', books: { tit: [2, 3] } } }));
  await page.route('**/data/audio/msb-david/tit.json', (route) =>
    route.fulfill({ json: { v: 1, edition: 'msb-david', book: 'tit', chapters: { '2': timingsOf(2), '3': timingsOf(3) } } }),
  );
  await page.route(/^https?:\/\/([a-z0-9-]+\.)*openbible\.com\//, (route) => {
    const url = route.request().url();
    if (url !== AUDIO(2) && url !== AUDIO(3)) {
      other.push(url);
      return route.abort('failed');
    }
    const cors = { 'access-control-allow-origin': '*', 'accept-ranges': 'bytes' };
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers()['range'] ?? '');
    if (!range) return route.fulfill({ status: 200, contentType: 'audio/mpeg', headers: cors, body: MP3 });
    const from = Number(range[1]);
    const to = range[2] ? Math.min(Number(range[2]), MP3.length - 1) : MP3.length - 1;
    return route.fulfill({ status: 206, contentType: 'audio/mpeg', headers: { ...cors, 'content-range': `bytes ${from}-${to}/${MP3.length}` }, body: MP3.subarray(from, to + 1) });
  });
  return other;
}

interface EarWindow {
  /** seconds of the page's audio clock */
  t: number;
  rms: number;
  hz: number;
  /** its length, seconds */
  w: number;
}

/** Routes the player's element through Web Audio into an AudioWorklet that gives each 5 ms window of what the page renders as [loudness, pitch], in window.lampasEar. */
async function hearThePage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    interface Ear {
      sampleRate: number;
      window: number;
      /** [rms, hz] of each window since the worklet began, in order */
      heard: number[];
      ready: boolean;
      element: HTMLMediaElement | null;
      plays: number;
      failed: string | null;
      /** each time the element's muted flag went from true to false: its second then (mw-ar5k42b.58) */
      unmutes: Array<{ second: number; readyState: number; seeking: boolean }>;
      /** how many times it went from false to true */
      mutes: number;
    }
    const ear: Ear = { sampleRate: 0, window: 0, heard: [], ready: false, element: null, plays: 0, failed: null, unmutes: [], mutes: 0 };
    // the element's muted flag is logged where it is set: the page's own code sets it, the test only watches
    const flag = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'muted');
    if (flag?.get && flag.set) {
      const { get, set } = flag;
      Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
        configurable: true,
        enumerable: flag.enumerable,
        get(this: HTMLMediaElement) {
          return get.call(this) as boolean;
        },
        set(this: HTMLMediaElement, on: boolean) {
          const was = get.call(this) as boolean;
          set.call(this, on);
          if (was && !on) ear.unmutes.push({ second: this.currentTime, readyState: this.readyState, seeking: this.seeking });
          if (!was && on) ear.mutes++;
        },
      });
    }
    (window as unknown as { lampasEar: Ear }).lampasEar = ear;
    // the publisher's server sends no CORS and the app's element asks none: here the route sends it and the element asks, or Web Audio would hear only silence
    const Original = window.Audio;
    const Wrapped = function (src?: string): HTMLAudioElement {
      const a = src === undefined ? new Original() : new Original(src);
      a.crossOrigin = 'anonymous';
      return a;
    } as unknown as typeof Audio;
    Wrapped.prototype = Original.prototype;
    window.Audio = Wrapped;
    const worklet = `
      class Ear extends AudioWorkletProcessor {
        constructor() { super(); this.size = Math.max(1, Math.round(sampleRate * 0.005)); this.buf = new Float32Array(this.size); this.fill = 0; this.carry = 0; this.out = []; }
        windowDone() {
          const b = this.buf, n = this.size;
          let sum = 0, first = -1, last = -1, count = 0, prev = this.carry;
          for (let i = 0; i < n; i++) {
            const v = b[i];
            sum += v * v;
            if ((prev < 0 && v >= 0) || (prev >= 0 && v < 0)) { const at = i - 1 + prev / (prev - v); if (count === 0) first = at; last = at; count++; }
            prev = v;
          }
          this.carry = b[n - 1];
          const hz = count >= 2 && last > first ? ((count - 1) / 2) / ((last - first) / sampleRate) : 0;
          this.out.push(Math.sqrt(sum / n), hz);
          if (this.out.length >= 80) { this.port.postMessage(this.out); this.out = []; }
        }
        process(inputs) {
          const x = inputs[0] && inputs[0][0];
          for (let i = 0; i < 128; i++) { this.buf[this.fill++] = x ? x[i] : 0; if (this.fill === this.size) { this.windowDone(); this.fill = 0; } }
          return true;
        }
      }
      registerProcessor('lampas-ear', Ear);`;
    const ctx = new AudioContext();
    const tap = ctx.createGain();
    tap.channelCount = 1;
    tap.channelCountMode = 'explicit';
    tap.connect(ctx.destination);
    ear.sampleRate = ctx.sampleRate;
    ear.window = Math.max(1, Math.round(ctx.sampleRate * 0.005)) / ctx.sampleRate;
    void ctx.audioWorklet
      .addModule(URL.createObjectURL(new Blob([worklet], { type: 'application/javascript' })))
      .then(() => {
        const node = new AudioWorkletNode(ctx, 'lampas-ear', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1, channelCountMode: 'explicit' });
        node.port.onmessage = (e: MessageEvent<number[]>) => {
          for (const v of e.data) ear.heard.push(v);
        };
        tap.connect(node);
        // the worklet runs only while it is pulled: its silent output goes to the destination
        const mute = ctx.createGain();
        mute.gain.value = 0;
        node.connect(mute).connect(ctx.destination);
        // the context runs from the first tap's play() (a page may not start sound before a gesture)
        ear.ready = true;
      })
      .catch((e: unknown) => {
        ear.failed = String(e);
      });
    const sourced = new WeakSet<HTMLMediaElement>();
    const { play } = HTMLMediaElement.prototype;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      ear.element = this;
      ear.plays++;
      if (!sourced.has(this)) {
        sourced.add(this);
        ctx.createMediaElementSource(this).connect(tap);
      }
      void ctx.resume();
      return play.call(this);
    };
  });
}

interface EarState {
  heard: number;
  plays: number;
}
const earState = (page: Page): Promise<EarState> =>
  page.evaluate(() => {
    const ear = (window as unknown as { lampasEar: { heard: number[]; plays: number } }).lampasEar;
    return { heard: ear.heard.length / 2, plays: ear.plays };
  });

interface Unmute {
  second: number;
  readyState: number;
  seeking: boolean;
}
/** The unmutes the element has had since `skip` of them, and how many mutes it has had in all. */
const unmutesOf = (page: Page): Promise<{ unmutes: Unmute[]; mutes: number }> =>
  page.evaluate(() => {
    const ear = (window as unknown as { lampasEar: { unmutes: Unmute[]; mutes: number } }).lampasEar;
    return { unmutes: ear.unmutes.slice(), mutes: ear.mutes };
  });

/** The windows heard since window `from`, once the ear has heard a quarter second more than it had (the worklet sends its windows in batches, and a stop's last sound comes after it). */
async function windowsSince(page: Page, from: number): Promise<EarWindow[]> {
  const now = (await earState(page)).heard;
  await expect.poll(async () => (await earState(page)).heard - now, { timeout: 30_000 }).toBeGreaterThanOrEqual(50);
  const { heard, size } = await page.evaluate(() => {
    const ear = (window as unknown as { lampasEar: { heard: number[]; window: number } }).lampasEar;
    return { heard: ear.heard.slice(), size: ear.window };
  });
  const out: EarWindow[] = [];
  for (let i = from; i * 2 + 1 < heard.length; i++) out.push({ t: i * size, rms: heard[i * 2], hz: heard[i * 2 + 1], w: size });
  return out;
}

/** The step of the recording a pitch is, or -1. */
function stepOf(hz: number): number {
  let best = -1;
  let gap = PITCH_SLOP;
  TONES.steps.forEach(([, , pitch], i) => {
    if (Math.abs(pitch - hz) <= gap) {
      gap = Math.abs(pitch - hz);
      best = i;
    }
  });
  return best;
}

/** One run of playing: the page's clock and the recording's second differ by `offset` (second = offset + rate * t), known to within lo..hi. */
interface Run {
  lo: number;
  hi: number;
  /** the windows of it heard: [t, step or -1, length] */
  windows: Array<[number, number, number]>;
}

/** What one play gave out, placed in the recording. */
interface Heard {
  /** each run of playing: the recording's seconds heard in it, [from, to] */
  runs: Array<{ from: number; to: number; sure: number }>;
  /** windows heard that no run could place */
  unplaced: number;
  /** the seconds of the recording heard, merged */
  spans: Array<[number, number]>;
  /** each run, in words: for the log */
  detail: string[];
}

/** Places each window heard in the recording: a window loud enough to hear is a step by its pitch, and a run's windows agree on one offset between the page's clock and
 * the recording's second; where two steps meet the offset is known to a window. */
function place(windows: EarWindow[], rate: number): Heard {
  const pieces: Run[] = [];
  /** loud windows with no step's pitch: [t, length] */
  const loose: Array<[number, number]> = [];
  let current: Run | null = null;
  windows.forEach((w, i) => {
    if (w.rms < HEARD_RMS) return;
    // a window whose loudness moves (the browser's ramp in at a start, the fade, a tone's own ends) misreads the pitch: it is placed by the piece beside it
    const steady = [windows[i - 1], windows[i + 1]].every((o) => o !== undefined && o.rms >= w.rms * STEADY && w.rms >= o.rms * STEADY);
    const step = steady ? stepOf(w.hz) : -1;
    if (step < 0) {
      loose.push([w.t, w.w]);
      return;
    }
    const [from, to] = TONES.steps[step];
    const lo = from - rate * w.t - PLACE_SLOP;
    const hi = to - rate * (w.t + w.w) + PLACE_SLOP;
    if (current && lo <= current.hi && hi >= current.lo) {
      current.lo = Math.max(current.lo, lo);
      current.hi = Math.min(current.hi, hi);
      current.windows.push([w.t, step, w.w]);
    } else {
      current = { lo, hi, windows: [[w.t, step, w.w]] };
      pieces.push(current);
    }
  });
  // a piece of a window or three that cannot be placed alone (its windows lie inside one step) and touches a piece that is placed is that piece's edge: the click of the
  // sound starting or stopping part way through a wave, whose pitch is no step's or happens to be one. It is placed by that piece's clock.
  const solid = (r: Run): boolean => (r.hi - r.lo) / 2 <= PLACE_SLOP + 0.005;
  for (let i = 0; i < pieces.length; i++) {
    const r = pieces[i];
    if (solid(r) || r.windows.length > 3) continue;
    const near = (o: Run): boolean => o !== r && solid(o) && o.windows.some(([t]) => r.windows.some(([u, , w]) => Math.abs(t - u) <= 4 * w));
    const to = pieces.find(near);
    if (!to) continue;
    to.windows.push(...r.windows.map(([t, , w]) => [t, -1, w] as [number, number, number]));
    pieces.splice(i, 1);
    i--;
  }
  // a loud window with no step's pitch (a click where the sound starts or stops, a window across two steps) belongs to the piece nearest it, within 50 ms of the page's clock
  let unplaced = 0;
  for (const [t, w] of loose) {
    let best: Run | null = null;
    let gap = 10 * w;
    for (const piece of pieces) {
      for (const [u] of piece.windows) {
        if (Math.abs(u - t) <= gap) {
          gap = Math.abs(u - t);
          best = piece;
        }
      }
    }
    if (best) best.windows.push([t, -1, w]);
    else unplaced++;
  }
  const placed = pieces
    .map((r) => {
      r.windows.sort((x, y) => x[0] - y[0]);
      const offset = (r.lo + r.hi) / 2;
      const seconds = r.windows.map(([t, , w]) => [offset + rate * t, offset + rate * (t + w)] as [number, number]);
      const steps = r.windows.map(([, step]) => step).filter((step) => step >= 0);
      return {
        offset,
        at: r.windows[0][0],
        from: Math.min(...seconds.map(([x]) => x)),
        to: Math.max(...seconds.map(([, y]) => y)),
        sure: (r.hi - r.lo) / 2,
        seconds,
        line: `t ${r.windows[0][0].toFixed(3)}: ${(Math.min(...seconds.map(([x]) => x))).toFixed(3)}-${Math.max(...seconds.map(([, y]) => y)).toFixed(3)} s ±${Math.round(((r.hi - r.lo) / 2) * 1000)} ms, steps ${Math.min(...steps)}-${Math.max(...steps)}, ${r.windows.length} windows`,
      };
    })
    .sort((x, y) => x.at - y.at);
  // a run of playing: the pieces, in the page's order, whose clocks agree (the time-stretch of a speed other than 1 moves a piece's clock by ten ms or so; a pause,
  // a seek or a new recording moves it by far more)
  const runs: Array<{ from: number; to: number; sure: number; offset: number }> = [];
  const detail: string[] = [];
  for (const piece of placed) {
    const last = runs[runs.length - 1];
    if (last && Math.abs(piece.offset - last.offset) <= RUN_JOIN) {
      last.from = Math.min(last.from, piece.from);
      last.to = Math.max(last.to, piece.to);
      last.sure = Math.max(last.sure, piece.sure);
      last.offset = piece.offset;
      detail.push(`  ${piece.line}`);
    } else {
      runs.push({ from: piece.from, to: piece.to, sure: piece.sure, offset: piece.offset });
      detail.push(`run ${runs.length}: ${piece.line}`);
    }
  }
  const all = placed.flatMap((r) => r.seconds).sort((x, y) => x[0] - y[0]);
  const spans: Array<[number, number]> = [];
  for (const [x, y] of all) {
    const last = spans[spans.length - 1];
    if (last && x <= last[1] + RUN_JOIN) last[1] = Math.max(last[1], y);
    else spans.push([x, y]);
  }
  return { runs: runs.map(({ from, to, sure }) => ({ from, to, sure })), unplaced, spans, detail };
}

interface Measure {
  case: string;
  rate: number;
  play: number;
  cold: boolean;
  start: number;
  end: number;
  /** first second heard less the start, ms (below 0: sound from before the span) */
  startMs: number;
  /** last second heard less the end, ms (above 0: sound from after it) */
  endMs: number;
  /** seconds of the span's own tone, from start + margin to end - margin - fade, not heard */
  lostMs: number;
  runs: number;
  unplaced: number;
  sureMs: number;
  browser: string;
  load: string;
}

const ms = (s: number): number => Math.round(s * 1000);

function measure(heard: Heard, kase: string, rate: number, play: number, cold: boolean, start: number, end: number, browser: string): Measure {
  const first = heard.spans[0]?.[0] ?? Number.NaN;
  const last = heard.spans[heard.spans.length - 1]?.[1] ?? Number.NaN;
  // the span's own tone that must be heard: [start + lead, end - tail - fade], less the silences inside the span (between its verses)
  const must: Array<[number, number]> = [];
  for (const [, a, b] of TONES.verses) {
    const from = Math.max(a + EDGE, start + MARGIN.lead);
    const to = Math.min(b - EDGE, end - MARGIN.tail - FADE);
    if (to > from) must.push([from, to]);
  }
  let lost = 0;
  for (const [a, b] of must) {
    let covered = 0;
    for (const [x, y] of heard.spans) covered += Math.max(0, Math.min(b, y) - Math.max(a, x));
    lost += b - a - covered;
  }
  return {
    case: kase,
    rate,
    play,
    cold,
    start,
    end,
    startMs: ms(first - start),
    endMs: ms(last - end),
    lostMs: ms(lost),
    runs: heard.runs.length,
    unplaced: heard.unplaced,
    sureMs: ms(Math.max(0, ...heard.runs.map((r) => r.sure))),
    browser,
    load: '',
  };
}

function report(m: Measure): void {
  if (!OUT) return;
  m.load = readFileSync('/proc/loadavg', 'utf8').split(' ').slice(0, 3).join(' ');
  appendFileSync(OUT, `${JSON.stringify(m)}\n`);
}

/** Holds a play to the margin: nothing heard before start - lead or after end + tail, every window placed and the span's own tone heard whole. */
function hold(m: Measure, what: string): void {
  expect.soft(m.unplaced, `${what}: windows heard that no step of the recording explains`).toBe(0);
  expect.soft(m.sureMs, `${what}: how sure the placing is, ms`).toBeLessThanOrEqual(15);
  expect.soft(m.startMs, `${what}: first second heard less the start, ms`).toBeGreaterThanOrEqual(-ms(MARGIN.lead));
  expect.soft(m.startMs, `${what}: first second heard less the start, ms (inside.lead: the start lost to the player)`).toBeLessThanOrEqual(ms(MARGIN.inside.lead));
  expect.soft(m.endMs, `${what}: last second heard less the end, ms`).toBeLessThanOrEqual(ms(MARGIN.tail));
  expect.soft(m.lostMs, `${what}: ms of the span's own tone not heard`).toBeLessThanOrEqual(0);
}

/** The start of a play seeks the element and mutes it until its second is at the span's start, then unmutes it (mw-ar5k42b.58). Headless Chromium takes a muted element for silent
 * and can snap its second to the wall clock (mw-ar5k42b.46), so the first sound heard must be within START_WITHIN of the span's start both ways, not only not before it by more than the
 * margin, and the play must have had its unmute (the second the element read then is logged, relative to the start, for each play). */
const START_WITHIN = 0.05;
/** The first unmute is lifted at 'loadedmetadata', before the seek is in and the sound begins (mw-fnvjof.17.248): 0 to 3 ms from the start in 24 plays under load, 0 to 20 ms when it waited for 'seeked'
 * (a page task run 24 ms late on a busy host lost the start of the span: the first sound 53 ms from it). */
const UNMUTE_WITHIN = 0.02;
function holdStartWhole(m: Measure, cold: boolean, after: { unmutes: Unmute[]; mutes: number }, before: { unmutes: Unmute[]; mutes: number }, start: number, what: string): void {
  const unmutes = after.unmutes.slice(before.unmutes.length);
  const mutes = after.mutes - before.mutes;
  console.log(`unmute: ${what}: muted ${mutes}x, unmuted ${unmutes.length}x at element second ${unmutes.map((u) => `${ms(u.second - start)} ms from the start (readyState ${u.readyState}, seeking ${u.seeking})`).join('; ')}; first sound ${m.startMs} ms from the start`);
  if (OUT) appendFileSync(OUT, `${JSON.stringify({ unmute: what, startMs: m.startMs, mutes, unmutesMs: unmutes.map((u) => ms(u.second - start)), readyStates: unmutes.map((u) => u.readyState) })}\n`);
  // a play on a freshly loaded element (cold) is seeked short of the start and muted; Play again seeks the element to the start before it plays, so it is never short of it and never muted
  expect.soft(mutes, `${what}: the play ${cold ? 'seeked the element short of the start and muted it' : 'was not muted'}`).toBe(cold ? 1 : 0);
  expect.soft(unmutes.length, `${what}: every mute was followed by an unmute`).toBe(mutes);
  expect.soft(Math.abs(m.startMs), `${what}: first second heard less the start, ms (within ${ms(START_WITHIN)})`).toBeLessThanOrEqual(ms(START_WITHIN));
  // the first unmute is where the element's second was at the start: never a second that was snapped on or back, and never later than UNMUTE_WITHIN after it
  if (unmutes.length > 0) expect.soft(Math.abs(unmutes[0].second - start), `${what}: the element's second at the first unmute less the start, ms (within ${ms(UNMUTE_WITHIN)})`).toBeLessThanOrEqual(ms(UNMUTE_WITHIN));
}

/** Saves his English speed through raw IndexedDB, as the app writes it. */
async function keepRate(page: Page, rate: number): Promise<void> {
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
}

async function start(page: Page, rate: number): Promise<string[]> {
  await openUnlocked(page);
  await honestSpeech(page, { msPerWord: 5 });
  await hearThePage(page);
  const other = await serveTones(page);
  await page.goto('/#/?b=tit&c=3&view=english&weave=off');
  await expect(page.getByRole('heading', { name: 'Titus 3', level: 1 })).toBeVisible();
  await keepRate(page, rate);
  return other;
}

/** Opens Titus 3 at `hash` (a verse or a section) in the Verse view, on Listen, with the book's timings loaded and the ear ready. */
async function openListen(page: Page, hash: string): Promise<Locator> {
  await page.goto(`/#/?b=tit&c=3&${hash}&view=english&weave=off`);
  await page.reload();
  const view = page.getByRole('region', { name: 'Verse view' });
  await expect(view).toBeVisible();
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some((e) => e.name.endsWith('/data/audio/msb-david/tit.json')))).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as unknown as { lampasEar: { ready: boolean; failed: string | null } }).lampasEar.failed ?? (window as unknown as { lampasEar: { ready: boolean } }).lampasEar.ready)).toBe(true);
  const listen = view.getByRole('button', { name: 'Listen', exact: true });
  if ((await listen.getAttribute('aria-pressed')) !== 'true') await listen.click();
  return view;
}

/** Taps the Verse view's Play (or Play again) until the tap is taken (the element's play()): the view drops a tap for its first 600 ms. Gives the window it began at. */
async function tapPlay(page: Page, view: Locator): Promise<number> {
  const before = await earState(page);
  await expect(async () => {
    if ((await earState(page)).plays > before.plays) return;
    const play = view.getByRole('button', { name: /^Play (again|verses? )/ });
    if (await play.isVisible()) await play.click();
    expect((await earState(page)).plays, 'the Play tap was taken').toBeGreaterThan(before.plays);
  }).toPass({ intervals: [250, 500, 1000], timeout: 30_000 });
  return before.heard;
}

const bar = (page: Page) => page.getByRole('region', { name: 'Speaking', exact: true });
const onBar = (page: Page, name: string) => bar(page).getByRole('button', { name, exact: true });

/** Waits until the element's second is past `second` (and it plays). */
async function until(page: Page, second: number): Promise<void> {
  await page.waitForFunction(
    (s) => {
      const a = (window as unknown as { lampasEar: { element: HTMLMediaElement | null } }).lampasEar.element;
      return !!a && !a.paused && a.currentTime > s;
    },
    second,
    { polling: 20, timeout: 30_000 },
  );
}

const CASES = [
  { name: 'one verse alone (Titus 3:5, silence either side)', hash: 'v=5', from: 5, to: 5 },
  { name: 'one verse run into and on from with no silence (Titus 3:7)', hash: 'v=7', from: 7, to: 7 },
  { name: 'a section (Titus 3:9-11, run into from 3:8 and on into 3:12)', hash: 'p=9', from: 9, to: 11 },
] as const;

for (const rate of [1, 1.25]) {
  test.describe(`at ${rate}x, what the page emits stays within the margin of the span`, () => {
    for (const kase of CASES) {
      test(`${kase.name}`, async ({ page, browserName }) => {
        test.setTimeout(60_000 + PLAYS * 20_000);
        const other = await start(page, rate);
        const [, from] = spanOf(kase.from);
        const [, , to] = spanOf(kase.to);
        let view: Locator | null = null;
        let ran = 0;
        for (let play = 1; play <= PLAYS; play++) {
          // odd plays on a freshly loaded page (the element made cold, its src new), even ones by Play again on the element just played
          const cold = play % 2 === 1;
          if (cold || !view) view = await openListen(page, kase.hash);
          const before = await unmutesOf(page);
          const mark = await tapPlay(page, view);
          await expect(view.getByRole('button', { name: 'Play again', exact: true })).toBeVisible({ timeout: 60_000 });
          const got = await windowsSince(page, mark);
          const after = await unmutesOf(page);
          if (process.env.LAMPAS_MARGIN_DEBUG) {
            const loud = got.findIndex((w) => w.rms >= HEARD_RMS);
            console.log(got.slice(Math.max(0, loud - 2), loud + 12).map((w) => `${w.t.toFixed(3)} rms ${w.rms.toFixed(4)} hz ${w.hz.toFixed(1)} step ${stepOf(w.hz)}`).join('\n'));
          }
          const heardOf = place(got, rate);
          const m = measure(heardOf, kase.name, rate, play, cold, from, to, browserName);
          report(m);
          console.log(`margin: ${JSON.stringify(m)}`);
          if (process.env.LAMPAS_MARGIN_DEBUG) console.log(heardOf.detail.join('\n'));
          hold(m, `${kase.name} at ${rate}x, play ${play}`);
          holdStartWhole(m, cold, after, before, from, `${kase.name} at ${rate}x, play ${play}`);
          ran++;
        }
        console.log(`start: ${ran} plays of ${kase.name} at ${rate}x, each with its seek-then-unmute second logged`);
        expect(ran, 'plays run').toBe(PLAYS);
        expect(await spoken(page), 'the recording read it, not the phone').toEqual([]);
        expect(other).toEqual([]);
      });
    }
  });
}

test.describe('every way the player starts or stops a span is heard the same way', () => {
  test('pause then resume inside a verse: nothing from outside it, and it goes on from where it was held', async ({ page, browserName }) => {
    test.setTimeout(120_000);
    const other = await start(page, 1);
    const [, from, to] = spanOf(5);
    const view = await openListen(page, 'v=5');
    const mark = await tapPlay(page, view);
    await until(page, from + 1);
    await onBar(page, 'Pause').click();
    await page.waitForTimeout(600); // a real-time wait: held paused for a moment, in which nothing must be heard
    await onBar(page, 'Resume').click();
    await expect(view.getByRole('button', { name: 'Play again', exact: true })).toBeVisible({ timeout: 60_000 });
    const heard = place(await windowsSince(page, mark), 1);
    const m = measure(heard, 'pause then resume (Titus 3:5)', 1, 1, true, from, to, browserName);
    report(m);
    console.log(`margin: ${JSON.stringify(m)}\n${heard.detail.join('\n')}`);
    hold(m, 'pause then resume');
    expect(heard.runs.length, 'two runs: before the pause and after the resume').toBe(2);
    // the resume goes on from the second it was held at: no jump back or on by more than the margin
    expect(Math.abs(heard.runs[1].from - heard.runs[0].to), 'seconds between where it was held and where it went on').toBeLessThanOrEqual(MARGIN.tail);
    expect(await spoken(page)).toEqual([]);
    expect(other).toEqual([]);
  });

  test('Next verse inside a section: the next verse starts at its own start, and the section ends at its end', async ({ page, browserName }) => {
    test.setTimeout(120_000);
    const other = await start(page, 1);
    const [, from] = spanOf(9);
    const [, start10] = spanOf(10);
    const [, , to] = spanOf(11);
    const view = await openListen(page, 'p=9');
    const mark = await tapPlay(page, view);
    await until(page, from + 0.8);
    await onBar(page, 'Next verse').click();
    await expect(view.getByRole('button', { name: 'Play again', exact: true })).toBeVisible({ timeout: 60_000 });
    const heard = place(await windowsSince(page, mark), 1);
    const m = measure(heard, 'Next verse (Titus 3:9 to 3:10)', 1, 1, true, from, to, browserName);
    m.lostMs = 0; // verse 9 is left part way by the skip
    report(m);
    console.log(`margin: ${JSON.stringify(m)}\n${heard.detail.join('\n')}`);
    hold(m, 'Next verse');
    expect(heard.runs.length, 'verse 9, then verse 10 on').toBeGreaterThanOrEqual(2);
    // everything after the skip is verses 10 and 11: nothing of the rest of verse 9 (the seek's first sound, wherever it lands, is inside them)
    for (const run of heard.runs.slice(1)) {
      expect(run.from - start10, 'a second heard after the skip less verse 10’s start').toBeGreaterThanOrEqual(-MARGIN.lead);
      expect(run.to - to).toBeLessThanOrEqual(MARGIN.tail);
    }
    expect(await spoken(page)).toEqual([]);
    expect(other).toEqual([]);
  });

  // A section never crosses a chapter (src/data/passage.ts: a passage ends at its chapter's end), so the one span that crosses is the header's Play, which reads on into
  // the next chapter as a chapter read from its beginning: its announcement is played (mw-82lb97i.28's rule for a crossing). This says what is heard there.
  test('the header’s Play across a chapter’s end: Titus 2 stops at its end, and what is heard of Titus 3’s announcement is said', async ({ page, browserName }) => {
    test.setTimeout(180_000);
    const other = await start(page, 1.25);
    await page.goto('/#/?b=tit&c=2&view=english&weave=off');
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Titus 2', level: 1 })).toBeVisible();
    await expect.poll(() => page.evaluate(() => (window as unknown as { lampasEar: { ready: boolean } }).lampasEar.ready)).toBe(true);
    await expect.poll(() => page.evaluate(() => performance.getEntriesByType('resource').some((e) => e.name.endsWith('/data/audio/msb-david/tit.json')))).toBe(true);
    const mark = (await earState(page)).heard;
    await page.getByRole('button', { name: 'Read from the top', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Titus 3', level: 1 })).toBeVisible({ timeout: 60_000 });
    const [, v1] = spanOf(1);
    await expect.poll(() => page.evaluate(() => (window as unknown as { lampasEar: { element: HTMLMediaElement | null } }).lampasEar.element?.src ?? ''), { timeout: 30_000 }).toContain('tone-verses-3');
    await until(page, v1 + 0.6);
    await page.getByRole('button', { name: 'Stop', exact: true }).first().click();
    const heard = place(await windowsSince(page, mark), 1.25);
    console.log(`crossing:\n${heard.detail.join('\n')}`);
    expect(heard.unplaced).toBe(0);
    expect(heard.runs.length, 'Titus 2, then Titus 3').toBeGreaterThanOrEqual(2);
    const [, , end15] = spanOf(15);
    expect(heard.runs[0].to - end15, 'Titus 2 heard past its last verse’s end, s').toBeLessThanOrEqual(MARGIN.tail);
    const titleHeard = heard.runs.slice(1).some((r) => r.from < TONES.title[1]);
    const line = `the crossing into Titus 3 ${titleHeard ? 'PLAYS' : 'does not play'} its announcement (heard from ${heard.runs[1].from.toFixed(3)} s; the announcement is 0-${TONES.title[1]} s)`;
    console.log(line);
    if (OUT) appendFileSync(OUT, `${JSON.stringify({ case: 'crossing', titleHeard, runs: heard.runs, browser: browserName })}\n`);
    await shot(page, 'recorded-voice-margin-crossing');
    expect(await spoken(page)).toEqual([]);
    expect(other).toEqual([]);
  });
});
