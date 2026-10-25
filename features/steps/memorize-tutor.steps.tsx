// features/steps/memorize-tutor.steps.tsx — runs features/memorize-tutor.feature: the tutor and memorizing (mw-fu7dqf.12). Postern is the fake (tests/support/fake-postern.ts) whose mill answers
// a grist with the reply a scenario sets; the app is the whole App, on Romans 8, with the Talk sheet open.
import '@testing-library/react/dont-cleanup-after-each';
import { createElement } from 'react';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { listMemorized, memorize, recordRecall } from '../../src/data/repositories/memorize';
import { clearBus } from '../../src/events/bus';
import { nameOf } from '../../src/memorize/commands';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern, type Reply } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';
import { sheetEntriesGone } from '../../tests/support/sheet-history';

afterAll(() => {
  vi.restoreAllMocks();
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const ANSWER = 'Here is what I found.';
let fake: FakePostern;

/** Opens the app on Romans 8; `reply` is what the mill answers a grist with, worked out from the request (undefined holds that grist for the scenario to answer); `before` seeds what he already memorizes. */
async function open(reply: (input: Record<string, unknown>) => Reply | undefined, before: () => Promise<void> = async () => {}): Promise<void> {
  // each step is a test of its own, so a scenario's mocks are let go of by the next scenario's start, not after the step that made them
  vi.restoreAllMocks();
  cleanup();
  await sheetEntriesGone();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = undefined;
  fake.replyFor = reply;
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear(), db.recalls.clear(), db.verseLists.clear()]);
  await db.reviews.where('kind').equals('verse').delete();
  await setReaderView('english');
  await setWeave('off');
  await seedHisWords();
  await before();
  render(createElement(App));
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const answered = (extra: Record<string, unknown> = {}): Reply => ({ status: 'answered', answer: { answer: ANSWER, words: [], ...extra } });
const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const sheetGone = () => waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());

async function openTalk(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Talk' }));
  await screen.findByRole('dialog', { name: /^Talk about / });
}

async function send(question: string): Promise<void> {
  const box = within(sheet()).getByRole('textbox', { name: 'Your message' });
  await user.clear(box);
  await user.type(box, question);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}

const says = (text: string) => waitFor(() => expect(sheet()).toHaveTextContent(text));
const memorizedRows = async (): Promise<string[]> => (await listMemorized()).map((r) => `${r.lang}:${r.ref}`).sort();

const feature = await loadFeature('features/memorize-tutor.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Help me memorize Romans 8:28', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with a do of memorize {string}', (async (_: unknown, ref: string) => {
      await open(() => answered({ do: [{ name: 'memorize', args: { ref } }], said: 'Memorizing it.' }));
    }) as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet says {string} with an Undo button', async (_, line: string) => {
      await says(line);
      expect(await within(sheet()).findByRole('button', { name: /^Undo/ })).toBeInTheDocument();
    });
    And('{string} is memorized in {string}', async (_, ref: string, lang: string) => {
      await waitFor(async () => expect(await memorizedRows()).toEqual([`${lang}:${ref}`]));
    });
    When('he taps Undo on that line', async () => {
      await user.click(within(sheet()).getByRole('button', { name: /^Undo/ }));
    });
    Then('the sheet says {string}', (_, line: string) => says(line));
    And('{string} is not memorized', async (_, ref: string) => {
      await waitFor(async () => expect((await memorizedRows()).filter((row) => row.endsWith(`:${ref}`))).toEqual([]));
    });
  });

  Scenario('What am I memorizing?', ({ Given, And, When, Then }) => {
    Given('he memorizes {string} and said it once, and Lampas is opened on Romans 8 with the tutor asking for {string} before it answers', (async (_: unknown, ref: string, fact: string) => {
      // the first grist is answered with the ask; the follow-up (it carries `asked`) is held for the scenario
      await open(
        (input) => ('asked' in input ? undefined : answered({ asks: [fact] })),
        async () => {
          await memorize(ref, ['en']);
          await recordRecall({ ref, lang: 'en', rung: 0, score: 1, missed: [], asked: [{ token: 'all', lang: 'en' }], how: 'said' });
        },
      );
    }) as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet says {string}', (_, line: string) => says(line));
    And('the follow-up carries {string} with {string} in it', async (_, fact: string, ref: string) => {
      await waitFor(() => expect(fake.received.length).toBe(2));
      const asked = fake.received[1].input.asked as Record<string, { summary: string; verses: Array<{ ref: string }> }>;
      expect(Object.keys(asked)).toEqual([fact]);
      expect(asked[fact].summary).toMatch(/^1 verse memorized/);
      expect(asked[fact].verses.map((v) => v.ref)).toEqual([ref]);
    });
    When('the tutor gives its second answer', async () => {
      await fake.answer(answered());
    });
    Then('the answer shows in the sheet', () => says(ANSWER));
    And('the sheet no longer says {string}', async (_, line: string) => {
      await waitFor(() => expect(sheet()).not.toHaveTextContent(line));
    });
  });

  Scenario('Open Memorize', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor takes him to {string} when he asks for it', (async (_: unknown, place: string) => {
      await open((input) => (String(input.question).includes('open Memorize') ? answered({ go: { name: place, args: {} }, said: 'Opened Memorize.' }) : answered()));
    }) as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', async (_, question: string) => {
      const before = await db.talks.count();
      await send(question);
      await waitFor(async () => expect(await db.talks.count()).toBe(before + 1));
    });
    Then('the Memorize screen is open', async () => {
      expect(await screen.findByRole('heading', { name: 'Memorize', level: 1 })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/memorize');
    });
    And('the Talk sheet is closed', sheetGone);
    When("he taps the phone's Back", async () => {
      window.history.back();
    });
    Then('the Talk sheet is open again', async () => {
      await screen.findByRole('dialog', { name: /^Talk about / });
    });
    And('the Memorize screen is not open', () => {
      expect(screen.queryByRole('heading', { name: 'Memorize', level: 1 })).toBeNull();
    });
  });

  Scenario('Start a session of a verse he memorizes', ({ Given, And, When, Then }) => {
    Given('he memorizes {string} and Lampas is opened on Romans 8 with the tutor taking him to the session of it when he asks', (async (_: unknown, ref: string) => {
      await open(
        (input) => (String(input.question).includes('practise') ? answered({ go: { name: 'memorize-screen', args: { ref, lang: 'en' } }, said: 'Opening the session.' }) : answered()),
        async () => void (await memorize(ref, ['en'])),
      );
    }) as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', async (_, question: string) => {
      const before = await db.talks.count();
      await send(question);
      await waitFor(async () => expect(await db.talks.count()).toBe(before + 1));
    });
    Then('the session of {string} in {string} is open', async (_, ref: string, lang: string) => {
      await waitFor(() => expect(window.location.hash).toBe(`#/memorize/${ref}/${lang}`));
      expect(await screen.findByRole('heading', { name: nameOf(ref), level: 1 })).toBeInTheDocument();
    });
    And('the Talk sheet is closed', sheetGone);
    When("he taps the phone's Back", async () => {
      window.history.back();
    });
    Then('the Talk sheet is open again', async () => {
      await screen.findByRole('dialog', { name: /^Talk about / });
    });
    And('the Memorize screen is not open', () => {
      expect(screen.queryByRole('heading', { name: 'Memorize', level: 1 })).toBeNull();
    });
  });
});
