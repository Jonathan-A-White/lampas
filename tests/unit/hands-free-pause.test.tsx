// tests/unit/hands-free-pause.test.tsx — 'Pause before it acts' (mw-rl10piw.9): the silence that ends a command is his setting, and the Hands-free session gives the kit a
// FUNCTION for pauseMs, read at each command, so a change while the session runs is the next command's pause with no restart of the wake. The kit is the real one, spied on;
// the wake is voice-kit's fake (tests/support/fake-wake.ts), the recogniser tests/support/fake-recognizer.ts, time a clock the test moves.
import 'fake-indexeddb/auto';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const kit = vi.hoisted(() => ({ options: [] as { pauseMs?: number | (() => number) }[] }));
vi.mock('voice-kit/handsfree', async (importOriginal) => {
  const actual = await importOriginal<typeof import('voice-kit/handsfree')>();
  return {
    ...actual,
    createHandsFree: ((ports, options) => {
      kit.options.push(options ?? {});
      return actual.createHandsFree(ports, options);
    }) as typeof actual.createHandsFree,
  };
});

import { db } from '../../src/data/db';
import { HandsFreeGate } from '../../src/handsFree/HandsFreeGate';
import { handsFreeSeam, handsFreeSource, resetHandsFree } from '../../src/handsFree/session';
import { setHandsFree } from '../../src/handsFree/switch';
import { handsFreePauseSetting } from '../../src/settings/definitions/handsFreePause';
import { setSetting } from '../../src/settings/store';
import { stopReading } from '../../src/speech/readAloud';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { serveWakeModel, stubWake, type WakeFake } from '../support/fake-wake';
import { ManualClock } from '../support/manual-clock';

let wake: WakeFake;
let synth: FakeSynth;
let clock: ManualClock;

beforeEach(async () => {
  resetHandsFree();
  kit.options.length = 0;
  clock = new ManualClock();
  handsFreeSeam.clock = clock;
  wake = stubWake();
  stubRecognizer();
  synth = stubSpeech([ENGLISH_VOICE]);
  vi.stubGlobal('fetch', () => Promise.resolve(new Response('not found', { status: 404 })));
  serveWakeModel();
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

async function turnOn(): Promise<void> {
  await act(async () => {
    await setHandsFree(true);
  });
  await waitFor(() => expect(wake.listening).toBe(true));
}

async function wakeUp(): Promise<FakeRecognizer> {
  // the session answers the wake word once it waits again: a command it has just carried out holds it 'working' until its last sound has left the phone (mw-rl10piw.76)
  await waitFor(() => expect(handsFreeSource.state().name).toBe('waiting'));
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

/** He says `words`, then is quiet for `ms`; whether the command was taken (the recogniser was stopped to hand over the words). */
async function quietFor(recogniser: FakeRecognizer, words: string, ms: number): Promise<boolean> {
  act(() => recogniser.say([result(words, false)]));
  act(() => clock.advance(ms));
  await act(async () => {});
  return recogniser.stopFn.mock.calls.length + recogniser.abortFn.mock.calls.length > 0;
}

const pauseOf = (): number => {
  const given = kit.options[0]?.pauseMs;
  expect(typeof given).toBe('function');
  return (given as () => number)();
};

describe("'Pause before it acts'", () => {
  it('is 1, 1.5, 2, 3 or 4 seconds, 1.5 to start, in the words the row says', () => {
    expect(handsFreePauseSetting.default).toBe('1.5');
    expect(handsFreePauseSetting.label).toBe('Pause before it acts');
    expect(handsFreePauseSetting.hint).toBe('How long it waits after you stop speaking.');
    expect(handsFreePauseSetting.allowed.kind === 'choice' && handsFreePauseSetting.allowed.values.map((v) => v.value)).toEqual(['1', '1.5', '2', '3', '4']);
    expect(handsFreePauseSetting.parse('7')).toBe('1.5');
  });

  it('is given to the kit as a function, so a change while the session runs is the next command’s pause and the wake is not restarted', async () => {
    render(<HandsFreeGate />);
    await turnOn();
    expect(kit.options).toHaveLength(1);
    expect(pauseOf()).toBe(1500);
    const starts = wake.starts;

    await act(async () => {
      await setSetting(handsFreePauseSetting, '3');
    });
    expect(kit.options).toHaveLength(1);
    expect(pauseOf()).toBe(3000);
    await act(async () => {
      await setSetting(handsFreePauseSetting, '1');
    });
    expect(pauseOf()).toBe(1000);
    expect(wake.starts).toBe(starts);
    expect(kit.options).toHaveLength(1);
  });

  it('is the saved value when the session is made: 3 seconds saved before Hands-free is turned On', async () => {
    await db.settings.put({ key: 'handsFreePause', value: '3' });
    render(<HandsFreeGate />);
    await turnOn();
    await waitFor(() => expect(pauseOf()).toBe(3000));
  });

  it('ends the next command after the new pause: 3 seconds hold 1.5 seconds of quiet, and 1 second does not hold 1.5', async () => {
    render(<HandsFreeGate />);
    await turnOn();
    await act(async () => {
      await setSetting(handsFreePauseSetting, '3');
    });
    const first = await wakeUp();
    expect(await quietFor(first, 'read John', 1500)).toBe(false);
    expect(await quietFor(first, 'read John 3', 3000)).toBe(true);
    // the command is carried out; the wake is listened for again, and the pause is read afresh for the next command
    await waitFor(() => expect(synth.speaking).toBe(true));
    act(() => synth.finish());
    await waitFor(() => expect(wake.listening).toBe(true));
    await act(async () => {
      await setSetting(handsFreePauseSetting, '1');
    });
    const second = await wakeUp();
    expect(await quietFor(second, 'stop', 1100)).toBe(true);
  });
});
