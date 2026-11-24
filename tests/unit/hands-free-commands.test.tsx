// tests/unit/hands-free-commands.test.tsx — the spoken commands of the first set after 'play' and 'pause' (src/handsFree/commands.ts, mw-rl10piw.7), driven by the wake and the recogniser
// of tests/support, with no Reader drawn (a Reader that is open answers through src/nav/readerRequest.ts, which a test stands in for): 'back a verse' in the recorded voice (the fake audio)
// and the phone's (the speech fake's log); and, for each thing that sounds (the recorded voice, the phone's, the passage player), that 'stop', 'read John 3', 'next chapter' and
// 'previous chapter' take the sound over and leave nothing for the close to go on with (what src/handsFree/playback.ts did to it at the wake and at the close, as in hands-free-playback.test.ts).
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { route } from 'voice-kit/handsfree';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterTimings } from '../../src/data/audioTimings';
import { forgetChapters, type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { questionAfterAsk } from '../../src/handsFree/ask';
import { HELP_LINES, HELP_SPOKEN, SPOKEN_COMMANDS } from '../../src/handsFree/commands';
import { goOnNow } from '../../src/handsFree/playback';
import { handsFreeSeam, resetHandsFree, runHandsFree } from '../../src/handsFree/session';
import { cardOf } from '../../src/markdown/verseLinks';
import { answerReadHere, forgetRead, pendingRead } from '../../src/nav/readerRequest';
import { readerOf } from '../support/routes';
import { getPassagePlayer, playPassages, stopPassage } from '../../src/speech/passagePlayer';
import { getReading, pauseReading, planOf, startReading, stopReading } from '../../src/speech/readAloud';
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
const startOf = (verse: number): number => 3 + (verse - 1) * 10;
const squash = (s: string): string => s.replace(/\s+/g, ' ').trim();
const englishOf = (n: number): string => squash((john1.verses.find((v) => v.n === n)?.e ?? []).map((c) => c.t).join(' '));

type Sound = 'the recorded voice' | "the phone's voice" | 'the passage player';
const SOUNDS: Sound[] = ['the recorded voice', "the phone's voice", 'the passage player'];

let wake: WakeFake;
let synth: FakeSynth;
let audio: FakeAudio;
let clock: ManualClock;
let unanswer: (() => void) | null;

const sounding = (): boolean => audio.playing() !== null || synth.speaking;

beforeEach(async () => {
  resetHandsFree();
  resetRecordedVoice();
  clearBus();
  forgetRead();
  forgetChapters();
  clock = new ManualClock();
  handsFreeSeam.clock = clock;
  wake = stubWake();
  stubRecognizer();
  synth = stubSpeech([ENGLISH_VOICE]);
  audio = stubAudio();
  stubChapterFetch();
  serveWakeModel();
  window.history.replaceState(null, '', '/#/?b=jhn&c=1');
  unanswer = null;
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
  await setReaderView('english');
  await setWeave('off');
  runHandsFree(true);
  await vi.waitFor(() => expect(wake.listening).toBe(true), { timeout });
});

afterEach(() => {
  unanswer?.();
  resetHandsFree();
  stopPassage();
  stopReading();
  resetRecordedVoice();
  forgetRead();
  wake.uninstall();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The Reader of `chapter` is on screen (it answers 'read from here'): what src/Reader.tsx registers while it is open. */
function readerOn(book: string, chapter: number): void {
  unanswer?.();
  window.history.replaceState(null, '', `/#/?b=${book}&c=${chapter}`);
  unanswer = answerReadHere(() => undefined, book, chapter);
}

async function play(sound: Sound, from = 2): Promise<void> {
  if (sound === 'the passage player') {
    const card = cardOf('John 1:1-5');
    if (!card) throw new Error('no card');
    playPassages([card]);
    await vi.waitFor(() => expect(getPassagePlayer().state).toBe('playing'), { timeout });
  } else startReading({ book: 'jhn', chapter: 1, plan, from, continuous: true, span: 'chapter', ...(sound === 'the recorded voice' ? { recorded: TIMINGS } : {}) });
  await vi.waitFor(() => expect(sounding()).toBe(true), { timeout });
  if (sound === 'the recorded voice') audio.advanceTo(startOf(from) + 1);
}

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

/** What the phone is asked to say in the exchange is said to its end. */
async function saidAloud(text: string): Promise<void> {
  await vi.waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain(text), { timeout });
  synth.finish();
}

/** The close has come and nothing is heard, read or planned, and nothing starts in the next moments. */
async function nothingSounds(): Promise<void> {
  await vi.waitFor(() => expect(wake.listening).toBe(true), { timeout });
  clock.advance(10_000);
  synth.advance(10_000);
  await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
  expect(getReading().status).toBe('idle');
  expect(getPassagePlayer().state).toBe('idle');
  expect(sounding()).toBe(false);
}

describe.each(['the recorded voice', "the phone's voice"] as const)("'back a verse' in %s", (sound) => {
  /** The verse being read is `verse`, and it is heard from its beginning. */
  async function hearsVerse(verse: number): Promise<void> {
    await vi.waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse }), { timeout });
    if (sound === 'the recorded voice') {
      await vi.waitFor(() => expect(audio.playing()).not.toBeNull(), { timeout });
      // verse 1 of a chapter read from its first verse starts at the recording's second 0, the announcement before it
      expect(audio.playing()?.currentTime).toBe(verse === 1 ? 0 : startOf(verse));
    } else {
      await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
      expect(englishOf(verse)).toContain(squash(synth.spoken[synth.spoken.length - 1].text));
    }
  }

  /** The reading goes on, to the next verse. */
  async function goesOnTo(verse: number): Promise<void> {
    if (sound === 'the recorded voice') audio.advanceTo(startOf(verse) + 0.5);
    else synth.finish();
    await vi.waitFor(() => expect(getReading()).toMatchObject({ status: 'reading', verse }), { timeout });
  }

  it('reads the verse before again and goes on from it', async () => {
    await play(sound, 5);
    const recogniser = await wakeUp();
    await vi.waitFor(() => expect(getReading().status).toBe('paused'), { timeout });
    await says(recogniser, 'back a verse');
    await hearsVerse(4);
    await goesOnTo(5);
    if (sound !== 'the recorded voice') expect(englishOf(5)).toContain(squash(synth.spoken[synth.spoken.length - 1].text));
  });

  it.each(['go back a verse', 'previous verse', 'last verse again'])("hears '%s' the same", async (words) => {
    await play(sound, 5);
    const recogniser = await wakeUp();
    await says(recogniser, words);
    await hearsVerse(4);
  });

  it('reads verse 1 again at verse 1', async () => {
    await play(sound, 1);
    const recogniser = await wakeUp();
    await says(recogniser, 'back a verse');
    await hearsVerse(1);
    expect(getReading().status).toBe('reading');
  });

  it('plays from the verse before while paused', async () => {
    await play(sound, 5);
    pauseReading();
    await vi.waitFor(() => expect(getReading().status).toBe('paused'), { timeout });
    const recogniser = await wakeUp();
    await says(recogniser, 'back a verse');
    await hearsVerse(4);
  });

  it('says nothing is being read when nothing is', async () => {
    const recogniser = await wakeUp();
    await says(recogniser, 'back a verse');
    await saidAloud('Nothing is being read');
    await nothingSounds();
  });
});

