// tests/support/fake-wake.ts — the wake word 'Hey Lampas' for the vitest steps and unit tests: voice-kit's own testing fake (voice-kit/testing/handsfree installWake), never a
// fake of our own (mw-it6qk5.3). Installed, voice-kit/wake's startWake hands itself to it: no microphone is opened and no model is run, and the test says the wake
// word with `say()`. `listening` is true while a wake is open. Lampas fetches the model itself when Hands-free is first turned on (src/handsFree/session.ts), so
// `serveWakeModel` answers that fetch with the file the kit packs and counts the asks. Playwright's side is tests/support/honest-fakes.ts honestWake.
import { readFileSync } from 'node:fs';
import { vi } from 'vitest';
import { installWake, type WakeFake, type WakeFakeOptions } from 'voice-kit/testing/handsfree';

export type { WakeFake };

/** The model file voice-kit packs (what the build ships). */
export const WAKE_MODEL_FILE = 'node_modules/voice-kit/packages/wake/dist/models/hey-lampas.json';

/** Installs the kit's fake wake where startWake looks for it; undo with `fake.uninstall()`. */
export function stubWake(options: WakeFakeOptions = {}): WakeFake {
  globalThis.__bsvKitTesting?.wake?.uninstall();
  return installWake(globalThis, options);
}

export interface ModelServer {
  /** How many times the model was asked for. */
  readonly asks: number;
}

/** Answers a fetch of the wake model (any address ending hey-lampas.json, with or without a build's hash) with the packed file; every other fetch goes on to
 * the fetch in place before (a chapter stub, say). Call it after that stub. */
export function serveWakeModel(): ModelServer {
  const before = globalThis.fetch;
  const server = { asks: 0 };
  const body = readFileSync(WAKE_MODEL_FILE, 'utf8');
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (/hey-lampas(-[\w-]+)?\.json(\?|$)/.test(url)) {
      server.asks++;
      return Promise.resolve(new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }
    return before(input, init);
  });
  return server;
}

declare global {
  var __bsvKitTesting: { wake?: WakeFake } | undefined;
}

/** A stream as voice-kit's honest microphone hands it out: it can say what it played (16-bit PCM) between two times since it opened. */
interface PlayingStream {
  getAudioTracks(): { label: string }[];
  elapsedMs(): number;
  read(fromMs: number, toMs: number): Uint8Array;
}

const playing = (stream: unknown): stream is PlayingStream =>
  typeof stream === 'object' && stream !== null && typeof (stream as PlayingStream).read === 'function' && typeof (stream as PlayingStream).elapsedMs === 'function';

/** How often the samples of a given stream are handed on, as an AudioWorklet batches them. */
const FEED_MS = 50;

export interface HeardStreams {
  /** The name of the track each started wake listened on, in order: a stream it was given, or the fake's own microphone. */
  readonly heardOn: string[];
}

/**
 * Makes the fake wake hand on what it hears (mw-5r3p30.1213): voice-kit's real startWake calls `onInput` with each batch of samples the microphone captured,
 * and the kit's fake calls it never. With this, a wake given one of the honest microphone's streams (tests/support/fake-mic.ts) hands its samples to
 * `onInput` as they play, every FEED_MS, at the clip's rate, until it is stopped; so the app's own check of a silent input runs on real silence.
 */
export function hearStreams(wake: WakeFake, sampleRate: number): HeardStreams {
  const heardOn: string[] = [];
  const start = wake.start.bind(wake);
  wake.start = async (options) => {
    const result = (await start(options)) as { ok: boolean; track?: { label: string }; stop?: () => void };
    if (!result.ok) return result;
    heardOn.push(result.track?.label ?? '');
    const stream = options.stream;
    const onInput = (options as { onInput?: (samples: Float32Array, rate: number) => void }).onInput;
    if (!playing(stream) || !onInput || !result.stop) return result;
    let at = stream.elapsedMs();
    const feed = setInterval(() => {
      const now = stream.elapsedMs();
      const pcm = stream.read(at, now);
      at = now;
      const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
      const samples = new Float32Array(Math.floor(pcm.byteLength / 2));
      for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
      if (samples.length > 0) onInput(samples, sampleRate);
    }, FEED_MS);
    const stop = result.stop;
    return {
      ...result,
      stop() {
        clearInterval(feed);
        stop();
      },
    };
  };
  return { heardOn };
}
