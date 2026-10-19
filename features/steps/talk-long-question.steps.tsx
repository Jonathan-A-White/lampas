// features/steps/talk-long-question.steps.tsx — runs features/talk-long-question.feature: an 885-character spoken question is sent whole to the Bible talk, its
// request passes the grind's input schema, and an answer whose cleaned question is 885 characters passes the answer schema and is kept (mw-5r3p30.463).
// The recogniser is a fake (tests/support/fake-recognizer.ts), Postern a fake (tests/support/fake-postern.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { isTalkAnswer } from '../../src/services/talk';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { longQuestion } from '../../tests/support/long-text';
import { seedHisWords } from '../../tests/support/his-words';
import { validate, type Schema } from '../../tests/support/schema-validate';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** past the app's 500 ms hold */
const HOLD_MS = 650;
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
let fake: FakePostern;

const schemaOf = (file: string): Schema => JSON.parse(readFileSync(`grinds/${file}`, 'utf8')) as Schema;

async function open(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  stubRecognizer();
  FakeRecognizer.instances = [];
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  await seedHisWords();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const talkButton = () => screen.getByRole('button', { name: 'Talk', exact: true });
const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));

const feature = await loadFeature('features/talk-long-question.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = 'Lampas is opened on Romans 8 with a talk behind a fake Postern and a recogniser';
  const hold = async () => {
    await user.pointer({ keys: '[MouseLeft>]', target: talkButton(), coords: AT });
    await sleep(HOLD_MS);
  };
  const speaks = async (_: unknown, length: number) => {
    await waitFor(() => expect(FakeRecognizer.instances.length > 0 && FakeRecognizer.last().startFn.mock.calls.length > 0).toBe(true));
    await act(async () => FakeRecognizer.last().say([result(longQuestion(length), false)]));
  };
  const letGo = () => user.pointer({ keys: '[/MouseLeft]', target: talkButton(), coords: AT });
  const received = async () => {
    await waitFor(() => expect(fake.received).toHaveLength(1));
    return fake.received[0];
  };

  Scenario('An 885-character spoken question is sent whole and the request passes the input schema', ({ Given, When, Then, And }) => {
    Given(opened, async () => {
      await open();
      fake.autoReply = { status: 'answered', answer: TALK_ANSWER };
    });
    When('he holds the Talk button', hold);
    And('he says a spoken question of {number} characters', speaks);
    And('he lets go of the Talk button', letGo);
    Then('the mill received one bible-talk grist marked as spoken whose question is all {number} characters', async (_, length: number) => {
      const got = await received();
      expect(got.grist).toMatchObject({ app: 'lampas', kind: 'bible-talk' });
      expect(got.input.spoken).toBe(true);
      expect(got.input.question).toBe(longQuestion(length));
      expect(String(got.input.question)).toHaveLength(length);
    });
    And('that request passes grinds/bible-talk.input.schema.json', async () => {
      expect(validate((await received()).input, schemaOf('bible-talk.input.schema.json'))).toEqual([]);
    });
  });

  Scenario('An answer whose question is 885 characters is kept', ({ Given, When, Then, And }) => {
    const cleaned = (length: number) => ({ ...TALK_ANSWER, question: longQuestion(length) });
    Given(opened, open);
    When('he holds the Talk button', hold);
    And('he says a spoken question of {number} characters', speaks);
    And('he lets go of the Talk button', letGo);
    And('the tutor answers with his question cleaned up, {number} characters long', async (_, length: number) => {
      await received();
      await fake.answer({ status: 'answered', answer: cleaned(length) });
    });
    Then("the answer passes grinds/bible-talk.answer.schema.json and the phone's own check", () => {
      expect(validate(cleaned(885), schemaOf('bible-talk.answer.schema.json'))).toEqual([]);
      expect(isTalkAnswer(cleaned(885))).toBe(true);
    });
    And('the sheet shows the cleaned question of {number} characters over the answer', async (_, length: number) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      expect(within(turns()[0]).getByText(longQuestion(length), { exact: false })).toBeInTheDocument();
      expect(turns()[0]).toHaveTextContent(TALK_ANSWER.answer);
    });
    And('the talk keeps the cleaned question of {number} characters', async (_, length: number) => {
      await waitFor(async () => expect((await db.talks.toArray()).at(-1)?.cleanQ).toBe(longQuestion(length)));
    });
  });
});
