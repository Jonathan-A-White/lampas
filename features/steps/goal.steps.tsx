// features/steps/goal.steps.tsx — runs features/goal.feature: parseGoal, what a passage needs (the committed 1 John 1) and the Goal
// section of Settings with its Book, Chapter and Verse pickers.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { loadChapter, loadIndex, type BookIndex } from '../../src/data/chapter';
import { goalTitle, parseGoal, type Goal } from '../../src/data/goal';
import { LADDER } from '../../src/data/grammar/ladder';
import { passageNeeds, progressToward, type PassageNeeds } from '../../src/data/grammar/needs';
import type { WordState } from '../../src/data/db';
import { db } from '../../src/data/db';
import { clearBus, latest } from '../../src/events/bus';
import { SettingsScreen } from '../../src/SettingsScreen';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
});

const group = () => screen.getByRole('group', { name: 'Goal' });
const picker = (name: 'Book' | 'Chapter' | 'Verse') => within(group()).getByRole<HTMLSelectElement>('combobox', { name });
const labels = (select: HTMLElement): string[] => within(select).getAllByRole('option').map((o) => o.textContent ?? '');
const shownOf = (select: HTMLSelectElement): string => select.selectedOptions[0]?.textContent ?? '';
const range = (from: number, to: number): string[] => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

async function openSettings(): Promise<void> {
  cleanup();
  clearBus();
  window.location.hash = '#/settings';
  await db.open();
  render(<SettingsScreen />);
  await screen.findByRole('group', { name: 'Goal' });
}

const saysGoal = async (text: string) => {
  await waitFor(() => expect(within(group()).getByTestId('goal-now')).toHaveTextContent(text));
};


const idOf = (title: string): string => {
  const idea = LADDER.find((i) => i.title === title);
  if (!idea) throw new Error(`no idea titled ${title}`);
  return idea.id;
};

