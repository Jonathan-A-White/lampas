// features/steps/study-way.steps.tsx — runs features/study-way.feature: My study way (mw-5r3p30.76). The tutor's quiz answer may propose one line
// (`study_way_line`); the sheet shows it with Keep this; a tap keeps it in the settings store ('studyWay'); Settings > My study way lists, edits and
// deletes the lines; every quiz request carries them (`study_way`). Postern is the fake (tests/support/fake-postern.ts) whose mill answers every grist.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, QUIZ_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const SEPARATOR = ' / ';
let fake: FakePostern;

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const linesOf = (text: string): string[] => text.split(SEPARATOR);

/** The lines the phone keeps: the settings store's 'studyWay' row, a JSON list. */
async function kept(): Promise<string[]> {
  const row = await db.settings.get('studyWay');
  return typeof row?.value === 'string' ? (JSON.parse(row.value) as string[]) : [];
}
const keep = (lines: string[]) => db.settings.put({ key: 'studyWay', value: JSON.stringify(lines) });

async function waitForReader(): Promise<void> {
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function open(line: string): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { ...QUIZ_ANSWER, study_way_line: line } };
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
  await waitForReader();
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const sheet = () => screen.getByRole('dialog');
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));
const proposal = () => {
  const el = sheet().querySelector<HTMLElement>('[data-study-way]');
  if (!el) throw new Error('the answer shows no proposed study way line');
  return el;
};
/** The proposed line once the answer has been kept and drawn. */
const proposalShown = () => waitFor(() => expect(proposal()).toBeInTheDocument());
const received = (i: number) => {
  const got = fake.received[i - 1];
  if (!got) throw new Error(`the mill received no grist number ${i}`);
  return got;
};
const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-study-way-line]'));
const rowOf = (line: string): HTMLElement => {
  const row = rows().find((r) => r.querySelector('[data-line-text]')?.textContent === line);
  if (!row) throw new Error(`no row for the line ${line}`);
  return row;
};

const feature = await loadFeature('features/study-way.feature');

