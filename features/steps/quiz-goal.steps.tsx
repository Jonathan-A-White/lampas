// features/steps/quiz-goal.steps.tsx — runs features/quiz-goal.feature: Quiz me asks what he wants from the quiz (mw-5r3p30.185). The quiz request
// carries `quiz_goal` (the kept goal, or null), the tutor's answer may carry `quiz_goal_offer`, the sheet shows it with Yes, from now on | Just this time,
// and the goal is kept in the settings store as 'quizGoal' (Settings > Quiz goal). Postern is the fake (tests/support/fake-postern.ts).
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
import { instructionsOf } from '../../tests/support/learner';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** The goal the phone keeps: the settings store's 'quizGoal' row, '' when none. */
async function kept(): Promise<string> {
  const row = await db.settings.get('quizGoal');
  return typeof row?.value === 'string' ? row.value : '';
}

async function waitForReader(): Promise<void> {
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function open(goal: string, answer: string = QUIZ_ANSWER.answer): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: { ...QUIZ_ANSWER, answer, ...(goal ? { quiz_goal_offer: goal } : {}) } };
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
const offer = () => {
  const el = sheet().querySelector<HTMLElement>('[data-quiz-goal]');
  if (!el) throw new Error('the answer shows no quiz goal offer');
  return el;
};
const offerShown = () => waitFor(() => expect(offer()).toBeInTheDocument());
const received = (i: number) => {
  const got = fake.received[i - 1];
  if (!got) throw new Error(`the mill received no grist number ${i}`);
  return got;
};
const goalRow = () => {
  const row = document.querySelector<HTMLElement>('[data-setting="quizGoal"]');
  if (!row) throw new Error('Settings has no Quiz goal row');
  return row;
};
const goalField = async () => within(goalRow()).findByRole('textbox', { name: 'Quiz goal' });

const feature = await loadFeature('features/quiz-goal.feature');

