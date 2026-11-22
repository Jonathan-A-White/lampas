// tests/unit/hands-free-car-mic.test.tsx — 'Hey Lampas' over his car's Bluetooth (mw-5r3p30.1213). His words: "I can't actually get it to work when it's connected
// through my car's Bluetooth it only seems to work if I disconnect from my car's Bluetooth". With the car connected the phone's default input is the car's
// Bluetooth route, which carries no sound, and the wake listener opened the default and never chose another. Now it opens a live input: the shared chooser's
// Bluetooth pick (voice-kit/composer chooseInput) first, never Android's 'Headset earpiece' or 'Speakerphone' route as the default, and an input that gives
// nothing but silence is left for the next one; a log line names the input it listens on.
// The phone is voice-kit's honest microphone with the inputs each case names (tests/support/fake-mic.ts stubPhoneInputs); the wake is the kit's fake, made to
// hand on the samples of the stream it is given as the real startWake does (tests/support/fake-wake.ts hearStreams).
import 'fake-indexeddb/auto';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { HandsFreeGate } from '../../src/handsFree/HandsFreeGate';
import { handsFreeSeam, resetHandsFree } from '../../src/handsFree/session';
import { setHandsFree } from '../../src/handsFree/switch';
import { stopReading } from '../../src/speech/readAloud';
import { stubPhoneInputs, type PhoneInput, type PhoneInputs } from '../support/fake-mic';
import { FakeRecognizer, stubRecognizer } from '../support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech } from '../support/fake-speech';
import { hearStreams, serveWakeModel, stubWake, type HeardStreams, type WakeFake } from '../support/fake-wake';

/** The rate the honest microphone's clip is recorded at. */
const CLIP_RATE = 16_000;

let wake: WakeFake;
let heard: HeardStreams;
let phone: PhoneInputs | null = null;
let info: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  resetHandsFree();
  // the wake's own microphone (when it is handed no stream) is the phone's default input
  wake = stubWake({ label: 'Default' });
  heard = hearStreams(wake, CLIP_RATE);
  // a silent input is known in 300 ms of samples here, not the phone's 3 s
  handsFreeSeam.quietMs = 300;
  stubRecognizer();
  stubSpeech([ENGLISH_VOICE]);
  vi.stubGlobal('fetch', () => Promise.resolve(new Response('not found', { status: 404 })));
  serveWakeModel();
  Object.defineProperty(navigator, 'wakeLock', {
    configurable: true,
    value: { request: async () => ({ addEventListener: () => {}, release: async () => {} }) },
  });
  info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
  await db.open();
  await db.settings.clear();
});

afterEach(() => {
  cleanup();
  stopReading();
  resetHandsFree();
  delete handsFreeSeam.quietMs;
  wake.uninstall();
  phone?.uninstall();
  phone = null;
  info.mockRestore();
  vi.unstubAllGlobals();
});

/** The phone has these inputs; Hands-free is turned On and the wake is listening. */
async function turnOnWith(inputs: readonly PhoneInput[]): Promise<void> {
  phone = stubPhoneInputs(inputs);
  render(<HandsFreeGate />);
  await act(async () => {
    await setHandsFree(true);
  });
  await waitFor(() => expect(wake.listening).toBe(true));
}

/** The lines the app logged. */
const logged = (): string[] => info.mock.calls.map((call: unknown[]) => call.map(String).join(' '));

/** Every microphone asked for by its exact id, and how many times the default was asked for (`audio: true`, no id). */
function asked(): { ids: string[]; defaults: number } {
  const requests = phone?.honest.requests ?? [];
  const ids: string[] = [];
  let defaults = 0;
  for (const request of requests as MediaStreamConstraints[]) {
    const audio = request.audio;
    if (typeof audio === 'object' && audio.deviceId && typeof audio.deviceId === 'object' && 'exact' in audio.deviceId) ids.push(String(audio.deviceId.exact));
    else defaults++;
  }
  return { ids, defaults };
}

