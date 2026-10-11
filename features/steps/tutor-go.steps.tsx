// features/steps/tutor-go.steps.tsx — runs features/tutor-go.feature: the Bible talk answer's `go` (mw-5r3p30.172), which takes him to a chapter.
// Postern is the fake (tests/support/fake-postern.ts) whose mill answers every grist with the answer a scenario sets; fetch serves the chapter
// files and the lexicon from disk.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { readerOf } from '../../src/nav/route';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const ANSWER = 'Taking you there now.';
let fake: FakePostern;

/** Opens the app on Romans 8; the mill answers with `go` (whatever shape a scenario wants) or, with `hold`, waits for the scenario to answer. */
async function open(go: unknown, hold = false): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  if (!hold) fake.autoReply = { status: 'answered', answer: { answer: ANSWER, words: [], go } };
  holding = hold ? go : undefined;
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.answers.clear()]);
  await setReaderView('english');
  await setWeave('off');
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

let holding: unknown;

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const sheetGone = () => waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
const here = () => readerOf(window.location.hash);

async function openTalk(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Talk' }));
  await screen.findByRole('dialog', { name: /^Talk about / });
}

async function send(question: string): Promise<void> {
  await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), question);
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
}

const readerIsOn = (book: string, chapter: number) => waitFor(() => expect(here()).toMatchObject({ book, chapter }));
const PLACES: Record<string, { book: string; chapter: number }> = { 'Colossians 1': { book: 'col', chapter: 1 }, 'Romans 8': { book: 'rom', chapter: 8 } };

const feature = await loadFeature('features/tutor-go.feature');

describeFeature(feature, ({ Scenario }) => {
  const goTo = (_: unknown, book: string, chapter: string) => open({ book, chapter: Number(chapter) });
  const goText = (_: unknown, text: string) => open(text);
  const onThe = async (_: unknown, title: string) => {
    const { book, chapter } = PLACES[title];
    await readerIsOn(book, chapter);
  };
  const shows = async () => {
    await waitFor(() => expect(sheet()).toHaveTextContent(ANSWER));
  };
  const saysNothingOpened = async (_: unknown, line: string) => {
    await waitFor(() => expect(within(sheet()).getByText(line)).toBeInTheDocument());
    expect(sheet()).not.toHaveTextContent('Opened ');
  };

  Scenario('Switching to Colossians 1 opens the Reader there, and Back returns to Romans 8', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with go {string} {int}', goTo as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the Reader is open on {string}', onThe);
    And('the Talk sheet is closed', sheetGone);
    And('the Reader says {string}', async (_, line: string) => {
      expect(await screen.findByRole('status')).toHaveTextContent(line);
      expect(await screen.findByRole('button', { name: /Colossians 1/ })).toBeInTheDocument();
    });
    When("he taps the phone's Back", async () => {
      window.history.back();
    });
    Then('the Reader is back on {string}', onThe);
    And('the Reader does not say {string}', async (_, line: string) => {
      await waitFor(() => expect(screen.queryByText(line)).toBeNull());
    });
    When('he opens Talk again', openTalk);
    Then('the talk shows the answer and the line {string}', async (_, line: string) => {
      await waitFor(() => expect(sheet()).toHaveTextContent(ANSWER));
      expect(within(sheet()).getByText(line)).toBeInTheDocument();
    });
  });

  Scenario('A chapter the book does not have is not opened and the talk says so', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with go {string} {int}', goTo as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows in the sheet', shows);
    And('the sheet says {string} and nothing was opened', saysNothingOpened);
    And('the Reader is open on {string}', onThe);
  });

  Scenario('A book the app does not have is not opened and the talk says so', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with go {string} {int}', goTo as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows in the sheet', shows);
    And('the sheet says {string} and nothing was opened', saysNothingOpened);
    And('the Reader is open on {string}', onThe);
  });

  Scenario('A go in a shape the app refuses is ignored and the answer is still shown', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with the go text {string}', goText);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows in the sheet', shows);
    And('the sheet says {string} and nothing was opened', saysNothingOpened);
    And('the Reader is open on {string}', onThe);
  });

  Scenario('An answer that comes after he closed the sheet does not move him', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor holds its answer with go {string} {int}', ((_: unknown, book: string, chapter: string) =>
      open({ book, chapter: Number(chapter) }, true)) as never);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    And('he taps Done on the Talk sheet', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
      await sheetGone();
    });
    And('the tutor answers', async () => {
      await waitFor(() => expect(fake.received.length).toBe(1));
      fake.answer({ status: 'answered', answer: { answer: ANSWER, words: [], go: holding } });
      await waitFor(async () => expect(await db.talks.count()).toBe(1));
    });
    And('he opens Talk again', openTalk);
    Then('the answer shows in the sheet', shows);
    And('the sheet says {string} and nothing was opened', saysNothingOpened);
    And('the Reader is open on {string}', onThe);
  });
  Scenario("Asked from Settings, the tutor opens the chapter there and Back returns to Settings", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 and the tutor answers with go {string} {int}', goTo as never);
    And('he opens Settings and the round Ask button', async () => {
      await act(async () => {
        window.location.hash = '#/settings';
      });
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
      await user.click(await screen.findByRole('button', { name: 'Ask the tutor about this screen' }));
      await screen.findByRole('dialog', { name: 'Ask the tutor: Settings' });
    });
    When('he sends {string} from the screen', async (_, question: string) => {
      const dialog = screen.getByRole('dialog', { name: 'Ask the tutor: Settings' });
      await user.type(within(dialog).getByRole('textbox', { name: 'Your message' }), question);
      await user.click(within(dialog).getByRole('button', { name: 'Send' }));
    });
    Then('the Reader is open on {string}', onThe);
    And('the Reader says {string}', async (_, line: string) => {
      expect(await screen.findByRole('status')).toHaveTextContent(line);
    });
    When("he taps the phone's Back", async () => {
      window.history.back();
    });
    Then('Settings is open', async () => {
      expect(await screen.findByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
    });
  });
});
