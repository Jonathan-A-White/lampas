// features/steps/quick-test.steps.tsx — runs features/quick-test.feature: a round of ten, the green/red
// feedback, the end screen, and the two-in-a-row rule seen through the Words screen and the words store.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/quiz';

afterAll(() => {
  cleanup();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const rom8 = readFileSync('public/data/rom/8.json', 'utf8');

interface Asked {
  lemma: string;
  right: boolean;
  /** the word's state when the round began */
  stateBefore: string;
}

let asked: Asked[] = [];
/** The answers of the round being played; `asked` keeps the last finished round. */
let round: Asked[] = [];

async function openLampasFresh(): Promise<void> {
  cleanup();
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(rom8)));
  forgetChapters();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear()]);
  window.location.hash = '';
  localStorage.removeItem('lampas.round');
  asked = [];
  round = [];
  // Every round starts from the same random source, so a second round asks the same words.
  render(<App newRandom={() => mulberry32(7)} />);
}

async function openQuickTest(): Promise<void> {
  // The Test button is in the Words header, which the Reader's Words button opens.
  if (!screen.queryByRole('button', { name: 'Test' })) {
    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    await user.click(await screen.findByRole('button', { name: 'Words' }));
  }
  await user.click(await screen.findByRole('button', { name: 'Test' }));
  await screen.findByRole('heading', { name: 'Quick test' });
  await screen.findByTestId('prompt');
}

async function openQuickTest0(): Promise<void> {
  if (!screen.queryByRole('button', { name: 'Test' })) {
    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    await user.click(await screen.findByRole('button', { name: 'Words' }));
  }
  await user.click(await screen.findByRole('button', { name: 'Test' }));
  await screen.findByRole('heading', { name: 'Quick test' });
}

const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-option]')];
const promptLemma = (): string => screen.getByTestId('prompt').getAttribute('data-lemma') ?? '';

async function rightGloss(): Promise<string> {
  const word = await db.words.get(promptLemma());
  if (!word) throw new Error(`no word ${promptLemma()}`);
  return word.gloss;
}

async function tapGloss(right: boolean): Promise<HTMLElement> {
  const gloss = await rightGloss();
  const target = options().find((o) => (o.textContent === gloss) === right);
  if (!target) throw new Error('no such option');
  await user.click(target);
  return target;
}

/** Answers the question on screen; `right` decides how, and the question is remembered. */
async function answer(right: boolean): Promise<void> {
  const lemma = promptLemma();
  const stateBefore = (await db.words.get(lemma))?.state ?? '';
  await tapGloss(right);
  round.push({ lemma, right, stateBefore });
}

async function goOn(): Promise<void> {
  await user.click(await screen.findByTestId('next'));
}

/** Plays the round to its end screen; `rightAt(i)` says whether question i is answered rightly. */
async function playRound(rightAt: (i: number) => boolean): Promise<void> {
  round = [];
  for (let i = 0; ; i += 1) {
    await screen.findByTestId('prompt');
    await answer(rightAt(i));
    const isLast = (await screen.findByTestId('next')).textContent === 'Finish';
    await goOn();
    if (isLast) break;
  }
  await screen.findByTestId('score');
  asked = round;
}

async function openWordsScreen(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Done' }));
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  await user.click(await screen.findByRole('button', { name: 'Words' }));
  await screen.findByRole('heading', { name: 'Words' });
  await waitFor(() => expect(document.querySelectorAll('[data-lemma]').length).toBeGreaterThan(0));
}

const wordRow = (lemma: string): HTMLElement => {
  const row = document.querySelector<HTMLElement>(`[data-lemma="${lemma}"]`);
  if (!row) throw new Error(`no row for ${lemma}`);
  return row;
};

async function expectOnWordsScreen(lemmas: string[], state: string): Promise<void> {
  await openWordsScreen();
  expect(lemmas.length).toBeGreaterThan(0);
  for (const l of lemmas) await waitFor(() => expect(wordRow(l).getAttribute('data-state')).toBe(state));
}

async function expectInStore(lemmas: string[], state: string): Promise<void> {
  for (const l of lemmas) expect((await db.words.get(l))?.state).toBe(state);
}


/** Answers the first `n` questions of a round and goes on to the next, leaving the round half done. */
async function answerSome(n: number): Promise<void> {
  round = [];
  for (let i = 0; i < n; i += 1) {
    await screen.findByTestId('prompt');
    await answer(true);
    await goOn();
  }
  await screen.findByTestId('prompt');
}

/** The app is closed and opened from its icon: a new render over the same stored data, landing where he was. */
async function closeAndReopen(): Promise<void> {
  cleanup();
  render(<App newRandom={() => mulberry32(7)} />);
}