describe("'Hey Lampas' over the car's Bluetooth", () => {
  it("listens on the phone's live microphone, not the car's silent Bluetooth route that is the default; a log line names it", async () => {
    await turnOnWith([
      { deviceId: 'default', label: 'Default', groupId: 'car', silent: true },
      { deviceId: 'car-bt', label: 'Bluetooth headset', groupId: 'car', silent: true },
      { deviceId: 'phone-mic', label: 'Phone microphone', groupId: 'phone' },
    ]);
    await waitFor(() => expect(heard.heardOn.at(-1)).toBe('Phone microphone'));
    expect(wake.listening).toBe(true);
    await waitFor(() => expect(phone?.openLabels()).toEqual(['Phone microphone']));
    // the default (the car's route) was never opened for the wake
    expect(heard.heardOn).not.toContain('Default');
    expect(asked().defaults).toBe(0);
    await waitFor(() => expect(logged().some((line) => line.includes('Hands-free') && line.includes('Phone microphone'))).toBe(true));
    // and 'Hey Lampas' is heard
    expect(wake.say()).toBe(true);
  });

  it("listens on the car's hands-free microphone when that is the live one", async () => {
    await turnOnWith([
      { deviceId: 'default', label: 'Default', groupId: 'phone-route', silent: true },
      { deviceId: 'car-hf', label: 'Car kit (hands-free)', groupId: 'car' },
      { deviceId: 'phone-mic', label: 'Phone microphone', groupId: 'phone' },
    ]);
    await waitFor(() => expect(heard.heardOn.at(-1)).toBe('Car kit (hands-free)'));
    expect(phone?.openLabels()).toEqual(['Car kit (hands-free)']);
    expect(heard.heardOn).not.toContain('Default');
    await waitFor(() => expect(logged().some((line) => line.includes('Car kit (hands-free)'))).toBe(true));
  });

  it("does not open the default when it is Android's 'Headset earpiece' route", async () => {
    await turnOnWith([
      { deviceId: 'default', label: 'Headset earpiece', groupId: 'earpiece' },
      { deviceId: 'earpiece', label: 'Headset earpiece', groupId: 'earpiece' },
      { deviceId: 'car-bt', label: 'Bluetooth headset', groupId: 'car' },
    ]);
    await waitFor(() => expect(heard.heardOn.at(-1)).toBe('Bluetooth headset'));
    expect(heard.heardOn).not.toContain('Default');
    expect(asked()).toEqual({ ids: ['car-bt'], defaults: 0 });
  });

  it("does not open the default when it is Android's 'Speakerphone' route", async () => {
    await turnOnWith([
      { deviceId: 'default', label: 'Speakerphone', groupId: 'speaker' },
      { deviceId: 'speaker', label: 'Speakerphone', groupId: 'speaker' },
      { deviceId: 'wired', label: 'Wired headset', groupId: 'wired' },
    ]);
    await waitFor(() => expect(heard.heardOn.at(-1)).toBe('Wired headset'));
    expect(heard.heardOn).not.toContain('Default');
    expect(asked()).toEqual({ ids: ['wired'], defaults: 0 });
  });

  it("with Android's own routes beside the car's silent one, leaves each silent input for the next and listens on the first that hears", async () => {
    await turnOnWith([
      { deviceId: 'default', label: 'Default', silent: true },
      { deviceId: 'speaker', label: 'Speakerphone' },
      { deviceId: 'earpiece', label: 'Headset earpiece' },
      { deviceId: 'car-bt', label: 'Bluetooth headset', silent: true },
    ]);
    // the car's Bluetooth first (the shared chooser's pick), then the default, then the phone's own: each silent one is left
    await waitFor(() => expect(heard.heardOn.at(-1)).toBe('Speakerphone'));
    expect(heard.heardOn).toEqual(['Bluetooth headset', 'Default', 'Speakerphone']);
    expect(phone?.openLabels()).toEqual(['Speakerphone']);
    expect(wake.listening).toBe(true);
  });

  it('with one ordinary input listens on the default as before (audio: true): nothing is opened by id', async () => {
    await turnOnWith([{ deviceId: 'default', label: 'Default - Phone microphone', groupId: 'phone' }]);
    await waitFor(() => expect(heard.heardOn).toEqual(['Default - Phone microphone']));
    expect(asked()).toEqual({ ids: [], defaults: 1 });
    expect(phone?.openLabels()).toEqual(['Default - Phone microphone']);
    expect(wake.say()).toBe(true);
  });

  // mw-5r3p30.1231: a car's route that carries no sound need not give exact zeros. Each of these was taken for a live input before, and the wake stayed on it.
  it("leaves a route whose samples sit off zero and wobble by the least step (an offset and dither, no sound) for the phone's microphone", async () => {
    await turnOnWith([
      { deviceId: 'default', label: 'Default', groupId: 'car', floor: 3 },
      { deviceId: 'car-bt', label: 'Bluetooth headset', groupId: 'car', floor: 3 },
      { deviceId: 'phone-mic', label: 'Phone microphone', groupId: 'phone' },
    ]);
    await waitFor(() => expect(heard.heardOn.at(-1)).toBe('Phone microphone'));
    expect(heard.heardOn).toEqual(['Bluetooth headset', 'Phone microphone']);
    expect(phone?.openLabels()).toEqual(['Phone microphone']);
  });

  it("leaves a route that pops once as it connects and then carries nothing, for the phone's microphone", async () => {
    await turnOnWith([
      { deviceId: 'default', label: 'Default', groupId: 'car', click: true },
      { deviceId: 'car-bt', label: 'Bluetooth headset', groupId: 'car', click: true },
      { deviceId: 'phone-mic', label: 'Phone microphone', groupId: 'phone' },
    ]);
    await waitFor(() => expect(heard.heardOn.at(-1)).toBe('Phone microphone'));
    expect(heard.heardOn).toEqual(['Bluetooth headset', 'Phone microphone']);
  });

  it("tells the log of a route that gives no samples at all, and stays on it: no samples is audio that is not running, which no other input mends", async () => {
    await turnOnWith([
      { deviceId: 'default', label: 'Default', groupId: 'car', stalled: true },
      { deviceId: 'car-bt', label: 'Bluetooth headset', groupId: 'car', stalled: true },
      { deviceId: 'phone-mic', label: 'Phone microphone', groupId: 'phone' },
    ]);
    await waitFor(() => expect(logged().some((line) => line.includes('no samples from "Bluetooth headset"'))).toBe(true));
    expect(heard.heardOn).toEqual(['Bluetooth headset']);
    expect(wake.listening).toBe(true);
  });

  // mw-5r3p30.1224: the command after the wake is heard on the same kind of live input, not on whatever Android's own recogniser picks
  it("hears the command on the car's hands-free microphone's track when the phone lists one, not on whatever the recogniser picks", async () => {
    await turnOnWith([
      { deviceId: 'default', label: 'Default', groupId: 'phone-route' },
      { deviceId: 'car-hf', label: 'Car kit (hands-free)', groupId: 'car' },
      { deviceId: 'phone-mic', label: 'Phone microphone', groupId: 'phone' },
    ]);
    const before = FakeRecognizer.instances.length;
    await act(async () => {
      expect(wake.say()).toBe(true);
    });
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before));
    const recogniser = FakeRecognizer.last();
    await waitFor(() => expect(recogniser.startFn).toHaveBeenCalled());
    const track = recogniser.startFn.mock.calls[0]?.[0] as MediaStreamTrack | undefined;
    // the recogniser was started on a chosen input's track (not with none, which is Android's own pick) and it is the car's
    expect(track?.label).toBe('Car kit (hands-free)');
  });

  it('with no Bluetooth or hands-free input the command recogniser starts as before, on the default microphone (no track)', async () => {
    await turnOnWith([{ deviceId: 'default', label: 'Default - Phone microphone', groupId: 'phone' }]);
    const before = FakeRecognizer.instances.length;
    await act(async () => {
      expect(wake.say()).toBe(true);
    });
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(before));
    await waitFor(() => expect(FakeRecognizer.last().startFn).toHaveBeenCalled());
    expect(FakeRecognizer.last().startFn.mock.calls[0]?.[0]).toBeUndefined();
  });
});
