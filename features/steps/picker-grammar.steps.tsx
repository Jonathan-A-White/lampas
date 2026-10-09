// features/steps/picker-grammar.steps.tsx — runs features/picker-grammar.feature: Settings > New words (New words at, Move it),
// the picker held to the grammar level (src/data/frontier.ts with src/data/grammar/formLevel.ts pickerPasses), and the move
// Review's end card offers or makes from the last 20 grammar answers (src/data/grammar/move.ts, src/review/pickerMove.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { pickFrontier, type Candidate, type Known } from '../../src/data/frontier';
import { ALWAYS_NEEDED, ideasOf } from '../../src/data/grammar/ladder';
import { pickerPasses, type PickerGrammar } from '../../src/data/grammar/formLevel';
import { mulberry32 } from '../../src/data/quiz';
import {
  getGrammarAnswers,
  getGrammarMove,
  getPickerGrammar,
  listLevels,
  seedWordsIfFirstOpen,
  setLevel,
  setPickerGrammar,
  setGrammarMove,
} from '../../src/data/repositories';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { DAY } from '../../src/data/schedule';
import { clearBus, latest, subscribe } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { FIXTURE_CHAPTER, FIXTURE_FREQUENCY } from '../../tests/fixtures/frontier';

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const NOMINATIVE = 'N-NSM';
const GENITIVE = 'N-GSM';

/** The ideas the two codes need, apart from the ones they share, are what the scenario sets. */
async function setIdeas(code: string, level: 'solid' | 'frontier' | 'notYet'): Promise<void> {
  for (const id of [...ideasOf(code), ...ALWAYS_NEEDED]) await setLevel(id, level, 'placement');
}

async function freshStore(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear()]);
}

const group = (name: string): HTMLElement => screen.getByRole('group', { name });
const pressed = (name: string, chip: string) => within(group(name)).getByRole('button', { name: chip, exact: true });

// --- the picker
let chapter: Chapter = FIXTURE_CHAPTER;
let picked: Candidate[] = [];
const known: Known = { solid: new Set(['καί', 'εἰμί']), learning: new Set(), dropped: new Set() };
const pick = async (level: PickerGrammar) => {
  picked = pickFrontier(chapter, known, FIXTURE_FREQUENCY, 100, pickerPasses(await listLevels(), level));
};
const offered = () => picked.map((c) => c.lemma);

// --- the round
let moves: unknown[] = [];

async function dueGrammar(rightBefore: boolean): Promise<void> {
  await seedWordsIfFirstOpen();
  await seedScheduleIfFirstOpen();
  await db.reviews.clear();
  // a strong idea: asked as a flashcard (Show, then I knew it / Not yet)
  await db.reviews.put({ kind: 'grammar', id: 'preposition', step: 5, rights: 3, due: Date.now() - 60_000, lastWhen: Date.now() - 3 * DAY, lapses: 0 });
  await db.settings.put({ key: 'grammarAnswers', value: (rightBefore ? '1' : '0').repeat(19) });
}

async function finishRound(rightAnswer: boolean): Promise<void> {
  window.history.replaceState(null, '', '/');
  moves = [];
  const off = subscribe('picker-level-moved', (e) => void moves.push(e));
  render(<App newRandom={() => mulberry32(7)} />);
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  await user.click(await screen.findByRole('button', { name: 'Review' }));
  await user.click(await screen.findByRole('button', { name: 'Start' }));
  // the grammar idea is asked first; then the words, each answered by its first option or a flashcard
  for (let guard = 0; guard < 30; guard += 1) {
    await waitFor(() => expect(screen.queryByTestId('next') ?? screen.queryByRole('button', { name: 'Show' }) ?? document.querySelector('[data-option]') ?? screen.queryByTestId('score')).toBeTruthy());
    if (screen.queryByTestId('score')) break;
    const grammar = screen.queryByTestId('grammar-prompt') !== null;
    const show = screen.queryByRole('button', { name: 'Show' });
    if (show) {
      await user.click(show);
      await user.click(await screen.findByRole('button', { name: grammar ? (rightAnswer ? 'I knew it' : 'Not yet') : 'I knew it' }));
    } else if (!screen.queryByTestId('next')) {
      await user.click(document.querySelector<HTMLElement>('[data-option]') as HTMLElement);
    }
    await user.click(await screen.findByTestId('next'));
  }
  await screen.findByTestId('score');
  off();
}