const feature = await loadFeature('features/goal.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  let index: BookIndex;
  let goal: Goal;
  let needs: PassageNeeds;

  BeforeEachScenario(() => {
    stubChapterFetch();
  });

  Scenario('A goal can be a book, a chapter or a verse', ({ Given, Then, And }) => {
    Given('the book index', async () => {
      index = await loadIndex();
    });
    Then('the goal {string} is the whole book of 1 John', (_, text: string) => expect(parseGoal(text, index)).toEqual({ book: '1jn' }));
    And('the goal {string} is chapter 1 of 1 John', (_, text: string) => expect(parseGoal(text, index)).toEqual({ book: '1jn', chapter: 1 }));
    And('the goal {string} is verse 1 of chapter 1 of 1 John and is titled {string}', (_, text: string, title: string) => {
      const parsed = parseGoal(text, index);
      expect(parsed).toEqual({ book: '1jn', chapter: 1, verse: 1 });
      expect(goalTitle(parsed!, index)).toBe(title);
    });
    And('the goal {string} is refused', (_, text: string) => expect(parseGoal(text, index)).toBeUndefined());
  });

  Scenario('The app knows what 1 John 1:1 needs', ({ Given, When, Then, And }) => {
    Given('the goal {string}', async (_, text: string) => {
      index = await loadIndex();
      goal = parseGoal(text, index)!;
      expect(goal).toBeDefined();
    });
    When('the app works out what it needs', async () => {
      needs = await passageNeeds(goal, loadChapter, index);
    });
    Then('it needs {int} words, {string} being the commonest, {int} times', (_, count: number, lemma: string, times: number) => {
      expect(needs.words).toHaveLength(count);
      expect(needs.words[0]).toMatchObject({ lemma: lemma.normalize('NFC'), count: times });
    });
    And('it needs the ideas {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string) => {
      const ids = needs.ideas.map((i) => i.id);
      for (const title of [a, b, c, d]) expect(ids).toContain(idOf(title));
    });
    And('it does not need {string} or {string}', (_, a: string, b: string) => {
      const ids = needs.ideas.map((i) => i.id);
      expect(ids).not.toContain(idOf(a));
      expect(ids).not.toContain(idOf(b));
    });
    And('with {string} being learned and nothing else known, {int} word is on the frontier and {int} are not yet', (_, lemma: string, frontier: number, notYet: number) => {
      const states = new Map<string, WordState>([[lemma.normalize('NFC'), 'learning']]);
      expect(progressToward(needs, states, new Map()).words).toMatchObject({ solid: 0, frontier, notYet });
    });
  });

  const waitsForBook = async () => {
    await saysGoal('Goal: none');
    expect(picker('Chapter')).toBeDisabled();
    expect(picker('Verse')).toBeDisabled();
  };
  const picks = (name: 'Book' | 'Chapter' | 'Verse') => async (_: unknown, option: string) => {
    await user.selectOptions(picker(name), option);
  };

  Scenario('Settings > Goal sets Read 1 John 1:1 from the three pickers', ({ Given, When, Then, And }) => {
    Given('Settings is open and no goal is set', async () => {
      await db.settings.clear();
      await openSettings();
    });
    Then('the Goal says {string} and the Chapter and Verse pickers wait for a book', async (_, text: string) => {
      await saysGoal(text);
      await waitsForBook();
    });
    When('he picks the book {string}', picks('Book'));
    Then('the Goal says {string} and the Chapter picker offers {string} and the chapters 1 to 5', async (_, text: string, whole: string) => {
      await saysGoal(text);
      expect(labels(picker('Chapter'))).toEqual([whole, ...range(1, 5)]);
    });
    When('he picks the chapter {string}', picks('Chapter'));
    Then('the Goal says {string} and the Verse picker offers {string} and the verses 1 to 10', async (_, text: string, whole: string) => {
      await saysGoal(text);
      expect(labels(picker('Verse'))).toEqual([whole, ...range(1, 10)]);
    });
    When('he picks the verse {string}', picks('Verse'));
    Then('the Goal says {string}', (_, text: string) => saysGoal(text));
    And('the bus has heard the goal is verse 1 of chapter 1 of 1 John', () => {
      expect(latest('goal-changed')?.goal).toEqual({ book: '1jn', chapter: 1, verse: 1 });
    });
  });

  Scenario('The goal survives a reopen', ({ Given, When, And, Then }) => {
    Given('Settings is open and no goal is set', async () => {
      await db.settings.clear();
      await openSettings();
    });
    When('he picks the book {string}', picks('Book'));
    And('he picks the chapter {string}', picks('Chapter'));
    And('he picks the verse {string}', picks('Verse'));
    And('Settings is opened again', async () => {
      await saysGoal('Read 1 John 1:1');
      await openSettings();
    });
    Then('the Goal says {string}', (_, text: string) => saysGoal(text));
    And('the Book picker shows {string}, the Chapter picker {string} and the Verse picker {string}', (_, book: string, chapter: string, verse: string) => {
      expect(shownOf(picker('Book'))).toBe(book);
      expect(shownOf(picker('Chapter'))).toBe(chapter);
      expect(shownOf(picker('Verse'))).toBe(verse);
    });
  });

  Scenario('Clear leaves no goal', ({ Given, When, And, Then }) => {
    Given('Settings is open and no goal is set', async () => {
      await db.settings.clear();
      await openSettings();
    });
    When('he picks the book {string}', picks('Book'));
    And('he picks the chapter {string}', picks('Chapter'));
    And('he taps Clear', async () => {
      await saysGoal('Read 1 John 1');
      await user.click(within(group()).getByRole('button', { name: 'Clear' }));
    });
    Then('the Goal says {string} and the Chapter and Verse pickers wait for a book', async (_, text: string) => {
      await saysGoal(text);
      await waitsForBook();
    });
    And('the bus has heard there is no goal', () => {
      expect(latest('goal-changed')).toEqual({ kind: 'goal-changed', goal: null });
    });
  });
});
