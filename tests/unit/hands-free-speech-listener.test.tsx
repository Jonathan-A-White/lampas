// tests/unit/hands-free-speech-listener.test.tsx — his report (mw-rl10piw.74, 2026-11-25): "in hands-free mode ... I can't really hear the tutor like he'll start and then he gets cut off and
// sometimes he's super soft and then I hit the play button and he's loud but then he's cut off". On Android an open microphone puts the phone's sound on the call route (soft), and a
// microphone opening, closing or moving between inputs as the voice speaks cuts it off (mw-rl10piw.50). So while the tutor speaks in Hands-free no microphone is open: neither the
// wake's nor a command's recogniser. The whole app is drawn on John 3 with Hands-free On, on the kit's fake wake (its `listening` is the wake's microphone), the fake recogniser, the
// honest speech fake and the fake Postern, as tests/unit/hands-free-ask.test.tsx draws it. Every microphone change and every utterance the engine is handed is logged in order, with
// whether the voice was speaking then, and the test reads that log.
import 'fake-indexeddb/auto';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { ASKING } from '../../src/handsFree/ask';
import { handsFreeSeam, resetHandsFree } from '../../src/handsFree/session';
import { forgetTrail } from '../../src/nav/lastRoute';
import { forgetRead } from '../../src/nav/readerRequest';
import { tutorSeat } from '../../src/nav/tutorSeat';
import { tutorTimings } from '../../src/services/tutor';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../support/fake-postern';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { seedHisWords } from '../support/his-words';
import { serveWakeModel, stubWake, type WakeFake } from '../support/fake-wake';
import { ManualClock } from '../support/manual-clock';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const timeout = ASYNC_WAIT_MS;
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';

/** A long answer (over 400 characters, five sentences), as the tutor gives on a chapter of Isaiah. */
const LONG = [
  'Isaiah opens with a courtroom: the heavens and the earth are called as witnesses against a people who have forgotten the Lord who raised them.',
  'Judah is pictured as a body beaten from head to foot, and Jerusalem as a booth left standing in a vineyard after the harvest.',
  'Their feasts and offerings are a weariness to God, because the hands that bring them are full of blood.',
  'Yet the chapter turns on an invitation: come now, let us reason together; though your sins be as scarlet, they shall be as white as snow.',
  'It ends with the promise that Zion shall be redeemed with judgment, and her converts with righteousness.',
].join(' ');

let wake: WakeFake;
let synth: FakeSynth;
let clock: ManualClock;
let fake: FakePostern;

/** What happened, in order: a microphone opened or closed (the wake's, or a recogniser's), or the engine was handed an utterance; with whether the voice was speaking then. */
interface Event {
  what: 'wake open' | 'wake close' | 'recogniser start' | 'recogniser end' | 'speak';
  text?: string;
  speaking: boolean;
  /** at a 'speak': the wake's microphone was open, or a recogniser was listening */
  micOpen?: boolean;
  /** when it happened (performance.now: tests/setup.ts lets Date.now run ahead of real time) */
  at?: number;
}
let events: Event[] = [];
/** Recognisers started and not yet stopped or aborted. */
const live = new Set<FakeRecognizer>();

const spoken = (): string[] => synth.spoken.map((s) => s.text.replace(/\s+/g, ' ').trim());

/** Logs each microphone change and each utterance, on the fakes' own seams. */
function watchMicrophones(): void {
  events = [];
  live.clear();
  const start = wake.start.bind(wake);
  wake.start = async (options) => {
    const opened = (await start(options)) as { ok: boolean; stop?: () => void };
    if (!opened.ok || !opened.stop) return opened;
    events.push({ what: 'wake open', speaking: synth.speaking });
    const stop = opened.stop;
    let closed = false;
    return {
      ...opened,
      stop() {
        if (!closed) events.push({ what: 'wake close', speaking: synth.speaking });
        closed = true;
        stop();
      },
    };
  };
  const make = FakeRecognizer.prototype.start;
  vi.spyOn(FakeRecognizer.prototype, 'start').mockImplementation(function (this: FakeRecognizer, track?: unknown) {
    live.add(this);
    events.push({ what: 'recogniser start', speaking: synth.speaking, at: performance.now() });
    const end = (): void => {
      if (live.delete(this)) events.push({ what: 'recogniser end', speaking: synth.speaking });
    };
    this.stopFn.mockImplementation(() => {
      end();
      if (FakeRecognizer.endsOnStop) this.onend?.();
    });
    this.abortFn.mockImplementation(() => {
      end();
      this.onend?.();
    });
    make.call(this, track);
  });
  const speak = synth.honest.synth.speak.bind(synth.honest.synth);
  synth.honest.synth.speak = (u) => {
    events.push({ what: 'speak', text: u.text, speaking: synth.speaking, micOpen: wake.listening || live.size > 0 });
    speak(u);
  };
}

