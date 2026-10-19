// features/steps/one-frontier.steps.tsx — runs features/one-frontier.feature: he learns one grammar idea at a time. The Goal screen names the idea at the
// frontier ('Learning now: ...'), the idea sheet asks before a second idea becomes Learning, and proving the frontier makes the next idea the frontier.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { unmetNeed } from '../../src/data/grammar/drillIt';
import { learnNext } from '../../src/data/grammar/goalProgress';
import { gapsOf } from '../../src/data/grammar/inference';
import type { Level } from '../../src/data/grammar/needs';
import { fixturePath } from '../../tests/support/fixture-path';
import { ideaOf, itemsOf, LADDER } from '../../src/data/grammar/ladder';
import { setGoal } from '../../src/data/repositories/settings';
import { setLevel, teachIdea } from '../../src/data/repositories/grammarLevels';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const ideaSheet = () => screen.getByRole('dialog', { name: 'Idea' });

/** Empties every store, marks the seeding done so only what a step puts is there, and saves the goal. */
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

async function openGoal(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.history.replaceState(null, '', '/#/goal');
  render(<App />);
  await screen.findByTestId('goal-title');
}

/** The ids of the ideas at the frontier now, the letters, pairs and breathings left out. */
const atFrontier = async (): Promise<string[]> =>
  (await db.grammarLevels.where('level').equals('frontier').toArray()).map((row) => row.id.replace(/^modern:/, '')).filter((id) => !/^(letter|diphthong|pair|breathing)-/.test(id)).sort();

const feature = await loadFeature('features/one-frontier.feature');

