// mw-rl10piw.50: his three-finger tap turned Hands-free Off and he heard 'Free oh', not 'Hands-free off': the sentence was started in the same instant the session stopped and closed the
// wake's microphone, and the phone clips speech at both ends while the audio route changes. The sentence is now said after the microphone is closed (Off) and the microphone opens after
// the sentence is over (On). The speech is voice-kit's honest fake and the wake its own fake (a listening wake is an open microphone).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { threeFingerTap } from 'voice-kit/testing/handsfree';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { HandsFreeGate } from '../../src/handsFree/HandsFreeGate';
import { resetHandsFree } from '../../src/handsFree/session';
import { getHandsFree } from '../../src/handsFree/switch';
import { handsFreeSetting } from '../../src/settings/definitions/handsFree';
import { setSetting } from '../../src/settings/store';
import { stopReading } from '../../src/speech/readAloud';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { serveWakeModel, stubWake, type WakeFake } from '../support/fake-wake';

let synth: FakeSynth;
let wakeFake: WakeFake;
/** Whether a wake was open (the microphone) at the moment each sentence was handed to the phone, in order. */
let micOpenWhenSpoken: Array<[string, boolean]>;
/** Whether a sentence was being said at the moment each wake was opened. */
let sayingWhenWakeOpened: boolean[];

beforeEach(async () => {
  cleanup();
  resetHandsFree();
  clearBus();
  stopReading();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
  synth = stubSpeech([ENGLISH_VOICE]);
  wakeFake = stubWake();
  serveWakeModel();
  micOpenWhenSpoken = [];
  sayingWhenWakeOpened = [];
  const speak = synth.honest.synth.speak.bind(synth.honest.synth);
  synth.honest.synth.speak = (u) => {
    micOpenWhenSpoken.push([u.text, wakeFake.listening]);
    speak(u);
  };
  const start = wakeFake.start.bind(wakeFake);
  wakeFake.start = (options) => {
    sayingWhenWakeOpened.push(synth.speaking || synth.pending);
    return start(options);
  };
  await db.open();
  await db.settings.clear();
});

afterAll(() => {
  wakeFake.uninstall();
  cleanup();
  resetHandsFree();
  vi.unstubAllGlobals();
  db.close();
});

const outcomes = (text: string): string[] => synth.honest.log.filter((e) => e.text === text).map((e) => e.outcome);
const mark = () => screen.queryByRole('img', { name: 'Hands-free is on' });

describe('the Hands-free sentences are heard whole', () => {
  it("says 'Hands-free off' only after the wake has let the microphone go, and to its end", async () => {
    await setSetting(handsFreeSetting, 'on');
    render(<HandsFreeGate />);
    await waitFor(() => expect(wakeFake.listening).toBe(true));
    act(() => threeFingerTap(document.body));
    await waitFor(async () => expect(await getHandsFree()).toBe(false));
    await waitFor(() => expect(micOpenWhenSpoken.map(([text]) => text)).toEqual(['Hands-free off']));
    expect(micOpenWhenSpoken).toEqual([['Hands-free off', false]]);
    expect(wakeFake.listening).toBe(false);
    expect(wakeFake.liveTracks).toBe(0);
    synth.finishAll();
    await waitFor(() => expect(outcomes('Hands-free off')).toEqual(['ended']));
    expect(mark()).toBeNull();
  });

  it("opens the wake only after 'Hands-free on' is over, so the sentence is not cut by the microphone", async () => {
    render(<HandsFreeGate />);
    await act(async () => {});
    act(() => threeFingerTap(document.body));
    await waitFor(() => expect(synth.spoken.map((s) => s.text)).toEqual(['Hands-free on']));
    await waitFor(() => expect(mark()).not.toBeNull());
    // the sentence is under way: no microphone is open or opening yet
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100)); // a real-time wait: nothing must happen in this window (the wake waits for the words)
    });
    expect(wakeFake.starts).toBe(0);
    synth.finishAll();
    await waitFor(() => expect(wakeFake.listening).toBe(true));
    expect(sayingWhenWakeOpened).toEqual([false]);
    expect(outcomes('Hands-free on')).toEqual(['ended']);
  });

  it('listens at once when Hands-free was already On at the start, and says nothing', async () => {
    await setSetting(handsFreeSetting, 'on');
    render(<HandsFreeGate />);
    await waitFor(() => expect(wakeFake.listening).toBe(true));
    expect(synth.spoken).toEqual([]);
  });
});