async function openJohn3(answer: string): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  forgetRead();
  vi.unstubAllGlobals();
  resetHandsFree();
  clock = new ManualClock();
  handsFreeSeam.clock = clock;
  handsFreeSeam.chime = { open: vi.fn<() => void>(), close: vi.fn<() => void>() };
  wake = stubWake();
  stubRecognizer();
  synth = stubSpeech([ENGLISH_VOICE]);
  watchMicrophones();
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { answer, words: [] } };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  serveWakeModel();
  Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: async () => ({ addEventListener: () => {}, release: async () => {} }) } });
  window.localStorage.clear();
  window.localStorage.setItem('lampas.welcome', 'done');
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await setReaderView('english');
  await setWeave('off');
  await db.settings.put({ key: 'handsFree', value: 'on' });
  await seedHisWords();
  window.location.hash = '#/?b=jhn&c=3';
  render(<App />);
  await screen.findByRole('heading', { name: 'John 3', level: 1 });
  await waitFor(() => expect(wake.listening).toBe(true), { timeout });
}

/** He says 'Hey Lampas' and asks; 'Asking the tutor' is said to its end; the tutor answers. */
async function askAloud(question: string): Promise<void> {
  const before = FakeRecognizer.instances.length;
  act(() => void wake.say());
  await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before), { timeout });
  const recogniser = FakeRecognizer.last();
  await waitFor(() => expect(recogniser.startFn).toHaveBeenCalled(), { timeout });
  act(() => recogniser.open());
  act(() => recogniser.say([result(question, false)]));
  act(() => clock.advance(1500));
  await waitFor(() => expect(spoken()).toContain(ASKING), { timeout });
  act(() => synth.finish());
}

/** The voice speaks each sentence of `text` to its end, as the phone reports it (the engine may be handed them one by one or all at once). */
/** When the voice last reached the end of a sentence in hearWhole (performance.now). */
let lastEndAt = 0;

async function hearWhole(text: string): Promise<void> {
  const sentences = text.split(/(?<=\.) /);
  const ended = (sentence: string): boolean => synth.honest.log.some((entry) => entry.outcome === 'ended' && String(entry.text).replace(/\s+/g, ' ').trim().includes(sentence));
  for (let i = 0; i < 50 && !sentences.every(ended); i++) {
    await waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    lastEndAt = performance.now();
    act(() => synth.finish());
  }
  expect(sentences.filter((sentence) => !ended(sentence))).toEqual([]);
}

/** The utterances of `text` the engine was handed, from the first. */
const spokenOf = (text: string): Event[] => {
  const first = events.findIndex((e) => e.what === 'speak' && text.startsWith(e.text?.replace(/\s+/g, ' ').trim().slice(0, 30) ?? '\u0000'));
  return first < 0 ? [] : events.slice(first);
};

