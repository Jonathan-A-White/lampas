// features/steps/review.steps.tsx — runs features/review.feature: the Reader's Due: N badge, the Review screen that
// asks due words first, and the schedule and the end card after the answers.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/quiz';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { seedWordsIfFirstOpen } from '../../src/data/repositories/words';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();

/** The words the scenarios make due, in the order they have been overdue (the first the longest). */
const DUE = ['λέγω', 'εἰμί', 'ἀγαπάω', 'ποιέω'];

/** A fresh store: the words seeded, nothing scheduled; the scenario adds the reviews it needs. */
async function freshStore(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear()]);
  await seedWordsIfFirstOpen();
  await seedScheduleIfFirstOpen();
  await db.reviews.clear();
}

/** Makes `lemmas` due: the first overdue the longest. `shape` says the step and rights each one stands on. */
async function makeDue(lemmas: string[], shape: (lemma: string, i: number) => { step: number; rights: number } = () => ({ step: 0, rights: 0 })): Promise<void> {
  for (const lemma of lemmas) expect(await db.words.get(lemma), `${lemma} is a seed word`).toBeTruthy();
  const now = Date.now();
  await db.reviews.bulkPut(
    lemmas.map((lemma, i) => ({ kind: 'word', id: lemma, ...shape(lemma, i), due: now - (lemmas.length - i) * 60_000, lastWhen: now - 3 * DAY, lapses: 0 })),
  );
}

async function openReader(): Promise<void> {
  window.history.replaceState(null, '', '/');
  render(<App newRandom={() => mulberry32(7)} />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
}

async function openReviewFromSettings(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  await user.click(await screen.findByRole('button', { name: 'Review' }));
  await screen.findByRole('heading', { name: 'Review', level: 1 });
}

const dueToday = () => screen.findByTestId('due-today');
const promptLemma = () => screen.getByTestId('prompt').getAttribute('data-lemma') ?? '';
const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-option]')];

async function start(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Start' }));
  await screen.findByTestId('prompt');
}

/** Answers the question on screen right or wrong; returns the lemma it asked. */
async function answerCurrent(right: boolean): Promise<string> {
  const lemma = promptLemma();
  const gloss = (await db.words.get(lemma))?.gloss;
  const target = options().find((o) => (o.textContent === gloss) === right);
  if (!target) throw new Error('no such option');
  await user.click(target);
  return lemma;
}

async function goOn(): Promise<void> {
  await user.click(await screen.findByTestId('next'));
}

const review = async (lemma: string) => {
  const r = await db.reviews.get(['word', lemma]);
  if (!r) throw new Error(`no review for ${lemma}`);
  return r;
};

