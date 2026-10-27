// features/steps/languages.steps.tsx — runs features/languages.feature: Which languages? and a dial for each language, on the real app opened on a new phone (mw-gdcyf98.2).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { placeInterest } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { applyChanges } from '../../src/settings/registry';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';
import { openSettingsGroup } from '../../tests/support/settings-pages';

const user = userEvent.setup();

// jsdom draws no layout and has no scrollIntoView
Element.prototype.scrollIntoView = function scrollIntoView() {};

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

async function openOnNewPhone(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  // as the app places a new phone before its first render (src/main.tsx): both dials at 0, nothing else written
  await placeInterest();
  await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await screen.findByRole('group', { name: 'Which languages?' });
}

const languages = (): HTMLElement => screen.getByRole('group', { name: 'Which languages?' });
const dial = (name: string): HTMLElement | null => screen.queryByRole('group', { name });
const pressed = (group: HTMLElement | null, label: string): boolean => {
  if (!group) return false;
  return within(group).queryByRole('button', { name: label })?.getAttribute('aria-pressed') === 'true';
};
/** The row a page draws under the name the feature gives it (the setting's `data-setting`). */
const ROW_OF: Readonly<Record<string, string>> = { 'Greek voice': 'greekVoice', 'Hebrew in the tutor': 'hebrewDepth' };
const rowDrawn = (name: string): boolean => document.querySelector(`[data-setting="${ROW_OF[name]}"]`) !== null;
const groupButtons = (): string[] => within(screen.getByRole('list', { name: 'Settings groups' })).getAllByRole('button').map((b) => b.textContent ?? '');

/** The Settings home again, from wherever a group's page left it. */
async function toHome(): Promise<void> {
  const back = screen.queryByRole('button', { name: '‹ Settings' });
  if (back) await user.click(back);
  await screen.findByRole('group', { name: 'Which languages?' });
}

const feature = await loadFeature('features/languages.feature');

describeFeature(feature, ({ Scenario }) => {
  const GIVEN = 'Lampas is opened on Settings on a new phone';
  const chooses = async (_: unknown, label: string): Promise<void> => {
    await user.click(await within(languages()).findByRole('button', { name: label }));
  };
  const choosesOnDial = async (_: unknown, step: string, name: string): Promise<void> => {
    const group = await screen.findByRole('group', { name });
    await user.click(within(group).getByRole('button', { name: step }));
    // the write is not awaited by the tap: the next step starts when the dial shows the step
    await waitFor(() => expect(pressed(dial(name), step), `${name} ${step}`).toBe(true));
  };
  const languagesHas = async (_: unknown, label: string): Promise<void> => {
    await waitFor(() => expect(pressed(languages(), label)).toBe(true));
    expect(within(languages()).getAllByRole('button')).toHaveLength(4);
  };
  const dialHas = async (_: unknown, name: string, step: string): Promise<void> => {
    await waitFor(() => expect(pressed(dial(name), step), `${name} ${step}`).toBe(true));
  };
  const noDialNamed = async (_: unknown, name: string): Promise<void> => {
    await waitFor(() => expect(dial(name)).toBeNull());
  };
  const noDial = async (): Promise<void> => {
    await waitFor(() => expect([dial('How much Greek?'), dial('How much Hebrew?')]).toEqual([null, null]));
  };
  const noGroup = async (_: unknown, title: string): Promise<void> => {
    await toHome();
    await waitFor(() => expect(groupButtons().filter((t) => t.startsWith(title))).toEqual([]));
  };
  const pageHas = async (_: unknown, title: string, name: string): Promise<void> => {
    await toHome();
    await openSettingsGroup(user, title === 'Learning' ? 'greek' : 'listening');
    await waitFor(() => expect(rowDrawn(name), name).toBe(true));
  };
  const pageHasNo = async (_: unknown, title: string, name: string): Promise<void> => {
    await toHome();
    await openSettingsGroup(user, title === 'Learning' ? 'greek' : 'listening');
    await waitFor(() => expect(rowDrawn(name), name).toBe(false));
  };

  Scenario('A new phone is English only', ({ Given, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    Then('Which languages? has {string} chosen', languagesHas);
    And('Settings draws no dial', noDial);
    And('Settings lists no group {string}', noGroup);
    And('the Settings home draws no Greek or Hebrew setting', async () => {
      await toHome();
      const home = screen.getByRole('main').textContent ?? '';
      expect(home).not.toMatch(/Weave|Greek voice|Hebrew in the tutor|Paradigms|Strong/);
    });
  });

  Scenario('Choosing Greek shows the Greek dial at Curious and the Greek rows', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    When('he chooses {string} under Which languages?', chooses);
    Then('Which languages? has {string} chosen', languagesHas);
    And('the dial {string} has {string} chosen', dialHas);
    And('Settings draws no dial {string}', noDialNamed);
    And('the dial {string} has five steps and no {string}', async (_: unknown, name: string, step: string) => {
      const buttons = within(await screen.findByRole('group', { name })).getAllByRole('button');
      expect(buttons).toHaveLength(5);
      expect(buttons.map((b) => b.textContent)).not.toContain(step);
      for (const b of buttons) expect(b.className).toMatch(/min-h-12/);
    });
    And('the {string} page draws {string}', pageHas);
  });

  Scenario('Choosing Hebrew shows the Hebrew dial and Hebrew in the tutor', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    When('he chooses {string} under Which languages?', chooses);
    Then('Which languages? has {string} chosen', languagesHas);
    And('the dial {string} has {string} chosen', dialHas);
    And('Settings draws no dial {string}', noDialNamed);
    And('the {string} page draws {string}', pageHas);
    And('the {string} page draws no {string}', pageHasNo);
  });

  Scenario('Choosing Greek and Hebrew shows both dials', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    When('he chooses {string} under Which languages?', chooses);
    Then('Which languages? has {string} chosen', languagesHas);
    And('the dial {string} has {string} chosen', dialHas);
    And('the dial {string} also has {string} chosen', dialHas);
  });

  Scenario('English only hides both dials and every Greek and Hebrew row, and choosing both again restores the levels', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    When('he chooses {string} under Which languages?', chooses);
    And('he chooses {string} on the dial {string}', choosesOnDial);
    And('he also chooses {string} on the dial {string}', choosesOnDial);
    And('he chooses {string} under Which languages?', chooses);
    Then('Settings draws no dial', noDial);
    And('Settings lists no group {string}', noGroup);
    And('the {string} page draws no {string}', pageHasNo);
    When('he chooses {string} under Which languages? again', async (_, label: string) => {
      await toHome();
      await chooses(_, label);
    });
    Then('the dial {string} has {string} chosen', dialHas);
    And('the dial {string} also has {string} chosen', dialHas);
  });

  Scenario('The tutor changes the Hebrew dial to 0 and the row reads Greek', ({ Given, When, Then, And }) => {
    Given(GIVEN, openOnNewPhone);
    When('he chooses {string} under Which languages?', chooses);
    And('the tutor changes {string} to {string}', async (_: unknown, key: string, value: string) => {
      const { applied } = await applyChanges([{ key, value }]);
      expect(applied).toHaveLength(1);
    });
    Then('Which languages? has {string} chosen', languagesHas);
    And('Settings draws no dial {string}', noDialNamed);
  });
});