describeFeature(feature, ({ Scenario }) => {
  const openWith = (_: unknown, goal: string) => open(goal);
  const startQuiz = async (_: unknown, heading: string) => {
    const h = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((x) => squash(x.textContent) === heading);
    if (!h) throw new Error(`no heading ${heading}`);
    await user.click(within(h).getByRole('button'));
    const view = await screen.findByRole('region', { name: 'Verse view' });
    await user.click(within(view).getByRole('button', { name: 'Quiz me', exact: true }));
    await user.click(within(view).getByRole('button', { name: 'Start the quiz', exact: true }));
    await screen.findByRole('dialog', { name: 'Quiz on Romans 8:1-11' });
  };
  const QUESTION = 'Is this how you want me to quiz you from now on?';
  const countIn = (el: HTMLElement) => (squash(el.textContent).split(QUESTION).length - 1);
  const buttonsOf = (yes: string, once: string) => {
    expect(within(offer()).getByRole('button', { name: yes, exact: true })).toBeInTheDocument();
    expect(within(offer()).getByRole('button', { name: once, exact: true })).toBeInTheDocument();
  };
  const given = (_: unknown, goal: string) => db.settings.put({ key: 'quizGoal', value: goal });
  const grists = (_: unknown, n: number) => waitFor(() => expect(fake.received).toHaveLength(n));
  const keptIs = (_: unknown, goal: string) => waitFor(async () => expect(await kept()).toBe(goal));
  const nothingKept = async () => {
    // give a stray save the time it would need, then look
    await waitFor(() => expect(turns()).toHaveLength(1));
    expect(await kept()).toBe('');
  };
  const send = async (_: unknown, said: string) => {
    await waitFor(() => expect(turns()).toHaveLength(1));
    await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), said);
    await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
  };
  const openSettings = async () => {
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await screen.findByRole('heading', { name: 'Settings', level: 1 });
  };
  const goalShown = async (_: unknown, goal: string) => {
    const field = await goalField();
    await waitFor(() => expect(field).toHaveValue(goal));
  };

  Scenario('With no quiz goal kept the quiz request says so and the instructions open by asking why', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal {string}', openWith);
    When('he starts the quiz on the passage {string}', startQuiz);
    Then('the mill received {int} grist', grists);
    And('grist number {int} says that no quiz goal is kept', (_, n: number) => {
      expect(received(n).input.mode).toBe('quiz');
      expect('quiz_goal' in received(n).input).toBe(true);
      expect(received(n).input.quiz_goal).toBeNull();
      expect('quiz_goal_once' in received(n).input).toBe(false);
    });
    And('the bible-talk instructions say to open by asking why he wants the quiz in one short plain question with no list of options', () => {
      const text = squash(instructionsOf('bible-talk')).toLowerCase();
      for (const phrase of ['`quiz_goal` is null', 'why he wants the quiz', 'one short plain question', 'no list of options']) expect(text).toContain(phrase);
    });
    And('the bible-talk instructions say to ask at most one follow-up and then quiz to match the goal', () => {
      const text = squash(instructionsOf('bible-talk')).toLowerCase();
      for (const phrase of ['at most one follow-up', 'quiz to match']) expect(text).toContain(phrase);
    });
  });

  Scenario('The app asks the goal question beside the buttons when the answer leaves it out', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal {string}', openWith);
    When('he starts the quiz on the passage {string}', startQuiz);
    Then('the offer shows the line {string} exactly once, above the buttons {string} and {string}', async (_, line: string, yes: string, once: string) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      await offerShown();
      expect(line).toBe(QUESTION);
      expect(countIn(turns()[0])).toBe(1);
      expect(countIn(offer())).toBe(1);
      buttonsOf(yes, once);
      const question = Array.from(offer().querySelectorAll('p')).find((p) => squash(p.textContent) === QUESTION);
      const first = within(offer()).getByRole('button', { name: yes, exact: true });
      expect(question).toBeTruthy();
      expect(question!.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  Scenario('The question is not shown twice when the answer already asks it', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern whose answer already asks the goal question and offers the quiz goal {string}', (_: unknown, goal: string) =>
      open(goal, `I will quiz you in plain English. ${QUESTION} Question 1: how does the passage begin?`));
    When('he starts the quiz on the passage {string}', startQuiz);
    Then('the goal question {string} shows exactly once in the whole turn, beside the buttons {string} and {string}', async (_, line: string, yes: string, once: string) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      await offerShown();
      expect(line).toBe(QUESTION);
      expect(countIn(turns()[0])).toBe(1);
      buttonsOf(yes, once);
    });
  });

  Scenario('A turn with no quiz goal offer shows no goal question', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers no quiz goal', () => open(''));
    When('he starts the quiz on the passage {string}', startQuiz);
    Then('the turn shows no goal question and no offer', async () => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      expect(countIn(turns()[0])).toBe(0);
      expect(sheet().querySelector('[data-quiz-goal]')).toBeNull();
    });
  });

  Scenario('Yes, from now on keeps the goal in Settings and every later quiz request carries it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal {string}', openWith);
    When('he starts the quiz on the passage {string}', startQuiz);
    Then('the quiz answer offers to keep the quiz goal {string} with the buttons {string} and {string}', async (_, goal: string, yes: string, once: string) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      await offerShown();
      expect(offer()).toHaveTextContent(goal);
      expect(within(offer()).getByRole('button', { name: yes, exact: true })).toBeInTheDocument();
      expect(within(offer()).getByRole('button', { name: once, exact: true })).toBeInTheDocument();
    });
    And('no quiz goal is kept on the phone', nothingKept);
    When('he taps {string}', async (_, name: string) => {
      await offerShown();
      await user.click(within(offer()).getByRole('button', { name, exact: true }));
    });
    Then('the offer says {string} and has no buttons', async (_, shown: string) => {
      await waitFor(() => expect(offer()).toHaveTextContent(shown));
      expect(within(offer()).queryAllByRole('button')).toHaveLength(0);
    });
    And('the phone keeps the quiz goal {string}', keptIs);
    When('he sends {string} in the quiz', send);
    Then('the mill received {int} grists', grists);
    And('grist number {int} carries the quiz goal {string}', (_, n: number, goal: string) => {
      expect(received(n).input.quiz_goal).toBe(goal);
      expect('quiz_goal_once' in received(n).input).toBe(false);
    });
    When('he closes the quiz sheet and opens Settings', async () => {
      await waitFor(() => expect(turns()).toHaveLength(2));
      await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
      await openSettings();
    });
    Then('Settings shows the Quiz goal {string}', goalShown);
  });

  Scenario('Just this time keeps nothing but the quiz goes on to match', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal {string}', openWith);
    When('he starts the quiz on the passage {string}', startQuiz);
    And('he taps {string}', async (_, name: string) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      await offerShown();
      await user.click(within(offer()).getByRole('button', { name, exact: true }));
    });
    Then('the offer says {string} and has no buttons', async (_, shown: string) => {
      await waitFor(() => expect(offer()).toHaveTextContent(shown));
      expect(within(offer()).queryAllByRole('button')).toHaveLength(0);
    });
    And('no quiz goal is kept on the phone', nothingKept);
    When('he sends {string} in the quiz', send);
    Then('the mill received {int} grists', grists);
    And('grist number {int} says that no quiz goal is kept and that this quiz is for {string}', (_, n: number, goal: string) => {
      expect(received(n).input.quiz_goal).toBeNull();
      expect(received(n).input.quiz_goal_once).toBe(goal);
    });
  });

  Scenario('A kept goal is changed or cleared in Settings', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal {string}', openWith);
    And('the phone was given the quiz goal {string}', given);
    When('he opens Settings', openSettings);
    Then('Settings shows the Quiz goal {string}', goalShown);
    When('he changes the Quiz goal to {string}', async (_, goal: string) => {
      const field = await goalField();
      await user.clear(field);
      await user.type(field, goal);
      await user.click(within(goalRow()).getByRole('button', { name: 'Save' }));
    });
    Then('the phone keeps the quiz goal {string}', keptIs);
    When('he clears the Quiz goal', async () => {
      await user.click(within(goalRow()).getByRole('button', { name: 'Clear' }));
    });
    Then('no quiz goal is kept on the phone', () => waitFor(async () => expect(await kept()).toBe('')));
    And('Settings shows no Quiz goal kept', async () => {
      await waitFor(async () => expect(await goalField()).toHaveValue(''));
      expect(goalRow()).toHaveTextContent('No goal kept');
    });
  });

  Scenario('The Quiz goal row has a visible label and says which goal is kept', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal {string}', openWith);
    And('the phone was given the quiz goal {string}', given);
    When('he opens Settings', openSettings);
    Then('the Quiz goal row shows the visible text {string}', async (_, text: string) => {
      await goalField();
      expect(within(goalRow()).getByText(text, { exact: true })).toBeVisible();
    });
    And('the Quiz goal row says {string}', async (_, text: string) => {
      await goalField();
      expect(within(goalRow()).getByText(text, { exact: true })).toBeVisible();
    });
  });

  Scenario('Save is off for a field of only spaces and Clear still clears', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal {string}', openWith);
    And('the phone was given the quiz goal {string}', given);
    When('he opens Settings', openSettings);
    And('he types only spaces in the Quiz goal', async () => {
      const field = await goalField();
      await user.clear(field);
      await user.type(field, '   ');
    });
    Then('the Quiz goal Save button is off', () => {
      expect(within(goalRow()).getByRole('button', { name: 'Save' })).toBeDisabled();
    });
    When('he clears the Quiz goal', async () => {
      await user.click(within(goalRow()).getByRole('button', { name: 'Clear' }));
    });
    Then('no quiz goal is kept on the phone', () => waitFor(async () => expect(await kept()).toBe('')));
  });

  Scenario('A kept goal is sent with the first request of a quiz', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern that offers the quiz goal {string}', openWith);
    And('the phone was given the quiz goal {string}', given);
    When('he starts the quiz on the passage {string}', startQuiz);
    Then('the mill received {int} grist', grists);
    And('grist number {int} carries the quiz goal {string}', (_, n: number, goal: string) => {
      expect(received(n).input.quiz_goal).toBe(goal);
    });
  });

  Scenario('The instructions pitch a quiz with the goal understanding in plain English', ({ Given, Then, And }) => {
    let text = '';
    Given("the bible-talk grind's instructions", () => {
      text = squash(instructionsOf('bible-talk')).toLowerCase();
    });
    Then('they say that with the goal understanding the questions are in plain English and leave the Greek out unless he asks', () => {
      for (const phrase of ['understanding', 'plain english', 'leave the greek out unless he asks']) expect(text).toContain(phrase);
    });
    And('they say that a kept quiz goal is not asked about again and may be changed when he asks', () => {
      for (const phrase of ['do not ask about it again', 'change my quiz goal', 'ask again']) expect(text).toContain(phrase);
    });
    And('they say to offer to keep the goal once, with the question {string}', (_, question: string) => {
      expect(text).toContain(question.toLowerCase());
      expect(text).toContain('`quiz_goal_offer`');
    });
  });
});
