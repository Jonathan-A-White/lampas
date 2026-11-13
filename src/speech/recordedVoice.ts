// src/speech/recordedVoice.ts — the recorded voice (mw-82lb97i.3, docs/read-aloud.md 'The recorded voice'): a chapter that has verse timings (src/data/audioTimings.ts) is
// read by the publisher's own MP3, played from their server by ONE audio element made on first use and kept for the app's life, so a later chapter needs no new tap.
// It has no CORS attribute (the publisher's server sends no CORS headers: with one the element would refuse to play) and the MP3 is never fetched by script, copied or cached:
// the element plays it as any page's <audio> would. This file is the sound only: src/speech/readAloud.ts keeps the reading (its verses, its span, crossing, Listen),
// and asks this file to play from a verse to a second (playRecording), seek by verse (seekToVerse), pause, resume and stop. It tells its ONE listener the verse
// at each 'timeupdate' (never requestAnimationFrame alone, which stops when the page hides), the span's end (a timer aimed at it, re-aimed on a change of speed, a
// pause, a seek and each 'timeupdate', and 'timeupdate' past it), and a failure (play() refused, the element's 'error', or no 'playing' within PLAYING_WAIT_MS).
// The end is judged by where the SOUND is (soundAt, mw-82lb97i.18): the element's second moves in steps (at each 'timeupdate' on a phone, in bursts in Chromium), so a timer
// that read it alone found it a step behind, waited again and let the next 'timeupdate' land past the end: his John 1:50 ran on into 'Then He declar…' of verse 51.
// Whether he wants it is his Bible voice setting (wantsRecording(), mw-82lb97i.6); recordingFor() is the rule a tap decides by, with no wait.
import { sourceLanguage, type Chapter } from '../data/chapter';
import { chapterTimingsNow, spanOf, verseAt, type ChapterTimings } from '../data/audioTimings';
import { bibleVoiceSetting, type BibleVoice } from '../settings/definitions/bibleVoice';
import { connectionKind } from './connection';
import type { PlanVerse } from './readAloud';

/** The recorded voices Lampas knows: the folder of their timings under /data/audio/. */
export type RecordedVoiceId = 'msb-david';

let chosen: BibleVoice = bibleVoiceSetting.default;

/** The recorded voice the Bible is read in, or null for the phone's voice: his Bible voice setting (src/settings/definitions/bibleVoice.ts, handed here by src/speech/settingsSync.ts)
 * with the kind of connection (src/speech/connection.ts): 'msb-david' always; 'msb-david-wifi' unless the phone says it is on mobile data (a phone that cannot tell, null, is taken for Wi-Fi: it is the start, and it could not be offered David otherwise,
 * mw-zbgo4ep.30); 'phone' never.
 * It is asked when a chapter starts (the tap, and each crossing into a next chapter), never in the middle of one: a chapter that began in one voice finishes in it. */
export function wantsRecording(): RecordedVoiceId | null {
  return recordingWanted(chosen);
}

/** The rule of wantsRecording for a Bible voice setting handed in (the Reader's, as it follows the setting: mw-zbgo4ep.33): whether David could play it on this connection. */
export function recordingWanted(voice: BibleVoice | undefined): RecordedVoiceId | null {
  if (voice === 'msb-david') return 'msb-david';
  if (voice === 'msb-david-wifi' && connectionKind() !== 'other') return 'msb-david';
  return null;
}

/** The Bible voice setting as last told here. */
export const bibleVoiceChosen = (): BibleVoice => chosen;

/** Recording on Wi-Fi only is chosen and the phone says it is on mobile data: David is held back, and the phone's voice reads (voiceDecision.ts says why). */
export const heldBackByData = (): boolean => chosen === 'msb-david-wifi' && connectionKind() === 'other';

/** Whether this chapter and these verses could be read by a recording at all, whatever he chose: the MSB's New Testament, every run English, and the phone online. */
export function recordingEligible(chapter: Chapter | null, verses: readonly PlanVerse[]): chapter is Chapter {
  if (!chapter || verses.length === 0) return false;
  if (chapter.translation !== 'msb' || sourceLanguage(chapter) !== 'grc') return false;
  if (!verses.every((v) => v.runs.every((r) => r.language === 'english'))) return false;
  return !(typeof navigator !== 'undefined' && navigator.onLine === false);
}

/** Tells the voice his Bible voice setting holds (the settings sync's, and a jsdom test's). */
export function setBibleVoice(voice: BibleVoice): void {
  chosen = voice;
}

/** The timings to read `verses` of this chapter by, or undefined for the phone's voice: decided at the tap with nothing awaited. All must hold: he wants the recording,
 * the chapter is the MSB's New Testament (no Old Testament, no Septuagint), every run of every verse to be read is English (the English view with nothing woven: the
 * recording reads the MSB's English only), the chapter's timings are already loaded and have every verse, and the phone is not offline. */
