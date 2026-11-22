// tests/unit/hands-free-wake-log.test.tsx — what Hands-free heard, told to the makers (mw-5r3p30.1231). His words: "hey lampus is still not recognized when I'm on my
// car's Bluetooth", on 0.7.311 with the mic mark showing, after mw-5r3p30.1213 made the wake leave a silent input. Nobody can see why on his phone: he cannot open
// chrome://inspect while driving. So the wake keeps a short log in memory (the last two minutes): every input the phone lists (its name, its group and its id, both
// as short hashes), each input it tried with the peak and mean of what it heard, the input it settled on and when, and every 10 s what it hears there with the
// wake model's highest score. Settings, Hands-free has 'Send what Hands-free heard', and a three-finger long press while Hands-free is on sends it too and says
// "Sent", through the one feedback sender (src/services/feedback.ts).
// The phone is voice-kit's honest microphone with the inputs each case names (tests/support/fake-mic.ts stubPhoneInputs); the wake is the kit's fake, made to hand
// on the samples of the stream it is given (tests/support/fake-wake.ts hearStreams), and the score is the real model's on those samples.
import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { HandsFreeGate } from '../../src/handsFree/HandsFreeGate';
import { handsFreeSeam, resetHandsFree } from '../../src/handsFree/session';
import { SEND_LOG_LABEL, SENT_ALOUD } from '../../src/handsFree/sendLog';
import { setHandsFree } from '../../src/handsFree/switch';
import { forgetWakeLog, shortHash, wakeLogLines, wakeLogSeam } from '../../src/handsFree/wakeLog';
import { HandsFreeControl } from '../../src/settings/controls/voice';
import { rowOf } from '../support/settings';
import { stopReading } from '../../src/speech/readAloud';
import { stubPhoneInputs, type PhoneInput, type PhoneInputs } from '../support/fake-mic';
import { stubRecognizer } from '../support/fake-recognizer';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { hearStreams, serveWakeModel, stubWake, type HeardStreams, type WakeFake } from '../support/fake-wake';

const sent = vi.hoisted(() => ({ requests: [] as { kind: string; request: Record<string, unknown> }[] }));
vi.mock('../../src/services/tutor', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/tutor')>();
  return {
    ...actual,
    askGrind: async (kind: string, request: Record<string, unknown>) => {
      sent.requests.push({ kind, request });
      return { status: 'sent' };
    },
  };
});

/** The rate the honest microphone's clip is recorded at. */
const CLIP_RATE = 16_000;

/** His car connected: the default is the car's route and so is its Bluetooth input, and neither carries any sound; the phone's own microphone hears. */
const CAR: PhoneInput[] = [
  { deviceId: 'default', label: 'Default', groupId: 'car', silent: true },
  { deviceId: 'car-bt', label: 'Bluetooth headset', groupId: 'car', silent: true },
  { deviceId: 'phone-mic', label: 'Phone microphone', groupId: 'phone' },
];

let wake: WakeFake;
let heard: HeardStreams;
let phone: PhoneInputs | null = null;
let synth: FakeSynth;
let info: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  resetHandsFree();
  forgetWakeLog();
  sent.requests.length = 0;
  wake = stubWake({ label: 'Default' });
  heard = hearStreams(wake, CLIP_RATE);
  // a silent input is known in 300 ms of samples here, not the phone's 3 s; what it hears is told every 600 ms, not every 10 s
  handsFreeSeam.quietMs = 300;
  wakeLogSeam.reportMs = 600;
  stubRecognizer();
  synth = stubSpeech([ENGLISH_VOICE]);
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
  forgetWakeLog();
  delete handsFreeSeam.quietMs;
  delete wakeLogSeam.reportMs;
  delete wakeLogSeam.holdMs;
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

const linesMatching = (pattern: RegExp): string[] => wakeLogLines().filter((line) => pattern.test(line));

/** The log says, every report, what the input it listens on hears: its levels and the model's best score. */
const REPORT = /on "Phone microphone", the last [\d.]+ s: peak -?[\d.]+ dBFS, mean -?[\d.]+ dBFS, \d+ samples, best score \d\.\d{3}/;

