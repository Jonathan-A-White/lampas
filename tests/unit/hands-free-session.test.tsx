// tests/unit/hands-free-session.test.tsx — the one Hands-free session of the app (src/handsFree/session.ts, mw-rl10piw.6) as the shell's gate runs it
// (src/handsFree/HandsFreeGate.tsx): the wake model is fetched only when Hands-free is first turned On; Off ends the session (no wake listening, no recogniser
// running); the mark's data-state follows the session (waiting, listening, working); and a microphone refused turns the setting Off and says why, on screen
// and aloud. The wake is voice-kit's fake (tests/support/fake-wake.ts), the recogniser tests/support/fake-recognizer.ts, the speech the honest fake.
import 'fake-indexeddb/auto';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { matchesGlob } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { injectManifestOptions } from '../../pwa-precache';
import { db } from '../../src/data/db';
import { HandsFreeGate } from '../../src/handsFree/HandsFreeGate';
import { MIC_REFUSED, handsFreeSeam, resetHandsFree } from '../../src/handsFree/session';
import { setHandsFree } from '../../src/handsFree/switch';
import { stopReading } from '../../src/speech/readAloud';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { serveWakeModel, stubWake, type ModelServer, type WakeFake } from '../support/fake-wake';
import { ManualClock } from '../support/manual-clock';

let wake: WakeFake;
let model: ModelServer;
let synth: FakeSynth;
let clock: ManualClock;

beforeEach(async () => {
  resetHandsFree();
  clock = new ManualClock();
  handsFreeSeam.clock = clock;
  wake = stubWake();
  stubRecognizer();
  synth = stubSpeech([ENGLISH_VOICE]);
  vi.stubGlobal('fetch', () => Promise.resolve(new Response('not found', { status: 404 })));
  model = serveWakeModel();
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request: async () => ({ addEventListener: () => {}, release: async () => {} }) },
  });
  await db.open();
  await db.settings.clear();
});

afterEach(() => {
  cleanup();
  stopReading();
  resetHandsFree();
  wake.uninstall();
  vi.unstubAllGlobals();
});

const mark = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-hands-free-mark] [data-state]');
const markState = (): string | null | undefined => mark()?.getAttribute('data-state');
const savedSetting = async (): Promise<string> => (await db.settings.get('handsFree'))?.value ?? 'off';

async function turnOn(): Promise<void> {
  await act(async () => {
    await setHandsFree(true);
  });
  await waitFor(() => expect(wake.listening).toBe(true));
  await waitFor(() => expect(markState()).toBe('waiting'));
}

async function wakeUp(): Promise<FakeRecognizer> {
  const before = FakeRecognizer.instances.length;
  act(() => {
    expect(wake.say()).toBe(true);
  });
  await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before));
  const recogniser = FakeRecognizer.last();
  await waitFor(() => expect(recogniser.startFn).toHaveBeenCalled());
  act(() => recogniser.open());
  return recogniser;
}

describe('the Hands-free session', () => {
  it("keeps the wake model out of the app's first download: no precache pattern takes it, and it is ignored by name", () => {
    const built = 'assets/hey-lampas-Bx3k9Q_z.json';
    expect(injectManifestOptions.globPatterns.some((pattern) => matchesGlob(built, pattern))).toBe(false);
    expect(injectManifestOptions.globIgnores.some((pattern) => matchesGlob(built, pattern))).toBe(true);
  });

  it('does not fetch the wake model until Hands-free is first turned On, and fetches it once', async () => {
    render(<HandsFreeGate />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50)); // a real-time wait: nothing may be fetched in this window while Hands-free is Off
    });
    expect(model.asks).toBe(0);
    expect(wake.starts).toBe(0);
    await turnOn();
    expect(model.asks).toBe(1);
    await act(async () => {
      await setHandsFree(false);
    });
    await waitFor(() => expect(wake.listening).toBe(false));
    await turnOn();
    // kept from the first time: a later start fetches nothing
    expect(model.asks).toBe(1);
  });

  it('ends when Hands-free is turned Off: no wake listening and no recogniser running, even in the middle of a command', async () => {
    render(<HandsFreeGate />);
    await turnOn();
    const recogniser = await wakeUp();
    await waitFor(() => expect(markState()).toBe('listening'));
    await act(async () => {
      await setHandsFree(false);
    });
    // (the wake is handed over while the command is heard, so it is not listening anyway: the setting reaching the gate is waited for first)
    await waitFor(() => expect(mark()).toBeNull());
    await waitFor(() => expect(recogniser.abortFn.mock.calls.length + recogniser.stopFn.mock.calls.length).toBeGreaterThan(0));
    expect(wake.listening).toBe(false);
    expect(wake.liveTracks).toBe(0);
    // a wake word now is heard by nothing
    expect(wake.say()).toBe(false);
  });

  it('shows its state on the mark: waiting, then listening after the wake, then working while it carries a command out, then waiting again', async () => {
    render(<HandsFreeGate />);
    await turnOn();
    expect(markState()).toBe('waiting');
    const recogniser = await wakeUp();
    await waitFor(() => expect(markState()).toBe('listening'));
    act(() => recogniser.say([result('banana', false)]));
    act(() => clock.advance(1500));
    // it is saying 'Sorry, I did not get that': the command is being carried out
    await waitFor(() => expect(synth.speaking).toBe(true));
    await waitFor(() => expect(markState()).toBe('working'));
    act(() => synth.finish());
    await waitFor(() => expect(markState()).toBe('waiting'));
  });

  it('turns itself Off when the microphone is refused, and says why on screen and aloud', async () => {
    wake.failWith('permission-denied');
    render(<HandsFreeGate />);
    await act(async () => {
      await setHandsFree(true);
    });
    await waitFor(async () => expect(await savedSetting()).toBe('off'));
    expect(MIC_REFUSED).toBe("Lampas may not use the microphone. Allow it in the browser's site settings, then turn Hands-free on again.");
    expect(await screen.findByRole('alert')).toHaveTextContent(MIC_REFUSED);
    await waitFor(() => expect(synth.spoken.map((s) => `${s.lang}:${s.text}`).join(' ')).toContain('en-US:Lampas may not use the microphone.'));
    expect(wake.listening).toBe(false);
    expect(mark()).toBeNull();
  });
});
