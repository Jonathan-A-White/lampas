// features/steps/tutor-timing.steps.tsx — runs features/tutor-timing.feature: the phone times every tutor answer (tap to sent, delivered to seen,
// seen to shown, the network inside them) and reports the last one as client_timing on the next grist; About shows its split. A fake Postern
// (tests/support/fake-postern.ts) is the backend and mill; only Date is faked (the clock below moves when a step says so), so the poll still runs on real timers.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen } from '@testing-library/react';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { About } from '../../src/About';
import { db } from '../../src/data/db';
import { answerDrawn } from '../../src/services/clientTiming';
import { askGrind, tutorTimings, TutorError } from '../../src/services/tutor';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  for (const a of asks ?? []) a.abort();
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  db.close();
});

const PHONE_KEY = '00'.repeat(31) + '02';
const KEY = Uint8Array.from(PHONE_KEY.match(/../g) ?? [], (h) => parseInt(h, 16));
const T = Date.UTC(2026, 9, 13, 12, 0, 0);
const isAnything = (value: unknown): value is object => typeof value === 'object' && value !== null;

let fake: FakePostern;
/** How long (ms of the faked clock) each kind of call takes, for the steps that give the network some time. */
let calls: Record<string, number>;
let asks: { done: Promise<unknown>; txid: Promise<string>; abort: () => void }[];

const at = (seconds: number): number => T + Math.round(seconds * 1000);
const now = (seconds: number): void => void vi.setSystemTime(at(seconds));

function begin(): void {
  for (const a of asks ?? []) a.abort();
  cleanup();
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ['Date'], now: T });
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  calls = {};
  asks = [];
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
    if (!String(input).startsWith(POSTERN_ORIGIN)) return Promise.reject(new TypeError('no network in this test'));
    const url = new URL(String(input));
    vi.setSystemTime(Date.now() + (calls[`${(init?.method ?? 'GET').toUpperCase()} ${url.pathname}`] ?? 0));
    return fake.fetch(input, init);
  });
}

/** Starts a grist the way a screen does: the tap was at `tapAt`; resolves `txid` once the backend has accepted it. */
function ask(tapAt = Date.now()): (typeof asks)[number] {
  const controller = new AbortController();
  let resolve!: (txid: string) => void;
  const txid = new Promise<string>((r) => (resolve = r));
  const done = askGrind('verse-ask', { question: 'What does it mean?' }, isAnything, { key: KEY, tapAt, signal: controller.signal, onSent: resolve });
  done.catch(() => undefined);
  const run = { done, txid, abort: () => controller.abort() };
  asks.push(run);
  return run;
}

const feature = await loadFeature('features/tutor-timing.feature');

/** One whole answer: tap at 0, accepted at 1.2, delivered 7.0, seen 8.5, drawn 8.6. */
async function timedAnswer(): Promise<void> {
  now(1.2);
  const first = ask(at(0));
  await first.txid;
  now(7);
  await fake.answer({ status: 'answered', answer: {} });
  now(8.5);
  await first.done;
  now(8.6);
  await answerDrawn(await first.txid);
}

const lastReceived = () => fake.received[fake.received.length - 1];