describe('the wake log, on his car (a silent route, then the phone\'s microphone)', () => {
  it('lists every input by name, group and id (hashed), each input tried with its peak and mean, where it settled and when, and the best score of each report', async () => {
    await turnOnWith(CAR);
    await waitFor(() => expect(heard.heardOn.at(-1)).toBe('Phone microphone'));
    await waitFor(() => expect(linesMatching(REPORT).length).toBeGreaterThan(0));
    const lines = wakeLogLines();
    // every input, its group and its id as short hashes; never the phone's own ids
    expect(lines).toContainEqual(expect.stringContaining(`input "Default" group ${shortHash('car')} id default`));
    expect(lines).toContainEqual(expect.stringContaining(`input "Bluetooth headset" group ${shortHash('car')} id ${shortHash('car-bt')}`));
    expect(lines).toContainEqual(expect.stringContaining(`input "Phone microphone" group ${shortHash('phone')} id ${shortHash('phone-mic')}`));
    expect(lines.join('\n')).not.toContain('car-bt');
    expect(lines.join('\n')).not.toContain('phone-mic');
    // each input tried, with what it gave: the car's route only silence, the phone's microphone sound
    expect(linesMatching(/^\d\d:\d\d:\d\d trying "Bluetooth headset"/)).toHaveLength(1);
    expect(linesMatching(/"Bluetooth headset" gave only silence in [\d.]+ s: peak silence, mean silence, \d+ samples; trying the next input/)).toHaveLength(1);
    expect(linesMatching(/"Phone microphone" hears: peak -?[\d.]+ dBFS, mean -?[\d.]+ dBFS/)).toHaveLength(1);
    // where it settled and when
    expect(linesMatching(/^\d\d:\d\d:\d\d listening for 'Hey Lampas' on "Phone microphone" since \d\d:\d\d:\d\d/)).toHaveLength(1);
    // in the order it happened: the list, the car's route tried and left, the phone's microphone settled on, then what it hears
    const at = (pattern: RegExp): number => lines.findIndex((line) => pattern.test(line));
    expect(at(/input "Bluetooth headset"/)).toBeLessThan(at(/trying "Bluetooth headset"/));
    expect(at(/"Bluetooth headset" gave only silence/)).toBeLessThan(at(/listening for 'Hey Lampas' on "Phone microphone"/));
    expect(at(/listening for 'Hey Lampas' on "Phone microphone"/)).toBeLessThan(at(REPORT));
  });

  it('keeps only the last two minutes, but always the inputs listed and where it listens now', async () => {
    let now = Date.parse('2026-11-21T11:00:00Z');
    wakeLogSeam.now = () => now;
    await turnOnWith(CAR);
    await waitFor(() => expect(linesMatching(/listening for 'Hey Lampas' on "Phone microphone"/)).toHaveLength(1));
    now += 3 * 60_000;
    const lines = wakeLogLines();
    expect(lines.some((line) => /trying "Bluetooth headset"/.test(line))).toBe(false);
    expect(lines).toContainEqual(expect.stringContaining(`input "Bluetooth headset" group ${shortHash('car')}`));
    expect(lines).toContainEqual(expect.stringMatching(/listening for 'Hey Lampas' on "Phone microphone" since 11:00:00/));
    delete wakeLogSeam.now;
  });
});

describe('sending what Hands-free heard to the makers', () => {
  it("Settings, Hands-free: 'Send what Hands-free heard' sends the log as feedback, and says Sent", async () => {
    await turnOnWith(CAR);
    await waitFor(() => expect(linesMatching(/listening for 'Hey Lampas' on "Phone microphone"/)).toHaveLength(1));
    const row = rowOf('handsFree');
    if (!row) throw new Error('no handsFree row');
    render(<HandsFreeControl row={row} />);
    fireEvent.click(await screen.findByRole('button', { name: SEND_LOG_LABEL }));
    await screen.findByText(SENT_ALOUD);
    expect(sent.requests).toHaveLength(1);
    const { kind, request } = sent.requests[0];
    expect(kind).toBe('feedback');
    expect(request.kind).toBe('hands-free-log');
    expect(request.app_version).toBe(__APP_VERSION__);
    expect(String(request.summary)).toMatch(/Hands-free.*"Phone microphone"/);
    const text = String(request.text);
    expect(text).toContain(`input "Bluetooth headset" group ${shortHash('car')} id ${shortHash('car-bt')}`);
    expect(text).toMatch(/"Bluetooth headset" gave only silence/);
    expect(text).toMatch(/listening for 'Hey Lampas' on "Phone microphone" since/);
  });

  it('a three-finger long press while Hands-free is on sends it too, and says "Sent" aloud', async () => {
    // longer than the three-finger tap's 400 ms, as the phone's own is, so lifting the fingers is not a tap that turns Hands-free off
    wakeLogSeam.holdMs = 500;
    await turnOnWith(CAR);
    await waitFor(() => expect(linesMatching(/listening for 'Hey Lampas' on "Phone microphone"/)).toHaveLength(1));
    const fingers = [0, 1, 2].map((i) => ({ identifier: i, clientX: 100 + i * 40, clientY: 300, target: document.body }));
    act(() => {
      fireEvent.touchStart(document.body, { touches: fingers, changedTouches: fingers });
    });
    await waitFor(() => expect(sent.requests).toHaveLength(1));
    act(() => {
      fireEvent.touchEnd(document.body, { touches: [], changedTouches: fingers });
    });
    expect(sent.requests[0].request.kind).toBe('hands-free-log');
    expect(String(sent.requests[0].request.text)).toMatch(/listening for 'Hey Lampas' on "Phone microphone"/);
    await waitFor(() => expect(synth.spoken.map((s) => s.text)).toContain(SENT_ALOUD));
    // a long press is not the three-finger tap: Hands-free is still on
    expect(wake.listening).toBe(true);
  });

  it('three fingers lifted before the long press is over send nothing', async () => {
    wakeLogSeam.holdMs = 800;
    await turnOnWith(CAR);
    const fingers = [0, 1, 2].map((i) => ({ identifier: i, clientX: 100 + i * 40, clientY: 300, target: document.body }));
    act(() => {
      fireEvent.touchStart(document.body, { touches: fingers, changedTouches: fingers });
    });
    act(() => {
      fireEvent.touchEnd(document.body, { touches: [], changedTouches: fingers });
    });
    await new Promise((resolve) => setTimeout(resolve, 1000)); // a real-time wait: the press would have been long by now
    expect(sent.requests).toHaveLength(0);
  });
});