export function recordingFor(book: string, chapter: Chapter | null, verses: readonly PlanVerse[]): ChapterTimings | undefined {
  if (!wantsRecording() || !recordingEligible(chapter, verses)) return undefined;
  const timings = chapterTimingsNow(book, chapter.chapter);
  if (!timings || !verses.every((v) => spanOf(timings, v.n) !== null)) return undefined;
  return timings;
}

/** What the recording tells the reading. */
export interface RecordingListener {
  /** the verse at the recording's second changed */
  verse(n: number): void;
  /** the span's end was reached (or the recording's own end) */
  reached(): void;
  /** it cannot be played: the reading goes on in the phone's voice */
  failed(): void;
}

/** How long the element may take, from play() to its 'playing', before the reading goes to the phone's voice. */
export const PLAYING_WAIT_MS = 8000;

/** The wait, in ms, from `now` (seconds into the recording) to `end` at `rate`: the recording's seconds go by `rate` times as fast. Never below 0. */
export const endWaitMs = (end: number, now: number, rate: number): number => (Math.max(0, end - now) / (rate > 0 ? rate : 1)) * 1000;

/** A timer fires a little early or the recording stalls: the end counts as reached within this many seconds of it. */
const END_SLACK = 0.05;

/** The end timer is aimed this many seconds of the recording BEFORE the end (inside END_SLACK, so a timer on time stops there): a timer on a busy page fires late (on the
 * Laptop at load 30 by 50-100 ms, John 11:35 +59 ms and 17:3 +74 ms past the end when it was aimed at the end itself), and the stop is at or before the end, never past it.
 * Stopping 40 ms early cuts nothing: the aligner leaves each verse's last word 0.25 s of room (scripts/audio-timings/align.py PAD_END). */
export const END_LEAD = 0.04;

/** The longest the element's second is run on by the clock past its last move: a little over one 'timeupdate' (a phone fires one about every 250 ms). */
export const RUN_ON_MS = 300;

let element: HTMLAudioElement | null = null;
let rate = 1;
let timings: ChapterTimings | null = null;
let endSecond = Infinity;
let listener: RecordingListener | null = null;
let lastVerse: number | null = null;
/** where the reading asked to start: applied again once the recording's metadata is in, should the browser have dropped a seek made before it */
let pendingStart: number | null = null;
/** the reading wants sound now (play() asked for and not paused since): a play() refused after a pause is not a failure */
let wantPlaying = false;
/** the play() asked for last: an answer to an older one is ignored */
let playToken = 0;
let endTimer: ReturnType<typeof setTimeout> | null = null;
let endAimedMs: number | null = null;
let playingWatch: ReturnType<typeof setTimeout> | null = null;
/** the element's second when it was last seen to change, and the clock (performance.now()) then */
let seenSecond = Number.NaN;
let seenAt = 0;
/** its second has been seen to move on since the last play, seek or wait: only a recording seen to play is run on by the clock (one that stalls is not) */
let moving = false;

/** Forgets the element's movement: after a play, a seek, a pause or a wait for data, its second is trusted alone until it is seen to move on again. */
function holdStill(): void {
  moving = false;
  seenSecond = element?.currentTime ?? Number.NaN;
  seenAt = performance.now();
}

/** Where the sound is, in seconds of the recording: the element's second, run on by the clock since it last moved (at `rate`, for at most RUN_ON_MS) while it is seen
 * to play forward. Its second moves in steps (each 'timeupdate'), so read alone it can be a step behind what is heard. */
function soundAt(): number {
  if (!element) return Number.NaN;
  const second = element.currentTime;
  const now = performance.now();
  if (second !== seenSecond) {
    moving = wantPlaying && !element.seeking && second > seenSecond;
    seenSecond = second;
    seenAt = now;
  }
  if (!moving || !wantPlaying) return second;
  return second + (Math.min(Math.max(0, now - seenAt), RUN_ON_MS) / 1000) * rate;
}

function clearEndTimer(): void {
  if (endTimer !== null) clearTimeout(endTimer);
  endTimer = null;
  endAimedMs = null;
}

function clearPlayingWatch(): void {
  if (playingWatch !== null) clearTimeout(playingWatch);
  playingWatch = null;
}

/** Aims the end timer at END_LEAD before the span's end from the second the sound is at, at its speed; a paused or ended recording has none. */
function aimEnd(): void {
  clearEndTimer();
  if (!element || !wantPlaying || !listener || !Number.isFinite(endSecond)) return;
  const wait = endWaitMs(endSecond - END_LEAD, soundAt(), rate);
  endAimedMs = wait;
  endTimer = setTimeout(() => {
    endTimer = null;
    endAimedMs = null;
    if (!element || !wantPlaying) return;
    // the recording stalled (buffering) or the timer came early: aim again rather than cut a word off
    if (soundAt() < endSecond - END_SLACK) return aimEnd();
    reach();
  }, wait);
}

/** The wait the end timer is aimed at, in ms, or null when none is (a test's). */
export const endTimerMs = (): number | null => endAimedMs;

function reach(): void {
  const to = listener;
  halt();
  to?.reached();
}

function fail(): void {
  const to = listener;
  halt();
  to?.failed();
}