describe.each(SOUNDS)('with %s sounding at the wake', (sound) => {
  it("'stop' ends it and nothing goes on at the close", async () => {
    await play(sound);
    const recogniser = await wakeUp();
    await says(recogniser, 'stop');
    await nothingSounds();
  });

  it("'read John 3' says the place, leaves nothing to go on with, and asks the Reader to read John 3 from verse 1", async () => {
    await play(sound);
    const recogniser = await wakeUp();
    await says(recogniser, 'read John 3');
    await saidAloud('John 3');
    await nothingSounds();
    expect(readerOf(window.location.hash)).toMatchObject({ book: 'jhn', chapter: 3 });
    expect(pendingRead('jhn', 3)).toMatchObject({ verse: 1 });
  });

  it("'go to John 3 16' says the verse and asks for it", async () => {
    await play(sound);
    const recogniser = await wakeUp();
    await says(recogniser, 'go to John 3 16');
    await saidAloud('John 3, verse 16');
    await nothingSounds();
    expect(readerOf(window.location.hash)).toMatchObject({ book: 'jhn', chapter: 3 });
    expect(pendingRead('jhn', 3)).toMatchObject({ verse: 16 });
  });

  it("'next chapter' leaves nothing to go on with and asks for John 2 from verse 1", async () => {
    await play(sound);
    readerOn('jhn', 1);
    const recogniser = await wakeUp();
    await says(recogniser, 'next chapter');
    await nothingSounds();
    expect(readerOf(window.location.hash)).toMatchObject({ book: 'jhn', chapter: 2 });
    expect(pendingRead('jhn', 2)).toMatchObject({ verse: 1 });
  });

  it("'previous chapter' leaves nothing to go on with and asks for John 1 from verse 1", async () => {
    await play(sound);
    readerOn('jhn', 2);
    const recogniser = await wakeUp();
    await says(recogniser, 'previous chapter');
    await nothingSounds();
    expect(readerOf(window.location.hash)).toMatchObject({ book: 'jhn', chapter: 1 });
    expect(pendingRead('jhn', 1)).toMatchObject({ verse: 1 });
  });

  it("words that are no place: 'I could not find' and the words, and it goes on", async () => {
    await play(sound);
    const recogniser = await wakeUp();
    await says(recogniser, 'read the weather');
    await saidAloud('I could not find the weather');
    await vi.waitFor(() => expect(sounding()).toBe(true), { timeout });
    expect(pendingRead('jhn', 3)).toBeUndefined();
    expect(readerOf(window.location.hash)).toMatchObject({ book: 'jhn', chapter: 1 });
  });
});

