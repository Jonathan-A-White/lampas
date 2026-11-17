// tests/unit/hands-free-switch-reading.test.tsx — mw-rl10piw.32: turning Hands-free On or Off (the Settings row, the three-finger tap, the tutor) says 'Hands-free on' / 'Hands-free off'
// beside a Bible reading under way, which pauses it (src/speech/greek.ts speakBeside); when the words are over the reading goes on, as the session's goOnAtClose does. A reading he
// paused himself stays paused.
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterTimings } from '../../src/data/audioTimings';
import { forgetChapters, type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { setHandsFree, toggleHandsFree } from '../../src/handsFree/switch';
import { getReading, pauseReading, planOf, startReading, stopReading } from '../../src/speech/readAloud';
import { resetRecordedVoice } from '../../src/speech/recordedVoice';
import { stubAudio, type FakeAudio } from '../support/fake-audio';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const timeout = ASYNC_WAIT_MS;
const john1 = JSON.parse(readFileSync('public/data/jhn/1.json', 'utf8')) as Chapter;
const plan = planOf(john1.verses, 'english', null);
const TIMINGS: ChapterTimings = {
  audio: 'https://example.test/jhn-1.mp3',
  duration: 600,
  verses: john1.verses.map((v) => [v.n, 3 + (v.n - 1) * 10, 3 + v.n * 10] as [number, number, number]),
};

let synth: FakeSynth;
let audio: FakeAudio;

beforeEach(async () => {
  clearBus();
  forgetChapters();
  resetRecordedVoice();
  synth = stubSpeech([ENGLISH_VOICE]);
  audio = stubAudio();
  await db.open();
  await Promise.all(db.tables.map((table) => table.clear()));
});

afterEach(() => {
  stopReading();
  resetRecordedVoice();
  vi.unstubAllGlobals();
});

const spoken = (): string[] => synth.spoken.map((s) => s.text);

async function reading(recorded = false): Promise<void> {
  startReading({ book: 'jhn', chapter: 1, plan, from: 1, continuous: true, span: 'chapter', ...(recorded ? { recorded: TIMINGS } : {}) });
  await vi.waitFor(() => expect(recorded ? audio.playing() !== null : synth.speaking).toBe(true), { timeout });
  expect(getReading().status).toBe('reading');
}

describe.each([
  ['on', true],
  ['off', false],
] as const)('turning Hands-free %s while the phone reads a chapter', (word, on) => {
  it(`says it beside the reading and then goes on with the reading`, async () => {
    if (!on) await db.settings.put({ key: 'handsFree', value: 'on' });
    await reading();
    await setHandsFree(on);
    await vi.waitFor(() => expect(spoken()).toContain(`Hands-free ${word}`), { timeout });
    await vi.waitFor(() => expect(getReading().status).toBe('paused'), { timeout });
    synth.finish(); // the words are said to their end
    await vi.waitFor(() => expect(getReading().status).toBe('reading'), { timeout });
    await vi.waitFor(() => expect(synth.speaking).toBe(true), { timeout });
  });
});

describe('turning Hands-free On while the recorded voice reads a chapter', () => {
  it('goes on with the recording once the words are said', async () => {
    await reading(true);
    await toggleHandsFree();
    await vi.waitFor(() => expect(spoken()).toContain('Hands-free on'), { timeout });
    synth.finish();
    await vi.waitFor(() => expect(getReading().status).toBe('reading'), { timeout });
    await vi.waitFor(() => expect(audio.playing()).not.toBeNull(), { timeout });
  });
});

describe('turning Hands-free On when the reading was paused by him', () => {
  it('leaves it paused', async () => {
    await reading();
    pauseReading();
    expect(getReading().status).toBe('paused');
    await toggleHandsFree();
    await vi.waitFor(() => expect(spoken()).toContain('Hands-free on'), { timeout });
    synth.finish();
    await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
    expect(getReading().status).toBe('paused');
    expect(synth.speaking).toBe(false);
  });
});

describe('turning Hands-free On with nothing reading', () => {
  it('starts nothing once the words are said', async () => {
    await toggleHandsFree();
    await vi.waitFor(() => expect(spoken()).toEqual(['Hands-free on']), { timeout });
    synth.finish();
    await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may start in this window
    expect(getReading().status).toBe('idle');
    expect(spoken()).toEqual(['Hands-free on']);
  });
});
