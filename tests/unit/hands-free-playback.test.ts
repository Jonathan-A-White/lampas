// tests/unit/hands-free-playback.test.ts — what the Hands-free session does to the sound (src/handsFree/playback.ts, mw-rl10piw.6, the epic's risk 2): at the
// wake whatever is sounding is paused BEFORE the recogniser starts, so the recogniser does not hear the Bible; when the exchange is over it goes on, after words
// it did not know and after no words, but not after 'pause'; and when nothing was sounding at the wake nothing is started at the end. For each of the three
// things that sound: the recorded voice (tests/support/fake-audio.ts), the phone's voice reading a chapter and the passage player (the honest speech fake).
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterTimings } from '../../src/data/audioTimings';
import { forgetChapters, type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { handsFreeSeam, resetHandsFree, runHandsFree } from '../../src/handsFree/session';
import { cardOf } from '../../src/markdown/verseLinks';
import { getPassagePlayer, playPassages, stopPassage } from '../../src/speech/passagePlayer';
import { getReading, planOf, startReading, stopReading, subscribeReading } from '../../src/speech/readAloud';
import { resetRecordedVoice } from '../../src/speech/recordedVoice';
import { stubChapterFetch } from '../support/chapter-fetch';
import { stubAudio, type FakeAudio } from '../support/fake-audio';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { serveWakeModel, stubWake, type WakeFake } from '../support/fake-wake';
import { ManualClock } from '../support/manual-clock';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const timeout = ASYNC_WAIT_MS;
const john1 = JSON.parse(readFileSync('public/data/jhn/1.json', 'utf8')) as Chapter;
const plan = planOf(john1.verses, 'english', null);
const TIMINGS: ChapterTimings = {
  audio: 'https://example.test/jhn-1.mp3',
  duration: 600,
  verses: john1.verses.map((v) => [v.n, 3 + (v.n - 1) * 10, 3 + v.n * 10] as [number, number, number]),
};

type Sound = 'the recorded voice' | "the phone's voice" | 'the passage player';
const SOUNDS: Sound[] = ['the recorded voice', "the phone's voice", 'the passage player'];

let wake: WakeFake;
let synth: FakeSynth;
let audio: FakeAudio;
let clock: ManualClock;
/** What happened, in order: the sound pausing and going on, and each recogniser starting (with whether anything was sounding then). */
let order: string[];
let unsubscribe: () => void;

/** Whether anything is heard now: the recording playing, or the phone speaking. */
const sounding = (): boolean => audio.playing() !== null || synth.speaking;

beforeEach(async () => {
  resetHandsFree();
  resetRecordedVoice();
  clearBus();
  forgetChapters();
  clock = new ManualClock();
  handsFreeSeam.clock = clock;
  wake = stubWake();
  stubRecognizer();
  order = [];
  // the recogniser the session opens says when it starts, and whether the Bible could be heard then
  vi.stubGlobal(
    'SpeechRecognition',
    class extends FakeRecognizer {
      start(track?: unknown) {
        order.push(`recogniser starts${sounding() ? ' while the Bible sounds' : ''}`);
        super.start(track);
      }
    },
  );
  synth = stubSpeech([ENGLISH_VOICE]);
  audio = stubAudio();
  stubChapterFetch();
  serveWakeModel();
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await setReaderView('english');
  await setWeave('off');
  unsubscribe = subscribeReading(() => {
    const status = getReading().status;
    if (order[order.length - 1] !== status) order.push(status);
  });
  runHandsFree(true);
  await vi.waitFor(() => expect(wake.listening).toBe(true), { timeout });
});

afterEach(() => {
  unsubscribe();
  resetHandsFree();
  stopPassage();
  stopReading();
  resetRecordedVoice();
  wake.uninstall();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function play(sound: Sound): Promise<void> {
  if (sound === 'the passage player') {
    const card = cardOf('John 1:1-5');
    if (!card) throw new Error('no card');
    playPassages([card]);
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('playing'), { timeout });
  } else startReading({ book: 'jhn', chapter: 1, plan, from: 1, continuous: true, span: 'chapter', ...(sound === 'the recorded voice' ? { recorded: TIMINGS } : {}) });
  await vi.waitFor(() => expect(sounding()).toBe(true), { timeout });
  if (sound === 'the recorded voice') expect(audio.playing()).not.toBeNull();
  else expect(synth.speaking).toBe(true);
  order = [];
}

/** 'Hey Lampas': the session pauses the sound, opens the recogniser, and the phone says it is open. */
async function wakeUp(): Promise<FakeRecognizer> {
  await vi.waitFor(() => expect(wake.listening).toBe(true), { timeout });
  const before = FakeRecognizer.instances.length;
  expect(wake.say()).toBe(true);
  await vi.waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before), { timeout });
  const recogniser = FakeRecognizer.last();
  recogniser.open();
  return recogniser;
}