const feature = await loadFeature('features/picker-grammar.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Settings offers New words at Solid grammar | Frontier grammar and Move it Ask | Auto | Off', ({ Given, Then, And, When }) => {
    Given('Lampas is opened on Settings with nothing chosen', async () => {
      await freshStore();
      window.history.replaceState(null, '', '/');
      render(<App />);
      await user.click(await screen.findByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    Then('New words at offers {string} and {string}, and {string} is chosen', async (_, a: string, b: string, chosen: string) => {
      await screen.findByRole('group', { name: 'New words at' });
      const names = within(group('New words at')).getAllByRole('button').map((x) => x.textContent);
      expect(names).toEqual([a, b]);
      await waitFor(() => expect(pressed('New words at', chosen)).toHaveAttribute('aria-pressed', 'true'));
    });
    And('Move it offers {string}, {string} and {string}, and {string} is chosen', async (_, a: string, b: string, c: string, chosen: string) => {
      const names = within(group('Move it')).getAllByRole('button').map((x) => x.textContent);
      expect(names).toEqual([a, b, c]);
      await waitFor(() => expect(pressed('Move it', chosen)).toHaveAttribute('aria-pressed', 'true'));
    });
    When('he taps {string} under New words at and {string} under Move it', async (_, a: string, b: string) => {
      await user.click(pressed('New words at', a));
      await user.click(pressed('Move it', b));
    });
    Then('{string} and {string} are chosen and are kept', async (_, a: string, b: string) => {
      await waitFor(() => expect(pressed('New words at', a)).toHaveAttribute('aria-pressed', 'true'));
      await waitFor(() => expect(pressed('Move it', b)).toHaveAttribute('aria-pressed', 'true'));
      expect(await getPickerGrammar()).toBe('solid');
      expect(await getGrammarMove()).toBe('off');
    });
  });

  Scenario('at Solid grammar a word whose forms use the not-yet genitive is not offered', ({ Given, And, When, Then }) => {
    Given('a chapter in which {string} always stands in the genitive and {string} in the nominative', async (_, genitive: string, nominative: string) => {
      await freshStore();
      chapter = {
        ...FIXTURE_CHAPTER,
        verses: FIXTURE_CHAPTER.verses.map((v) => ({
          ...v,
          g: v.g.map((w) => ({ ...w, p: w.l === genitive ? GENITIVE : w.l === nominative ? NOMINATIVE : NOMINATIVE })),
        })),
      };
    });
    And('the nominative ideas are solid and the genitive is not yet known', async () => {
      await setIdeas(NOMINATIVE, 'solid');
      await setIdeas(GENITIVE, 'solid');
      await setLevel('case-genitive', 'notYet', 'placement');
    });
    When('Lampas picks the new words of the chapter at Solid grammar', async () => pick('solid'));
    Then('{string} is offered and {string} is not', (_, yes: string, no: string) => {
      expect(offered()).toContain(yes);
      expect(offered()).not.toContain(no);
    });
    When('the genitive is at the frontier and Lampas picks at Frontier grammar', async () => {
      await setLevel('case-genitive', 'frontier', 'placement');
      await pick('frontier');
    });
    Then('{string} is offered too', (_, lemma: string) => {
      expect(offered()).toContain(lemma);
    });
  });

  const setting = async (level: string, move: string) => {
    await freshStore();
    await setPickerGrammar(level === 'Solid grammar' ? 'solid' : 'frontier');
    await setGrammarMove(move.toLowerCase() as 'ask' | 'auto' | 'off');
  };

  Scenario('after a strong round with Ask the end card offers the move and Yes sets Frontier grammar', ({ Given, And, When, Then }) => {
    Given('New words at is {word} grammar and Move it is {word}', async (_, level: string, move: string) => setting(`${level} grammar`, move));
    And('his last {int} grammar answers were right and a grammar idea is due', async (_, n: number) => {
      expect(n).toBe(19);
      await dueGrammar(true);
    });
    When('he finishes a round, getting the idea right', async () => finishRound(true));
    Then('the end card asks {string} with {string} and {string}', async (_, question: string, yes: string, notNow: string) => {
      expect(await screen.findByTestId('move-offer')).toHaveTextContent(question);
      expect(screen.getByRole('button', { name: yes })).toBeVisible();
      expect(screen.getByRole('button', { name: notNow })).toBeVisible();
      expect(await getPickerGrammar()).toBe('solid');
    });
    When('he taps {string}', async (_, label: string) => user.click(screen.getByRole('button', { name: label })));
    Then('the end card says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('move-said')).toHaveTextContent(text));
    });
    And('New words at is {string} and the move was told as {string}', async (_, level: string, how: string) => {
      await waitFor(async () => expect(await getPickerGrammar()).toBe(level === 'Frontier grammar' ? 'frontier' : 'solid'));
      expect(latest('picker-level-moved')).toEqual({ kind: 'picker-level-moved', level: 'frontier', how });
      // the answers that made the move do not judge the new level
      expect(await getGrammarAnswers()).toEqual([]);
    });
  });

  Scenario('with Auto the move is made and said', ({ Given, And, When, Then }) => {
    Given('New words at is {word} grammar and Move it is {word}', async (_, level: string, move: string) => setting(`${level} grammar`, move));
    And('his last {int} grammar answers were right and a grammar idea is due', async () => dueGrammar(true));
    When('he finishes a round, getting the idea right', async () => finishRound(true));
    Then('the end card says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('move-said')).toHaveTextContent(text));
      expect(screen.queryByRole('button', { name: 'Yes' })).toBeNull();
    });
    And('New words at is {string} and the move was told as {string}', async (_, level: string, how: string) => {
      expect(await getPickerGrammar()).toBe(level === 'Frontier grammar' ? 'frontier' : 'solid');
      expect(latest('picker-level-moved')).toEqual({ kind: 'picker-level-moved', level: 'frontier', how });
    });
  });

  Scenario('with Off nothing is offered', ({ Given, And, When, Then }) => {
    Given('New words at is {word} grammar and Move it is {word}', async (_, level: string, move: string) => setting(`${level} grammar`, move));
    And('his last {int} grammar answers were right and a grammar idea is due', async () => dueGrammar(true));
    When('he finishes a round, getting the idea right', async () => finishRound(true));
    Then('the end card offers no move and says nothing of one', () => {
      expect(screen.queryByTestId('move-offer')).toBeNull();
      expect(screen.queryByTestId('move-said')).toBeNull();
    });
    And('New words at is {string} and no move was told', async (_, level: string) => {
      expect(await getPickerGrammar()).toBe(level === 'Frontier grammar' ? 'frontier' : 'solid');
      expect(moves).toEqual([]);
    });
  });

  Scenario('a weak round at Frontier grammar moves down', ({ Given, And, When, Then }) => {
    Given('New words at is {word} grammar and Move it is {word}', async (_, level: string, move: string) => setting(`${level} grammar`, move));
    And('his last {int} grammar answers were wrong and a grammar idea is due', async () => dueGrammar(false));
    When('he finishes a round, getting the idea wrong', async () => finishRound(false));
    Then('the end card says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('move-said')).toHaveTextContent(text));
    });
    And('New words at is {string} and the move was told as {string}', async (_, level: string, how: string) => {
      expect(await getPickerGrammar()).toBe(level === 'Frontier grammar' ? 'frontier' : 'solid');
      expect(latest('picker-level-moved')).toEqual({ kind: 'picker-level-moved', level: 'solid', how });
    });
  });
});
