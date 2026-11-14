// tests/unit/listen-passage-title.test.tsx — Listen on a pericope that starts at verse 1 (John 1:1-5, 'The Beginning') does not play the chapter's announcement ('Audio Bible, John
// chapter one'; mw-82lb97i.40): the Reader starts a pericope through useReadFrom's listenTo, with the passage's verses as the plan and the span 'chapter', so a reading that
// starts at the plan's first verse looked like a chapter read from its beginning. Only a chapter, a book or the Bible does (mw-82lb97i.28). The element is tests/support/fake-audio.ts.
import { readFileSync } from 'node:fs';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetTimings, loadBookTimings } from '../../src/data/audioTimings';
import type { Chapter } from '../../src/data/chapter';
import { passageAt, rangeOf } from '../../src/data/passage';
import { clearBus } from '../../src/events/bus';
import { useReadFrom } from '../../src/reader/useReadFrom';
import { setConnectionForTests } from '../../src/speech/connection';
import { stopReading } from '../../src/speech/readAloud';
import { resetRecordedVoice, setBibleVoice } from '../../src/speech/recordedVoice';
import { forgetVoiceNotices } from '../../src/speech/voiceDecision';
import { stubAudio, type FakeAudio } from '../support/fake-audio';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../support/fake-speech';

const chapter = { ...(JSON.parse(readFileSync('public/data/jhn/1.json', 'utf8')) as Chapter), translation: 'msb', source: 'grc' } as Chapter;
const AUDIO = 'https://example.test/jhn-1.mp3';
const index = { v: 1, edition: 'msb-david', voice: 'David', books: { jhn: [1] } };
const book = { v: 1, edition: 'msb-david', book: 'jhn', chapters: { '1': { audio: AUDIO, duration: 900, verses: chapter.verses.map((v, i) => [v.n, 5 + i * 10, 5 + (i + 1) * 10]) } } };

let audio: FakeAudio;

beforeEach(async () => {
  window.localStorage.clear();
  clearBus();
  forgetTimings();
  forgetVoiceNotices();
  resetRecordedVoice();
  setBibleVoice('msb-david');
  setConnectionForTests({ type: 'wifi' });
  vi.stubGlobal('fetch', (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/index.json')) return Promise.resolve(Response.json(index));
    if (url.endsWith('/jhn.json')) return Promise.resolve(Response.json(book));
    return Promise.resolve(new Response('no', { status: 404 }));
  });
  await loadBookTimings('jhn');
  stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
});

afterEach(() => {
  stopReading();
  resetRecordedVoice();
  setConnectionForTests(undefined);
  forgetTimings();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const hook = () => renderHook(() => useReadFrom('jhn', 1, chapter, 'english', null, undefined)).result.current;

describe('Listen on a passage that starts at verse 1 (mw-82lb97i.40)', () => {
  it('John 1:1-5, The Beginning, starts at verse 1’s own second and plays no announcement', () => {
    const passage = passageAt(chapter.verses, 1);
    expect(passage?.heading).toBe('The Beginning');
    expect(passage?.last).toBe(5);
    hook().listenTo(passage!);
    expect(audio.playedAt).toEqual([5]);
    expect(audio.sources[0]).toBe(`${AUDIO}#t=5`);
  });

  it('the chapter’s whole text as one passage (the place line’s Listen) still plays the announcement: second 0', () => {
    const whole = rangeOf(chapter.verses, 1, chapter.verses.length, 'John 1')!;
    hook().listenTo(whole);
    expect(audio.playedAt).toEqual([0]);
    expect(audio.sources).toEqual([AUDIO]);
  });

  it('the header’s Play from verse 1 (a chapter) still plays the announcement', () => {
    hook().readFrom(1, true);
    expect(audio.playedAt).toEqual([0]);
    expect(audio.sources).toEqual([AUDIO]);
  });
});
