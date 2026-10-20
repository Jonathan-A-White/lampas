// features/steps/settings-search.steps.tsx — runs features/settings-search.feature: the search field at the top of the Settings home, which lists the rows it finds with their group.
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
import { seedHisWords } from '../../tests/support/his-words';

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
  await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  // the home draws its groups from a live query: wait for the last one before searching
  await groupButton('Account');
}

const groupButton = (title: string): Promise<HTMLElement> => screen.findByRole('button', { name: new RegExp(`^${title}`) });

const searchField = (): Promise<HTMLElement> => screen.findByRole('searchbox', { name: 'Search settings' });
const found = (label: string): HTMLElement | null =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-found]')).find((el) => el.querySelector('span')?.textContent === label) ?? null;
const groups = (): HTMLElement | null => document.querySelector<HTMLElement>('[aria-label="Settings groups"]');

const feature = await loadFeature('features/settings-search.feature');

describeFeature(feature, ({ Scenario }) => {
  const openNothing = () => openSettings();
  const typed = async (_: unknown, text: string): Promise<void> => {
    await user.type(await searchField(), text);
  };
  const findsIn = async (_: unknown, label: string, group: string): Promise<void> => {
    const el = await waitFor(() => {
      const hit = found(label);
      expect(hit, label).not.toBeNull();
      return hit!;
    });
    expect(el).toHaveTextContent(`in ${group}`);
  };
  const findsNo = async (_: unknown, label: string): Promise<void> => {
    await waitFor(() => expect(document.querySelector('[aria-label="Matching settings"]')).not.toBeNull());
    expect(found(label)).toBeNull();
  };
  const listsGroups = async (_: unknown, ...names: string[]): Promise<void> => {
    for (const name of names) expect(await groupButton(name)).toBeInTheDocument();
  };
  const listsNoGroups = async (): Promise<void> => {
    await waitFor(() => expect(groups()).toBeNull());
  };

  Scenario('The home lists the groups and no setting', ({ Given, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    Then('Settings lists the groups {string}, {string}, {string}, {string}, {string}, {string} and {string}', listsGroups);
    And('Settings has no group {string}', (_, name: string) => {
      expect(screen.queryByRole('group', { name })).toBeNull();
    });
  });

  Scenario('Typing logos lists the Logos settings with their group', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with Logos On', () => openSettings({ 'resource.logos': 'on' }));
    When('he types {string} in the Settings search', typed);
    Then('Settings finds {string} in {string}', findsIn);
    And('Settings finds {string} in {string}', findsIn);
    And('Settings finds no {string}', findsNo);
    And('Settings lists no groups', listsNoGroups);
  });

  Scenario('Clearing the search lists the groups again', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with Logos On', () => openSettings({ 'resource.logos': 'on' }));
    When('he types {string} in the Settings search', typed);
    And('he clears the Settings search', async () => {
      await user.clear(await searchField());
    });
    Then('Settings lists the groups {string}, {string}, {string}, {string}, {string}, {string} and {string}', listsGroups);
  });

  Scenario("The search matches a setting's hint, ignoring capitals and accents", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('Settings finds {string} in {string}', findsIn);
    And('Settings finds no {string}', findsNo);
  });

  Scenario('A search that matches nothing says so', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('Settings says {string}', async (_, text: string) => {
      expect(await screen.findByText(new RegExp(text))).toBeInTheDocument();
    });
    And('Settings lists no groups', listsNoGroups);
  });

  Scenario('A hidden detail is found through the setting that turns it on', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('Settings finds {string} in {string}', findsIn);
    And('Settings finds no {string}', findsNo);
  });

  Scenario("A choice's name finds its setting", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('Settings finds {string} in {string}', findsIn);
    And('Settings finds no {string}', findsNo);
  });

  Scenario('Choosing a found setting opens its page at that row', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    And('he chooses {string} among the found', async (_, label: string) => {
      const hit = await waitFor(() => {
        const el = found(label);
        expect(el, label).not.toBeNull();
        return el!;
      });
      await user.click(hit);
    });
    Then('the {string} page is open', async (_, title: string) => {
      expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
    });
    And('the group {string} is shown', async (_, name: string) => {
      expect(await screen.findByRole('group', { name })).toBeInTheDocument();
    });
  });
});
