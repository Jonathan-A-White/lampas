// tests/unit/media-session.test.ts — the lock screen of a recorded reading (src/speech/mediaSession.ts, mw-82lb97i.7): while a recording is the reading, navigator.mediaSession shows
// 'John 3' by 'Majority Standard Bible, read by David' with Play and Pause that steer the reading; it is all cleared when the reading ends. The phone's voice has none, and a phone
// without a media session reads on regardless. The session is a stub, the element tests/support/fake-audio.ts.
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterTimings } from '../../src/data/audioTimings';
import type { Chapter } from '../../src/data/chapter';
import { clearBus } from '../../src/events/bus';
import { planOf, getReading, pauseReading, startReading, stopReading } from '../../src/speech/readAloud';
import { resetMediaSession } from '../../src/speech/mediaSession';
import { recordingElement, resetRecordedVoice, setBibleVoice } from '../../src/speech/recordedVoice';
import { stubAudio, type FakeAudio } from '../support/fake-audio';
import { stubMediaSession, unstubMediaSession, type FakeMediaSession } from '../support/fake-media-session';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../support/fake-speech';

const chapter = JSON.parse(readFileSync('public/data/jhn/3.json', 'utf8')) as Chapter;
const plan = () => planOf(chapter.verses, 'english', null);
const TIMINGS: ChapterTimings = {
  audio: 'https://example.test/jhn-3.mp3',
  duration: 400,
  verses: chapter.verses.map((v, i): [number, number, number] => [v.n, 3 + i * 10, 3 + (i + 1) * 10]),
};

let session: FakeMediaSession;
let audio: FakeAudio;

const recorded = () => startReading({ chapter: 3, plan: plan(), from: 1, continuous: true, book: 'jhn', span: 'book', recorded: TIMINGS });

beforeEach(() => {
  clearBus();
  resetMediaSession();
  resetRecordedVoice();
  stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
  session = stubMediaSession();
});

afterEach(() => {
  stopReading();
  resetRecordedVoice();
  resetMediaSession();
  unstubMediaSession();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('a recorded reading on the lock screen', () => {
  it('shows John 3 by the narrator, playing, with the app’s own icons', () => {
    recorded();
    expect(session.metadata?.title).toBe('John 3');
    expect(session.metadata?.artist).toBe('Majority Standard Bible, read by David');
    expect(session.metadata?.album).toBe('Lampas');
    expect(session.metadata?.artwork.map((a) => a.src)).toEqual(['/icon-192.png', '/icon-512.png']);
    expect(session.playbackState).toBe('playing');
  });

  it('follows pauseReading: paused', () => {
    recorded();
    pauseReading();
    expect(session.playbackState).toBe('paused');
  });

  it('has a Pause that pauses the audio element and a Play that plays it from the same second', () => {
    recorded();
    audio.advanceTo(8);
    session.handlers.pause?.();
    expect(audio.playing()).toBeNull();
    expect(session.playbackState).toBe('paused');
    expect(getReading().status).toBe('paused');
    const second = recordingElement()?.currentTime;
    session.handlers.play?.();
    expect(audio.playing()).toBe(recordingElement());
    expect(recordingElement()?.currentTime).toBe(second);
    expect(session.playbackState).toBe('playing');
  });

  it('has a Stop that ends the reading', () => {
    recorded();
    session.handlers.stop?.();
    expect(getReading().status).toBe('idle');
    expect(audio.playing()).toBeNull();
  });

  it('is cleared when the reading ends: no metadata, state none, no handlers', () => {
    recorded();
    stopReading();
    expect(session.metadata).toBeNull();
    expect(session.playbackState).toBe('none');
    expect(session.handlers).toEqual({ play: null, pause: null, stop: null });
  });

  it('is cleared when a verse’s recording runs to its end by itself', () => {
    startReading({ chapter: 3, plan: plan(), from: 1, continuous: false, book: 'jhn', recorded: TIMINGS });
    expect(session.playbackState).toBe('playing');
    audio.advanceTo(13);
    expect(getReading().status).toBe('idle');
    expect(session.metadata).toBeNull();
    expect(session.playbackState).toBe('none');
    expect(session.handlers.play).toBeNull();
  });
});

describe('where there is no lock screen to show', () => {
  it('a phone-voice reading sets no metadata and no handler', () => {
    setBibleVoice('phone');
    startReading({ chapter: 3, plan: plan(), from: 1, continuous: true, book: 'jhn', span: 'book' });
    expect(getReading().status).toBe('reading');
    expect(session.metadata).toBeNull();
    expect(session.playbackState).toBe('none');
    expect(session.handlers).toEqual({ play: null, pause: null, stop: null });
  });

  it('a recorded reading starts and ends with no error where navigator.mediaSession is undefined', () => {
    unstubMediaSession();
    expect(navigator.mediaSession).toBeUndefined();
    expect(() => {
      recorded();
      pauseReading();
      stopReading();
    }).not.toThrow();
    expect(getReading().status).toBe('idle');
  });
});
