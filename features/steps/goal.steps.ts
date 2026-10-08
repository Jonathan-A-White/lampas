// features/steps/goal.steps.ts — runs features/goal.feature: parseGoal and what a passage needs, with the committed 1 John 1.
import { expect } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { loadChapter, loadIndex, type BookIndex } from '../../src/data/chapter';
import { goalTitle, parseGoal, type Goal } from '../../src/data/goal';
import { LADDER } from '../../src/data/grammar/ladder';
import { passageNeeds, progressToward, type PassageNeeds } from '../../src/data/grammar/needs';
import type { WordState } from '../../src/data/db';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

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
});