const feature = await loadFeature('features/quick-test.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A round asks ten different words', ({ Given, When, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Quick test', openQuickTest);
    Then('the first question is shown with {int} glosses to tap', (_, n: number) => {
      expect(options()).toHaveLength(n);
      expect(new Set(options().map((o) => o.textContent)).size).toBe(n);
    });
    When('he answers every question and goes on to the end', async () => playRound(() => true));
    Then('ten different words were asked', () => {
      expect(asked).toHaveLength(10);
      expect(new Set(asked.map((a) => a.lemma)).size).toBe(10);
    });
  });

  Scenario('A right answer shows green and a wrong answer shows the right gloss', ({ Given, When, And, Then }) => {
    let tapped: HTMLElement;
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Quick test', openQuickTest);
    And('he taps the right gloss', async () => {
      tapped = await tapGloss(true);
    });
    Then('the tapped gloss is green and he can go on', () => {
      expect(tapped.getAttribute('data-result')).toBe('right');
      expect(options().filter((o) => o.getAttribute('data-result'))).toHaveLength(1);
      expect(screen.getByTestId('next')).toBeEnabled();
    });
    When('he goes to the next question', goOn);
    And('he taps a wrong gloss', async () => {
      await screen.findByTestId('prompt');
      tapped = await tapGloss(false);
    });
    Then('the tapped gloss is red and the right gloss is shown green', async () => {
      expect(tapped.getAttribute('data-result')).toBe('wrong');
      const gloss = await rightGloss();
      const right = options().find((o) => o.textContent === gloss);
      expect(right?.getAttribute('data-result')).toBe('right');
      expect(screen.getByTestId('feedback')).toHaveTextContent(gloss);
    });
  });

  Scenario('The end screen shows the score and the misses', ({ Given, When, And, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Quick test', openQuickTest);
    And('he answers the first {int} questions wrongly and the rest rightly', async (_, n: number) => playRound((i) => i >= n));
    Then('the end screen reads {string}', (_, text: string) => {
      expect(screen.getByTestId('score')).toHaveTextContent(text);
    });
    And('the end screen lists the {int} words he missed', (_, n: number) => {
      const listed = [...document.querySelectorAll('[data-missed]')].map((e) => e.getAttribute('data-missed'));
      expect(listed).toHaveLength(n);
      expect(listed.sort()).toEqual(asked.filter((a) => !a.right).map((a) => a.lemma).sort());
    });
  });

  Scenario('Two misses in a row make a solid word learning and it leaves the weave', ({ Given, When, And, Then }) => {
    const missedSolid = () => asked.filter((a) => a.stateBefore === 'solid').map((a) => a.lemma);
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Quick test', openQuickTest);
    And('he answers every question wrongly and goes on to the end', async () => playRound(() => false));
    Then('the words he missed that were solid are still solid on the Words screen', async () =>
      expectOnWordsScreen(missedSolid(), 'solid'),
    );
    When('he starts another Quick test', openQuickTest);
    And('he answers every question wrongly again and goes on to the end', async () => playRound(() => false));
    Then('the words he missed that were solid are learning on the Words screen', async () =>
      expectOnWordsScreen(missedSolid(), 'learning'),
    );
    And('the words store holds them as learning', async () => {
      await expectInStore(missedSolid(), 'learning');
      const rows = await db.results.where('lemma').equals(missedSolid()[0]).toArray();
      expect(rows.map((r) => r.right)).toEqual([false, false]);
    });
  });

  Scenario('Two rights in a row make a learning word solid', ({ Given, When, And, Then }) => {
    const learningAsked = () => asked.filter((a) => a.stateBefore === 'learning').map((a) => a.lemma);
    let learningWords: string[] = [];
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Quick test', openQuickTest);
    And('he answers every question rightly and goes on to the end', async () => {
      await playRound(() => true);
      learningWords = learningAsked();
    });
    Then('the learning words he was asked are still learning on the Words screen', async () =>
      expectOnWordsScreen(learningWords, 'learning'),
    );
    When('he starts another Quick test', openQuickTest);
    And('he answers every question rightly again and goes on to the end', async () => playRound(() => true));
    Then('the learning words he was asked are solid on the Words screen', async () =>
      expectOnWordsScreen(learningWords, 'solid'),
    );
    And('the words store holds them as solid', async () => {
      await expectInStore(learningWords, 'solid');
      const rows = await db.results.where('lemma').equals(learningWords[0]).toArray();
      expect(rows.map((r) => r.right)).toEqual([true, true]);
    });
  });
  Scenario('A round left half done is offered again after the app was closed, and Resume goes on where he stopped', ({ Given, When, And, Then }) => {
    let wordAtFour = '';
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Quick test', openQuickTest);
    And('he answers the first 3 questions of a round', async () => {
      await answerSome(3);
      wordAtFour = promptLemma();
    });
    And('he closes the app and opens it again', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await closeAndReopen();
      await openQuickTest0();
    });
    Then('the Quick test says {string} with Resume and New round', async (_, text: string) => {
      await screen.findByText(text);
      expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy();
      expect(screen.getByRole('button', { name: 'New round' })).toBeTruthy();
    });
    When('he taps Resume', async () => user.click(screen.getByRole('button', { name: 'Resume' })));
    Then('he is on question 4 of 10 with the same word as before', async () => {
      await screen.findByText('4 of 10');
      expect(promptLemma()).toBe(wordAtFour);
    });
  });

  Scenario('New round throws the half-done round away', ({ Given, When, And, Then }) => {
    Given('Lampas is opened for the first time', openLampasFresh);
    When('he opens the Quick test', openQuickTest);
    And('he answers the first 3 questions of a round', async () => answerSome(3));
    And('he closes the app and opens it again', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await closeAndReopen();
      await openQuickTest0();
    });
    And('he taps New round', async () => user.click(await screen.findByRole('button', { name: 'New round' })));
    Then('he is on question 1 of 10', async () => {
      await screen.findByText('1 of 10');
    });
    When('he closes the app and opens it again', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await closeAndReopen();
      await openQuickTest0();
    });
    Then('the Quick test shows a question and does not offer a round', async () => {
      await screen.findByTestId('prompt');
      expect(screen.queryByText('Round left unfinished')).toBeNull();
    });
  });
});
