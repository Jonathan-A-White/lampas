// The wait for the mill's answer (src/services/tutor.ts askGrind): a slow answer, and a poll that fails on the way, never end the wait;
// the wait gives up as 'Could not reach the tutor' only when no call to Postern has succeeded for CONTACT_LOST_MS, and as 'took too
// long' at the tutor's deadline (mw-5r3p30.208). The mill is the fake Postern behind a fetch whose answers the test delays or fails, on fake time.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PrivateKey, Utils } from '@bsv/sdk';
import { CONTACT_LOST_MS, TutorError, askGrind, tutorTimings } from '../../src/services/tutor';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';

const key = Uint8Array.from(Utils.toArray('00'.repeat(31) + '09', 'hex'));
const isAnswer = (value: unknown): value is { verdict: string } => typeof value === 'object' && value !== null && 'verdict' in value;
const ANSWER = { status: 'answered', answer: { verdict: 'well-read' } } as const;

let postern: FakePostern;
/** how the next call to Postern behaves: answer as the fake does (undefined), after a delay, never answer (the door's 30 s then ends it), or fail to connect */
let behave: (path: string, method: string) => { delayMs?: number; hang?: boolean; unreachable?: boolean } | undefined;
let saved: typeof tutorTimings;

beforeEach(() => {
  vi.useFakeTimers();
  postern = makeFakePostern();
  behave = () => undefined;
  saved = { ...tutorTimings };
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    const how = behave(url.pathname, (init?.method ?? 'GET').toUpperCase());
    if (how?.unreachable) throw new TypeError('Failed to fetch');
    if (how?.hang) return new Promise<Response>(() => undefined);
    if (how?.delayMs) await new Promise((resolve) => setTimeout(resolve, how.delayMs));
    return postern.fetch(input, init);
  });
});
afterEach(() => {
  Object.assign(tutorTimings, saved);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const ask = (onSent?: () => void) => askGrind('verse-read', { reference: 'Romans 8:28' }, isAnswer, { key, onSent });
/** settles with the TutorError the wait ends in, or the answer */
const outcome = (wait: Promise<unknown>) => wait.then((answer) => ({ answer }), (error: unknown) => ({ error }));
const isPolling = (path: string, method: string) => path === '/api/messages' && method === 'GET';

describe('a slow answer', () => {
  it('is waited for: the mill answers after 45 s of fake time and every request answers within 30 s', async () => {
    behave = (path, method) => (isPolling(path, method) ? { delayMs: 20_000 } : undefined);
    const wait = outcome(ask(() => setTimeout(() => postern.answer(ANSWER), 45_000)));
    await vi.advanceTimersByTimeAsync(120_000);
    expect(await wait).toEqual({ answer: { verdict: 'well-read' } });
  });
});

describe('a poll that fails inside the wait', () => {
  it('does not end it: two polls that time out (30 s each) and a later one that finds the answer', async () => {
    let polls = 0;
    behave = (path, method) => {
      if (!isPolling(path, method)) return undefined;
      polls += 1;
      return polls === 2 || polls === 3 ? { hang: true } : undefined;
    };
    const wait = outcome(ask(() => setTimeout(() => postern.answer(ANSWER), 50_000)));
    await vi.advanceTimersByTimeAsync(170_000);
    expect(await wait).toEqual({ answer: { verdict: 'well-read' } });
    expect(polls).toBeGreaterThan(3);
  });

  it('does not end it: polls that cannot connect for a few seconds (a mobile blip)', async () => {
    let blip = false;
    behave = (path, method) => (blip && isPolling(path, method) ? { unreachable: true } : undefined);
    const wait = outcome(
      ask(() => {
        setTimeout(() => (blip = true), 3_000);
        setTimeout(() => (blip = false), 15_000);
        setTimeout(() => postern.answer(ANSWER), 20_000);
      }),
    );
    await vi.advanceTimersByTimeAsync(60_000);
    expect(await wait).toEqual({ answer: { verdict: 'well-read' } });
  });
});

describe('a backend that cannot be reached', () => {
  it('ends as Could not reach the tutor once no call has succeeded for CONTACT_LOST_MS, not before and not endlessly', async () => {
    let dead = false;
    behave = () => (dead ? { hang: true } : undefined);
    let failedAt: number | undefined;
    const started = Date.now();
    const wait = outcome(
      ask(() => {
        dead = true;
      }),
    ).then((result) => {
      failedAt = Date.now() - started;
      return result;
    });
    await vi.advanceTimersByTimeAsync(CONTACT_LOST_MS - 5_000);
    expect(failedAt).toBeUndefined();
    await vi.advanceTimersByTimeAsync(tutorTimings.deadlineMs);
    const result = (await wait) as { error: TutorError };
    expect(result.error).toBeInstanceOf(TutorError);
    expect(result.error.failure).toBe('unreachable');
    expect(result.error.message).toBe('Postern did not answer. Check the connection and try again.');
    expect(failedAt).toBeLessThan(CONTACT_LOST_MS + 2 * 30_000 + 2 * tutorTimings.pollMs);
  });

  it('is the same when every call throws the door’s ApiTimeoutError or BackendUnreachableError', async () => {
    let dead = false;
    behave = () => (dead ? { unreachable: true } : undefined);
    const wait = outcome(
      ask(() => {
        dead = true;
      }),
    );
    await vi.advanceTimersByTimeAsync(tutorTimings.deadlineMs);
    const result = (await wait) as { error: TutorError };
    expect(result.error.failure).toBe('unreachable');
  });
});

describe('an answer that never comes', () => {
  it('ends as The tutor took too long to answer. at the 180 s deadline, with the backend answering all the while', async () => {
    const wait = outcome(ask());
    await vi.advanceTimersByTimeAsync(tutorTimings.deadlineMs - 1_000);
    let ended = false;
    void wait.then(() => (ended = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(ended).toBe(false);
    await vi.advanceTimersByTimeAsync(2_000);
    const result = (await wait) as { error: TutorError };
    expect(result.error).toBeInstanceOf(TutorError);
    expect(result.error.failure).toBe('no-answer');
    expect(result.error.message).toBe('The tutor took too long to answer.');
  });
});

// mw-5r3p30.269: his Read it aloud on 1 Thessalonians 5:16 showed 'Waiting for the tutor… 83 s' while the mill had answered 10 s after
// the grist was sent. The wait paged GET /api/messages from since=0 with no limit, so its first page was every record this phone ever
// sent or was sent (about 10 MB for his phone; each record carries its payload twice), and the door's 30 s timer stops when the headers
// arrive, so nothing bounded a body read over mobile data. The fetch below is that link: the headers come at once and the body comes
// `bytesPerSecond` at a time, or never (a stall); the fetch's signal cuts it, as a browser's does.
/** how many bodies the link was cut off in the middle of */
let cut = 0;
const phone = PrivateKey.fromHex('00'.repeat(31) + '09').toPublicKey().toString();

/** `response` as a slow link delivers it: headers now, the body after its length at `bytesPerSecond`, or never when `stall`. */
async function overLink(response: Response, signal: AbortSignal | null | undefined, how: { bytesPerSecond?: number; stall?: boolean }): Promise<Response> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const ms = how.stall ? undefined : (bytes.length / (how.bytesPerSecond ?? Infinity)) * 1000;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const abort = (): void => controller.error(new DOMException('The operation was aborted.', 'AbortError'));
      if (signal?.aborted) return abort();
      const timer =
        ms === undefined
          ? undefined
          : setTimeout(() => {
              signal?.removeEventListener('abort', stop);
              controller.enqueue(bytes);
              controller.close();
            }, ms);
      const stop = (): void => {
        clearTimeout(timer);
        cut += 1;
        abort();
      };
      signal?.addEventListener('abort', stop, { once: true });
    },
  });
  return new Response(body, { status: response.status, headers: response.headers });
}

