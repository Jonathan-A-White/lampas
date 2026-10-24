// tests/unit/recall-hold.test.tsx — Lampas hears a recall (mw-fu7dqf.7, docs/layout/memorize.md): useRecallHold(lang) dictates English in en-US, or Greek in el-GR and never in
// anything else (voice-kit's strictLang), and hands the words once, on release; a Weave recall is recorded (the words of a mixed verse cannot be dictated: one recogniser hears one
// language) and the recording is handed on. A phone that cannot hear Greek, or has no network, says so (onUnavailable) so the session can grade itself. The recogniser is
// tests/support/fake-recognizer.ts, the recorder tests/support/fake-recorder.ts; nothing is faked by hand beyond them.
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recording } from '../../src/audio/recorder';
import { useRecallHold, type RecallHold, type RecallUnavailable } from '../../src/memorize/useRecallHold';
import type { MemorizeLang } from '../../src/memorize/languages';
import { askTranscriber } from '../../src/speech/askTranscriber';
import { useTalkHold } from '../../src/talk/useTalkHold';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';
import { FakeRecorder, stubRecorder } from '../support/fake-recorder';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  stubRecognizer();
  stubRecorder();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const pass = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));

interface Heard {
  words: string[];
  recordings: Recording[];
  unavailable: RecallUnavailable[];
}

function mount(lang: MemorizeLang): { heard: Heard; hold: () => RecallHold } {
  const heard: Heard = { words: [], recordings: [], unavailable: [] };
  const { result: hook } = renderHook(() =>
    useRecallHold({ lang, onHeard: (words) => heard.words.push(words), onRecording: (recording) => heard.recordings.push(recording), onUnavailable: (reason) => heard.unavailable.push(reason) }),
  );
  return { heard, hold: () => hook.current };
}

/** The bar is held: the finger goes down and the recogniser is started. */
async function press(hold: () => RecallHold) {
  act(() => hold().talk.bar.onPointerDown({ pointerId: 1, clientX: 10, clientY: 10, currentTarget: { setPointerCapture: () => undefined } } as never));
  await pass();
}
async function release(hold: () => RecallHold) {
  act(() => hold().talk.bar.onPointerUp());
  await pass();
  await pass();
}

describe('a recall said in English', () => {
  it('starts the transcriber in en-US, not strict, and hands the words on once, on release', async () => {
    const start = vi.spyOn(askTranscriber, 'start');
    const { heard, hold } = mount('en');
    await press(hold);
    expect(start).toHaveBeenCalledTimes(1);
    expect(start.mock.calls[0][0]).toMatchObject({ lang: 'en-US' });
    expect(start.mock.calls[0][0].strictLang).toBeFalsy();
    const recogniser = FakeRecognizer.last();
    act(() => {
      recogniser.open();
      recogniser.say([result('For we know that', false)]);
    });
    expect(heard.words).toEqual([]);
    await release(hold);
    expect(heard.words).toEqual(['For we know that']);
    expect(heard.unavailable).toEqual([]);
  });
});

describe('a recall said in Greek', () => {
  it('starts the transcriber in el-GR, strict, and hands the words on once, on release', async () => {
    const start = vi.spyOn(askTranscriber, 'start');
    const { heard, hold } = mount('el');
    await press(hold);
    expect(start.mock.calls[0][0]).toMatchObject({ lang: 'el-GR', strictLang: true });
    const recogniser = FakeRecognizer.last();
    expect(recogniser.lang).toBe('el-GR');
    act(() => {
      recogniser.open();
      recogniser.say([result('οἴδαμεν δὲ ὅτι', false)]);
    });
    await release(hold);
    expect(heard.words).toEqual(['οἴδαμεν δὲ ὅτι']);
  });

  it('never walks on to English: a phone that cannot hear Greek says so (no-greek-dictation)', async () => {
    FakeRecognizer.noSpeechFor = ['el-GR', 'el'];
    const { heard, hold } = mount('el');
    await press(hold);
    act(() => FakeRecognizer.answerChecks());
    await pass();
    expect(FakeRecognizer.instances.every((r) => r.lang !== 'en-US' && r.lang !== '')).toBe(true);
    expect(heard.unavailable).toEqual(['no-greek-dictation']);
    expect(heard.words).toEqual([]);
  });

  it('says offline when the speech service cannot be reached (a network error)', async () => {
    const { heard, hold } = mount('el');
    await press(hold);
    const recogniser = FakeRecognizer.last();
    act(() => recogniser.open());
    await act(async () => recogniser.onerror?.({ error: 'network' }));
    await release(hold);
    expect(heard.unavailable).toEqual(['offline']);
    expect(heard.words).toEqual([]);
  });
});

describe('a Weave recall', () => {
  it('starts no recogniser: the recorder runs for the hold and the recording is handed on', async () => {
    const start = vi.spyOn(askTranscriber, 'start');
    const { heard, hold } = mount('weave');
    act(() => hold().record.press());
    await pass();
    expect(hold().record.listening).toBe(true);
    expect(FakeRecorder.last().started).toBe(true);
    act(() => hold().record.release());
    await pass();
    await pass();
    expect(FakeRecorder.last().stopped).toBe(true);
    expect(heard.recordings).toHaveLength(1);
    expect(heard.recordings[0]).toMatchObject({ mime: 'audio/webm', durationMs: FakeRecorder.durationMs });
    expect(start).not.toHaveBeenCalled();
    expect(FakeRecognizer.instances).toHaveLength(0);
    expect(hold().record.listening).toBe(false);
  });

  it('a hold too short for the mill to score sends nothing and says so', async () => {
    FakeRecorder.durationMs = 400;
    const { heard, hold } = mount('weave');
    act(() => hold().record.press());
    await pass();
    act(() => hold().record.release());
    await pass();
    await pass();
    expect(heard.recordings).toEqual([]);
    expect(hold().record.phase).toBe('short');
  });

  it('a slide off drops the recording', async () => {
    const { heard, hold } = mount('weave');
    act(() => hold().record.press());
    await pass();
    act(() => hold().record.drop());
    await pass();
    expect(FakeRecorder.last().cancelled).toBe(true);
    expect(heard.recordings).toEqual([]);
    expect(hold().record.phase).toBe('dropped');
  });

  it('a phone with the microphone turned off says so (no-microphone)', async () => {
    FakeRecorder.denied = true;
    const { heard, hold } = mount('weave');
    act(() => hold().record.press());
    await pass();
    expect(heard.unavailable).toEqual(['no-microphone']);
    expect(heard.recordings).toEqual([]);
  });
});

describe('every other bar (useTalkHold with no language given)', () => {
  it('still asks for en-US and is not strict', async () => {
    const start = vi.spyOn(askTranscriber, 'start');
    const { result: hook } = renderHook(() => useTalkHold(() => undefined));
    act(() => hook.current.bar.onPointerDown({ pointerId: 1, clientX: 10, clientY: 10, currentTarget: { setPointerCapture: () => undefined } } as never));
    await pass();
    expect(start).toHaveBeenCalledTimes(1);
    expect(start.mock.calls[0][0]).toMatchObject({ lang: 'en-US' });
    expect(start.mock.calls[0][0].strictLang).toBeFalsy();
  });
});
