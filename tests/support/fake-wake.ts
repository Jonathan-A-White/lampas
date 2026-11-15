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