describeFeature(feature, ({ Scenario }) => {
  const openWith = (_: unknown, line: string) => open(line);
  const givenKept = async (_: unknown, text: string) => keep(linesOf(text));
  const startQuiz = async (_: unknown, heading: string) => {
    const h = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((x) => squash(x.textContent) === heading);
    if (!h) throw new Error(`no heading ${heading}`);
    await user.click(within(h).getByRole('button'));
    const view = await screen.findByRole('region', { name: 'Verse view' });
    await user.click(within(view).getByRole('button', { name: 'Quiz me', exact: true }));
    await user.click(within(view).getByRole('button', { name: 'Start the quiz', exact: true }));
    await screen.findByRole('dialog', { name: 'Quiz on Romans 8:1-11' });
  };
  const keptIs = (_: unknown, text: string) => waitFor(async () => expect(await kept()).toEqual(linesOf(text)));
  const nothingKept = async () => {
    // give a stray save the time it would need, then look
    await waitFor(() => expect(turns()).toHaveLength(1));
    expect(await kept()).toEqual([]);
  };
  const pageShows = (_: unknown, text: string) => waitFor(() => expect(rows().map((r) => r.querySelector('[data-line-text]')?.textContent)).toEqual(linesOf(text)));

  Scenario('A line the tutor proposes is kept with one tap and survives a close', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz whose first answer proposes the line {string}', openWith);
    When('he starts the quiz on the passage {string}', startQuiz);
    Then('the quiz answer shows the proposed line {string} with a {string} button', async (_, line: string, name: string) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      await proposalShown();
      expect(proposal()).toHaveTextContent(line);
      expect(await within(proposal()).findByRole('button', { name, exact: true })).toBeInTheDocument();
    });
    And('nothing is kept on the phone', nothingKept);
    When('he taps {string}', async (_, name: string) => {
      await proposalShown();
      await user.click(within(proposal()).getByRole('button', { name, exact: true }));
    });
    Then('the proposed line shows {string} and no {string} button', async (_, shown: string, name: string) => {
      await waitFor(() => expect(proposal()).toHaveTextContent(shown));
      expect(within(proposal()).queryByRole('button', { name, exact: true })).toBeNull();
    });
    And('the phone keeps the study way lines {string}', keptIs);
    When('Lampas is closed and opened again', async () => {
      cleanup();
      clearBus();
      window.history.replaceState(null, '', '/');
      render(<App />);
      await waitForReader();
    });
    Then('the phone still keeps the study way lines {string}', keptIs);
  });

  Scenario('A proposed line that is not kept is not saved', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz whose first answer proposes the line {string}', openWith);
    When('he starts the quiz on the passage {string}', startQuiz);
    And('he taps Done on the quiz sheet', async () => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
    });
    Then('nothing is kept on the phone', async () => {
      expect(await kept()).toEqual([]);
    });
  });

  Scenario('Settings lists the kept lines, and each can be edited or deleted', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz whose first answer proposes the line {string}', openWith);
    And('the phone was given the study way lines {string}', givenKept);
    When('he opens Settings and then {string}', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
      await user.click(screen.getByRole('button', { name }));
      await screen.findByRole('heading', { name, level: 1 });
    });
    Then('the page shows the lines {string}', pageShows);
    When('he edits the line {string} to {string}', async (_, line: string, to: string) => {
      const row = rowOf(line);
      await user.click(within(row).getByRole('button', { name: /^Edit/ }));
      const field = screen.getByRole('textbox', { name: 'Study way line' });
      await user.clear(field);
      await user.type(field, to);
      await user.click(screen.getByRole('button', { name: 'Save' }));
    });
    Then('the page now shows the lines {string}', pageShows);
    And('the phone now keeps the study way lines {string}', keptIs);
    When('he deletes the line {string}', async (_, line: string) => {
      await user.click(within(rowOf(line)).getByRole('button', { name: /^Delete/ }));
    });
    Then('the page ends with the lines {string}', pageShows);
    And('the phone ends with the study way lines {string}', keptIs);
  });

  Scenario('Every quiz request carries the kept lines', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz whose first answer proposes the line {string}', openWith);
    And('the phone was given the study way lines {string}', givenKept);
    When('he starts the quiz on the passage {string}', startQuiz);
    And('the quiz answer number {int} has arrived', (_, n: number) => waitFor(() => expect(turns()).toHaveLength(n)));
    And('he sends {string}', async (_, said: string) => {
      await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), said);
      await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
    });
    Then('the mill received {int} grists', (_, n: number) => waitFor(() => expect(fake.received).toHaveLength(n)));
    And('grist number {int} carries the study way {string}', (_, n: number, text: string) => {
      expect(received(n).input.study_way).toEqual(linesOf(text));
    });
    And('grist number {int} also carries the study way {string}', (_, n: number, text: string) => {
      expect(received(n).input.study_way).toEqual(linesOf(text));
    });
  });

  Scenario('An ordinary talk and a phone with no kept lines send no study way', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz whose first answer proposes the line {string}', openWith);
    And('the phone was given the study way lines {string}', givenKept);
    When('he opens the ordinary talk about verse 11 and sends {string}', async (_, said: string) => {
      await user.click(await screen.findByRole('button', { name: 'Verse 11' }));
      const view = await screen.findByRole('region', { name: 'Verse view' });
      await user.click(within(view).getByRole('button', { name: 'Ask the tutor', exact: true }));
      await user.click(within(view).getByRole('button', { name: 'Talk about verse 11', exact: true }));
      await screen.findByRole('dialog', { name: 'Talk about Romans 8:11' });
      await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), said);
      await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
    });
    Then('the mill received {int} grists', (_, n: number) => waitFor(() => expect(fake.received).toHaveLength(n)));
    And('grist number {int} carries no study way', (_, n: number) => {
      expect('study_way' in received(n).input).toBe(false);
    });
  });

  Scenario('Twelve lines are the most he can keep', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz whose first answer proposes the line {string}', openWith);
    And('the phone was given {int} study way lines', async (_, n: number) => keep(Array.from({ length: n }, (__, i) => `Line number ${i + 1}.`)));
    When('he starts the quiz on the passage {string}', startQuiz);
    Then('the proposed line shows no {string} button and says {string}', async (_, name: string, says: string) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      await proposalShown();
      await waitFor(() => expect(proposal()).toHaveTextContent(says));
      expect(within(proposal()).queryByRole('button', { name, exact: true })).toBeNull();
    });
  });
});