describeFeature(feature, ({ Scenario }) => {
  const GIVEN_LEARNING = 'the goal is {string} and he is learning {string}';
  const learning = async (_: unknown, goal: string, id: string) => {
    await freshStore(goal);
    await teachIdea(id, 'got-it');
    await db.reviews.where('[kind+id]').equals(['grammar', id]).modify({ rights: 3, lapses: 1 });
  };
  const opensSheetFromGoal = async (_: unknown, id: string) => {
    await openGoal();
    await user.click(await screen.findByTestId('ideas-bar'));
    await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: ideaOf(id).title }));
    await screen.findByRole('dialog', { name: 'Idea' });
    await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
  };
  const GIVEN_SHEET = 'he opens the idea sheet of {string} from the Goal screen';
  const slides = async (_: unknown, label: string) => {
    fireEvent.change(within(ideaSheet()).getByRole('slider', { name: 'Your level' }), { target: { value: String(['Not yet', 'Learning', 'I know it'].indexOf(label)) } });
  };
  const onlyFrontier = async (_: unknown, id: string) => {
    await waitFor(async () => expect(await atFrontier()).toEqual([id]));
  };
  const goalSays = async (_: unknown, text: string) => {
    await waitFor(() => expect(screen.getAllByText(text, { exact: false })).toHaveLength(1));
  };

  Scenario('A placement that found three ideas at the frontier leaves one, and the Goal screen names it', ({ Given, When, Then, And }) => {
    Given('the goal is {string} and the placement found the ideas {string}, {string} and {string} at the frontier', async (_, goal: string, a: string, b: string, c: string) => {
      await freshStore(goal);
      for (const id of [a, b, c]) await setLevel(id, 'frontier', 'placement');
    });
    When('he opens the Goal screen', openGoal);
    Then('the Goal screen says {string} in one place', goalSays);
    And('the grammar ideas bar says exactly one idea is at the frontier', async () => {
      await waitFor(async () => expect(await screen.findByTestId('ideas-legend')).toHaveTextContent(/Frontier 1 /));
      expect(screen.getByTestId('ideas-legend').textContent).not.toMatch(/Frontier [2-9]/);
    });
  });

  Scenario('Sliding a second idea to Learning asks which of the two he is learning', ({ Given, And, When, Then }) => {
    Given(GIVEN_LEARNING, learning);
    And(GIVEN_SHEET, opensSheetFromGoal);
    When('he slides the level to {string}', slides);
    Then('he is asked {string}', async (_, question: string) => {
      expect(await screen.findByRole('alertdialog')).toHaveTextContent(question);
    });
    And('{string} is still the only idea at the frontier', onlyFrontier);
  });

  Scenario('When the idea builds on one that is not solid, Go to is asked first and the switch question only after Stay here', ({ Given, And, When, Then }) => {
    Given(GIVEN_LEARNING, learning);
    And(GIVEN_SHEET, opensSheetFromGoal);
    When('he slides the level to {string}', slides);
    Then('he is asked {string}', async (_, question: string) => {
      expect(await screen.findByRole('alertdialog')).toHaveTextContent(question);
    });
    And('{string} is still the only idea at the frontier', onlyFrontier);
    When('he taps {string}', async (_, name: string) => {
      await user.click(await screen.findByRole('button', { name }));
    });
    Then('he is then asked {string}', async (_, question: string) => {
      await waitFor(() => expect(screen.getByRole('alertdialog')).toHaveTextContent(question));
    });
    And('{string} still holds the frontier', onlyFrontier);
  });

  Scenario('Keeping the idea he is learning changes nothing', ({ Given, And, When, Then }) => {
    Given(GIVEN_LEARNING, learning);
    And(GIVEN_SHEET, opensSheetFromGoal);
    And('he slides the level to {string}', slides);
    When('he taps {string}', async (_, name: string) => {
      await user.click(await screen.findByRole('button', { name }));
    });
    Then('{string} is still the only idea at the frontier', onlyFrontier);
    And('the idea sheet\'s slider rests on {string}', async (_, label: string) => {
      await waitFor(() => expect(within(ideaSheet()).getByRole('slider', { name: 'Your level' })).toHaveAttribute('aria-valuetext', label));
    });
  });

  Scenario('Switching puts the old idea back to Not yet and keeps its review', ({ Given, And, When, Then }) => {
    Given(GIVEN_LEARNING, learning);
    And(GIVEN_SHEET, opensSheetFromGoal);
    And('he slides the level to {string}', slides);
    When('he taps {string}', async (_, name: string) => {
      await user.click(await screen.findByRole('button', { name }));
    });
    Then('{string} is the only idea at the frontier', onlyFrontier);
    And('{string} is Not yet and its review is as it was', async (_, id: string) => {
      expect(await db.grammarLevels.get(id)).toMatchObject({ level: 'notYet' });
      expect(await db.reviews.get(['grammar', id])).toMatchObject({ rights: 3, lapses: 1 });
    });
    And('after he closes the idea sheet the Goal screen says {string} in one place', async (_, text: string) => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'Done' }));
      await goalSays(null, text);
    });
  });

  Scenario('Proving the idea he is learning makes the next idea the frontier', ({ Given, And, When, Then }) => {
    Given(GIVEN_LEARNING, learning);
    And(GIVEN_SHEET, opensSheetFromGoal);
    When('he taps Mark known without a drill on the idea sheet', async () => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'Mark known without a drill' }));
    });
    Then('{string} is the only idea at the frontier', onlyFrontier);
    And('after he closes the idea sheet the Goal screen says {string} in one place', async (_, text: string) => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'Done' }));
      await goalSays(null, text);
    });
  });

  Scenario('Marking the alphabet known while it is Learning leaves one idea Learning, and none builds on a letter', ({ Given, And, When, Then }) => {
    Given(GIVEN_LEARNING, learning);
    And(GIVEN_SHEET, opensSheetFromGoal);
    When('he taps Mark known without a drill on the idea sheet', async () => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'Mark known without a drill' }));
    });
    Then('exactly one idea is at the frontier and it is not {string}', async (_, id: string) => {
      await waitFor(async () => {
        const there = await atFrontier();
        expect(there).toHaveLength(1);
        expect(there).not.toContain(id);
      });
    });
    And('after he closes the idea sheet the Goal screen says {string} in one place', async (_, text: string) => {
      await user.click(within(ideaSheet()).getByRole('button', { name: 'Done' }));
      await goalSays(null, text);
    });
    And('no idea sheet says it builds on a letter of the alphabet', async () => {
      const levels = new Map((await db.grammarLevels.toArray()).map((row): [string, typeof row.level] => [row.id.replace(/^modern:/, ''), row.level]));
      const unmet = LADDER.map((idea) => unmetNeed(idea.id, levels)).filter((id) => id !== null && ideaOf(id).glyphs);
      expect(unmet).toEqual([]);
    });
  });
  Scenario('The Greek alphabet marked known by hand while omicron is still Not yet leaves no letter for Learn next or the gaps list', ({ Given, When, Then, And }) => {
    let levels = new Map<string, Level>();
    Given('he marked {string} known by hand while {string} is still Not yet and the other letters are solid', (_, group: string, item: string) => {
      levels = new Map<string, Level>([[group, 'solid'], ...itemsOf(group).map((letter): [string, Level] => [letter.id, letter.id === item ? 'notYet' : 'solid'])]);
    });
    When('Learn next and the gaps list are read', () => {
      expect(levels.get('letter-omicron')).toBe('notYet');
    });
    Then('the gaps list names no letter of the alphabet', () => {
      expect(gapsOf(levels).map((i) => i.id)).toEqual([]);
    });
    And('Learn next names no letter of the alphabet', () => {
      const needs = { ideas: [{ id: 'alphabet', count: 1, example: { form: '', code: '', ref: '' } }] };
      const next = learnNext(needs, fixturePath, levels);
      expect(next?.gaps).toBeUndefined();
      expect(next?.idea.glyphs).toBeUndefined();
    });
  });
});
