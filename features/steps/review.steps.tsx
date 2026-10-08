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
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';

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

/** Answers the question on screen right or wrong; returns the lemma it asked. A flashcard is shown, then graded. */
async function answerCurrent(right: boolean): Promise<string> {
  const lemma = promptLemma();
  if (screen.queryByRole('button', { name: 'Show' })) {
    await user.click(screen.getByRole('button', { name: 'Show' }));
    await user.click(await screen.findByRole('button', { name: right ? 'I knew it' : 'Not yet' }));
    return lemma;
  }
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

const showButton = () => screen.queryByRole('button', { name: 'Show' });

/** past the app's 500 ms hold */
const HOLD_MS = 650;
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let synth: FakeSynth;

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
  Scenario('A weak word is asked as multiple choice and a strong one as a flashcard', ({ Given, When, And, Then }) => {
    Given('the word {string} is due on step {int}', async (_, lemma: string, step: number) => {
      await freshStore();
      await makeDue([lemma], () => ({ step, rights: 0 }));
    });
    And('the word {string} is also due on step {int}', async (_, lemma: string, step: number) => {
      expect(await db.words.get(lemma), `${lemma} is a seed word`).toBeTruthy();
      // overdue by less than the first, so it is asked second
      const now = Date.now();
      await db.reviews.put({ kind: 'word', id: lemma, step, rights: 0, due: now - 30_000, lastWhen: now - 3 * DAY, lapses: 0 });
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the question for {string} has four options and no Show control', (_, lemma: string) => {
      expect(promptLemma()).toBe(lemma);
      expect(options()).toHaveLength(4);
      expect(showButton()).toBeNull();
    });
    When('he answers {string} right and goes on', async (_, lemma: string) => {
      expect(await answerCurrent(true)).toBe(lemma);
      await goOn();
    });
    Then('the question for {string} is a flashcard with the lemma {string}, no options and a Show control', async (_, asked: string, lemma: string) => {
      await waitFor(() => expect(promptLemma()).toBe(asked));
      expect(screen.getByTestId('prompt')).toHaveTextContent(lemma);
      expect(options()).toHaveLength(0);
      expect(showButton()).toBeVisible();
    });
    And('the flashcard does not show the gloss yet', async () => {
      const gloss = (await db.words.get(promptLemma()))?.gloss ?? '';
      expect(gloss).not.toBe('');
      expect(document.body.textContent).not.toContain(gloss);
      expect(screen.queryByTestId('picture')).toBeNull();
    });
  });

  Scenario('Show reveals the meaning and I knew it records a right review', ({ Given, When, And, Then }) => {
    Given('the word {string} is due on step {int}', async (_, lemma: string, step: number) => {
      await freshStore();
      await makeDue([lemma], () => ({ step, rights: 0 }));
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    And('he taps Show', async () => user.click(await screen.findByRole('button', { name: 'Show' })));
    Then('the flashcard shows the gloss of {string} with {string} and {string}', async (_, lemma: string, a: string, b: string) => {
      const gloss = (await db.words.get(lemma))?.gloss ?? '';
      expect(await screen.findByTestId('flash-gloss')).toHaveTextContent(gloss);
      expect(screen.getByRole('button', { name: a })).toBeVisible();
      expect(screen.getByRole('button', { name: b })).toBeVisible();
      expect(showButton()).toBeNull();
    });
    When('he taps {string}', async (_, name: string) => user.click(await screen.findByRole('button', { name })));
    Then('{string} has one right review and no lapse', async (_, lemma: string) => {
      await waitFor(async () => expect((await review(lemma)).rights).toBe(1));
      expect((await review(lemma)).lapses).toBe(0);
      expect((await review(lemma)).step).toBe(3);
    });
  });

  Scenario('Not yet records a wrong review', ({ Given, When, And, Then }) => {
    Given('the word {string} is due on step {int}', async (_, lemma: string, step: number) => {
      await freshStore();
      await makeDue([lemma], () => ({ step, rights: 0 }));
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    And('he taps Show', async () => user.click(await screen.findByRole('button', { name: 'Show' })));
    And('he taps {string}', async (_, name: string) => user.click(await screen.findByRole('button', { name })));
    Then('{string} is on step {int} and has lapsed once', async (_, lemma: string, step: number) => {
      await waitFor(async () => expect((await review(lemma)).step).toBe(step));
      expect((await review(lemma)).lapses).toBe(1);
    });
  });

  Scenario('A word that slips is asked as multiple choice again', ({ Given, When, And, Then }) => {
    Given('the word {string} is due on step {int}', async (_, lemma: string, step: number) => {
      await freshStore();
      await makeDue([lemma], () => ({ step, rights: 0 }));
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    And('he taps Show', async () => user.click(await screen.findByRole('button', { name: 'Show' })));
    And('he taps {string}', async (_, name: string) => user.click(await screen.findByRole('button', { name })));
    And('he goes on to the end of the round', async () => {
      await goOn();
      for (let i = 0; i < 9; i += 1) {
        await screen.findByTestId('prompt');
        await answerCurrent(true);
        await goOn();
      }
      await screen.findByTestId('score');
    });
    And('{string} is due again', async (_, lemma: string) => {
      await db.reviews.update(['word', lemma], { due: Date.now() - 60_000 });
    });
    And('he starts another round', async () => {
      await user.click(await screen.findByRole('button', { name: 'Another round' }));
      await screen.findByTestId('prompt');
    });
    Then('the question for {string} has four options and no Show control', (_, lemma: string) => {
      expect(promptLemma()).toBe(lemma);
      expect(options()).toHaveLength(4);
      expect(showButton()).toBeNull();
    });
  });

  Scenario('A flashcard shows the dictionary form and hold-to-hear says it', ({ Given, When, And, Then }) => {
    Given('the word {string} is due on step {int}', async (_, lemma: string, step: number) => {
      await freshStore();
      synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
      await makeDue([lemma], () => ({ step, rights: 0 }));
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the flashcard shows only the lemma {string}', (_, lemma: string) => {
      expect(screen.getByTestId('prompt').textContent).toBe(lemma.normalize('NFC'));
      expect(screen.getByTestId('prompt').textContent).toBe((promptLemma()).normalize('NFC'));
      expect(screen.queryByTestId('picture')).toBeNull();
    });
    When('he holds the Hold to hear bar', async () => {
      await user.pointer({ keys: '[MouseLeft>]', target: screen.getByTestId('hold-to-hear'), coords: { clientX: 100, clientY: 100 } });
      await sleep(HOLD_MS);
    });
    Then('the Greek voice says {string}', async (_, lemma: string) => {
      expect(synth.spoken.map((u) => u.text)).toEqual([lemma.normalize('NFC')]);
      expect(synth.spoken[0].lang).toBe('el-GR');
      await user.pointer({ keys: '[/MouseLeft]', target: screen.getByTestId('hold-to-hear'), coords: { clientX: 100, clientY: 100 } });
    });
  });
});
