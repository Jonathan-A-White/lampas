// A long reading check (5 to 10 minutes, mw-5r3p30.684) waits as long as the mill may take for a clip of that length, its upload has room to
// finish on a slow link, and a reading that still runs out of time says so (mw-5r3p30.685), never 'The tutor is offline right now'.
// The mill's scorer limit is 120 s + 0.5 s per second of audio, at most 540 s (the mill's mw-gq6.660); the mill is the fake Postern on fake time.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Utils } from '@bsv/sdk';
import { askGrind, OFFLINE_MESSAGE, TUTOR_OFFLINE_MESSAGE, TutorError, tutorTimings, UPLOAD_TOO_SLOW_MESSAGE } from '../../src/services/tutor';
import { askVerseRead, buildReadingRequest, isVerseReadAnswer, READING_TOO_LONG_MESSAGE, READING_UPLOAD_TOO_SLOW_MESSAGE, readingDeadlineMs, scorerLimitMs, uploadTimeoutMs } from '../../src/services/reading';
import type { Recording } from '../../src/audio/recorder';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';

const key = Uint8Array.from(Utils.toArray('00'.repeat(31) + '09', 'hex'));
const ANSWER = { status: 'answered', answer: { verdict: 'well-read', note: 'Well read.', focus_words: [] } } as const;
const verse = { n: 1, g: [], e: [{ t: 'In the beginning' }] } as never;
const request = buildReadingRequest('Genesis 1:1', verse);
/** the recorder's bits: 32 kbit/s, so 4000 bytes a second */
const clip = (seconds: number): Recording => ({ blob: new Blob([new Uint8Array(seconds * 4000)]), mime: 'audio/webm', durationMs: seconds * 1000 });

// a clip's sealing and hashing are real work (crypto.subtle) that fake time does not wait for: time is moved on in steps, each given a real moment first
const realSetTimeout = globalThis.setTimeout;
const realMoment = (): Promise<void> => new Promise((resolve) => realSetTimeout(resolve, 20));
async function advance(ms: number): Promise<void> {
  for (let left = ms; left > 0; left -= 10_000) {
    await realMoment();
    await vi.advanceTimersByTimeAsync(Math.min(10_000, left));
  }
  await realMoment();
}

let postern: FakePostern;
let delayOf: (path: string, method: string) => number;
let saved: typeof tutorTimings;

