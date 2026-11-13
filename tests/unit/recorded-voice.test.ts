// tests/unit/recorded-voice.test.ts — the recorded voice's end timer (src/speech/recordedVoice.ts, mw-82lb97i.3): the wait for a span's end is (end - now) / rate,
// aimed when it plays and aimed again after a pause, a seek and a change of speed; it never cuts the recording off before the end. The element is tests/support/fake-audio.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChapterTimings } from '../../src/data/audioTimings';
import { endTimerMs, endWaitMs, fadeVolume, pauseRecording, playRecording, recordingElement, resetRecordedVoice, resumeRecording, seekToVerse, setRecordedRate, type RecordingListener } from '../../src/speech/recordedVoice';
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

// mw-82lb97i.27: after mw-82lb97i.18 he still heard the first 'th' of verse 51's 'Then' at the end of John 1:50. The recording has 0.4 s of digital silence between the two, so
// the stop came late: an element's own second can run behind the sound and then jump on (traced on a loaded page: 0.82 s of the recording a second of the clock, then
// +0.37 s in 0.175 s), and what a phone's output still holds when pause() is called is played out. The sound here runs by the clock; the element says what `reading` makes it say.
describe('a single verse stops at or before its end, faded to silence, whatever the element says of its second (mw-82lb97i.27)', () => {
  interface Stop {
    /** the second of the SOUND when the recording was paused */
    at: number;
    /** the element's volume when pause() was called */
    volume: number;
    /** each volume the element was given, with the second of the sound then */
    volumes: Array<[number, number]>;
  }

  /** Plays verse 2 (10 s to 20 s) alone. The sound runs by the clock; the element's second is `reading(the sound's second)` whenever it is read, and a 'timeupdate' comes every 266 ms. */
  async function stopWith(reading: (sound: number) => number): Promise<Stop> {
    let at: number | null = null;
    playRecording(TIMINGS, 2, 20, { ...listener, reached: () => told.push('reached') });
    await Promise.resolve();
    const began = Date.now();
    const sound = (): number => 10 + (Date.now() - began) / 1000;
    const el = element();
    let volume = el.volume;
    let volumeAtPause = Number.NaN;
    const volumes: Array<[number, number]> = [];
    Object.defineProperty(el, 'currentTime', { configurable: true, get: () => reading(sound()), set: () => undefined });
    Object.defineProperty(el, 'volume', {
      configurable: true,
      get: () => volume,
      set: (next: number) => {
        volume = next;
        volumes.push([sound(), next]);
      },
    });
    const pause = el.pause.bind(el);
    el.pause = () => {
      if (at === null) {
        at = sound();
        volumeAtPause = volume;
      }
      pause();
    };
    for (let tick = 266; at === null && tick < 60_000; tick += 266) {
      vi.advanceTimersByTime(began + tick - Date.now());
      if (at === null && audio.playing()) el.dispatchEvent(new Event('timeupdate'));
    }
    if (at === null) throw new Error('it never stopped');
    return { at, volume: volumeAtPause, volumes };
  }

  it('the fade is 1 until 110 ms before the end, half way down 80 ms before it, and silent from 50 ms before it', () => {
    expect(fadeVolume(20, 15)).toBe(1);
    expect(fadeVolume(20, 19.88)).toBe(1);
    expect(fadeVolume(20, 19.92)).toBeCloseTo(0.5);
    expect(fadeVolume(20, 19.95)).toBe(0);
    expect(fadeVolume(20, 20.3)).toBe(0);
    expect(fadeVolume(Infinity, 20)).toBe(1);
  });

  it('an element that tells its second truly: stopped in the 70 ms before the end, never past it', async () => {
    const stop = await stopWith((sound) => sound);
    expect(stop.at).toBeLessThanOrEqual(20);
    expect(stop.at).toBeGreaterThanOrEqual(20 - 0.07);
    expect(told).toEqual(['reached']);
  });

  it('the last 60 ms before the stop are faded to silence: the volume is 1 until then, only goes down, and is 0 when pause() is called', async () => {
    const stop = await stopWith((sound) => sound);
    expect(stop.volume).toBe(0);
    const levels = stop.volumes.map(([, v]) => v);
    expect(levels.length).toBeGreaterThanOrEqual(2);
    expect(levels).toEqual([...levels].sort((a, b) => b - a));
    // nothing of the verse is turned down before its last 110 ms (the fade's 60 ms and the 50 ms the stop may come before the end)
    expect(Math.min(...stop.volumes.map(([at]) => at))).toBeGreaterThanOrEqual(20 - 0.11 - 0.001);
    expect(stop.volumes.some(([, v]) => v > 0 && v < 1)).toBe(true);
  });

  it('the next reading starts at full volume', async () => {
    await stopWith((sound) => sound);
    const el = element();
    Reflect.deleteProperty(el, 'currentTime');
    Reflect.deleteProperty(el, 'volume');
    el.volume = 0;
    playRecording(TIMINGS, 3, 30, listener);
    expect(el.volume).toBe(1);
  });

  it('an element that falls behind the sound over the last second (0.82 s a second) and jumps on to it only past the end: stopped within 50 ms of the end', async () => {
    // the trace of John 4:1 on a loaded page: the readings 266 ms apart moved on 0.219 s each, then 0.372 s in the 175 ms the end timer waited
    const stop = await stopWith((sound) => (sound < 19 || sound >= 20.1 ? sound : sound - 0.18 * (sound - 19)));
    expect(stop.at).toBeLessThanOrEqual(20 + 0.05);
    expect(stop.at).toBeGreaterThanOrEqual(20 - 0.07);
    expect(stop.volume).toBe(0);
  });

  it('an element whose second moves only in steps of 250 ms: stopped in the 70 ms before the end, never past it', async () => {
    const stop = await stopWith((sound) => 10 + Math.floor((sound - 10 - 0.11) / 0.25) * 0.25 + 0.11);
    expect(stop.at).toBeLessThanOrEqual(20);
    expect(stop.at).toBeGreaterThanOrEqual(20 - 0.07);
    expect(stop.volume).toBe(0);
  });

  it('a recording that stalls half a second before the end is not stopped or turned down by the clock: it waits, and stops in silence once the sound gets there', async () => {
    playRecording(TIMINGS, 2, 20, listener);
    await Promise.resolve();
    audio.advanceTo(19.5);
    const el = element();
    vi.advanceTimersByTime(3000);
    expect(told).toEqual([]);
    expect(audio.playing()).not.toBeNull();
    expect(el.volume).toBe(1);
    audio.advanceTo(20);
    expect(told).toEqual(['reached']);
    expect(el.volume).toBe(0);
  });
});
