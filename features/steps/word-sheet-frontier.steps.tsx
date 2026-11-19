// features/steps/word-sheet-frontier.steps.tsx — runs features/word-sheet-frontier.feature: the word sheet's Add to my words (the tutor's own control, src/AddWordButton.tsx)
// on a Greek word of 1 John 1 and a Hebrew word of Genesis 1, and the Goal screen's Frontier count after it.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { setGoal } from '../../src/data/repositories/settings';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { unstubRangeRects } from '../../tests/support/fake-layout';
import { putAtLevels } from './levels';
import { closeDatabase } from './close-database';

const user = userEvent.setup();

afterAll(async () => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  await closeDatabase();
});

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** Opens the app on a chapter with a goal set, his list empty (or holding `listed` as a learning word) and the source language's dial all in and the Greek view saved. */
async function openOn(title: string, goal: string, listed?: string): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  unstubRangeRects();
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  // his list is only what a step puts: the first-open seeding is marked done
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await putAtLevels({ hebrew: 5 }, { readerView: 'greek' });
  await setGoal(goal);
  if (listed) await db.words.put({ lemma: listed, lang: 'grc', lemmas: [listed], gloss: 'beginning', lesson: 0, state: 'learning', since: Date.now() });
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const wordEl = (verse: number, text: string): HTMLElement => {
  const found = [...document.querySelectorAll<HTMLElement>(`[data-verse="${verse}"] [data-word]`)].find((el) => squash(el.textContent) === text);
  if (!found) throw new Error(`no word "${text}" in verse ${verse}`);
  return found;
};
const sheet = (): Promise<HTMLElement> => screen.findByRole('dialog', { name: 'Word' });
const addButton = async (): Promise<HTMLElement> => within(await sheet()).findByRole('button', { name: /^(Add to my words|On my list)$/ });

const feature = await loadFeature('features/word-sheet-frontier.feature');

describeFeature(feature, ({ Scenario }) => {
  const taps = async (_: unknown, word: string, verse: number): Promise<void> => user.click(wordEl(verse, word));
  const tapsAdd = async (_: unknown, label: string): Promise<void> => {
    await user.click(await within(await sheet()).findByRole('button', { name: label }));
  };
  const reads = async (_: unknown, label: string): Promise<void> => {
    await waitFor(async () => expect(await addButton()).toHaveTextContent(label));
    expect(await addButton()).toBeDisabled();
  };
  const listedAs = (lemma: string, lang: 'grc' | 'hbo') => async (): Promise<void> => {
    await waitFor(async () => expect(await db.words.get(lemma)).toMatchObject({ lemma, lang, state: 'learning' }));
  };

  Scenario('A word he has not learned is added from its sheet and the Goal screen counts it as Frontier', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on 1 John 1 with the goal {string} and no word on his list', (_: unknown, goal: string) => openOn('1 John 1', goal));
    When('he taps the word {string} of verse {int}', taps);
    Then('the word sheet has the button {string}', async (_: unknown, label: string) => {
      expect(await within(await sheet()).findByRole('button', { name: label })).toBeEnabled();
    });
    When('he taps {string} on the word sheet', tapsAdd);
    Then("the word sheet's button reads {string} and is disabled", reads);
    And('{string} is on his list as a word he is learning', (_: unknown, lemma: string) => listedAs(lemma, 'grc')());
    When('he opens the Goal screen', async () => {
      cleanup();
      clearBus();
      forgetTrail();
      window.history.replaceState(null, '', '/#/goal');
      render(<App />);
    });
    Then('the words bar says Frontier {int}', async (_: unknown, n: number) => {
      await waitFor(async () => expect(await screen.findByTestId('words-legend')).toHaveTextContent(new RegExp(`Frontier ${n} ·`)));
    });
  });

  Scenario('A word already on his list reads On my list at once', ({ Given, When, Then }) => {
    Given('Lampas is opened on 1 John 1 with the goal {string} and {string} on his list', (_: unknown, goal: string, lemma: string) => openOn('1 John 1', goal, lemma));
    When('he taps the word {string} of verse {int}', taps);
    Then("the word sheet's button reads {string} and is disabled", reads);
  });

  Scenario('A Hebrew word is added under its language', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the goal {string} and no word on his list', (_: unknown, goal: string) => openOn('Genesis 1', goal));
    When('he taps the word {string} of verse {int}', taps);
    And('he taps {string} on the word sheet', tapsAdd);
    Then("the word sheet's button reads {string} and is disabled", reads);
    And('{string} is on his list as a Hebrew word he is learning', (_: unknown, lemma: string) => listedAs(lemma, 'hbo')());
  });
});