/** Puts `count` old records for this phone on the backend, each about `size` bytes: the history of a phone that has asked a lot. */
function history(count: number, size: number): void {
  for (let i = 0; i < count; i += 1) postern.sendStatus(phone, { kind: 'request-status', note: 'x'.repeat(size) });
}

describe('a phone with a long history, on mobile data (mw-5r3p30.269)', () => {
  let link: (path: string, method: string, polls: number) => { bytesPerSecond?: number; stall?: boolean } | undefined;
  let polls: number;
  beforeEach(() => {
    polls = 0;
    cut = 0;
    link = () => undefined;
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(typeof input === 'string' ? input : input.toString());
      const method = (init?.method ?? 'GET').toUpperCase();
      if (isPolling(url.pathname, method)) polls += 1;
      const how = link(url.pathname, method, polls);
      const response = await postern.fetch(input, init);
      return how ? overLink(response, init?.signal, how) : response;
    });
  });

  it('is shown the answer within a poll of the mill answering, not after reading the whole history (his 83 s)', async () => {
    history(150, 6_000); // about 1.2 MB of sealed records, which this link takes about a minute to read
    link = () => ({ bytesPerSecond: 20_000 });
    let sentAt = 0;
    let settledAt: number | undefined;
    const wait = outcome(
      ask(() => {
        sentAt = Date.now();
        setTimeout(() => postern.answer(ANSWER), 10_000); // sent 22:34:21Z, answered 22:34:31Z
      }),
    ).then((result) => {
      settledAt = Date.now();
      return result;
    });
    await vi.advanceTimersByTimeAsync(120_000);
    expect(await wait).toEqual({ answer: { verdict: 'well-read' } });
    expect(settledAt! - sentAt).toBeLessThanOrEqual(10_000 + tutorTimings.pollMs + 1_000);
  });

  it('does not let a poll whose page stalls half-way hold up the next: the answer ready by then is shown within pollMs + 1 s, and the stalled page is cut', async () => {
    link = (path, method, count) => (isPolling(path, method) && count === 1 ? { stall: true } : undefined);
    let sentAt = 0;
    let settledAt: number | undefined;
    const wait = outcome(
      ask(() => {
        sentAt = Date.now();
        setTimeout(() => postern.answer(ANSWER), 2_000);
      }),
    ).then((result) => {
      settledAt = Date.now();
      return result;
    });
    await vi.advanceTimersByTimeAsync(tutorTimings.deadlineMs + 10_000);
    expect(await wait).toEqual({ answer: { verdict: 'well-read' } });
    expect(polls).toBe(2);
    expect(settledAt! - sentAt).toBeLessThanOrEqual(tutorTimings.pollMs + 1_000);
    expect(cut).toBe(1);
  });

  it('gives up on a page that has not come, body and all, in pollTimeoutMs: the door\'s 30 s ends at the headers', async () => {
    link = (path, method) => (isPolling(path, method) ? { stall: true } : undefined);
    const wait = outcome(ask());
    await vi.advanceTimersByTimeAsync(tutorTimings.pollTimeoutMs + 1_000);
    expect(cut).toBeGreaterThanOrEqual(1);
    await vi.advanceTimersByTimeAsync(tutorTimings.deadlineMs);
    const result = (await wait) as { error: TutorError };
    expect(result.error.failure).toBe('unreachable');
  });
});
