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

/** One input of the phone as enumerateDevices names it; `silent` makes it give nothing but silence for good (a car's route that carries no sound). The three
 * others are routes that carry no sound either, in the ways a real one can (mw-5r3p30.1231): `floor`, every sample sits that many 16-bit steps off zero and
 * wobbles by the least step (a route's offset and dither); `click`, a pop of 20 ms as the route connects, then silence; `stalled`, no samples come at all.
 * Any other input is live: it plays the clip over the room's own noise, which never stops (a real microphone never gives exact zeros), unless `soundMs` says it
 * falls silent (mw-5r3p30.1242). */
export interface PhoneInput {
  deviceId: string;
  label: string;
  groupId?: string;
  silent?: boolean;
  floor?: number;
  click?: boolean;
  stalled?: boolean;
  /** A live input that gives only exact zeros once it has carried sound for this many ms from when it was first read, by any stream: a route torn down (the
   * car's Bluetooth SCO), or the phone's microphone muted by a call. */
  soundMs?: number;
  /** With `soundMs`: the sound comes back this many ms after it stopped (the call ended). */
  soundAgainMs?: number;
}

/** The room's noise under a live input: a wobble of ROOM_STEPS 16-bit steps either side of the clip (about -70 dBFS), well above a dead route's least wobble. */
const ROOM_STEPS = 12;

/** A route that carries no sound in one of the ways other than exact zeros. */
const routeOnly = (input: PhoneInput): boolean => input.floor !== undefined || !!input.click || !!input.stalled;

/** Whether a live input carries sound `elapsedMs` after it was first read (`soundMs`, `soundAgainMs`). */
function soundingAt(input: PhoneInput, elapsedMs: number): boolean {
  if (input.soundMs === undefined || elapsedMs < input.soundMs) return true;
  return input.soundAgainMs !== undefined && elapsedMs >= input.soundMs + input.soundAgainMs;
}

/** How long the pop of a `click` input lasts, from the first samples read of it (the route connecting as it is first listened to). */
const CLICK_MS = 20;

/** A stream of the honest fake: `read` gives its 16-bit PCM between two times since it opened. */
interface ReadableStream16 {
  read(fromMs: number, toMs: number): Uint8Array;
}

/** Makes the honest stream of an input give what `input` says it carries: a silent route's offset, pop or nothing instead of exact zeros, and a live input's
 * room under its clip (or exact zeros while it is muted). `firstRead` is when the input was first read, by any of its streams (Date.now()). */
function carry(stream: ReadableStream16, input: PhoneInput, firstRead: Map<PhoneInput, number>): void {
  const read = stream.read.bind(stream);
  const live = !routeOnly(input) && !input.silent;
  let first: number | undefined;
  stream.read = (fromMs, toMs) => {
    const pcm = read(fromMs, toMs);
    first ??= fromMs;
    if (input.stalled) return new Uint8Array(0);
    if (!firstRead.has(input)) firstRead.set(input, Date.now());
    const sounding = soundingAt(input, Date.now() - (firstRead.get(input) ?? Date.now()));
    const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    const frames = pcm.byteLength / 2;
    const msPer = frames > 0 ? (toMs - fromMs) / frames : 0;
    for (let i = 0; i < frames; i++) {
      const at = fromMs + i * msPer;
      let value = view.getInt16(i * 2, true);
      if (input.floor !== undefined) value += input.floor + (i % 2);
      if (input.click && at < first + CLICK_MS) value = i % 2 === 0 ? 16_000 : -16_000;
      if (live) value = sounding ? Math.max(-32768, Math.min(32767, value + ((i * 7) % (2 * ROOM_STEPS + 1)) - ROOM_STEPS)) : 0;
      view.setInt16(i * 2, value, true);
    }
    return pcm;
  };
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
  const firstRead = new Map<PhoneInput, number>();
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
      honest.options.silent = input.silent || routeOnly(input) ? Infinity : false;
      const opened = fake.getUserMedia(constraints);
      return input.silent ? opened : opened.then((stream) => (carry(stream as unknown as ReadableStream16, input, firstRead), stream));
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
