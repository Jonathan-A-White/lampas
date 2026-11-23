// tests/unit/hands-free-ask.test.tsx — Hands-free 'ask' (src/handsFree/ask.ts, mw-rl10piw.8) in the cases the feature (features/hands-free-ask.feature) leaves to a unit test: a wake while the answer
// is spoken stops it and opens a new command; an answer carrying a command that needs his tap speaks its words, runs nothing and leaves the offer in the talk; a tutor that cannot answer
// is said so and the Bible goes on; the sentences and the words after 'ask' as the router makes them; no Reader, no tutor. The whole app is drawn (a Reader answers for its chapter), on the kit's
// fake wake, the recogniser driven by hand, the honest speech fake, a spy for the chime port and the fake Postern for the tutor.
import 'fake-indexeddb/auto';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { ASKING, questionAfterAsk, STILL_ANSWERING, TUTOR_FAILED } from '../../src/handsFree/ask';
import { handsFreeSeam, resetHandsFree } from '../../src/handsFree/session';
import { forgetTrail } from '../../src/nav/lastRoute';
import { forgetRead } from '../../src/nav/readerRequest';
import { tutorTimings } from '../../src/services/tutor';
import { bibleTalkRegistry } from '../../src/tutor/registry';
import type { Command } from 'voice-kit/talks';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../support/fake-postern';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { seedHisWords } from '../support/his-words';
import { serveWakeModel, stubWake, type WakeFake } from '../support/fake-wake';
import { ManualClock } from '../support/manual-clock';
import { row, sourceOf } from '../support/sermon-sources';
import { setSermonSources } from '../../src/sermons';
import { closeSermon, hasQueuedSermon } from '../../src/sermons/player';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const timeout = ASYNC_WAIT_MS;
const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const ANSWER = 'Nicodemus was a Pharisee and a ruler of the Jews.';

let wake: WakeFake;
let synth: FakeSynth;
let clock: ManualClock;
let fake: FakePostern;
let chime: { open: ReturnType<typeof vi.fn<() => void>>; close: ReturnType<typeof vi.fn<() => void>> };

const mark = (): string | null | undefined => document.querySelector<HTMLElement>('[data-hands-free-mark] [data-state]')?.getAttribute('data-state');
const spoken = (): string[] => synth.spoken.map((s) => s.text.replace(/\s+/g, ' ').trim());

async function openJohn3(answer: unknown = { answer: ANSWER, words: [] }): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  forgetRead();
  vi.unstubAllGlobals();
  resetHandsFree();
  clock = new ManualClock();
  handsFreeSeam.clock = clock;
  chime = { open: vi.fn<() => void>(), close: vi.fn<() => void>() };
  handsFreeSeam.chime = chime;
  wake = stubWake();
  stubRecognizer();
  synth = stubSpeech([ENGLISH_VOICE]);
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer };
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
  await waitFor(() => expect(document.querySelectorAll('[data-reader] [data-verse]').length).toBeGreaterThan(0));
}

async function readJohn3FromVerse(verse: number): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Read from the top' }));
  await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse: 1 }));
  for (let n = 1; n < verse; n++) act(() => synth.finish());
  await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse }));
}

async function wakeUp(): Promise<FakeRecognizer> {
  await waitFor(() => expect(wake.listening).toBe(true), { timeout });
  const before = FakeRecognizer.instances.length;
  act(() => void wake.say());
  await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before), { timeout });
  await waitFor(() => expect(FakeRecognizer.last().startFn).toHaveBeenCalled());
  act(() => FakeRecognizer.last().open());
  return FakeRecognizer.last();
}

async function says(recogniser: FakeRecognizer, words: string): Promise<void> {
  act(() => recogniser.say([result(words, false)]));
  act(() => clock.advance(1500));
  await act(async () => {});
}

/** 'Asking the tutor' is said to its end; the tutor answers. */
async function untilAnswerIsSpoken(): Promise<void> {
  await waitFor(() => expect(spoken()).toContain(ASKING), { timeout });
  act(() => synth.finish());
}

beforeEach(() => {
  delete handsFreeSeam.chime;
});

