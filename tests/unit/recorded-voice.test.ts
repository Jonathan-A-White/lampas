// tests/unit/recorded-voice.test.ts — the recorded voice's end timer (src/speech/recordedVoice.ts, mw-82lb97i.3): the wait for a span's end is (end - now) / rate,
// aimed when it plays and aimed again after a pause, a seek and a change of speed; it never cuts the recording off before the end. The element is tests/support/fake-audio.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterTimings } from '../../src/data/audioTimings';
import { endTimerMs, endWaitMs, pauseRecording, playRecording, recordingElement, resetRecordedVoice, resumeRecording, seekToVerse, setRecordedRate, type RecordingListener } from '../../src/speech/recordedVoice';
import { stubAudio, type FakeAudio } from '../support/fake-audio';

const TIMINGS: ChapterTimings = {
  audio: 'https://example.test/chapter.mp3',
  duration: 40,
  verses: [
    [1, 2, 10],
    [2, 10, 20],
    [3, 20, 30],
  ],
};

let audio: FakeAudio;
let told: string[];
const listener: RecordingListener = {
  verse: (n) => told.push(`verse ${n}`),
  reached: () => told.push('reached'),
  failed: () => told.push('failed'),
};
const element = (): HTMLMediaElement => {
  const el = recordingElement();
  if (!el) throw new Error('no element');
  return el;
};

beforeEach(() => {
  vi.useFakeTimers();
  resetRecordedVoice();
  audio = stubAudio();
  told = [];
});

afterEach(() => {
  resetRecordedVoice();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the wait for a span’s end', () => {
  it('is the seconds left divided by the rate', () => {
    expect(endWaitMs(20, 10, 1)).toBe(10_000);
    expect(endWaitMs(20, 10, 0.5)).toBe(20_000);
    expect(endWaitMs(20, 10, 2)).toBe(5_000);
  });

  it('is never below nothing, past the end', () => {
    expect(endWaitMs(20, 25, 1)).toBe(0);
  });

  it.each([
    [0.5, 40_000],
    [1, 20_000],
    [2, 10_000],
  ])('at rate %s, from verse 2 to the end of verse 3, is %s ms', (rate, wait) => {
    setRecordedRate(rate);
    playRecording(TIMINGS, 2, 30, listener);
    expect(element().currentTime).toBe(10);
    expect(element().playbackRate).toBe(rate);
    expect(endTimerMs()).toBe(wait);
  });

  it('starts the recording’s first verse at second 0, the title included', () => {
    playRecording(TIMINGS, 1, 10, listener);
    expect(element().currentTime).toBe(0);
    expect(endTimerMs()).toBe(10_000);
  });
});

describe('the end timer is aimed again', () => {
  it('after a pause: none while paused, then from the second it was paused at', () => {
    playRecording(TIMINGS, 2, 30, listener);
    audio.advanceTo(15);
    pauseRecording();
    expect(endTimerMs()).toBeNull();
    resumeRecording();
    expect(audio.playedAt).toEqual([10, 15]);
    expect(endTimerMs()).toBe(15_000);
  });

  it('after a seek', () => {
    setRecordedRate(2);
    playRecording(TIMINGS, 1, 30, listener);
    expect(endTimerMs()).toBe(15_000);
    seekToVerse(3);
    expect(element().currentTime).toBe(20);
    expect(endTimerMs()).toBe(5_000);
  });

  it('after a change of speed while it plays', () => {
    playRecording(TIMINGS, 2, 20, listener);
    audio.advanceTo(12);
    setRecordedRate(0.5);
    expect(element().playbackRate).toBe(0.5);
    expect(endTimerMs()).toBe(16_000);
  });
});

describe('the end', () => {
  it('is reached when the timer fires at the end, and the element is paused', async () => {
    playRecording(TIMINGS, 2, 20, listener);
    await Promise.resolve();
    const wait = endTimerMs() ?? 0;
    // the recording's clock runs on between two timeupdates: a moment short of the end when the timer fires
    audio.advanceTo(19.75);
    element().currentTime = 19.97;
    expect(told).toEqual([]);
    vi.advanceTimersByTime(wait);
    expect(told).toEqual(['reached']);
    expect(audio.playing()).toBeNull();
  });

  it('waits on when the timer fires before the recording got there (it stalled)', async () => {
    playRecording(TIMINGS, 2, 20, listener);
    await Promise.resolve();
    vi.advanceTimersByTime(10_000);
    expect(told).toEqual([]);
    expect(endTimerMs()).toBe(10_000);
    audio.advanceTo(20);
    expect(told).toEqual(['reached']);
  });

  it('tells each verse as the time passes it', () => {
    playRecording(TIMINGS, 1, 30, listener);
    audio.advanceTo(25);
    expect(told).toEqual(['verse 2', 'verse 3']);
  });

  it('is a failure when no sound starts within 8 seconds', () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => new Promise<void>(() => undefined));
    playRecording(TIMINGS, 2, 20, listener);
    vi.advanceTimersByTime(8_000);
    expect(told).toEqual(['failed']);
  });
});