describe('the ends of the Bible and the Reader that is not open', () => {
  it("says there is no next chapter after Revelation 22, and what was playing goes on", async () => {
    await play("the phone's voice");
    readerOn('rev', 22);
    const recogniser = await wakeUp();
    await says(recogniser, 'next chapter');
    await saidAloud('There is no next chapter');
    await vi.waitFor(() => expect(sounding()).toBe(true), { timeout });
    expect(readerOf(window.location.hash)).toMatchObject({ book: 'rev', chapter: 22 });
  });

  it("says there is no chapter before Genesis 1", async () => {
    const recogniser = await wakeUp();
    readerOn('gen', 1);
    await says(recogniser, 'previous chapter');
    await saidAloud('There is no chapter before this');
    expect(readerOf(window.location.hash)).toMatchObject({ book: 'gen', chapter: 1 });
  });

  it("says to open a chapter first when no Reader is open", async () => {
    const recogniser = await wakeUp();
    await says(recogniser, 'next chapter');
    await saidAloud('Open a chapter first');
  });

  it("'open John chapter 3' and 'red john three' are read as 'read John 3'", async () => {
    const recogniser = await wakeUp();
    await says(recogniser, 'red john three');
    await saidAloud('John 3');
    expect(pendingRead('jhn', 3)).toMatchObject({ verse: 1 });
  });
});

// mw-rl10piw.43: 'help' and 'what can I say' say what he can say, made from the router's one table
describe('help', () => {
  it('has a line for every command the router knows, and the router takes each line\'s example as that command', () => {
    const lines = HELP_LINES.map((line) => line.name).sort();
    expect(lines).toEqual(SPOKEN_COMMANDS.map((rule) => rule.name).sort());
    for (const line of HELP_LINES) expect(route(line.example, SPOKEN_COMMANDS)?.name, `'${line.example}'`).toBe(line.name);
  });

  it('is said with every example in it and not as words it did not get', async () => {
    for (const asked of ['help', 'what can I say']) {
      const recogniser = await wakeUp();
      await says(recogniser, asked);
      await saidAloud(HELP_SPOKEN);
      for (const line of HELP_LINES) expect(HELP_SPOKEN).toContain(line.example);
      expect(synth.spoken.map((s) => s.text)).not.toContain('Sorry, I did not get that');
      await vi.waitFor(() => expect(wake.listening).toBe(true), { timeout });
    }
    for (const word of ['play', 'pause', 'stop', 'read John 3', 'next chapter', 'previous chapter', 'ask']) expect(HELP_SPOKEN).toContain(word);
  });
});