afterEach(() => {
  act(() => closeSermon());
  setSermonSources(undefined);
  cleanup();
  stopReading();
  resetHandsFree();
  wake?.uninstall();
  delete handsFreeSeam.chime;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the words after 'ask'", () => {
  it("are the question as he said it, with 'ask' and 'ask the tutor' left off", () => {
    expect(questionAfterAsk('ask who was Nicodemus')).toBe('who was Nicodemus');
    expect(questionAfterAsk('Ask the tutor, Who was Nicodemus?')).toBe('Who was Nicodemus?');
    expect(questionAfterAsk('please ask what does logos mean')).toBe('what does logos mean');
    expect(questionAfterAsk('ask')).toBe('');
  });
});

describe('Hands-free ask', () => {
  it('a wake while the answer is spoken stops the speech and opens a new command', async () => {
    await openJohn3();
    const first = await wakeUp();
    await says(first, 'ask who was Nicodemus');
    await untilAnswerIsSpoken();
    await waitFor(() => expect(spoken().join(' ')).toContain(ANSWER), { timeout });
    expect(synth.speaking).toBe(true);
    const before = FakeRecognizer.instances.length;
    act(() => void wake.say());
    // the speech is cut (the fake's log shows the cancel) and the session is listening for a command
    await waitFor(() => expect(synth.speaking).toBe(false), { timeout });
    expect(synth.calls[synth.calls.length - 1]).toBe('cancel');
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before), { timeout });
    act(() => FakeRecognizer.last().open());
    await waitFor(() => expect(mark()).toBe('listening'));
  });

  it('an answer carrying a command that needs his tap speaks its words, runs nothing and leaves the offer in the talk', async () => {
    // the Reader's registry holds no command that needs a tap (the sheets register theirs), so one is stood in for it, as tests/unit/tutor-looking.test.tsx does
    let ran = 0;
    const confirm: Command = { name: 'delete-note', tell: 'Deletes a note', kind: 'confirm', offer: () => 'Delete the note?', run: async () => ((ran += 1), { said: 'Deleted' }) };
    const registry = bibleTalkRegistry();
    const real = registry.command.bind(registry);
    vi.spyOn(registry, 'command').mockImplementation((name) => (name === confirm.name ? confirm : real(name)));
    vi.spyOn(registry, 'refuses').mockImplementation((name) => (name === confirm.name ? undefined : undefined));
    await openJohn3({
      answer: 'I can delete that note. Tap the button if you want it deleted.',
      words: [],
      do: [{ name: 'delete-note' }],
    });
    const first = await wakeUp();
    await says(first, 'ask delete my note about Nicodemus');
    await untilAnswerIsSpoken();
    // the words are spoken (the Talk sheet is closed) and nothing ran; the turn holds the offer, which waits for his tap
    await waitFor(() => expect(spoken().join(' ')).toContain('I can delete that note.'), { timeout });
    await waitFor(async () => expect(await db.talks.count()).toBeGreaterThan(0), { timeout });
    const [turn] = await db.talks.toArray();
    expect(turn.done).toEqual([{ name: 'delete-note', kind: 'confirm', said: 'Delete the note?', args: {} }]);
    expect(ran).toBe(0);
  });

  describe('a sermon the answer plays (the tutor\'s play-sermon, mw-qtu3zvz.84)', () => {
    const clay = { ...row('tv', 'clay', 'Lightning in Clay Pots', ['jhn', 3, 1, 21], 'Phil Morgan'), open: { url: 'https://www.youtube.com/watch?v=clay_pots_1' } };
    const SAYS = 'Lightning in Clay Pots, preached by Phil Morgan.';
    const playing = { answer: SAYS, words: [], do: [{ name: 'play-sermon', args: { sermon: 'tv:clay' } }] };
    const player = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-sermon-player]');

    it('starts in the player only after the answer has been spoken, with no tap', async () => {
      setSermonSources([sourceOf('tv', 'Test Video', { jhn: [clay] })]);
      await openJohn3(playing);
      const first = await wakeUp();
      await says(first, 'ask play a sermon on this chapter');
      await untilAnswerIsSpoken();
      await waitFor(() => expect(spoken().join(' ')).toContain(SAYS), { timeout });
      // the title and preacher are being said: nothing plays over them
      expect(synth.speaking).toBe(true);
      expect(player()).toBeNull();
      act(() => synth.finish());
      await waitFor(() => expect(player()).not.toBeNull(), { timeout });
      expect(player()).toHaveAttribute('aria-label', 'Lightning in Clay Pots');
    });

    it('does not start when a wake cut the answer short', async () => {
      setSermonSources([sourceOf('tv', 'Test Video', { jhn: [clay] })]);
      await openJohn3(playing);
      const first = await wakeUp();
      await says(first, 'ask play a sermon on this chapter');
      await untilAnswerIsSpoken();
      await waitFor(() => expect(spoken().join(' ')).toContain(SAYS), { timeout });
      act(() => void wake.say());
      await waitFor(() => expect(synth.speaking).toBe(false), { timeout });
      // a real-time wait: a window in which nothing must happen (the sermon must stay unopened)
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(player()).toBeNull();
    });

    it('does not start when a wake came before the answer did (the late answer is not a typed one)', async () => {
      setSermonSources([sourceOf('tv', 'Test Video', { jhn: [clay] })]);
      await openJohn3(playing);
      // the tutor holds its answer: the wake comes while 'Asking the tutor' is said and the answer is waited for
      fake.autoReply = undefined;
      const first = await wakeUp();
      await says(first, 'ask play a sermon on this chapter');
      await waitFor(() => expect(spoken()).toContain(ASKING), { timeout });
      act(() => synth.finish());
      await waitFor(() => expect(wake.listening).toBe(true), { timeout });
      const before = FakeRecognizer.instances.length;
      act(() => void wake.say());
      await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before), { timeout });
      // the answer arrives late
      await fake.answer({ status: 'answered', answer: playing });
      await waitFor(async () => expect(await db.talks.count()).toBeGreaterThan(0), { timeout });
      // a real-time wait: a window in which nothing must happen (the sermon must stay unopened)
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(player()).toBeNull();
      // and the sermon the late answer named is not left held for a later answer to start
      expect(hasQueuedSermon()).toBe(false);
    });
  });

  it('a second ask while the first still waits is refused as busy, and the late answer to the first question is not spoken to the second command (mw-qtu3zvz.271)', async () => {
    await openJohn3();
    // the tutor holds its answer: a wake comes while it is waited for, and a second 'ask' is said before it arrives
    fake.autoReply = undefined;
    const first = await wakeUp();
    await says(first, 'ask who was Nicodemus');
    await waitFor(() => expect(spoken()).toContain(ASKING), { timeout });
    act(() => synth.finish());
    await waitFor(() => expect(wake.listening).toBe(true), { timeout });
    const second = await wakeUp();
    await says(second, 'ask who was Pilate');
    // the second command is refused as busy (nothing more was sent): the tutor is still answering the first question
    await waitFor(() => expect(spoken()).toEqual([ASKING, ASKING]), { timeout });
    act(() => synth.finish());
    await waitFor(() => expect(spoken()).toContain(STILL_ANSWERING), { timeout });
    // the first request's answer arrives late; nobody may speak it as the answer to the second command
    await fake.answer({ status: 'answered', answer: { answer: ANSWER, words: [] } });
    // only the first question was ever sent
    expect(fake.received).toHaveLength(1);
    await waitFor(async () => expect(await db.talks.count()).toBeGreaterThan(0), { timeout });
    // a real-time wait: a window in which nothing must happen (the late answer must not be spoken)
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(spoken().filter((text) => text.includes(ANSWER))).toEqual([]);
    const turns = await db.talks.toArray();
    expect(turns.map((turn) => turn.q)).toEqual(['who was Nicodemus']);
  });

  it("a tutor that cannot answer is said so with the Talk's own reason, and the session waits again with the Bible going on", async () => {
    await openJohn3();
    fake.autoReply = { status: 'failed', reason: 'no model' };
    await openJohn3Reading();
    const first = await wakeUp();
    await says(first, 'ask who was Nicodemus');
    await untilAnswerIsSpoken();
    await waitFor(() => expect(spoken().join(' ')).toContain(TUTOR_FAILED), { timeout });
    act(() => synth.finish());
    expect(spoken().join(' ')).toContain('Could not reach the tutor');
    // it closes: the wake waits again and John 3 goes on
    await waitFor(() => expect(mark()).toBe('waiting'), { timeout });
    await waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse: 2 }), { timeout });
  });
});

async function openJohn3Reading(): Promise<void> {
  await readJohn3FromVerse(2);
}
