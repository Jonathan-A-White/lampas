// features/steps/ask-composer.steps.tsx — runs features/ask-composer.feature: the Verse view's Ask the tutor is bsv-kit's Composer (one Hold to ask
// bar, Type a question beneath it), asking about Romans 8:1-11. The recogniser and Postern are fakes (tests/support/fake-recognizer.ts, fake-postern.ts);
// the press is user-event pointer input.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { markSupplied } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { composerIn, holdBarIn, holdBarsIn } from '../../tests/support/composer';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
let fake: FakePostern;

interface RawVerse {
  n: number;
  e: { t: string }[];
  g: { t: string }[];
}
const ROMANS_8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as { verses: RawVerse[] };
const markedEnglishOf = (from: number, to: number): string =>
  ROMANS_8.verses.filter((v) => v.n >= from && v.n <= to).map((v) => v.e.map(markSupplied).join(' ')).join(' ');
const greekOf = (from: number, to: number): string =>
  ROMANS_8.verses.filter((v) => v.n >= from && v.n <= to).map((v) => v.g.map((w) => w.t).join(' ')).join(' ');
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

async function open(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
  stubRecognizer();
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear(), db.readings.clear()]);
  await setReaderView('english');
  await setWeave('off');
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const headingEl = (text: string): HTMLElement => {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => squash(h.textContent) === text);
  if (!found) throw new Error(`no heading ${text}`);
  return found;
};

const feature = await loadFeature('features/ask-composer.feature');

describeFeature(feature, ({ Scenario }) => {
  const openIt = () => open();
  const tapHeading = async (_: unknown, text: string) => {
    await user.click(within(headingEl(text)).getByRole('button'));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const choose = async (_: unknown, action: string) => {
    await user.click(within(viewEl()).getByRole('button', { name: action, exact: true }));
  };
  const received = async (_: unknown, reference: string, question: string) => {
    await waitFor(() => expect(fake.received).toHaveLength(1));
    expect(fake.received[0].grist).toMatchObject({ app: 'lampas', kind: 'verse-ask' });
    expect(fake.received[0].input.reference).toBe(reference);
    expect(fake.received[0].input.question).toBe(question);
  };
  const carriesPassage = () => {
    expect(fake.received[0].input.greek).toBe(greekOf(1, 11));
    expect(fake.received[0].input.english).toBe(markedEnglishOf(1, 11));
  };
  const answerShows = async () => {
    await waitFor(() => expect(viewEl().querySelectorAll('[data-answer]')).toHaveLength(1));
    expect(viewEl().querySelector('[data-answer]')).toHaveTextContent(SYNERGEI_ANSWER.answer);
  };
  const opened = 'Lampas is opened on Romans 8 in the English view with a tutor and a recogniser behind a fake Postern';

  Scenario('Ask the tutor shows one composer and nothing else to ask with', ({ Given, When, Then, And }) => {
    Given(opened, openIt);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    Then('one composer is on screen with a {string} bar and a {string} button', (_, bar: string, type: string) => {
      expect(within(viewEl()).getAllByTestId('composer')).toHaveLength(1);
      expect(holdBarsIn(viewEl())).toHaveLength(1);
      expect(holdBarIn(viewEl())).toHaveTextContent(bar);
      expect(within(composerIn(viewEl())).getByRole('button', { name: type })).toBeInTheDocument();
    });
    And('there is no Ask button, no second hold bar, no attach button and no camera button', () => {
      const view = viewEl();
      expect(within(view).queryByRole('button', { name: 'Ask', exact: true })).toBeNull();
      expect(view.querySelectorAll('[data-hold-bar]')).toHaveLength(0);
      expect(within(view).queryByRole('button', { name: /^Hold to ask$/ })).toBe(holdBarIn(view));
      expect(within(view).queryByRole('button', { name: 'Attach files' })).toBeNull();
      expect(within(view).queryByRole('button', { name: 'Take a photo' })).toBeNull();
    });
  });

  Scenario('Holding shows his words as he speaks and letting go asks about verses 1-11', ({ Given, When, Then, And }) => {
    Given(opened, openIt);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    And('he holds the Hold to ask bar', async () => {
      await user.pointer({ keys: '[MouseLeft>]', target: holdBarIn(viewEl()), coords: AT });
      await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
    });
    And('the recogniser hears {string}', (_, words: string) => {
      act(() => {
        FakeRecognizer.last().open();
        FakeRecognizer.last().say([result(words, false)]);
      });
    });
    Then('the composer shows the live words {string}', async (_, words: string) => {
      expect(await within(composerIn(viewEl())).findByText(words)).toBeInTheDocument();
    });
    When('he lets go of the Hold to ask bar', async () => {
      await user.pointer({ keys: '[/MouseLeft]', target: holdBarIn(viewEl()), coords: AT });
    });
    Then('the mill received one grist for the lampas app, kind verse-ask, about {string} with the question {string}', received);
    And('that grist carries the Greek and the English of verses 1 to 11 and no other', carriesPassage);
    And('the answer shows in the Verse view', answerShows);
  });

  Scenario('Typing a question and tapping Send asks the same way', ({ Given, When, Then, And }) => {
    Given(opened, openIt);
    When('he taps the heading {string}', tapHeading);
    And('he chooses {string}', choose);
    And('he taps {string}', async (_, name: string) => {
      await user.click(within(composerIn(viewEl())).getByRole('button', { name }));
    });
    And('he types {string} and taps Send', async (_, question: string) => {
      await user.type(within(composerIn(viewEl())).getByRole('textbox', { name: 'Your question' }), question);
      await user.click(within(composerIn(viewEl())).getByRole('button', { name: 'Send' }));
    });
    Then('the mill received one grist for the lampas app, kind verse-ask, about {string} with the question {string}', received);
    And('that grist carries the Greek and the English of verses 1 to 11 and no other', carriesPassage);
    And('the answer shows in the Verse view', answerShows);
  });
});