// mw-rl10piw.44: 'please read Proverbs 2 to me' in one breath did nothing: the words around the command ('please', 'to me', 'for me', 'read me') are filler, and words it cannot act on are said back
describe('filler words around a command', () => {
  it.each([
    'read Proverbs 2',
    'please read Proverbs 2',
    'please read Proverbs chapter 2',
    'read me Proverbs 2',
    'please read Proverbs 2 to me',
    'read Proverbs 2 for me',
    'please read me Proverbs chapter two for me please',
    'could you please read Proverbs 2 to me',
    'can you read Proverbs 2 for me',
  ])("'%s' says Proverbs 2 and asks the Reader to read it from verse 1", async (words) => {
    const recogniser = await wakeUp();
    await says(recogniser, words);
    await saidAloud('Proverbs 2');
    expect(readerOf(window.location.hash)).toMatchObject({ book: 'pro', chapter: 2 });
    expect(pendingRead('pro', 2)).toMatchObject({ verse: 1 });
  });

  it.each([
    ['go to John 3 16 for me', 'John 3, verse 16', 'jhn', 3, 16],
    ['please open John 3 to me', 'John 3', 'jhn', 3, 1],
    ['please red john three for me', 'John 3', 'jhn', 3, 1],
  ])("'%s' is read as the place it names", async (words, said, book, chapter, verse) => {
    const recogniser = await wakeUp();
    await says(recogniser, words);
    await saidAloud(said);
    expect(pendingRead(book, chapter)).toMatchObject({ verse });
  });

  it.each([
    ['please next chapter for me', 'There is no next chapter'],
    ['please go back a chapter to me', 'There is no chapter before this'],
  ])("'%s' is the chapter command it names", async (words, said) => {
    const recogniser = await wakeUp();
    readerOn(said.includes('next') ? 'rev' : 'gen', said.includes('next') ? 22 : 1);
    await says(recogniser, words);
    await saidAloud(said);
  });

  it.each(['please pause for me', 'please stop reading for me', 'please back a verse for me', 'please help me', 'please play for me'])("'%s' is not words it did not get", async (words) => {
    await play("the phone's voice", 5);
    const recogniser = await wakeUp();
    await says(recogniser, words);
    await vi.waitFor(() => expect(wake.listening).toBe(true), { timeout });
    expect(synth.spoken.map((s) => s.text).filter((t) => t.startsWith('Sorry'))).toEqual([]);
  });

  it("keeps 'for me' in a question put to the tutor", () => {
    expect(questionAfterAsk('please ask what is grace for me')).toBe('what is grace for me');
  });

  it("words it cannot act on are said back: 'two to me' is said back as what it heard", async () => {
    const recogniser = await wakeUp();
    await says(recogniser, 'two to me');
    await saidAloud('Sorry, I did not get that, I heard "two to me"');
  });
});

// mw-rl10piw.46: the page hides right after the wake word, before the command is heard: the session closes, and what the wake paused is left paused, as hiding a plain reading leaves it
// (src/handsFree/playback.ts goOnAtClose and goOnNow are the two callers that resume; neither does when the page is hidden)
describe('the page is hidden after the wake', () => {
  function pageIs(state: 'hidden' | 'visible'): void {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => state === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  }
  afterEach(() => {
    delete (document as unknown as Record<string, unknown>).visibilityState;
    delete (document as unknown as Record<string, unknown>).hidden;
  });

  it.each(["the phone's voice", 'the passage player'] as const)('leaves %s paused at the close and speaks nothing', async (sound) => {
    await play(sound, 5);
    await wakeUp();
    await vi.waitFor(() => expect(sounding()).toBe(false), { timeout });
    expect(sound === 'the passage player' ? getPassagePlayer().state : getReading().status).toBe('paused');
    pageIs('hidden');
    await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
    clock.advance(10_000);
    synth.advance(10_000);
    await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
    expect(sounding()).toBe(false);
    expect(sound === 'the passage player' ? getPassagePlayer().state : getReading().status).toBe('paused');
    pageIs('visible');
  });

  it("'play' does not go on with a paused reading while the page is hidden", async () => {
    await play("the phone's voice", 5);
    pauseReading();
    await vi.waitFor(() => expect(getReading().status).toBe('paused'), { timeout });
    pageIs('hidden');
    expect(goOnNow()).toBe(true);
    await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
    expect(getReading().status).toBe('paused');
    expect(synth.speaking).toBe(false);
    pageIs('visible');
  });
});
