// The reading recorder (src/audio/recorder.ts) picks the clip's type by what the browser can record: Opus in webm where
// it has it, then ogg, then mp4 (iOS Safari). The mime that goes out has no codec suffix.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_SECONDS } from '../../src/services/reading';
import { MAX_RECORDING_MS, MicUnavailable, ReadingRecorder, extensionOf, pickMime } from '../../src/audio/recorder';

const only = (...supported: string[]) => (mime: string) => supported.includes(mime);

describe('pickMime', () => {
  it('prefers webm with Opus', () => {
    expect(pickMime(only('audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'))).toBe('audio/webm;codecs=opus');
  });
  it('takes ogg when webm is not there', () => {
    expect(pickMime(only('audio/ogg;codecs=opus', 'audio/mp4'))).toBe('audio/ogg;codecs=opus');
  });
  it('takes mp4 on a phone that records nothing else (iOS Safari)', () => {
    expect(pickMime(only('audio/mp4'))).toBe('audio/mp4');
  });
  it('takes plain webm before giving up, and answers an empty type when the browser has none of them', () => {
    expect(pickMime(only('audio/webm'))).toBe('audio/webm');
    expect(pickMime(only())).toBe('');
  });
});

describe('extensionOf', () => {
  it('names the clip by its type', () => {
    expect(extensionOf('audio/webm')).toBe('webm');
    expect(extensionOf('audio/ogg')).toBe('ogg');
    expect(extensionOf('audio/mp4')).toBe('m4a');
  });
});

describe('ReadingRecorder', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('says so, in words for him, when the browser has no recorder', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    await expect(new ReadingRecorder().start()).rejects.toBeInstanceOf(MicUnavailable);
  });

  it('says the microphone is turned off when the phone refuses it', async () => {
    vi.stubGlobal('MediaRecorder', class {});
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(new Error('denied')) } });
    await expect(new ReadingRecorder().start()).rejects.toThrow(/turned off/);
  });

  it('measures a hold on the monotonic clock: a wall clock that steps back 1.4 s mid-hold still reads a hold, not a tap', async () => {
    // WSL2 steps Date.now() back about 1.4 s every 32 s; performance.now() does not move backwards
    let wall = 1_000_000;
    let mono = 5_000;
    vi.spyOn(Date, 'now').mockImplementation(() => wall);
    vi.spyOn(performance, 'now').mockImplementation(() => mono);
    class FakeMediaRecorder {
      static isTypeSupported = () => true;
      mimeType = 'audio/webm';
      state = 'inactive';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.onstop?.();
      }
    }
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.resolve({ getTracks: () => [] }) } });
    const recorder = new ReadingRecorder();
    await recorder.start();
    mono += 1500; // he held for 1.5 s ...
    wall += 1500 - 1400; // ... and the wall clock stepped back 1.4 s meanwhile
    const recording = await recorder.stop();
    expect(recording.durationMs).toBe(1500);
  });

  it('cuts a reading at the ten minutes the check hears, the longest the reading check allows (services/reading.ts MAX_SECONDS)', () => {
    expect(MAX_RECORDING_MS).toBe(MAX_SECONDS * 1000);
    expect(MAX_RECORDING_MS).toBe(600_000);
  });

  describe('a long reading (mw-5r3p30.684)', () => {
    class FakeMediaRecorder {
      static isTypeSupported = () => true;
      mimeType = 'audio/webm';
      state = 'inactive';
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        this.onstop?.();
      }
    }
    const setUp = () => {
      vi.useFakeTimers();
      // the monotonic clock follows the fake timers, as a hold is timed on it
      vi.spyOn(performance, 'now').mockImplementation(() => Date.now());
      vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.resolve({ getTracks: () => [] }) } });
    };
    afterEach(() => vi.useRealTimers());

    it('keeps listening past a minute: 150 s of reading is one clip of 150 s and the cap never handed anything on', async () => {
      setUp();
      const onLimit = vi.fn();
      const recorder = new ReadingRecorder(onLimit);
      await recorder.start();
      await vi.advanceTimersByTimeAsync(150_000);
      expect(onLimit).not.toHaveBeenCalled();
      const recording = await recorder.stop();
      expect(recording.durationMs).toBe(150_000);
      expect(recording.capped).toBeUndefined();
    });

    it('at the cap hands the whole clip on, marked as cut by the cap', async () => {
      setUp();
      const onLimit = vi.fn();
      const recorder = new ReadingRecorder(onLimit);
      await recorder.start();
      await vi.advanceTimersByTimeAsync(MAX_RECORDING_MS + 10);
      expect(onLimit).toHaveBeenCalledTimes(1);
      expect(onLimit.mock.calls[0][0]).toMatchObject({ durationMs: MAX_RECORDING_MS, capped: true });
    });
  });
});
