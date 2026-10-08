// The reading recorder (src/audio/recorder.ts) picks the clip's type by what the browser can record: Opus in webm where
// it has it, then ogg, then mp4 (iOS Safari). The mime that goes out has no codec suffix.
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => vi.unstubAllGlobals());

  it('says so, in words for him, when the browser has no recorder', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    await expect(new ReadingRecorder().start()).rejects.toBeInstanceOf(MicUnavailable);
  });

  it('says the microphone is turned off when the phone refuses it', async () => {
    vi.stubGlobal('MediaRecorder', class {});
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(new Error('denied')) } });
    await expect(new ReadingRecorder().start()).rejects.toThrow(/turned off/);
  });

  it('cuts a reading at the minute the scorer takes', () => {
    expect(MAX_RECORDING_MS).toBe(60_000);
  });
});
