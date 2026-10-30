// features/steps/tutor-door-setting.steps.tsx — runs features/tutor-door-setting.feature: the Tutor door and Hand rows of Settings (src/settings/controls/tutorDoor.tsx), their one-time hand question, and that both are kept.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { openSettingsGroup } from '../../tests/support/settings-pages';
import type { GroupId } from '../../src/settings/rows';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

const user = userEvent.setup();
const GROUPS: Record<string, GroupId> = { 'The tutor': 'tutor', Reading: 'reading' };
const QUESTION = 'Which hand do you hold your phone in?';

let page = 'The tutor';

/** Opens Settings on its home and then the page of a group, keeping what the settings store holds (a reload keeps it). */
async function openPage(title: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/#/settings');
  stubChapterFetch();
  render(<App />);
  await openSettingsGroup(user, GROUPS[title]);
  page = title;
}

const row = async (name: string) => screen.findByRole('group', { name });
const chosen = async (name: string): Promise<string[]> =>
  within(await row(name))
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent ?? '');

const feature = await loadFeature('features/tutor-door-setting.feature');

describeFeature(feature, ({ Scenario, BeforeEachScenario }) => {
  BeforeEachScenario(async () => {
    cleanup();
    window.localStorage.clear();
    await db.open();
    await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear()]);
  });

  const opened = async (_: unknown, title: string) => openPage(title);
  const shows = async (_: unknown, name: string, value: string) => {
    await waitFor(async () => expect(await chosen(name)).toEqual([value]));
  };
  const chooses = async (_: unknown, value: string, name: string) => {
    await user.click(within(await row(name)).getByRole('button', { name: value }));
  };
  const kept = async (_: unknown, key: string, value: string) => {
    await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
  };
  const reopened = async () => openPage(page);

  Scenario('The Tutor door starts at Two-finger tap', ({ Given, Then }) => {
    Given('Settings is open at the page of {string}', opened);
    Then('the {string} row shows {string} chosen', shows);
  });

  Scenario('Floating ? asks the hand once and is kept across a reload', ({ Given, When, Then, And }) => {
    Given('Settings is open at the page of {string}', opened);
    When('he chooses {string} for the {string}', chooses);
    Then('the app asks {string}', async (_, question: string) => {
      expect(question).toBe(QUESTION);
      await screen.findByRole('group', { name: question });
    });
    When('he answers {string}', async (_, value: string) => {
      await user.click(within(await screen.findByRole('group', { name: QUESTION })).getByRole('button', { name: value }));
    });
    Then('the app no longer asks', async () => {
      await waitFor(() => expect(screen.queryByRole('group', { name: QUESTION })).toBeNull());
    });
    And('the setting {string} is kept as {string}', kept);
    And('his hand is kept as {string}', (_, value: string) => kept(_, 'hand', value));
    When('Settings is opened again after a reload', reopened);
    Then('the {string} row shows {string} chosen', shows);
    And('the app does not ask which hand', async () => {
      await row('Tutor door');
      expect(screen.queryByRole('group', { name: QUESTION })).toBeNull();
    });
  });

  Scenario('Hand starts at Right and is kept across a reload', ({ Given, When, Then }) => {
    Given('Settings is open at the page of {string}', opened);
    Then('the {string} row shows {string} chosen', shows);
    When('he chooses {string} for the {string}', chooses);
    Then('the setting {string} is kept as {string}', kept);
    When('Settings is opened again after a reload', reopened);
    Then('the {string} row still shows {string} chosen', shows);
  });
});
