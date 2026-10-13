// features/steps/tutor-live-stream.steps.ts — runs features/tutor-live-stream.feature: while a tutor answer is awaited the phone listens on the backend's
// event stream (src/services/answerStream.ts) and fetches the answer the moment it is named, with a poll as backstop. The backend is the fake Postern
// (tests/support/fake-postern.ts, `events` on) and every timer is fake, so "within 0.5 s" is read off the fake clock.
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { streamTimings } from '../../src/services/answerStream';
import { askGrind, tutorTimings } from '../../src/services/tutor';
import { makeFakePostern, type FakePostern } from '../../tests/support/fake-postern';

const KEY = Uint8Array.from({ length: 32 }, (_, i) => (i === 31 ? 0x0b : 0));
const isAnswer = (value: unknown): value is { verdict: string } => typeof value === 'object' && value !== null && 'verdict' in value;
const ANSWER = { status: 'answered', answer: { verdict: 'well-read' } } as const;

interface Ask {
  controller: AbortController;
  settled: boolean;
  outcome?: unknown;
}

let fake: FakePostern;
let asks: Ask[];
let saved: typeof tutorTimings;

function end(): void {
  for (const a of asks ?? []) a.controller.abort();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (saved) Object.assign(tutorTimings, saved);
}
afterAll(end);

function begin(events: boolean): void {
  end();
  vi.useFakeTimers();
  saved = { ...tutorTimings };
  fake = makeFakePostern();
  fake.events = events;
  asks = [];
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => fake.fetch(input, init));
}

function ask(): Ask {
  const controller = new AbortController();
  const run: Ask = { controller, settled: false };
  askGrind('verse-read', { reference: 'Romans 8:28' }, isAnswer, { key: KEY, signal: controller.signal }).then(
    (answer) => ((run.settled = true), (run.outcome = answer)),
    (error: unknown) => ((run.settled = true), (run.outcome = error)),
  );
  asks.push(run);
  return run;
}

/** Lets the sends, the sign-ins and the stream's opening happen, on fake time. */
const settle = (ms = 100): Promise<void> => vi.advanceTimersByTimeAsync(ms);
const streamCalls = (): number => fake.calls.filter((c) => c === 'GET /api/events').length;

const feature = await loadFeature('features/tutor-live-stream.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('An answer announced on the stream is fetched at once', ({ Given, When, And, Then }) => {
    Given('a backend with a live event stream', () => begin(true));
    When('he asks the tutor and the stream is up', async () => {
      ask();
      await settle();
      expect(fake.openStreams).toBe(1);
    });
    And('the mill answers', () => fake.answer(ANSWER));
    Then('the answer is shown within 0.5 s of the announcement', async () => {
      expect(tutorTimings.pollMs).toBeGreaterThanOrEqual(3000);
      await settle(500);
      expect(asks[0].settled).toBe(true);
      expect(asks[0].outcome).toEqual({ verdict: 'well-read' });
    });
  });

  Scenario('A dropped stream is reconnected and an answer delivered meanwhile is still shown', ({ Given, When, And, Then }) => {
    Given('a backend with a live event stream', () => begin(true));
    When('he asks the tutor and the stream is up', async () => {
      ask();
      await settle();
      expect(fake.openStreams).toBe(1);
    });
    And('the stream drops', async () => {
      fake.dropStreams();
      await settle(0);
      expect(fake.openStreams).toBe(0);
    });
    And('the mill answers', () => fake.answer(ANSWER));
    Then('the stream is reconnected and the answer is shown within 1.5 s', async () => {
      await settle(1500);
      expect(streamCalls()).toBe(2);
      expect(asks[0].settled).toBe(true);
      expect(asks[0].outcome).toEqual({ verdict: 'well-read' });
    });
  });

  Scenario('Polls carry the wait while the stream cannot be reopened', ({ Given, When, And, Then }) => {
    Given('a backend with a live event stream', () => begin(true));
    When('he asks the tutor and the stream is up', async () => {
      ask();
      await settle();
      expect(fake.openStreams).toBe(1);
    });
    And('the stream drops and the backend refuses a new one', async () => {
      fake.eventsRefused = true;
      fake.dropStreams();
      await settle(0);
    });
    And('the mill answers', () => fake.answer(ANSWER));
    Then('the answer is shown within 3.5 s', async () => {
      await settle(3500);
      expect(asks[0].settled).toBe(true);
      expect(asks[0].outcome).toEqual({ verdict: 'well-read' });
      expect(fake.openStreams).toBe(0);
    });
  });

  Scenario('No stream is open when no answer is awaited', ({ Given, When, And, Then }) => {
    Given('a backend with a live event stream', () => begin(true));
    Then('no stream is open', async () => {
      await settle(1000);
      expect(fake.openStreams).toBe(0);
      expect(streamCalls()).toBe(0);
    });
    When('he asks the tutor and the stream is up', async () => {
      ask();
      await settle();
      expect(fake.openStreams).toBe(1);
    });
    And('the mill answers', () => fake.answer(ANSWER));
    Then('the answer is shown within 0.5 s of the announcement', async () => {
      await settle(500);
      expect(asks[0].settled).toBe(true);
    });
    And('no stream is open any more', () => {
      expect(fake.openStreams).toBe(0);
    });
  });

  Scenario('A wait that is abandoned closes the stream', ({ Given, When, And, Then }) => {
    Given('a backend with a live event stream', () => begin(true));
    When('he asks the tutor and the stream is up', async () => {
      ask();
      await settle();
      expect(fake.openStreams).toBe(1);
    });
    And('he leaves before the answer comes', async () => {
      asks[0].controller.abort();
      await settle(0);
    });
    Then('no stream is open', async () => {
      await settle(60_000);
      expect(fake.openStreams).toBe(0);
      expect(streamCalls()).toBe(1);
    });
  });

  Scenario('Two waits at once share one stream', ({ Given, When, Then }) => {
    Given('a backend with a live event stream', () => begin(true));
    When('he asks the tutor twice and the stream is up', async () => {
      ask();
      ask();
      await settle();
    });
    Then('one stream is open', () => {
      expect(fake.openStreams).toBe(1);
      expect(streamCalls()).toBe(1);
    });
  });

  Scenario('A stream that goes quiet is read as dropped and opened again', ({ Given, When, And, Then }) => {
    Given('a backend with a live event stream', () => begin(true));
    When('he asks the tutor and the stream is up', async () => {
      ask();
      await settle();
      expect(fake.openStreams).toBe(1);
    });
    And('the stream says nothing for over a minute', () => settle(streamTimings.staleMs + streamTimings.checkMs + 2000));
    Then('the stream was opened a second time', () => {
      expect(streamCalls()).toBeGreaterThanOrEqual(2);
      expect(fake.openStreams).toBe(1);
    });
  });

  Scenario('A backend that offers no event stream is polled', ({ Given, When, And, Then }) => {
    Given('a backend with no event stream', () => begin(false));
    When('he asks the tutor', async () => {
      ask();
      await settle();
    });
    And('the mill answers', () => fake.answer(ANSWER));
    Then('the answer is shown at the next poll', async () => {
      await settle(tutorTimings.pollMs + 500);
      expect(asks[0].settled).toBe(true);
      expect(asks[0].outcome).toEqual({ verdict: 'well-read' });
    });
    And('no stream was ever asked for', () => {
      expect(streamCalls()).toBe(0);
    });
  });
});