describeFeature(feature, ({ Scenario }) => {
  Scenario('The next grist carries the phone\'s part of the last answer', ({ Given, When, And, Then }) => {
    Given('a phone that has never asked the tutor', begin);
    When('he taps at {number} s and the mill accepts the request at {number} s', async (_, tap: number, accepted: number) => {
      now(accepted);
      const run = ask(at(tap));
      await run.txid;
    });
    And('the mill delivers the answer at {number} s and the poll sees it at {number} s', async (_, delivered: number, seen: number) => {
      now(delivered);
      await fake.answer({ status: 'answered', answer: {} });
      now(seen);
      await asks[0].done;
    });
    And('the answer is drawn at {number} s', async (_, drawn: number) => {
      now(drawn);
      await answerDrawn(await asks[0].txid);
    });
    And('he asks again', async () => {
      now(20);
      await ask().txid;
    });
    Then('the grist carries client_timing for the first grist with tap to sent {number}, delivered to seen {number} and seen to shown {number}', (_, sent: number, delivered: number, shown: number) => {
      expect(lastReceived().client_timing).toEqual({ txid: fake.txids[0], tap_to_sent: sent, delivered_to_seen: delivered, seen_to_shown: shown });
    });
  });

  Scenario('About shows the split of the last answer', ({ Given, When, And, Then }) => {
    Given('a phone that has never asked the tutor', begin);
    When('he taps at {number} s and the mill accepts the request at {number} s', async (_, tap: number, accepted: number) => {
      now(accepted);
      await ask(at(tap)).txid;
    });
    And('the mill delivers the answer at {number} s and the poll sees it at {number} s', async (_, delivered: number, seen: number) => {
      now(delivered);
      await fake.answer({ status: 'answered', answer: {} });
      now(seen);
      await asks[0].done;
    });
    And('the answer is drawn at {number} s', async (_, drawn: number) => {
      now(drawn);
      await answerDrawn(await asks[0].txid);
    });
    Then('About says {string}', (_, line: string) => {
      render(<About />);
      expect(screen.getByText(line)).toBeInTheDocument();
    });
  });

  Scenario('The first grist after install carries no client_timing', ({ Given, When, Then }) => {
    Given('a phone that has never asked the tutor', begin);
    When('he asks', async () => {
      await ask().txid;
    });
    Then('the grist carries no client_timing', () => {
      expect(fake.received).toHaveLength(1);
      expect(lastReceived()).not.toHaveProperty('client_timing');
    });
  });

  Scenario('A failed grist reports no timing for itself', ({ Given, And, When, Then }) => {
    Given('a phone that has never asked the tutor', begin);
    And('the first answer was timed and drawn', timedAnswer);
    When('the mill fails his next grist', async () => {
      now(30);
      fake.autoReply = { status: 'failed', reason: 'The session died.' };
      const run = ask();
      await expect(run.done).rejects.toBeInstanceOf(TutorError);
      now(40);
      await answerDrawn(await run.txid);
      fake.autoReply = undefined;
    });
    And('he asks again', async () => {
      now(50);
      await ask().txid;
    });
    Then("the second grist carried the first answer's timing", () => {
      expect(fake.received[1].client_timing).toMatchObject({ txid: fake.txids[0], tap_to_sent: 1200 });
    });
    And('the third grist carries no client_timing', () => {
      expect(fake.received).toHaveLength(3);
      expect(fake.received[2]).not.toHaveProperty('client_timing');
    });
  });

  Scenario('An abandoned grist reports no timing for itself', ({ Given, When, And, Then }) => {
    Given('a phone that has never asked the tutor', begin);
    When('he asks and leaves before the answer comes', async () => {
      const run = ask();
      await run.txid;
      run.abort();
      await run.done.catch(() => undefined);
      await answerDrawn(await run.txid);
    });
    And('he asks again', async () => {
      await ask().txid;
    });
    Then('the grist carries no client_timing', () => {
      expect(fake.received).toHaveLength(2);
      expect(lastReceived()).not.toHaveProperty('client_timing');
    });
  });

  Scenario('The network time rides with the report and shows in About', ({ Given, When, And, Then }) => {
    Given('a phone that has never asked the tutor', begin);
    When('he taps at {number} s and the request takes {number} s to reach the mill and be accepted at {number} s', async (_, tap: number, takes: number, accepted: number) => {
      now(accepted - takes);
      calls['POST /api/messages'] = takes * 1000;
      await ask(at(tap)).txid;
      calls['POST /api/messages'] = 0;
    });
    And('the mill delivers the answer at {number} s and the poll that sees it at {number} s takes {number} s', async (_, delivered: number, polled: number, takes: number) => {
      now(delivered);
      await fake.answer({ status: 'answered', answer: {} });
      now(polled);
      calls['GET /api/messages'] = takes * 1000;
      await asks[0].done;
      calls['GET /api/messages'] = 0;
    });
    And('the answer is drawn at {number} s', async (_, drawn: number) => {
      now(drawn);
      await answerDrawn(await asks[0].txid);
    });
    And('he asks again', async () => {
      now(20);
      await ask().txid;
    });
    Then('the grist carries network {number}', (_, network: number) => {
      expect(lastReceived().client_timing).toMatchObject({ txid: fake.txids[0], network, poll_network: 300 });
    });
    And('About says {string}', (_, line: string) => {
      render(<About />);
      expect(screen.getByText(line)).toBeInTheDocument();
    });
  });
});
