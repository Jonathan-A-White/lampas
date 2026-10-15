// The fake Postern's answer() waits for the grist it answers (mw-5r3p30.370): a step that says 'the tutor answers' right after a tap
// can run before the app has built and sent its grist, on a loaded host. answer() then waits, up to the suite's ASYNC_WAIT_MS, for the
// next grist to arrive and answers it; only a grist that never comes fails it, with 'no grist arrived within N ms'.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Utils } from '@bsv/sdk';
import { askGrind, tutorTimings } from '../../src/services/tutor';
import { makeFakePostern, type FakePostern } from '../support/fake-postern';
import { ASYNC_WAIT_MS } from '../support/timeouts';

const key = Uint8Array.from(Utils.toArray('00'.repeat(31) + '0a', 'hex'));
const isAnswer = (value: unknown): value is { verdict: string } => typeof value === 'object' && value !== null && 'verdict' in value;
const ANSWER = { status: 'answered', answer: { verdict: 'well-read' } } as const;

let postern: FakePostern;
let saved: typeof tutorTimings;

beforeEach(() => {
  postern = makeFakePostern();
  saved = { ...tutorTimings };
  tutorTimings.pollMs = 10;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => postern.fetch(input, init));
});
afterEach(() => {
  Object.assign(tutorTimings, saved);
  vi.unstubAllGlobals();
});

const ask = () => askGrind('verse-read', { reference: 'Romans 8:28' }, isAnswer, { key });

describe("the fake Postern's answer", () => {
  it('called before the app sends, waits for the grist, answers it, and the app is shown the answer', async () => {
    const answered = postern.answer(ANSWER);
    expect(postern.received).toHaveLength(0);
    const shown = await ask();
    await answered;
    expect(shown).toEqual({ verdict: 'well-read' });
    expect(postern.received).toHaveLength(1);
  });

  it('called twice before two sends, answers each grist once, oldest first', async () => {
    const first = postern.answer(ANSWER);
    const second = postern.answer({ status: 'answered', answer: { verdict: 'some-to-fix' } });
    expect(await ask()).toEqual({ verdict: 'well-read' });
    expect(await ask()).toEqual({ verdict: 'some-to-fix' });
    await Promise.all([first, second]);
  });

  it('answers a grist already waiting at once', async () => {
    let sent!: () => void;
    const arrived = new Promise<void>((resolve) => (sent = resolve));
    const shown = askGrind('verse-read', { reference: 'Romans 8:28' }, isAnswer, { key, onSent: () => sent() });
    await arrived;
    await postern.answer(ANSWER);
    expect(await shown).toEqual({ verdict: 'well-read' });
  });

  it('fails only after the wait, naming it, when no grist arrives', async () => {
    expect(postern.answerWaitMs).toBe(ASYNC_WAIT_MS);
    postern.answerWaitMs = 30;
    // performance.now, not Date.now: tests/setup.ts bends Date.now so it never runs backwards, and the Desktop's wall clock steps back by
    // most of a second every half minute (WSL2's time sync), after which Date.now moves 1 ms a reading until real time catches up. The
    // wait is real time (realSetTimeout), so a monotonic clock is what measures it; the same as tests/unit/async-wait.test.ts.
    const started = performance.now();
    await expect(postern.answer(ANSWER)).rejects.toThrow('no grist arrived within 30 ms');
    expect(performance.now() - started).toBeGreaterThanOrEqual(25);
  });
});

// mw-skwocd.9: a scenario that leaves a grist in flight must not fail the next one. The fake counts what it has taken in and not
// answered (`inFlight`); `endAll` answers every one of them and what is sent after, so a step file can end a scenario with none left.
describe("the fake Postern's grists in flight", () => {
  it('counts a grist taken in and not answered, and endAll leaves none, now or later', async () => {
    expect(postern.inFlight).toBe(0);
    let sent!: () => void;
    const arrived = new Promise<void>((resolve) => (sent = resolve));
    const shown = askGrind('verse-read', { reference: 'Romans 8:28' }, isAnswer, { key, onSent: () => sent() });
    await arrived;
    expect(postern.inFlight).toBe(1);
    postern.endAll({ status: 'failed', reason: 'the scenario ended' });
    expect(postern.inFlight).toBe(0);
    await expect(shown).rejects.toBeDefined();
    const later = ask();
    await expect(later).rejects.toBeDefined();
    expect(postern.inFlight).toBe(0);
  });
});
