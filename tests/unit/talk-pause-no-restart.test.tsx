// tests/unit/talk-pause-no-restart.test.tsx — the Talk sheet's listener (src/useVoice.ts) on a phone that can record, held through a 5 s
// pause (mw-5r3p30.498, from mw-q6n8m0.5): the recogniser Android ends on the silence is NOT started again (every start() rings the
// phone's start tone, a bell at each pause), the words heard before the end are kept, and the rest of the hold is recorded and its words
// follow on release, into the turn that is sent. The recogniser is tests/support/fake-recognizer.ts, the recorder and the audio a minimal
// fake of what voice-kit/composer replays a recording through; a phone that cannot record still starts it again (the control at the foot).
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVoice } from '../../src/useVoice';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';

class Stream {
  getTracks() {
    return [{ stop: vi.fn() }];
  }
}
class Recorder {
  static made: Recorder[] = [];
  static isTypeSupported = () => true;
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor() {
    Recorder.made.push(this);
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' }) });
    this.onstop?.();
  }
}
/** An audio context whose recording is a second of loud sound, played into a fresh recogniser until its source ends. */
class Audio {
  decodeAudioData() {
    const samples = new Float32Array(1000).fill(0.5);
    return Promise.resolve({ sampleRate: 1000, numberOfChannels: 1, duration: 1, length: 1000, getChannelData: () => samples });
  }
  createBuffer(_channels: number, length: number) {
    return { duration: length / 1000, copyToChannel: () => undefined };
  }
  createBufferSource() {
    const source = { buffer: null as unknown, connect: () => undefined, onended: null as (() => void) | null, start: () => setTimeout(() => source.onended?.(), 100) };
    return source;
  }
  createMediaStreamDestination() {
    return { stream: { getAudioTracks: () => [{ stop: vi.fn() }] } };
  }
  close() {
    return Promise.resolve();
  }
}

function canRecord(): void {
  Recorder.made = [];
  vi.stubGlobal('MediaRecorder', Recorder);
  vi.stubGlobal('MediaStream', Stream);
  vi.stubGlobal('AudioContext', Audio);
  Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.resolve(new Stream()) }, configurable: true, writable: true });
}

beforeEach(() => {
  vi.useFakeTimers();
  stubRecognizer();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true, writable: true });
});

/** Hold, say `before`, let Android end the recogniser on a 5 s pause, speak on, release; the first recogniser is the hold's. */
async function holdThroughPause(sent: string[], before: string) {
  const voice = renderHook(() => useVoice((text) => sent.push(text)));
  act(() => voice.result.current.press());
  const held = FakeRecognizer.last();
  act(() => {
    held.open();
    held.say([result(before, true)]);
  });
  await act(() => vi.advanceTimersByTimeAsync(5000));
  await act(async () => {
    held.onerror?.({ error: 'no-speech' });
    held.onend?.();
    await vi.advanceTimersByTimeAsync(0);
  });
  return { voice, held };
}

describe('the Talk sheet listener through a 5 s pause in one hold', () => {
  it('does not start the recogniser again after it ends, keeps the words before, and sends the words after the pause too', async () => {
    canRecord();
    const sent: string[] = [];
    const { voice, held } = await holdThroughPause(sent, 'why does Paul say');
    // No start() after the end (that is the bell), and the live words stay as they were.
    expect(held.startFn).toHaveBeenCalledTimes(1);
    expect(FakeRecognizer.instances).toHaveLength(1);
    expect(voice.result.current.listening).toBe(true);
    expect(voice.result.current.transcript).toBe('why does Paul say');
    expect(voice.result.current.notice).toBeUndefined();
    // The rest of the hold is recorded; he speaks on for a while and lets go.
    expect(Recorder.made).toHaveLength(1);
    expect(Recorder.made[0].state).toBe('recording');
    await act(() => vi.advanceTimersByTimeAsync(8000));
    let released: Promise<void> = Promise.resolve();
    // the recording is played into one fresh recogniser, silently (a hold that is over rings no bell), which hears the rest
    await act(async () => {
      released = voice.result.current.release();
      await vi.advanceTimersByTimeAsync(0);
    });
    const replay = FakeRecognizer.last();
    expect(replay).not.toBe(held);
    await act(async () => {
      replay.open();
      replay.say([result('all things to all people', true)]);
      await vi.advanceTimersByTimeAsync(500);
      replay.onend?.();
      await released;
    });
    expect(held.startFn).toHaveBeenCalledTimes(1);
    expect(sent).toEqual(['why does Paul say all things to all people']);
  });

  it('control: on a phone that cannot record the recogniser is started again, the way Android rang its bell', async () => {
    vi.stubGlobal('MediaRecorder', undefined);
    const sent: string[] = [];
    const { held } = await holdThroughPause(sent, 'why does Paul say');
    expect(held.startFn).toHaveBeenCalledTimes(2);
  });
});
