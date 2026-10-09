// features/steps/settings-search.steps.tsx — runs features/settings-search.feature: the search field at the top of Settings.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

async function openSettings(seed: Record<string, string> = {}): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  for (const [key, value] of Object.entries(seed)) await db.settings.put({ key, value });
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  // the screen draws its groups from live queries: wait for the last section before searching
  await screen.findByRole('heading', { name: 'More', level: 2 });
  await screen.findByRole('group', { name: 'Tips' });
}

const searchField = (): Promise<HTMLElement> => screen.findByRole('searchbox', { name: 'Search settings' });
const section = (name: string): HTMLElement | null => screen.queryByRole('heading', { name, level: 2 });

const feature = await loadFeature('features/settings-search.feature');

describeFeature(feature, ({ Scenario }) => {
  const openNothing = () => openSettings();
  const typed = async (_: unknown, text: string): Promise<void> => {
    await user.type(await searchField(), text);
  };

  Scenario('Typing logos shows only the Logos settings', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with Logos On', () => openSettings({ 'resource.logos': 'on' }));
    When('he types {string} in the Settings search', typed);
    Then('Settings shows the switch {string}', async (_, name: string) => {
      expect(await screen.findByRole('switch', { name })).toBeInTheDocument();
    });
    And('Settings shows the section {string}', async (_, name: string) => {
      expect(await screen.findByRole('heading', { name, level: 2 })).toBeInTheDocument();
    });
    And('Settings has no sections {string} or {string}', async (_, a: string, b: string) => {
      await waitFor(() => expect(section(a)).toBeNull());
      expect(section(b)).toBeNull();
    });
    And('Settings has no group {string}', (_, name: string) => {
      expect(screen.queryByRole('group', { name })).toBeNull();
    });
  });

  Scenario('Clearing the search shows every setting again', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with Logos On', () => openSettings({ 'resource.logos': 'on' }));
    When('he types {string} in the Settings search', typed);
    And('he clears the Settings search', async () => {
      await user.clear(await searchField());
    });
    Then('Settings shows the sections {string} and {string}', async (_, a: string, b: string) => {
      expect(await screen.findByRole('heading', { name: a, level: 2 })).toBeInTheDocument();
      expect(await screen.findByRole('heading', { name: b, level: 2 })).toBeInTheDocument();
    });
    And('Settings shows the group {string}', async (_, name: string) => {
      expect(await screen.findByRole('group', { name })).toBeInTheDocument();
    });
  });

  Scenario("The search matches a setting's hint, ignoring capitals and accents", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('Settings shows the group {string}', async (_, name: string) => {
      expect(await screen.findByRole('group', { name })).toBeInTheDocument();
    });
    And('Settings has no section {string}', async (_, name: string) => {
      await waitFor(() => expect(section(name)).toBeNull());
    });
  });

  Scenario('A search that matches nothing says so', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('Settings says {string}', async (_, text: string) => {
      expect(await screen.findByText(new RegExp(text))).toBeInTheDocument();
    });
    And('Settings has no section {string}', async (_, name: string) => {
      await waitFor(() => expect(section(name)).toBeNull());
    });
  });

  Scenario('A hidden detail is found through the setting that turns it on', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('Settings shows the switch {string}', async (_, name: string) => {
      expect(await screen.findByRole('switch', { name })).toBeInTheDocument();
    });
    And('Settings has no section {string}', async (_, name: string) => {
      await waitFor(() => expect(section(name)).toBeNull());
    });
  });
});
