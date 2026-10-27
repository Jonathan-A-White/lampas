// features/steps/pronunciation-progress.steps.tsx — runs features/pronunciation-progress.feature: the sound ideas' levels are kept per pronunciation, the grammar
// ideas' are not, and the Goal screen tells him once that the sounds start again after a switch.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { ideaOf } from '../../src/data/grammar/ladder';
import { isSoundIdea } from '../../src/data/grammar/soundScope';
import { setLevel } from '../../src/data/repositories/grammarLevels';
import { setGoal, setGreekPronunciation } from '../../src/data/repositories/settings';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { registerPronunciation } from '../../src/speech/pronunciation';
import { MODERN } from '../../src/speech/schemes/modern';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { setEachOnItsOwn } from '../../tests/support/settings-pages';

const user = userEvent.setup();
let unregister: (() => void) | undefined;
let modernGrammarSolid: string[] = [];

afterAll(() => {
  unregister?.();
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

async function openAt(hash: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.history.replaceState(null, '', `/${hash}`);
  render(<App />);
}

/** The ids of the solid ideas the Goal screen lists, after opening the Grammar ideas list. */
async function solidIdeas(): Promise<string[]> {
  if (!screen.queryByTestId('ideas-list')) await user.click(await screen.findByTestId('ideas-bar'));
  const group = await within(await screen.findByTestId('ideas-list')).findByRole('region', { name: 'Solid' });
  return [...group.querySelectorAll('[data-idea]')].map((li) => li.getAttribute('data-idea') ?? '');
}

/** Opens Settings and taps the pronunciation with this label; waits until it is the saved one. */
async function chooseInSettings(label: string): Promise<void> {
  await openAt('#/settings?group=listening');
  // the Greek row shows while each language is set on its own (mw-gdcyf98.6)
  await setEachOnItsOwn(user, true);
  await user.click(await screen.findByRole('radio', { name: label }));
  const id = label === 'Modern Greek' ? 'modern' : 'erasmian';
  await waitFor(async () => expect((await db.settings.get('greekPronunciation'))?.value).toBe(id));
}

const titles = (ids: string[]): string[] => ids.map((id) => ideaOf(id).title);

const feature = await loadFeature('features/pronunciation-progress.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  BeforeEachScenario(async () => {
    unregister?.();
    unregister = undefined;
    cleanup();
    clearBus();
    forgetTrail();
    localStorage.clear();
    vi.unstubAllGlobals();
    stubChapterFetch();
    await db.open();
    await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
    await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
    modernGrammarSolid = [];
  });

  Scenario('Switching the pronunciation starts the sounds again, keeps the grammar ideas and tells him once', ({ Given, And, When, Then }) => {
    Given('a second pronunciation {string} is registered', (_, label: string) => {
      unregister = registerPronunciation({ ...MODERN, id: 'erasmian', label });
    });
    And('the goal is {string} and in Modern Greek {string} and {string} are solid', async (_, goal: string, a: string, b: string) => {
      await setGoal(goal);
      await setGreekPronunciation('modern');
      await setLevel(a, 'solid', 'sheet');
      await setLevel(b, 'solid', 'sheet');
    });
    When('he opens the Goal screen', () => openAt('#/goal'));
    Then('the Goal screen has no note about a switch', async () => {
      await screen.findByTestId('goal-title');
      expect(screen.queryByTestId('pronunciation-switch')).toBeNull();
    });
    And('the solid ideas include {string} and {string}', async (_, a: string, b: string) => {
      const ids = await solidIdeas();
      modernGrammarSolid = ids.filter((id) => !isSoundIdea(id));
      expect(titles(ids)).toEqual(expect.arrayContaining([a, b]));
    });
    When('he switches the pronunciation to {string} in Settings', async (_, label: string) => {
      await chooseInSettings(label);
    });
    And('he goes to the Goal screen', () => openAt('#/goal'));
    Then('the Goal screen says {string}', async (_, text: string) => {
      expect(await screen.findByTestId('pronunciation-switch')).toHaveTextContent(text);
    });
    And('the solid ideas include {string} but not {string}', async (_, kept: string, gone: string) => {
      const ids = await solidIdeas();
      expect(titles(ids)).toContain(kept);
      expect(titles(ids)).not.toContain(gone);
    });
    And("the grammar ideas' counts are the same as in Modern Greek", async () => {
      const ids = await solidIdeas();
      expect(ids.filter((id) => !isSoundIdea(id)).sort()).toEqual([...modernGrammarSolid].sort());
    });
    When('he opens the Goal screen once more', () => openAt('#/goal'));
    Then('the Goal screen shows no note about a switch', async () => {
      await screen.findByTestId('goal-title');
      expect(screen.queryByTestId('pronunciation-switch')).toBeNull();
    });
  });

  Scenario('Switching back gives him the old sounds as they were', ({ Given, And, When, Then }) => {
    Given('a second pronunciation {string} is registered', (_, label: string) => {
      unregister = registerPronunciation({ ...MODERN, id: 'erasmian', label });
    });
    And('the goal is {string} and in Modern Greek {string} and {string} are solid', async (_, goal: string, a: string, b: string) => {
      await setGoal(goal);
      await setGreekPronunciation('modern');
      await setLevel(a, 'solid', 'sheet');
      await setLevel(b, 'solid', 'sheet');
    });
    When('he switches the pronunciation to {string} in Settings', async (_, label: string) => {
      await chooseInSettings(label);
    });
    And('he switches the pronunciation to {string} in Settings', async (_, label: string) => {
      await chooseInSettings(label);
    });
    And('he opens the Goal screen', () => openAt('#/goal'));
    Then('the Goal screen says {string}', async (_, text: string) => {
      expect(await screen.findByTestId('pronunciation-switch')).toHaveTextContent(text);
    });
    And('the solid ideas include {string} and {string}', async (_, a: string, b: string) => {
      expect(titles(await solidIdeas())).toEqual(expect.arrayContaining([a, b]));
    });
  });
});
