// features/steps/hebrew-ladder.steps.tsx — runs features/hebrew-ladder.feature: the Goal and Placement screens on the ladder of the language in hand (the one chosen language,
// or the Greek | Hebrew segment with both chosen), the Hebrew alphabet idea taught and marked known on the Goal, the placement at the Hebrew foundation, the Goal link in
// Settings' Learning group and the Goal at English only. Languages are chosen the way Settings chooses them (setLanguages moves the two dials).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { setGreekInterest, setHebrewInterest, setLanguages } from '../../src/data/repositories';
import { setGoal } from '../../src/data/repositories/settings';
import type { Languages } from '../../src/settings/definitions/interest';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { SettingsScreen } from '../../src/SettingsScreen';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();

// Change and the Goal's other links scroll to a section; jsdom has no layout to scroll
Element.prototype.scrollIntoView = () => {};

/** Empties every store and chooses the languages, as Settings' row 'Which languages?' does. */
async function fresh(languages: Languages, goal?: string, learning = false): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.passageLessons.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await setLanguages(languages);
  // the Learning group of Settings is drawn from step 3 (Learning) of a dial
  if (learning && (languages === 'greek' || languages === 'both')) await setGreekInterest(3);
  if (learning && (languages === 'hebrew' || languages === 'both')) await setHebrewInterest(3);
  if (goal !== undefined) await setGoal(goal);
}

async function openGoal(): Promise<void> {
  window.history.replaceState(null, '', '/#/goal');
  await seedHisWords();
  render(<App />);
}

async function openSettingsLearning(): Promise<void> {
  cleanup();
  window.location.hash = '#/settings?group=greek';
  render(<SettingsScreen />);
  await screen.findByRole('heading', { name: 'Learning' });
}

const ideasList = () => screen.findByTestId('hebrew-ideas');
const hebrewRow = async (title: string) => within(await ideasList()).getByText(title).closest('li') as HTMLElement;
const sheet = () => screen.findByRole('dialog', { name: 'Idea' });
const segment = () => screen.findByTestId('source-segment');

const feature = await loadFeature('features/hebrew-ladder.feature');