/** Pauses the element and drops the listener: nothing more is told. */
function halt(): void {
  wantPlaying = false;
  playToken++;
  listener = null;
  pendingStart = null;
  clearEndTimer();
  clearPlayingWatch();
  element?.pause();
  holdStill();
}

function tell(): void {
  if (!element || !timings || !listener) return;
  const now = element.currentTime;
  if (pendingStart !== null) {
    if (now + END_SLACK < pendingStart) return; // the start's seek is not in yet
    pendingStart = null;
  }
  // at the span's end the verse after it is never told (it may start on the very second the span ends)
  if (soundAt() >= endSecond - END_SLACK) return reach();
  const n = verseAt(timings, now);
  if (n !== null && n !== lastVerse) {
    lastVerse = n;
    listener.verse(n);
  }
  // the second is fresh: the end timer is aimed again from it, so it never waits for the next 'timeupdate'
  aimEnd();
}

function make(): HTMLAudioElement {
  const audio = new Audio();
  audio.preload = 'auto';
  audio.preservesPitch = true;
  audio.addEventListener('timeupdate', () => {
    if (wantPlaying) tell();
  });
  audio.addEventListener('playing', () => {
    clearPlayingWatch();
    holdStill();
    aimEnd();
  });
  audio.addEventListener('seeking', () => holdStill());
  // no data yet: the sound has stopped where the element's second is
  audio.addEventListener('waiting', () => {
    holdStill();
    aimEnd();
  });
  audio.addEventListener('seeked', () => {
    holdStill();
    aimEnd();
  });
  audio.addEventListener('ratechange', () => aimEnd());
  audio.addEventListener('loadedmetadata', () => {
    if (pendingStart !== null && Math.abs(audio.currentTime - pendingStart) > END_SLACK) audio.currentTime = pendingStart;
  });
  audio.addEventListener('ended', () => {
    if (listener && wantPlaying) reach();
  });
  audio.addEventListener('error', () => {
    if (listener) fail();
  });
  return audio;
}

/** The one element, made on first use. */
function audio(): HTMLAudioElement {
  element ??= make();
  return element;
}

/** The one element, or null before the first recording (a test's, and the media session's later). */
export const recordingElement = (): HTMLAudioElement | null => element;

/** Plays the element now: from a tap, nothing may be awaited before this. A refusal, or no 'playing' in time, is a failure. */
function play(): void {
  const el = audio();
  wantPlaying = true;
  const mine = ++playToken;
  el.playbackRate = rate;
  holdStill();
  clearPlayingWatch();
  playingWatch = setTimeout(() => {
    playingWatch = null;
    if (mine === playToken && wantPlaying && listener) fail();
  }, PLAYING_WAIT_MS);
  let started: Promise<void> | undefined;
  try {
    started = el.play();
  } catch {
    return fail();
  }
  started?.catch(() => {
    if (mine === playToken && wantPlaying && listener) fail();
  });
  aimEnd();
}

/** Plays `recording` from the start of verse `from` (second 0 for its first verse, the narrator's title included) to `until` seconds, telling `to` as it goes. The
 * element and its src are kept when it is the recording already loaded. Call it straight from the tap. */
export function playRecording(recording: ChapterTimings, from: number, until: number, to: RecordingListener): boolean {
  halt();
  const el = audio();
  if (timings !== recording || el.getAttribute('src') !== recording.audio) el.src = recording.audio;
  timings = recording;
  listener = to;
  endSecond = until;
  if (!seekToVerse(from)) {
    listener = null;
    return false;
  }
  play();
  return true;
}

/** Moves the recording to the start of verse `n` (second 0 for the recording's first verse): the start, Restart and a tapped verse all come here. False when it has no such verse. */
export function seekToVerse(n: number): boolean {
  if (!timings || !element) return false;
  const span = spanOf(timings, n);
  if (!span) return false;
  const start = timings.verses[0]?.[0] === n ? 0 : span.start;
  pendingStart = start;
  element.currentTime = start;
  lastVerse = n;
  holdStill();
  aimEnd();
  return true;
}

/** Holds the recording at the second it is at. */
export function pauseRecording(): void {
  if (!element) return;
  wantPlaying = false;
  playToken++;
  clearEndTimer();
  clearPlayingWatch();
  element.pause();
  holdStill();
}

/** Plays on from the second it was paused at. */
export function resumeRecording(): void {
  if (!element || !listener) return;
  play();
}

/** Stops the recording and forgets its listener: every new reading and every Stop comes here. */
export function stopRecording(): void {
  halt();
}

/** His English speed: the recording plays at it, keeping its pitch; a change while it plays takes effect at once. */
export function setRecordedRate(next: number): void {
  if (!(next > 0)) return;
  rate = next;
  if (element) {
    element.playbackRate = rate;
    aimEnd();
  }
}

/** Forgets the element and everything about it (a test's: each scenario starts with no element). */
export function resetRecordedVoice(): void {
  halt();
  chosen = bibleVoiceSetting.default;
  element = null;
  timings = null;
  lastVerse = null;
  endSecond = Infinity;
  rate = 1;
}
