// features/steps/pattern-ideas.steps.tsx — runs features/pattern-ideas.feature: a goal passage needs the pattern ideas its words use (patternsOf,
// mw-svw421.1): the Goal screen's ideas list names them, passageNeeds counts them with a first example, and the idea sheet shows words of the passage.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { passageNeeds } from '../../src/data/grammar/needs';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { setGoal } from '../../src/data/repositories/settings';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const chapterFile = (book: string, n: number) => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;

async function freshStore(goal: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await setGoal(goal);
}

const sheet = () => screen.findByRole('dialog', { name: 'Idea' });
const feature = await loadFeature('features/pattern-ideas.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A passage needs the patterns its words use', ({ Given, When, And, Then }) => {
    Given('the goal is {string} and he knows no word and no idea', async (_, goal: string) => freshStore(goal));
    When('he opens the Goal screen', () => {
      cleanup();
      clearBus();
      forgetTrail();
      window.history.replaceState(null, '', '/#/goal');
      render(<App />);
    });
    And('he taps the ideas bar', async () => {
      await user.click(await screen.findByTestId('ideas-bar'));
    });
    Then('the ideas list has {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      const list = await screen.findByTestId('ideas-list');
      for (const title of [a, b, c]) expect(within(list).getByRole('button', { name: title }), title).toBeInTheDocument();
    });
    And('the passage needs count {string}, {string} and {string} with an example from 1 John 1', async (_, a: string, b: string, c: string) => {
      const needs = await passageNeeds({ book: '1jn', chapter: 1 }, async (_book, n) => chapterFile('1jn', n), BOOK_INDEX);
      for (const id of [a, b, c]) {
        const idea = needs.ideas.find((i) => i.id === id);
        expect(idea, id).toBeDefined();
        expect(idea!.count, id).toBeGreaterThan(0);
        expect(idea!.example.ref, id).toMatch(/^1jn\.1\.\d+$/);
      }
    });
    When('he taps the idea {string} in the ideas list', async (_, title: string) => {
      await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: title }));
    });
    Then('the idea sheet is open on {string}', async (_, title: string) => {
      expect(await within(await sheet()).findByRole('heading', { name: title })).toBeInTheDocument();
    });
    And('the idea sheet of the augment shows up to three examples from {string}', async (_, title: string) => {
      await waitFor(() => expect(within(screen.getByRole('dialog', { name: 'Idea' })).getAllByTestId('idea-example').length).toBeGreaterThan(0));
      const found = within(screen.getByRole('dialog', { name: 'Idea' })).getAllByTestId('idea-example');
      expect(found.length).toBeLessThanOrEqual(3);
      for (const example of found) expect(within(example).getByTestId('idea-verse').textContent).toMatch(new RegExp(`^${title}:\\d+$`));
    });
  });
});
