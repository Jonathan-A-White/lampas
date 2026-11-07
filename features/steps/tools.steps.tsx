// features/steps/tools.steps.tsx — runs features/tools.feature: the Reader's Menu, the Tools screen, its doors and their Back, and the Settings search finding a tool that moved there.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { ROWS } from '../../src/settings/rows';
import { writeSetting } from '../../src/settings/registry';
import { seedHisWords } from '../../tests/support/his-words';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubSpeech } from '../../tests/support/fake-speech';
import { openSettings, openTools, findMenuButton, findToolsHeading, findSettingsHeading } from '../../tests/unit/openSettings';

const user = userEvent.setup();

async function openReader(logos: boolean): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  stubSpeech([]);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.history.replaceState(null, '', '/');
  await seedHisWords();
  if (logos) await writeSetting('resource.logos', 'on');
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
}

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const menu = () => screen.queryByRole('menu', { name: 'Menu' });
const toolsList = () => screen.findByRole('list', { name: 'Tools' });
const namesIn = (list: HTMLElement) => within(list).getAllByRole('button').map((b) => b.querySelector('[data-tool-name]')?.textContent ?? '');

const feature = await loadFeature('features/tools.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  Scenario('The Menu holds Tools and Settings, each with an icon, and Back closes it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8', () => openReader(false));
    When('he opens the Menu', async () => {
      await user.click(await findMenuButton());
    });
    Then('the Menu has the rows "Tools" and "Settings", each with an icon', async () => {
      const rows = within(await screen.findByRole('menu', { name: 'Menu' })).getAllByRole('menuitem');
      expect(rows.map((r) => r.textContent)).toEqual(['Tools', 'Settings']);
      for (const row of rows) expect(row.querySelector('svg'), row.textContent ?? '').not.toBeNull();
    });
    When("he taps the phone's Back", async () => {
      window.history.back();
    });
    Then('the Menu is closed', async () => {
      await waitFor(() => expect(menu()).toBeNull());
    });
    And('the reader is shown', () => {
      expect(screen.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
    });
  });

  Scenario("Settings in the Menu opens Settings", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8', () => openReader(false));
    When("he opens Settings from the reader's Menu", async () => {
      await openSettings(user);
    });
    Then('the Settings screen is shown', async () => {
      expect(await findSettingsHeading()).toBeVisible();
    });
    And('the address is {string}', (_, hash: string) => expect(window.location.hash).toBe(hash));
    And('the Settings groups do not list Tools', async () => {
      const groups = await screen.findByRole('list', { name: 'Settings groups' });
      expect(within(groups).queryByRole('button', { name: /^Tools/ })).toBeNull();
    });
  });

  Scenario('Tools lists the library, the verse lists, Memorize, Paradigms, Words and Review', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with Logos on', () => openReader(true));
    When("he opens Tools from the reader's Menu", async () => {
      await openTools(user);
    });
    Then('the Tools screen lists "Your Logos library", "Verse lists", "Memorize", "Paradigms", "Words" and "Review" in that order', async () => {
      expect(namesIn(await toolsList())).toEqual(['Your Logos library', 'Verse lists', 'Memorize', 'Paradigms', 'Words', 'Review']);
    });
    And('the address is {string}', (_, hash: string) => expect(window.location.hash).toBe(hash));
  });

  ScenarioOutline('Each tool opens its screen and Back returns to Tools', ({ Given, When, And, Then }, row: { tool: string; screen: string; back: string }) => {
    Given('Lampas is opened on Romans 8 with Logos on', () => openReader(true));
    When("he opens Tools from the reader's Menu", async () => {
      await openTools(user);
    });
    And('he opens the tool "<tool>"', async () => {
      await user.click(within(await toolsList()).getByRole('button', { name: new RegExp(`^${row.tool}`) }));
    });
    Then('the screen "<screen>" is shown', async () => {
      expect(await screen.findByRole('heading', { name: String(row.screen), level: 1 })).toBeVisible();
    });
    When('he taps "<back>" on the tool\'s screen', async () => {
      await user.click(await screen.findByRole('button', { name: String(row.back) }));
    });
    Then('the Tools screen is shown', async () => {
      expect(await findToolsHeading()).toBeVisible();
    });
  });

  Scenario('The Settings pages no longer hold the tools, and the Settings search finds one and opens it', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with Logos on', () => openReader(true));
    When("he opens Settings from the reader's Menu", async () => {
      await openSettings(user);
    });
    Then('no Settings group page holds a row named "Words", "Review", "Paradigms" or "Your Logos library"', () => {
      // by key: the Daily page has a setting of its own named Review
      const keys = ROWS.map((r) => r.key);
      for (const key of ['link.words', 'link.review', 'link.paradigms', 'link.lists', 'link.memorize', 'library']) expect(keys, key).not.toContain(key);
    });
    When('he searches Settings for {string}', async (_, query: string) => {
      await user.type(await screen.findByRole('searchbox', { name: 'Search settings' }), query);
    });
    Then('the search lists {string} in Tools', async (_, name: string) => {
      const found = within(await screen.findByRole('list', { name: 'Matching tools' }));
      const button = found.getByRole('button', { name: new RegExp(`^${name}`) });
      expect(button).toHaveTextContent('in Tools');
    });
    When('he opens the found tool {string}', async (_, name: string) => {
      await user.click(within(await screen.findByRole('list', { name: 'Matching tools' })).getByRole('button', { name: new RegExp(`^${name}`) }));
    });
    Then('the screen {string} is shown', async (_, name: string) => {
      expect(await screen.findByRole('heading', { name, level: 1 })).toBeVisible();
    });
  });
});