afterEach(() => {
  cleanup();
  stopReading();
  resetHandsFree();
  wake?.uninstall();
  delete handsFreeSeam.chime;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Hands-free: while the tutor speaks no microphone is open (mw-rl10piw.74)', () => {
  it('a long answer spoken by itself is said whole with the microphone shut, and the recogniser listens for a follow-up only after its end', async () => {
    expect(LONG.length).toBeGreaterThan(400);
    await openJohn3(LONG);
    await askAloud('ask what is Isaiah 1 about');
    await waitFor(() => expect(spoken().join(' ')).toContain(LONG.slice(0, 40)), { timeout });
    const during = spokenOf(LONG);
    // as the answer's first words go to the engine, neither the wake nor a recogniser holds the microphone
    expect(during[0]).toMatchObject({ what: 'speak', micOpen: false });
    await hearWhole(LONG);
    // the whole answer, sentence by sentence, each to its end: nothing cancelled it and no microphone opened, closed or moved under it
    const answer = synth.honest.log.filter((entry) => LONG.includes(String(entry.text).replace(/\s+/g, ' ').trim()));
    expect(answer.length).toBeGreaterThanOrEqual(5);
    expect(answer.map((entry) => entry.outcome)).toEqual(answer.map(() => 'ended'));
    expect(synth.calls.slice(synth.calls.findIndex((c) => c.startsWith('speak Isaiah opens')))).not.toContain('cancel');
    expect(during.filter((e) => e.what !== 'speak' && e.speaking)).toEqual([]);
    expect(during.filter((e) => e.what === 'speak').every((e) => e.micOpen === false)).toBe(true);
    // after the end, the recogniser opens for his follow-up (no wake word needed)
    const before = during.filter((e) => e.what === 'recogniser start').length;
    await waitFor(() => expect(spokenOf(LONG).filter((e) => e.what === 'recogniser start').length).toBeGreaterThan(before), { timeout });
    expect(getReading().status).toBe('idle');
    // mw-rl10piw.76: not at the answer's end event, while its last words are still leaving the phone: the follow-up's recogniser opens a settle after it
    const followUp = spokenOf(LONG).filter((e) => e.what === 'recogniser start')[before];
    expect((followUp?.at ?? 0) - lastEndAt).toBeGreaterThanOrEqual(140);
  });

  it("his tap on the answer's speaker shuts the microphone before the voice starts (the follow-up's recogniser too), Stop stops it, and the wake listens again after", async () => {
    await openJohn3(LONG);
    await askAloud('ask what is Isaiah 1 about');
    await hearWhole(LONG);
    // the follow-up window: a recogniser listens
    await waitFor(() => expect(live.size).toBe(1), { timeout });
    act(() => FakeRecognizer.last().open());
    act(() => void tutorSeat()?.open());
    const speakers = await screen.findAllByRole('button', { name: 'Read aloud' }, { timeout });
    const speaker = speakers[speakers.length - 1];
    const mark = events.length;
    await user.click(speaker);
    await waitFor(() => expect(spokenOf(LONG).length).toBeGreaterThan(0), { timeout });
    await waitFor(() => expect(events.slice(mark).some((e) => e.what === 'speak')).toBe(true), { timeout });
    const tapped = events.slice(mark);
    const firstSpeak = tapped.findIndex((e) => e.what === 'speak');
    // the recogniser was put down before the voice started, and nothing listens while it speaks
    expect(tapped.slice(0, firstSpeak).map((e) => e.what)).toContain('recogniser end');
    expect(tapped[firstSpeak]).toMatchObject({ micOpen: false });
    expect(wake.listening).toBe(false);
    expect(speaker).toHaveAccessibleName('Stop reading');
    act(() => synth.finish());
    await waitFor(() => expect(events.slice(mark).filter((e) => e.what === 'speak').length).toBeGreaterThan(1), { timeout });
    expect(events.slice(mark).filter((e) => e.what !== 'speak' && e.speaking)).toEqual([]);
    // Stop (the speaker is a stop square while it reads) stops the voice; then the wake listens again
    await user.click(speaker);
    expect(speaker).toHaveAccessibleName('Read aloud');
    await waitFor(() => expect(synth.speaking).toBe(false), { timeout });
    await waitFor(() => expect(wake.listening).toBe(true), { timeout });
  });

  it('the wake word said while the answer is still awaited still cuts the question short and opens a new command', async () => {
    await openJohn3(LONG);
    fake.autoReply = undefined;
    await askAloud('ask what is Isaiah 1 about');
    await waitFor(() => expect(wake.listening).toBe(true), { timeout });
    const before = FakeRecognizer.instances.length;
    act(() => void wake.say());
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before), { timeout });
    // the answer that comes late is kept in the Talk, never spoken
    await fake.answer({ status: 'answered', answer: { answer: LONG, words: [] } });
    await waitFor(async () => expect(await db.talks.count()).toBeGreaterThan(0), { timeout });
    expect(spoken().join(' ')).not.toContain(LONG.slice(0, 40));
  });
});
