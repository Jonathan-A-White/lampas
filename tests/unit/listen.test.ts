import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LANG, isListenSupported, recognizerLang, startListening, IDLE_RESTART_WAIT_MS, MAX_IDLE_RESTARTS, STOP_TIMEOUT_MS, type ListenOptions } from '../../src/services/listen';
import { FakeRecognizer, result, stubRecognizer } from '../support/fake-recognizer';

beforeEach(() => {
  vi.useFakeTimers();
  stubRecognizer();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function started(options: ListenOptions = {}) {
  const got = startListening({ lang: 'en-GB', ...options });
  if (!got.ok) throw new Error('expected listening to start');
  return got.session;
}

describe('startListening', () => {
  it('is not supported without a recogniser, and says so as a value', () => {
    vi.unstubAllGlobals();
    expect(isListenSupported()).toBe(false);
    const got = startListening();
    expect(got.ok).toBe(false);
    if (!got.ok) expect(got.error.kind).toBe('not-supported');
  });

  it('uses the webkit-prefixed recogniser when that is all there is', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognizer);
    FakeRecognizer.instances = [];
    expect(isListenSupported()).toBe(true);
    started();
    expect(FakeRecognizer.instances).toHaveLength(1);
  });

  it('listens continuously with interim words, in a full language tag', () => {
    started({ lang: 'en' });
    const rec = FakeRecognizer.last();
    expect(rec.continuous).toBe(true);
    expect(rec.interimResults).toBe(true);
    expect(rec.lang).toBe(DEFAULT_LANG);
    expect(recognizerLang('el-GR')).toBe('el-GR');
    expect(rec.startFn).toHaveBeenCalledTimes(1);
  });

  it('passes the interim words on while the finger is down', () => {
    const interim: string[] = [];
    started({ onInterim: (t) => interim.push(t) });
    const rec = FakeRecognizer.last();
    rec.say([result('what', false)]);
    rec.say([result('what does', false)]);
    rec.say([result('what does this mean', false)]);
    expect(interim).toEqual(['what', 'what does', 'what does this mean']);
  });

  it('says when the microphone is open, once', () => {
    const onStart = vi.fn();
    started({ onStart });
    const rec = FakeRecognizer.last();
    rec.open();
    rec.open();
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('starts the recogniser again when it ends mid-hold, and keeps the earlier words', async () => {
    const interim: string[] = [];
    const session = started({ onInterim: (t) => interim.push(t) });
    const rec = FakeRecognizer.last();
    rec.say([result('why does Paul say', true)]);
    rec.onend?.();
    expect(rec.startFn).toHaveBeenCalledTimes(2);
    rec.say([result('all things', false)]);
    expect(interim[interim.length - 1]).toBe('why does Paul say all things');
    const done = session.stop();
    await vi.advanceTimersByTimeAsync(0);
    const got = await done;
    expect(got).toMatchObject({ ok: true, text: 'why does Paul say all things' });
  });

  it('says a phrase the restarted recogniser hears again once', () => {
    const interim: string[] = [];
    started({ onInterim: (t) => interim.push(t) });
    const rec = FakeRecognizer.last();
    rec.say([result('why does Paul say', true)]);
    rec.onend?.();
    rec.say([result('why does Paul say all', false)]);
    expect(interim[interim.length - 1]).toBe('why does Paul say all');
  });

  it('release waits for the final result, then settles once with all the words', async () => {
    FakeRecognizer.endsOnStop = false;
    const onFinal = vi.fn();
    const session = started({ onFinal });
    const rec = FakeRecognizer.last();
    rec.say([result('what is this', false)]);
    let settled = false;
    const done = session.stop().then((r) => {
      settled = true;
      return r;
    });
    await vi.advanceTimersByTimeAsync(10);
    expect(settled).toBe(false);
    expect(rec.stopFn).toHaveBeenCalledTimes(1);
    // the last words arrive after the release, then the recogniser ends
    rec.say([result('what is this chapter about', true)]);
    rec.onend?.();
    const got = await done;
    expect(got).toEqual({ ok: true, text: 'what is this chapter about', mode: 'on-device' });
    expect(onFinal).toHaveBeenCalledExactlyOnceWith('what is this chapter about');
  });

  it('gives up waiting for a recogniser that never ends, after STOP_TIMEOUT_MS, with what was heard', async () => {
    FakeRecognizer.endsOnStop = false;
    const session = started();
    FakeRecognizer.last().say([result('hello there', false)]);
    const done = session.stop();
    await vi.advanceTimersByTimeAsync(STOP_TIMEOUT_MS + 1);
    expect(await done).toMatchObject({ ok: true, text: 'hello there' });
    expect(FakeRecognizer.last().abortFn).toHaveBeenCalled();
  });

  it('pointer-cancel (abort) sends nothing: no final words, an empty result', async () => {
    const onFinal = vi.fn();
    const session = started({ onFinal });
    FakeRecognizer.last().say([result('never mind', false)]);
    session.abort();
    expect(await session.stop()).toMatchObject({ ok: true, text: '' });
    expect(onFinal).not.toHaveBeenCalled();
    expect(FakeRecognizer.last().abortFn).toHaveBeenCalled();
  });

  it('not-allowed gives the permission message with the Settings steps, and stops', () => {
    const onError = vi.fn();
    started({ onError });
    const rec = FakeRecognizer.last();
    rec.onerror?.({ error: 'not-allowed' });
    rec.onend?.();
    expect(onError).toHaveBeenCalledTimes(1);
    const error = onError.mock.calls[0][0];
    expect(error.kind).toBe('permission-denied');
    expect(error.message).toContain('Lampas');
    expect(error.message).toMatch(/Settings.*Permissions.*Microphone.*Allow/);
    expect(rec.startFn).toHaveBeenCalledTimes(1);
  });

  it('a hold that hears nothing ends with the no-speech message', async () => {
    const onError = vi.fn();
    started({ onError });
    const rec = FakeRecognizer.last();
    // the recogniser ends at once, again and again: after MAX_IDLE_RESTARTS it is given up on
    for (let i = 0; i <= MAX_IDLE_RESTARTS; i++) rec.onend?.();
    expect(rec.startFn).toHaveBeenCalledTimes(1 + MAX_IDLE_RESTARTS);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ kind: 'no-speech', message: 'No speech was heard.' });
  });

  it('a transient no-speech error shows only when nothing was heard', async () => {
    const session = started();
    const rec = FakeRecognizer.last();
    rec.onerror?.({ error: 'no-speech' });
    const done = session.stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(await done).toMatchObject({ ok: false, text: '', error: { kind: 'no-speech' } });

    const second = started();
    const rec2 = FakeRecognizer.last();
    rec2.say([result('I said something', false)]);
    rec2.onerror?.({ error: 'no-speech' });
    const done2 = second.stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(await done2).toMatchObject({ ok: true, text: 'I said something' });
  });

  it('keeps starting a recogniser that keeps ending once he has said words, until he lets go', async () => {
    const session = started();
    const rec = FakeRecognizer.last();
    rec.say([result('hold on a moment', false)]);
    for (let i = 0; i < MAX_IDLE_RESTARTS; i++) rec.onend?.();
    const before = rec.startFn.mock.calls.length;
    rec.onend?.();
    expect(rec.startFn).toHaveBeenCalledTimes(before);
    await vi.advanceTimersByTimeAsync(IDLE_RESTART_WAIT_MS);
    expect(rec.startFn).toHaveBeenCalledTimes(before + 1);
    const done = session.stop();
    expect(await done).toMatchObject({ ok: true, text: 'hold on a moment' });
  });

  it('asks for on-device recognition and falls back to the cloud in the same hold when the phone cannot', () => {
    const onFallback = vi.fn();
    const session = started({ onFallback });
    const first = FakeRecognizer.last();
    expect(first.processLocally).toBe(true);
    expect(session.mode).toBe('on-device');
    first.onerror?.({ error: 'language-not-supported' });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(FakeRecognizer.instances).toHaveLength(2);
    expect(FakeRecognizer.last().processLocally).toBe(false);
    expect(session.mode).toBe('cloud');
  });
});
