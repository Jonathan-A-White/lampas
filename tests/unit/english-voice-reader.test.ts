// tests/unit/english-voice-reader.test.ts — mw-82lb97i.17: with the Bible voice on Phone voice and the English voice on 'English United Kingdom' the Bible is read
// in that voice (his report: "I don't hear the uk voice when I switch"). The phone is voice-kit's honest fake with the voices an Android Chrome lists
// ('English United Kingdom' is lang en_GB there, with an underscore, and the voice list holds a US voice first).
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fillChapter, type Chapter } from '../../src/data/chapter';
import { forgetTimings, loadBookTimings } from '../../src/data/audioTimings';
import { clearBus } from '../../src/events/bus';
import { setVoice } from '../../src/speech/greek';
import { planOf, startReading, stopReading } from '../../src/speech/readAloud';
import { recordingFor, recordingElement, resetRecordedVoice, setBibleVoice } from '../../src/speech/recordedVoice';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, type FakeVoice, stubSpeech } from '../support/fake-speech';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const UK_VOICE: FakeVoice = { lang: 'en_GB', name: 'English United Kingdom', voiceURI: 'English United Kingdom' };
const english = () => planOf(chapter.verses, 'english', null);

let synth: FakeSynth;
beforeEach(() => {
  clearBus();
  synth = stubSpeech([ENGLISH_VOICE, UK_VOICE, GREEK_VOICE]);
  setVoice('english', 'English United Kingdom');
});
afterEach(() => {
  stopReading();
  resetRecordedVoice();
  setVoice('english', null);
  vi.unstubAllGlobals();
});

describe('the Bible read by the phone voice carries the English voice he chose', () => {
  it('every utterance has the UK voice and the UK language when the Bible voice is Phone voice', () => {
    setBibleVoice('phone');
    startReading({ chapter: 8, plan: english(), from: 1, continuous: true });
    synth.finishAll();
    expect(synth.spoken.length).toBeGreaterThan(1);
    expect(synth.spoken.every((u) => u.voice === UK_VOICE)).toBe(true);
    // Android Chrome picks the sound by the utterance's language, not its voice object: the language must be the voice's own
    expect(synth.spoken.every((u) => u.lang === 'en-GB')).toBe(true);
  });

  it('the next verse uses it after a switch from Recording (David) to Phone voice mid-session', () => {
    setBibleVoice('msb-david');
    setBibleVoice('phone');
    startReading({ chapter: 8, plan: english(), from: 1, continuous: true });
    synth.finish();
    synth.finish();
    expect(synth.spoken.length).toBeGreaterThan(1);
    expect(synth.spoken.every((u) => u.voice === UK_VOICE && u.lang === 'en-GB')).toBe(true);
  });

  it('a voice of the Bible in the default pick still gets the language of the app when none is chosen', () => {
    setVoice('english', null);
    setBibleVoice('phone');
    startReading({ chapter: 8, plan: english(), from: 1, continuous: false });
    expect(synth.spoken.every((u) => u.lang === 'en-US')).toBe(true);
  });
});

describe('John, which has a recording', () => {
  const read = (path: string): string => readFileSync(`public/${path}`, 'utf8');
  beforeEach(() => {
    forgetTimings();
    vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/data/audio/msb-david/')) return Promise.resolve(new Response(read(url.slice(1)), { status: 200 }));
      return Promise.resolve(new Response('not found', { status: 404 }));
    });
  });
  afterEach(() => forgetTimings());

  it('is read in the chosen phone voice on Phone voice, and by the recording again on Recording (David)', async () => {
    await loadBookTimings('jhn');
    const john = fillChapter(JSON.parse(read('data/jhn/3.json')) as Chapter);
    const plan = planOf(john.verses, 'english', null);
    setBibleVoice('phone');
    expect(recordingFor('jhn', john, plan)).toBeUndefined();
    startReading({ book: 'jhn', chapter: 3, plan, from: 1, continuous: false });
    expect(synth.spoken.length).toBeGreaterThan(0);
    expect(synth.spoken.every((u) => u.voice === UK_VOICE && u.lang === 'en-GB')).toBe(true);
    expect(recordingElement()?.getAttribute('src') ?? null).toBeNull();
    stopReading();
    setBibleVoice('msb-david');
    expect(recordingFor('jhn', john, plan)?.audio).toMatch(/^https:\/\/openbible\.com\//);
  });
});
