// tests/support/fake-mic.ts — the phone's microphone for the feature steps: voice-kit's honest one (voice-kit/testing/mic) on a clock
// the test moves by hand. A recogniser opens a moment after start(), sends an interim result as each word of the clip ends, a
// final one at the clip's end, and ends 1.5 s after; stop() gives the words heard so far. Unlike tests/support/fake-recognizer.ts,
// which a test drives result by result, this one takes the time the phone takes: `advance(ms)` says how much has passed.
import { vi } from 'vitest';
import { clips, installMic, type MicFake, type MicOptions } from 'voice-kit/testing/mic';
import { ManualClock } from './manual-clock';

export interface StubbedMic {
  readonly honest: MicFake;
  readonly clock: ManualClock;
  /** The words of the clip (what the recogniser will hear). */
  readonly transcript: string;
  /** Time passes: the recogniser opens, hears words, ends. */
  advance(ms: number): void;
}

/** Puts a recogniser and a recorder in place of the phone's, hearing `clip` (English by default). */
export function stubMic(options: Omit<MicOptions, 'clock'> = {}): StubbedMic {
  const clock = new ManualClock();
  const clip = options.clip ?? clips.english;
  const host: Record<string, unknown> = {};
  const honest = installMic(host, { ...options, clip, clock });
  vi.stubGlobal('SpeechRecognition', host.SpeechRecognition);
  vi.stubGlobal('MediaRecorder', host.MediaRecorder);
  return { honest, clock, transcript: clip.transcript, advance: (ms) => clock.advance(ms) };
}

/** One input of the phone as enumerateDevices names it; `silent` makes it give nothing but silence for good (a car's route that carries no sound). */
export interface PhoneInput {
  deviceId: string;
  label: string;
  groupId?: string;
  silent?: boolean;
}

export interface PhoneInputs {
  readonly honest: MicFake;
  /** The labels of the microphone tracks open now, in the order they were opened. */
  openLabels(): string[];
  /** Puts back the navigator.mediaDevices that was there. */
  uninstall(): void;
}

/**
 * A phone with several inputs (mw-5r3p30.1213): voice-kit's honest microphone, whose enumerateDevices lists the one input it plays, is given this list
 * instead, and each getUserMedia opens the input it names (its exact deviceId, or 'default' for `audio: true`) with that input's name and silence, so a
 * test can say which input a feature opened. The streams are the honest fake's: they play the clip in real time, or silence.
 */
export function stubPhoneInputs(inputs: readonly PhoneInput[], options: Omit<MicOptions, 'clock' | 'label' | 'silent'> = {}): PhoneInputs {
  const host: { navigator?: { mediaDevices: MediaDevices } } = {};
  const honest = installMic(host, { ...options, clip: options.clip ?? clips.english });
  const fake = host.navigator!.mediaDevices;
  const before = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  const named = (constraints: MediaStreamConstraints | undefined): PhoneInput | undefined => {
    const audio = constraints?.audio;
    const wanted = typeof audio === 'object' && audio.deviceId && typeof audio.deviceId === 'object' && 'exact' in audio.deviceId ? audio.deviceId.exact : 'default';
    return inputs.find((input) => input.deviceId === wanted);
  };
  const mediaDevices = {
    enumerateDevices: () => Promise.resolve(inputs.map((input) => ({ kind: 'audioinput', deviceId: input.deviceId, label: input.label, groupId: input.groupId ?? '' }))),
    getUserMedia: (constraints?: MediaStreamConstraints) => {
      const input = named(constraints);
      if (!input) return Promise.reject(Object.assign(new Error('Requested device not found'), { name: 'OverconstrainedError' }));
      honest.options.label = input.label;
      honest.options.silent = input.silent ? Infinity : false;
      return fake.getUserMedia(constraints);
    },
  };
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: mediaDevices });
  return {
    honest,
    openLabels: () => honest.streams.flatMap((stream) => stream.getAudioTracks()).filter((track) => track.readyState === 'live').map((track) => track.label),
    uninstall() {
      honest.uninstall();
      if (before) Object.defineProperty(navigator, 'mediaDevices', before);
      else delete (navigator as { mediaDevices?: unknown }).mediaDevices;
    },
  };
}