describeFeature(feature, ({ Scenario }) => {
  const goalIs = async (title: string) => expect(await screen.findByTestId('goal-title')).toHaveTextContent(title);
  const noHebrewIdea = () => {
    expect(screen.queryByText('The Hebrew alphabet')).toBeNull();
    expect(screen.queryByTestId('hebrew-ideas')).toBeNull();
  };

  Scenario('With Hebrew chosen the Goal shows the Hebrew alphabet', ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen and the Goal screen is open', async () => {
      await fresh('hebrew');
      await openGoal();
    });
    Then('the Goal lists {string} as Not yet', async (_, title: string) => {
      const row = await hebrewRow(title);
      expect(row).toHaveAttribute('data-level', 'notYet');
      expect(row).toHaveTextContent('Not yet');
    });
    And('no Greek idea or Greek goal is on the screen', () => {
      expect(screen.queryByText('The Greek alphabet')).toBeNull();
      expect(screen.queryByTestId('words-bar')).toBeNull();
      expect(screen.queryByText('No goal yet')).toBeNull();
    });
    And('the screen has no Greek and Hebrew segment', () => {
      expect(screen.queryByTestId('source-segment')).toBeNull();
    });
    When('he opens {string} and marks it known without a drill', async (_, title: string) => {
      await user.click(within(await hebrewRow(title)).getByRole('button'));
      const dialog = await sheet();
      await user.click(await within(dialog).findByRole('button', { name: 'Mark known without a drill' }));
    });
    Then('the Goal lists {string} as Solid', async (_, title: string) => {
      await waitFor(async () => expect(await hebrewRow(title)).toHaveAttribute('data-level', 'solid'));
    });
    And('{string} has the level solid and no review row', async (_, id: string) => {
      expect((await db.grammarLevels.get(id))?.level).toBe('solid');
      expect(await db.reviews.count()).toBe(0);
    });
  });

  Scenario('The Hebrew alphabet is taught from its sheet in Hebrew type', ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen and the Goal screen is open', async () => {
      await fresh('hebrew');
      await openGoal();
    });
    When('he opens {string}', async (_, title: string) => {
      await user.click(within(await hebrewRow(title)).getByRole('button'));
    });
    Then('the sheet teaches it with the Hebrew shown right to left in lang he', async () => {
      const dialog = await sheet();
      expect(await within(dialog).findByTestId('idea-what')).toHaveTextContent('Hebrew has 22 letters');
      const worked = within(dialog).getByTestId('worked-word');
      expect(worked).toHaveAttribute('lang', 'he');
      expect(worked).toHaveAttribute('dir', 'rtl');
      expect(worked).toHaveClass('script-he');
      expect(dialog.querySelector('[data-testid="idea-spot"] [lang="he"][dir="rtl"]')).not.toBeNull();
    });
    And('the sheet offers no Drill it', async () => {
      expect(within(await sheet()).queryByRole('button', { name: 'Drill it' })).toBeNull();
    });
  });

  Scenario('Placement on the Hebrew ladder places at its foundation', ({ Given, When, Then, And }) => {
    Given('Hebrew is the only language chosen and the Goal screen is open', async () => {
      await fresh('hebrew');
      await openGoal();
    });
    When('he taps Place me and then Start from the letters', async () => {
      await user.click(await screen.findByRole('button', { name: 'Place me' }));
      await user.click(await screen.findByRole('button', { name: 'Start from the letters' }));
    });
    Then('the placement says {string}', async (_, text: string) => {
      expect(await screen.findByTestId('where')).toHaveTextContent(text);
    });
    And('it says Learn next on the Goal screen opens {string}', async (_, title: string) => {
      expect(await screen.findByTestId('from-letters')).toHaveTextContent(`Learn next on the Goal screen opens ${title}.`);
    });
  });

  Scenario('With both chosen the segment switches ladders and the Greek one is as before', ({ Given, When, Then, And }) => {
    Given('both languages are chosen, the goal is {string} and the Goal screen is open', async (_, goal: string) => {
      await fresh('both', goal.replace(/^Read /, ''));
      await openGoal();
    });
    Then('the segment has Greek pressed and the Goal is {string}', async (_, title: string) => {
      expect(within(await segment()).getByRole('button', { name: 'Greek' })).toHaveAttribute('aria-pressed', 'true');
      await goalIs(title);
    });
    When('he taps {string} on the segment', async (_, name: string) => {
      await user.click(within(await segment()).getByRole('button', { name }));
    });
    Then('the Goal lists {string} as Not yet', async (_, title: string) => {
      expect(await hebrewRow(title)).toHaveAttribute('data-level', 'notYet');
    });
    And('the Goal shows no Greek goal', () => {
      expect(screen.queryByText('Read 1 John 1:1')).toBeNull();
      expect(screen.queryByTestId('words-bar')).toBeNull();
    });
    When('he goes back to {string} on the segment', async (_, name: string) => {
      await user.click(within(await segment()).getByRole('button', { name }));
    });
    Then('the Goal is {string} again with Words and Grammar ideas bars', async (_, title: string) => {
      await goalIs(title);
      await screen.findByTestId('words-bar');
      await screen.findByTestId('ideas-bar');
    });
    And('no Hebrew idea is on the screen', () => noHebrewIdea());
  });

  Scenario('With Greek only no Hebrew idea is anywhere', ({ Given, When, Then, And }) => {
    Given('Greek is the only language chosen, the goal is {string} and the Goal screen is open', async (_, goal: string) => {
      await fresh('greek', goal.replace(/^Read /, ''));
      await openGoal();
    });
    Then('the Goal is {string} with Words and Grammar ideas bars', async (_, title: string) => {
      await goalIs(title);
      await screen.findByTestId('words-bar');
      await screen.findByTestId('ideas-bar');
    });
    And('no Hebrew idea is on the screen', () => noHebrewIdea());
    And('the screen has no Greek and Hebrew segment', () => {
      expect(screen.queryByTestId('source-segment')).toBeNull();
    });
    When('he opens the Grammar ideas list', async () => {
      await user.click(await screen.findByTestId('ideas-bar'));
    });
    Then('the list has {string} and no Hebrew idea', async (_, title: string) => {
      const list = await screen.findByTestId('ideas-list');
      expect(within(list).getAllByText(title).length).toBeGreaterThan(0);
      expect(within(list).queryByText(/Hebrew/)).toBeNull();
    });
  });

  Scenario('The Goal link is in the Learning group of either language at Learning and of neither at English only', ({ Given, When, Then }) => {
    Given('Hebrew is the only language chosen', async () => {
      await fresh('hebrew', undefined, true);
    });
    Then('the Learning group of Settings has a Goal link', async () => {
      await openSettingsLearning();
      expect(await screen.findByRole('button', { name: 'Goal' })).toBeInTheDocument();
    });
    When('Greek is the only language chosen', async () => {
      await fresh('greek', undefined, true);
    });
    Then('the Learning group of Settings still has a Goal link', async () => {
      await openSettingsLearning();
      expect(await screen.findByRole('button', { name: 'Goal' })).toBeInTheDocument();
    });
    When('English only is chosen', async () => {
      await fresh('english');
    });
    Then('the Learning group of Settings has no Goal link', async () => {
      await openSettingsLearning();
      await screen.findByRole('heading', { name: 'Learning' });
      expect(screen.queryByRole('button', { name: 'Goal' })).toBeNull();
    });
  });

  Scenario('At English only the Goal screen has no ladder', ({ Given, Then }) => {
    Given('English only is chosen and the Goal screen is open', async () => {
      await fresh('english');
      await openGoal();
    });
    Then('the Goal says {string} and lists no idea', async (_, text: string) => {
      expect(await screen.findByText(text)).toBeInTheDocument();
      expect(screen.queryByTestId('hebrew-ideas')).toBeNull();
      expect(screen.queryByTestId('ideas-bar')).toBeNull();
    });
  });
});