beforeEach(() => {
  vi.useFakeTimers();
  postern = makeFakePostern();
  delayOf = () => 0;
  saved = { ...tutorTimings };
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const delay = delayOf(url.pathname, (init?.method ?? 'GET').toUpperCase());
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    return postern.fetch(input, init);
  });
});
afterEach(() => {
  Object.assign(tutorTimings, saved);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const outcome = (wait: Promise<unknown>) => wait.then((answer) => ({ answer }), (error: unknown) => ({ error }));

describe('the deadline of a reading check', () => {
  it('is never below the fixed 180 s and grows with the clip: the mill scores 20 s in 130 s, 300 s in 270 s and 600 s in 420 s', () => {
    expect(scorerLimitMs(20)).toBe(130_000);
    expect(scorerLimitMs(300)).toBe(270_000);
    expect(scorerLimitMs(600)).toBe(420_000);
    for (const seconds of [20, 300, 600]) {
      expect(readingDeadlineMs(seconds)).toBeGreaterThanOrEqual(tutorTimings.deadlineMs);
      // the scorer's limit, then the model's step and the upload on top of it
      expect(readingDeadlineMs(seconds)).toBeGreaterThan(scorerLimitMs(seconds) + uploadTimeoutMs(seconds * 4000));
    }
    expect(readingDeadlineMs(300)).toBeGreaterThan(readingDeadlineMs(20));
    expect(readingDeadlineMs(600)).toBeGreaterThan(readingDeadlineMs(300));
    expect(readingDeadlineMs(600)).toBeGreaterThanOrEqual(10 * 60_000);
  });

  it('keeps a 600 s reading waiting past the fixed 180 s: the mill answers it at 400 s', async () => {
    postern.autoReply = undefined;
    const wait = outcome(askVerseRead(request, clip(600), { key, onSent: () => setTimeout(() => void postern.answer(ANSWER), 400_000) }));
    await advance(450_000);
    expect(await wait).toEqual({ answer: ANSWER.answer });
  });
});

describe('the upload of a reading', () => {
  it('is not cut at the door default 30 s: a 600 s clip (2.4 MB) whose upload takes 100 s on a slow link is sent and answered', async () => {
    delayOf = (path, method) => (path === '/api/blobs' && method === 'POST' ? 100_000 : 0);
    postern.autoReply = ANSWER;
    const wait = outcome(askVerseRead(request, clip(600), { key }));
    await advance(200_000);
    expect(await wait).toEqual({ answer: ANSWER.answer });
    expect(postern.blobs).toHaveLength(1);
    expect(postern.received).toHaveLength(1);
  });

  it('has room for a 600 s clip on a slow link: more than the door 30 s, and the longer the clip the longer', () => {
    expect(uploadTimeoutMs(600 * 4000)).toBeGreaterThan(100_000);
    expect(uploadTimeoutMs(20 * 4000)).toBeGreaterThanOrEqual(30_000);
    expect(uploadTimeoutMs(600 * 4000)).toBeGreaterThan(uploadTimeoutMs(20 * 4000));
  });
});

describe('a reading that runs out of time', () => {
  it('says it took too long to check, never that the tutor is offline', async () => {
    postern.autoReply = undefined;
    const wait = outcome(askVerseRead(request, clip(300), { key }));
    await advance(readingDeadlineMs(300) + 5_000);
    const result = (await wait) as { error: TutorError };
    expect(result.error).toBeInstanceOf(TutorError);
    expect(result.error.message).toBe(READING_TOO_LONG_MESSAGE);
    expect(result.error.message).not.toContain('offline');
    expect(result.error.message).not.toBe(TUTOR_OFFLINE_MESSAGE);
  });
});

describe('a reading whose upload runs out of time (mw-5r3p30.690)', () => {
  it('says the reading was too slow to send, not that the tutor is offline or that the check took too long', async () => {
    delayOf = (path, method) => (path === '/api/blobs' && method === 'POST' ? uploadTimeoutMs(600 * 4000) + 60_000 : 0);
    const wait = outcome(askVerseRead(request, clip(600), { key }));
    await advance(uploadTimeoutMs(600 * 4000) + 30_000);
    const result = (await wait) as { error: TutorError };
    expect(result.error).toBeInstanceOf(TutorError);
    expect(result.error.message).toBe(READING_UPLOAD_TOO_SLOW_MESSAGE);
    expect(result.error.message).not.toBe(TUTOR_OFFLINE_MESSAGE);
    expect(result.error.message).not.toBe(READING_TOO_LONG_MESSAGE);
    expect(result.error.message).toContain('send');
    // nothing went: a retry sends the reading afresh, and the screen may offer it (failure is not 'not-sent')
    expect(result.error.failure).toBe('unreachable');
    expect(result.error.resend).toBeUndefined();
    expect(postern.received).toHaveLength(0);
  });

  it('says the same, in the general words, for an ask whose file upload runs out of the door 30 s', async () => {
    delayOf = (path, method) => (path === '/api/blobs' && method === 'POST' ? 90_000 : 0);
    const wait = outcome(askGrind('verse-read', request, isVerseReadAnswer, { key, files: [{ bytes: new Uint8Array(1000), mime: 'audio/webm', name: 'a.webm' }], untimed: true }));
    await advance(35_000);
    const result = (await wait) as { error: TutorError };
    expect(result.error).toBeInstanceOf(TutorError);
    expect(result.error.message).toBe(UPLOAD_TOO_SLOW_MESSAGE);
  });

  it('still says the tutor is offline when the upload is refused by a gateway error with the phone online', async () => {
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      if (url.pathname === '/api/blobs') return new Response('bad gateway', { status: 502 });
      return postern.fetch(input, init);
    });
    const result = (await outcome(askVerseRead(request, clip(20), { key }))) as { error: TutorError };
    expect(result.error.message).toBe(TUTOR_OFFLINE_MESSAGE);
  });

  it('says the phone is offline when it is, whatever the upload did', async () => {
    delayOf = (path, method) => (path === '/api/blobs' && method === 'POST' ? 90_000 : 0);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const wait = outcome(askVerseRead(request, clip(20), { key }));
    await advance(60_000);
    const result = (await wait) as { error: TutorError };
    expect(result.error.message).toBe(OFFLINE_MESSAGE);
    vi.restoreAllMocks();
  });
});
