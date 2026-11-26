// mw-rl10piw.76: his words (2026-11-25, Android Chrome, 0.7.386/387): "to turn it on I get hands-free and that's it it's cut short", and "he was answering but then ... the hands-free
// microphone came on and when it came on it cut him off so he couldn't answer fully". mw-rl10piw.74 shut the microphone while the tutor speaks and made a voice start after the microphone
// is let go; it left the other direction open: the microphone opened in the very instant the voice's END event arrived. On a phone the end event comes while the last of the sound is still
// in the audio buffer, and a microphone opening there moves the route and cuts it ('Hands-free on' heard as 'Hands-free'; an answer's last words). So after any speech of the app the
// microphone waits for the sound to leave the phone (SPEECH_TAIL_MS, speech/greek.ts whenVoiceSettled), and an answer's voice waits for a microphone that is still opening, however long it
// takes (not 2 s). The fakes report the end event exactly as the phone does, so the gap between that event and the microphone's opening is what these tests read.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { threeFingerTap } from 'voice-kit/testing/handsfree';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { HandsFreeGate } from '../../src/handsFree/HandsFreeGate';
import { resetHandsFree } from '../../src/handsFree/session';
import { handsFreeSetting } from '../../src/settings/definitions/handsFree';
import { setSetting } from '../../src/settings/store';
import { answerRuns } from '../../src/speech/answerRuns';
import { startAnswer, stopReading } from '../../src/speech/readAloud';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { serveWakeModel, stubWake, type WakeFake } from '../support/fake-wake';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const timeout = ASYNC_WAIT_MS;

/** The least a microphone may wait after a voice's end event (a little under SPEECH_TAIL_MS, for the clock's rounding). */
const TAIL_AT_LEAST_MS = 140;

let synth: FakeSynth;
let wakeFake: WakeFake;
/** When (performance.now: tests/setup.ts lets Date.now run ahead of real time) each wake was opened. */
let wakeOpenedAt: number[];
/** Whether a voice was speaking as each wake was opened. */
let speakingAtOpen: boolean[];
/** How long the next wake takes to open (a phone's slow input), in milliseconds. */
let openTakes = 0;

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
  wakeOpenedAt = [];
  speakingAtOpen = [];
  openTakes = 0;
  const start = wakeFake.start.bind(wakeFake);
  wakeFake.start = async (options) => {
    wakeOpenedAt.push(performance.now());
    speakingAtOpen.push(synth.speaking || synth.pending);
    if (openTakes > 0) await new Promise((resolve) => setTimeout(resolve, openTakes)); // a real-time wait: the phone's slow input is the thing under test
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

describe('the microphone opens only after the voice has had time to leave the phone (mw-rl10piw.76)', () => {
  it("opens the wake a settle after the end of 'Hands-free on', not in the same instant", async () => {
    render(<HandsFreeGate />);
    await act(async () => {});
    act(() => threeFingerTap(document.body));
    await waitFor(() => expect(synth.spoken.map((s) => s.text)).toEqual(['Hands-free on']), { timeout });
    expect(wakeOpenedAt).toEqual([]);
    const endedAt = performance.now();
    act(() => synth.finishAll());
    expect(outcomes('Hands-free on')).toEqual(['ended']);
    await waitFor(() => expect(wakeFake.listening).toBe(true), { timeout });
    expect(speakingAtOpen).toEqual([false]);
    // the sentence's last sound was still in the phone's buffer at its end event: the microphone waits for it
    expect(wakeOpenedAt[0] - endedAt).toBeGreaterThanOrEqual(TAIL_AT_LEAST_MS);
  });

  it("opens the wake again a settle after a tutor answer's end, and only after it", async () => {
    await setSetting(handsFreeSetting, 'on');
    render(<HandsFreeGate />);
    await waitFor(() => expect(wakeFake.listening).toBe(true), { timeout });
    act(() => startAnswer(7, answerRuns('He answers in one sentence.')));
    await waitFor(() => expect(wakeFake.listening).toBe(false), { timeout });
    await waitFor(() => expect(synth.speaking).toBe(true), { timeout });
    expect(wakeOpenedAt).toHaveLength(1);
    const endedAt = performance.now();
    act(() => synth.finishAll());
    await waitFor(() => expect(wakeFake.listening).toBe(true), { timeout });
    expect(wakeOpenedAt).toHaveLength(2);
    expect(speakingAtOpen[1]).toBe(false);
    expect(wakeOpenedAt[1] - endedAt).toBeGreaterThanOrEqual(TAIL_AT_LEAST_MS);
  });

  it("an answer begun while the wake is still opening is not started until that open is over and let go, however long it takes", async () => {
    // a phone's slow input: the open outlasts the 2 s the voice used to wait before it went on regardless
    openTakes = 2400;
    await setSetting(handsFreeSetting, 'on');
    render(<HandsFreeGate />);
    await waitFor(() => expect(wakeOpenedAt).toHaveLength(1), { timeout });
    act(() => startAnswer(8, answerRuns('The answer is said whole.')));
    await new Promise((resolve) => setTimeout(resolve, 2300)); // a real-time wait: nothing must happen in this window (the voice waits for the open)
    // the microphone has not finished opening: the voice is not handed anything over it
    expect(wakeFake.listening).toBe(false);
    expect(synth.spoken.map((s) => s.text)).toEqual([]);
    await waitFor(() => expect(synth.spoken.map((s) => s.text)).toEqual(['The answer is said whole.']), { timeout });
    // it speaks with no microphone open
    expect(wakeFake.listening).toBe(false);
    act(() => synth.finishAll());
    expect(outcomes('The answer is said whole.')).toEqual(['ended']);
  }, 15000);
});