async function says(recogniser: FakeRecognizer, words: string): Promise<void> {
  recogniser.say([result(words, false)]);
  clock.advance(1500);
}

const paused = async (): Promise<void> => {
  await vi.waitFor(() => expect(getReading().status).toBe('paused'), { timeout });
  expect(sounding()).toBe(false);
};

const goesOn = async (sound: Sound): Promise<void> => {
  await vi.waitFor(() => expect(getReading().status).toBe('reading'), { timeout });
  await vi.waitFor(() => expect(sound === 'the recorded voice' ? audio.playing() !== null : synth.speaking).toBe(true), { timeout });
  if (sound === 'the passage player') expect(getPassagePlayer().state).toBe('playing');
};

/** 'Sorry, I did not get that' is said, and said to its end. */
async function sorrySaid(): Promise<void> {
  await vi.waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain('Sorry, I did not get that'), { timeout });
  synth.finish();
}

describe.each(SOUNDS)('with %s sounding at the wake', (sound) => {
  it('pauses it at the wake, before the recogniser starts', async () => {
    await play(sound);
    await wakeUp();
    await paused();
    expect(order).toEqual(['paused', 'recogniser starts']);
  });

  it('goes on after words it did not know, once it has said so', async () => {
    await play(sound);
    const recogniser = await wakeUp();
    await paused();
    await says(recogniser, 'banana');
    await sorrySaid();
    await goesOn(sound);
  });

  it('goes on after no words', async () => {
    await play(sound);
    await wakeUp();
    await paused();
    clock.advance(6000);
    await goesOn(sound);
  });

  it("does not go on after 'pause'", async () => {
    await play(sound);
    const recogniser = await wakeUp();
    await paused();
    await says(recogniser, 'pause');
    await vi.waitFor(() => expect(wake.listening).toBe(true), { timeout });
    clock.advance(10_000);
    synth.advance(10_000);
    await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
    expect(getReading().status).toBe('paused');
    expect(sounding()).toBe(false);
  });
});

describe('with nothing sounding at the wake', () => {
  it('starts nothing when it closes after words it did not know', async () => {
    const recogniser = await wakeUp();
    await says(recogniser, 'banana');
    await sorrySaid();
    await vi.waitFor(() => expect(wake.listening).toBe(true), { timeout });
    await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
    expect(getReading().status).toBe('idle');
    expect(getPassagePlayer().state).toBe('idle');
    expect(audio.played).toEqual([]);
    expect(synth.speaking).toBe(false);
  });

  it('starts nothing when it closes after no words', async () => {
    await wakeUp();
    clock.advance(6000);
    await vi.waitFor(() => expect(wake.listening).toBe(true), { timeout });
    await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
    expect(getReading().status).toBe('idle');
    expect(getPassagePlayer().state).toBe('idle');
    expect(audio.played).toEqual([]);
    expect(synth.spoken).toEqual([]);
  });
});
