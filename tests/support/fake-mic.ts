// tests/support/fake-mic.ts — the phone's microphone for the feature steps: bsv-kit's honest one (bsv-kit/testing/mic) on a clock
// the test moves by hand. A recogniser opens a moment after start(), sends an interim result as each word of the clip ends, a
// final one at the clip's end, and ends 1.5 s after; stop() gives the words heard so far. Unlike tests/support/fake-recognizer.ts,
// which a test drives result by result, this one takes the time the phone takes: `advance(ms)` says how much has passed.
import { vi } from 'vitest';
import { clips, installMic, type MicFake, type MicOptions } from 'bsv-kit/testing/mic';
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
