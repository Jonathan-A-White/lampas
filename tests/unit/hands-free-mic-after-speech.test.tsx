// tests/unit/hands-free-mic-after-speech.test.tsx — his report (mw-rl10piw.76, Postern general 2026-11-25, Android Chrome, 0.7.386/387): "when I do the three finger tap ... to turn it on I get
// hands-free and that's it it's cut short" and "he was answering but then ... the hands-free microphone came on and when the hands-free microphone came on it cut him off". mw-rl10piw.74 shut the
// microphone while a tutor answer speaks, but two ways stayed open: (1) the microphone opened in the instant a sentence's end was reported ('Hands-free on', an answer's last word), and the phone has
// not finished sounding it then, so the tail is clipped; (2) an answer's voice waited only 2 s for a wake that was still opening, then started over it, and the wake's microphone opened under the voice.
// So now no microphone opens while the app's voice speaks, and none opens until the voice has been quiet MIC_SETTLE_MS. The speech is voice-kit's honest fake and the wake its own fake (a listening
// wake is an open microphone); the gaps are measured in real milliseconds because the clip is the phone's, not the fake's.
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
import { stopReading } from '../../src/speech/readAloud';
import { startAnswerWhenSeen } from '../../src/speech/tutorVoice';
import { ENGLISH_VOICE, stubSpeech, type FakeSynth } from '../support/fake-speech';
import { serveWakeModel, stubWake, type WakeFake } from '../support/fake-wake';

/** The least a microphone may wait after the voice ended (the session waits 150 ms; a few ms of margin for the timers). */
const AT_LEAST_MS = 140;

let synth: FakeSynth;
let wake: WakeFake;
/** What happened, in order, with the real time it happened at. */
let log: Array<{ what: 'wake open' | 'wake close' | 'speak' | 'ended'; text?: string; micOpen?: boolean; at: number }>;
/** Holds a wake's start (a microphone that is slow to open) until released; null for a wake that starts at once. */
let hold: Promise<void> | null;
/** How many times the wake was asked to start (the fake counts only a start that has gone through). */
let asked: number;

const answerText = 'Isaiah opens with a courtroom. Judah is pictured as a body beaten from head to foot. Zion shall be redeemed with judgment.';

beforeEach(async () => {
  cleanup();
  resetHandsFree();
  clearBus();
  stopReading();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
  synth = stubSpeech([ENGLISH_VOICE]);
  wake = stubWake();
  serveWakeModel();
  const mine: typeof log = [];
  log = mine;
  hold = null;
  asked = 0;
  const speak = synth.honest.synth.speak.bind(synth.honest.synth);
  synth.honest.synth.speak = (u) => {
    mine.push({ what: 'speak', text: u.text, micOpen: wake.listening, at: performance.now() });
    const onend = u.onend;
    u.onend = (event) => {
      mine.push({ what: 'ended', text: u.text, at: performance.now() });
      onend?.call(u, event);
    };
    speak(u);
  };
  const start = wake.start.bind(wake);
  wake.start = async (options) => {
    asked++;
    if (hold) await hold;
    const opened = (await start(options)) as { ok: boolean; stop?: () => void };
    if (!opened.ok || !opened.stop) return opened;
    mine.push({ what: 'wake open', at: performance.now() });
    const stop = opened.stop;
    let closed = false;
    return {
      ...opened,
      stop() {
        if (!closed) mine.push({ what: 'wake close', at: performance.now() });
        closed = true;
        stop();
      },
    };
  };
  await db.open();
  await db.settings.clear();
});

afterAll(() => {
  vi.useRealTimers();
  wake.uninstall();
  cleanup();
  resetHandsFree();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const at = (what: 'wake open' | 'wake close' | 'speak' | 'ended', text?: string, nth = 0): number => {
  const found = log.filter((e) => e.what === what && (text === undefined || e.text === text));
  expect(found.length, `${what} ${text ?? ''} #${nth}`).toBeGreaterThan(nth);
  return found[nth].at;
};

describe('Hands-free: no microphone opens over a sentence, or in the instant it ends (mw-rl10piw.76)', () => {
  it("opens the wake only some time after 'Hands-free on' has been said to its end", async () => {
    render(<HandsFreeGate />);
    await act(async () => {});
    act(() => threeFingerTap(document.body));
    await waitFor(() => expect(synth.spoken.map((s) => s.text)).toEqual(['Hands-free on']));
    expect(asked).toBe(0);
    act(() => synth.finishAll());
    await waitFor(() => expect(wake.listening).toBe(true));
    expect(synth.honest.log.filter((e) => e.text === 'Hands-free on').map((e) => e.outcome)).toEqual(['ended']);
    expect(at('wake open') - at('ended', 'Hands-free on')).toBeGreaterThanOrEqual(AT_LEAST_MS);
  });

  it('an answer that begins while the wake is still opening is not started over it: the wake finishes opening, lets go, and the voice starts after', async () => {
    let release: () => void = () => {};
    hold = new Promise<void>((resolve) => (release = resolve));
    await setSetting(handsFreeSetting, 'on');
    render(<HandsFreeGate />);
    await waitFor(() => expect(asked).toBeGreaterThan(0));
    // the wake takes longer to open than the 2 s the answer's voice used to wait for it: time passes (the clock is the test's), the voice has not begun
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    act(() => startAnswerWhenSeen(41, answerRuns(answerText)));
    await vi.advanceTimersByTimeAsync(2600);
    vi.useRealTimers();
    expect(synth.spoken).toEqual([]);
    act(() => release());
    await waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0));
    // the wake opened (it had been asked to), was let go, and only then did the voice start; no microphone was open as it began
    expect(log.map((e) => e.what).slice(0, 3)).toEqual(['wake open', 'wake close', 'speak']);
    expect(log.filter((e) => e.what === 'speak').every((e) => e.micOpen === false)).toBe(true);
    expect(at('speak') - at('wake close')).toBeGreaterThanOrEqual(AT_LEAST_MS);
  });

  it("the wake listens again only some time after the answer's last sentence has ended, and the answer is not cut", async () => {
    await setSetting(handsFreeSetting, 'on');
    render(<HandsFreeGate />);
    await waitFor(() => expect(wake.listening).toBe(true));
    act(() => startAnswerWhenSeen(42, answerRuns(answerText)));
    await waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0));
    expect(wake.listening).toBe(false);
    for (let i = 0; i < 20 && synth.spoken.length > 0 && !synth.honest.log.some((e) => e.outcome === 'ended' && String(e.text).includes('redeemed')); i++) {
      await waitFor(() => expect(synth.speaking).toBe(true));
      act(() => synth.finish());
    }
    const answer = synth.honest.log.filter((e) => answerText.includes(String(e.text).replace(/\s+/g, ' ').trim()));
    expect(answer.length).toBeGreaterThanOrEqual(3);
    expect(answer.map((e) => e.outcome)).toEqual(answer.map(() => 'ended'));
    expect(synth.calls.slice(synth.calls.findIndex((c) => c.startsWith('speak Isaiah opens')))).not.toContain('cancel');
    await waitFor(() => expect(wake.listening).toBe(true));
    const lastEnd = Math.max(...log.filter((e) => e.what === 'ended').map((e) => e.at));
    expect(at('wake open', undefined, 1) - lastEnd).toBeGreaterThanOrEqual(AT_LEAST_MS);
  });
});