const feature = await loadFeature('features/review.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The reader shows Due: N when words are due', ({ Given, When, Then }) => {
    Given('{int} of his words are due', async (_, n: number) => {
      await freshStore();
      await makeDue(DUE.slice(0, n));
    });
    When('Lampas is opened on the Reader', openReader);
    Then('the Reader shows {string}', async (_, text: string) => {
      expect(await screen.findByRole('button', { name: text })).toBeVisible();
    });
    When('he taps {string}', async (_, text: string) => user.click(await screen.findByRole('button', { name: text })));
    Then('the Review screen says {string}', async (_, text: string) => {
      await dueToday();
      await waitFor(() => expect(screen.getByTestId('due-today')).toHaveTextContent(text));
    });
  });

  Scenario('The Reader shows no count when nothing is due', ({ Given, When, Then }) => {
    Given('none of his words is due', freshStore);
    When('Lampas is opened on the Reader', openReader);
    Then('the Reader shows no Due count', async () => {
      await waitFor(() => expect(screen.getByRole('button', { name: 'Settings' })).toBeVisible());
      expect(screen.queryByRole('button', { name: /^Due:/ })).toBeNull();
    });
  });

  Scenario('Review draws due words before others', ({ Given, When, And, Then }) => {
    Given('{int} of his words are due', async (_, n: number) => {
      await freshStore();
      await makeDue(DUE.slice(0, n));
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    Then('the Review screen says {string}', async (_, text: string) => {
      await dueToday();
      await waitFor(() => expect(screen.getByTestId('due-today')).toHaveTextContent(text));
    });
    const asked: string[] = [];
    When('he starts the review', start);
    Then('the first {int} questions are the due words, the longest overdue first', async (_, n: number) => {
      asked.length = 0;
      for (let i = 0; i < n; i += 1) {
        await screen.findByTestId('prompt');
        asked.push(await answerCurrent(true));
        await goOn();
      }
      expect(asked).toEqual(DUE.slice(0, n));
    });
    And('the rest of the round is {int} other words', async (_, n: number) => {
      for (let i = 0; i < n; i += 1) {
        await screen.findByTestId('prompt');
        asked.push(await answerCurrent(true));
        await goOn();
      }
      await screen.findByTestId('score');
      const others = asked.slice(DUE.slice(0, 3).length);
      expect(others).toHaveLength(n);
      expect(new Set(asked).size).toBe(asked.length);
      expect(others.some((l) => DUE.includes(l))).toBe(false);
    });
  });

  Scenario('A right answer twice in a row pushes the word to the next step', ({ Given, When, And, Then }) => {
    Given('the word {string} is due and was right once before', async (_, lemma: string) => {
      await freshStore();
      await makeDue([lemma], () => ({ step: 0, rights: 1 }));
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    And('he answers {string} right', async (_, lemma: string) => {
      expect(promptLemma()).toBe(lemma);
      await answerCurrent(true);
    });
    Then('{string} is on step {int} and due in {int} days', async (_, lemma: string, step: number, days: number) => {
      await waitFor(async () => expect((await review(lemma)).step).toBe(step));
      expect(Math.abs((await review(lemma)).due - (Date.now() + days * DAY))).toBeLessThan(60_000);
    });
  });

  Scenario('A wrong answer brings it back tomorrow', ({ Given, When, And, Then }) => {
    Given('the word {string} is due on step {int}', async (_, lemma: string, step: number) => {
      await freshStore();
      await makeDue([lemma], () => ({ step, rights: 0 }));
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    And('he answers {string} wrong', async (_, lemma: string) => {
      expect(promptLemma()).toBe(lemma);
      await answerCurrent(false);
    });
    Then('{string} is on step {int} and due in {int} day', async (_, lemma: string, step: number, days: number) => {
      await waitFor(async () => expect((await review(lemma)).step).toBe(step));
      const r = await review(lemma);
      expect(r.lapses).toBe(1);
      expect(Math.abs(r.due - (Date.now() + days * DAY))).toBeLessThan(60_000);
    });
  });

  Scenario('The end card says how many come back tomorrow', ({ Given, When, And, Then }) => {
    Given('{int} words are due, {int} of them on step 3', async (_, n: number, onStep: number) => {
      await freshStore();
      // the last `onStep` of the due words stand on step 3
      await makeDue(DUE.slice(0, n), (_, i) => ({ step: i >= n - onStep ? 3 : 0, rights: 0 }));
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    And('he answers every question right and goes on to the end', async () => {
      for (let i = 0; i < 10; i += 1) {
        await screen.findByTestId('prompt');
        await answerCurrent(true);
        await goOn();
      }
    });
    Then('the end card reads {string}', async (_, text: string) => {
      expect(await screen.findByTestId('score')).toHaveTextContent(text);
    });
    And('the end card says {string}', async (_, text: string) => {
      expect(await screen.findByTestId('comes-back')).toHaveTextContent(text);
    });
    And('the end card has a {string} button', (_, name: string) => {
      expect(screen.getByRole('button', { name })).toBeVisible();
    });
  });

  Scenario('Review is remembered across a reopen', ({ Given, When, And, Then }) => {
    Given('{int} of his words are due', async (_, n: number) => {
      await freshStore();
      await makeDue(DUE.slice(0, n));
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('the app is closed and opened again', async () => {
      cleanup();
      // the app's own start: a bare address is replaced by the place he was at
      window.history.replaceState(null, '', '/');
      restoreLastRoute();
      render(<App newRandom={() => mulberry32(7)} />);
    });
    Then('the Review screen says {string}', async (_, text: string) => {
      await dueToday();
      await waitFor(() => expect(screen.getByTestId('due-today')).toHaveTextContent(text));
    });
  });
});
