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
    [0.5, 39_920],
    [1, 19_960],
    [2, 9_980],
  ])('at rate %s, from verse 2 to 40 ms of the recording before the end of verse 3 (END_LEAD: a busy page’s timer fires late), is %s ms', (rate, wait) => {
    setRecordedRate(rate);
    playRecording(TIMINGS, 2, 30, listener);
    expect(element().currentTime).toBe(10);
    expect(element().playbackRate).toBe(rate);
    expect(endTimerMs()).toBeCloseTo(wait);
  });

  it('starts the recording’s first verse at second 0, the title included', () => {
    playRecording(TIMINGS, 1, 10, listener);
    expect(element().currentTime).toBe(0);
    expect(endTimerMs()).toBeCloseTo(9_960);
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
    expect(endTimerMs()).toBeCloseTo(14_960);
  });

  it('after a seek', () => {
    setRecordedRate(2);
    playRecording(TIMINGS, 1, 30, listener);
    expect(endTimerMs()).toBeCloseTo(14_980);
    seekToVerse(3);
    expect(element().currentTime).toBe(20);
    expect(endTimerMs()).toBeCloseTo(4_980);
  });

  it('after a change of speed while it plays', () => {
    playRecording(TIMINGS, 2, 20, listener);
    audio.advanceTo(12);
    setRecordedRate(0.5);
    expect(element().playbackRate).toBe(0.5);
    expect(endTimerMs()).toBeCloseTo(15_920);
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
    expect(endTimerMs()).toBeCloseTo(9_960);
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

// mw-82lb97i.18: his John 1:50 in David's voice ran on into 'Then He declar…' of verse 51. A phone's element moves its second in steps, at each 'timeupdate' (about every
// 250 ms), while the sound runs on by the clock: a stop that reads the second when its timer fires finds it a step behind, waits again, and the next 'timeupdate' lands past the end.
describe('a single verse stops at its end on a phone’s 250 ms timeupdate cadence (mw-82lb97i.18)', () => {
  /** Plays verse `verse` alone and lets the phone run: the sound goes on by the clock, the element's second moves to it only at each 'timeupdate', the first `phase` ms
   * after the sound starts and then every 250 ms. Gives the second of the sound when the recording was stopped. */
  async function stopOf(verse: number, phase: number, rate = 1): Promise<number> {
    setRecordedRate(rate);
    const span = TIMINGS.verses.find(([n]) => n === verse);
    if (!span) throw new Error('no verse');
    let stoppedAt: number | null = null;
    playRecording(TIMINGS, verse, span[2], { ...listener, reached: () => (stoppedAt = span[1] + (Date.now() - began) / 1000 * rate) });
    await Promise.resolve();
    const began = Date.now();
    for (let tick = phase; stoppedAt === null && tick < 60_000; tick += 250) {
      vi.advanceTimersByTime(began + tick - Date.now());
      if (stoppedAt !== null || !audio.playing()) break;
      element().currentTime = span[1] + (tick / 1000) * rate;
      element().dispatchEvent(new Event('timeupdate'));
    }
    if (stoppedAt === null) throw new Error('it never stopped');
    return stoppedAt;
  }

  it.each([0, 40, 100, 160, 230])('verse 2 (10 s to 20 s) with the first timeupdate %s ms in: stopped at the end, never more than 50 ms past it', async (phase) => {
    const at = await stopOf(2, phase);
    expect(at).toBeGreaterThanOrEqual(20 - 0.05);
    expect(at).toBeLessThanOrEqual(20 + 0.05);
    expect(audio.playing()).toBeNull();
  });

  it.each([0.75, 1.5])('at his speed %s too', async (rate) => {
    const at = await stopOf(3, 110, rate);
    expect(at).toBeGreaterThanOrEqual(30 - 0.05);
    expect(at).toBeLessThanOrEqual(30 + 0.05);
  });

  it('a recording that stalls (no second moves) is not stopped by the clock alone: it waits for the sound to get there', async () => {
    playRecording(TIMINGS, 2, 20, listener);
    await Promise.resolve();
    audio.advanceTo(19.5);
    // buffering: the element's second stands at 19.5 for three seconds
    vi.advanceTimersByTime(3000);
    expect(told).toEqual([]);
    expect(audio.playing()).not.toBeNull();
    audio.advanceTo(20);
    expect(told).toEqual(['reached']);
  });
});
