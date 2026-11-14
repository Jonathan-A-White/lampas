// tests/unit/recorded-voice-title.test.ts — which readings play the narrator's announcement ('Audio Bible, John chapter one', the recording's first seconds before verse 1;
// mw-82lb97i.28): a chapter, a book or the Bible read from its first verse do; one verse, a pericope, and a reading from the middle of a chapter do not. The element is
// tests/support/fake-audio.ts.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterTimings } from '../../src/data/audioTimings';
import type { Chapter } from '../../src/data/chapter';
import { clearBus } from '../../src/events/bus';
import { planOf, startReading, stopReading } from '../../src/speech/readAloud';
import { recordingElement, resetRecordedVoice } from '../../src/speech/recordedVoice';
import { stubAudio, type FakeAudio } from '../support/fake-audio';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../support/fake-speech';

const chapter = JSON.parse(readFileSync('public/data/jhn/3.json', 'utf8')) as Chapter;
const plan = () => planOf(chapter.verses, 'english', null);
const TIMINGS: ChapterTimings = {
  audio: 'https://example.test/jhn-3.mp3',
  duration: 400,
  verses: chapter.verses.map((v, i): [number, number, number] => [v.n, 5 + i * 10, 5 + (i + 1) * 10]),
};

let audio: FakeAudio;

beforeEach(() => {
  clearBus();
  resetRecordedVoice();
  stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
});

afterEach(() => {
  stopReading();
  resetRecordedVoice();
  vi.restoreAllMocks();
});

const read = (from: number, continuous: boolean, span?: 'passage' | 'chapter' | 'book' | 'bible'): void =>
  startReading({ chapter: 3, plan: plan(), from, continuous, book: 'jhn', span, recorded: TIMINGS });

describe('the announcement of a chapter’s recording', () => {
  it.each([
    ['one verse', false, undefined],
    ['a pericope', true, 'passage'],
  ] as const)('is not played by %s from verse 1: it starts at the verse’s own second', (_name, continuous, span) => {
    read(1, continuous, span);
    expect(audio.playedAt).toEqual([5]);
    expect(recordingElement()?.muted).toBe(true);
  });

  it.each(['chapter', 'book', 'bible'] as const)('is played by a %s from its first verse: second 0', (span) => {
    read(1, true, span);
    expect(audio.playedAt).toEqual([0]);
    expect(audio.sources).toEqual(['https://example.test/jhn-3.mp3']);
    expect(recordingElement()?.muted).toBe(false);
  });

  it('is not played by a chapter read from its middle, nor found again by going back to verse 1', () => {
    read(3, true, 'book');
    expect(audio.playedAt).toEqual([25]);
  });
});
