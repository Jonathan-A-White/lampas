// features/steps/settings-details.steps.tsx — runs features/settings-details.feature: Settings shows a setting's details only while it is on.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { browserEnv } from '../../src/resources/openApp';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36';

let timers: (() => void)[] = [];
let leavers: (() => void)[] = [];
let returners: (() => void)[] = [];

const real = { ...browserEnv };

afterAll(() => {
  Object.assign(browserEnv, real);
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const registered = (list: (() => void)[], fn: () => void, set: (next: (() => void)[]) => void): (() => void) => {
  list.push(fn);
  return () => set(list.filter((x) => x !== fn));
};

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
  timers = [];
  leavers = [];
  returners = [];
  Object.defineProperty(window.navigator, 'userAgent', { value: ANDROID, configurable: true });
  browserEnv.after = (fn) => registered(timers, fn, (n) => (timers = n));
  browserEnv.onAway = (fn) => registered(leavers, fn, (n) => (leavers = n));
  browserEnv.onReturn = (fn) => registered(returners, fn, (n) => (returners = n));
  browserEnv.launch = () => {};
  browserEnv.open = () => {};
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
}

const run = (list: (() => void)[]): void => {
  act(() => {
    for (const fn of [...list]) fn();
  });
};
const switchOf = (name: string): Promise<HTMLElement> => screen.findByRole('switch', { name });
const settled = async (): Promise<void> => {
  // the screen draws its groups from live queries: wait for the last section before claiming something is absent
  await screen.findByRole('heading', { name: 'More', level: 2 });
  await screen.findByRole('group', { name: 'New words a day' });
  await screen.findByRole('group', { name: 'Weave' });
  await screen.findByRole('group', { name: 'Tips' });
};
const noGroup = (name: string): void => expect(screen.queryByRole('group', { name })).toBeNull();

const feature = await loadFeature('features/settings-details.feature');

describeFeature(feature, ({ Scenario }) => {
  const turnsOn = async (_: unknown, name: string): Promise<void> => {
    await user.click(await switchOf(name));
  };
  const openNothing = (): Promise<void> => openSettings();
  const heldAs = async (_: unknown, key: string, value: string): Promise<void> => {
    await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
  };
  const says = async (_: unknown, text: string): Promise<void> => {
    expect(await screen.findByText(text)).toBeInTheDocument();
  };
  const doesNotSay = async (_: unknown, text: string): Promise<void> => {
    await settled();
    expect(screen.queryByText(text)).toBeNull();
  };
  const noField = async (_: unknown, label: string): Promise<void> => {
    await settled();
    expect(screen.queryByLabelText(label)).toBeNull();
  };
  const field = async (_: unknown, label: string, value: string): Promise<void> => {
    expect(await screen.findByLabelText(label)).toHaveValue(value);
  };
  const noLink = async (_: unknown, name: string): Promise<void> => {
    await settled();
    expect(screen.queryByRole('link', { name })).toBeNull();
  };
  const tapsUnder = async (_: unknown, chip: string, group: string): Promise<void> => {
    await user.click(within(await screen.findByRole('group', { name: group })).getByRole('button', { name: chip }));
  };

  Scenario('Accordance Off is its row and nothing else', ({ Given, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    Then('Settings shows the switch {string} Off with its help {string}', async (_, name: string, help: string) => {
      await waitFor(async () => expect(await switchOf(name)).toHaveAttribute('aria-checked', 'false'));
      expect(screen.getByText(help)).toBeInTheDocument();
    });
    And('Settings has no field {string}', noField);
    And('Settings does not say {string}', doesNotSay);
    And('Settings has no link {string}', noLink);
  });

  Scenario('Turning Accordance On shows its details and Off hides them, keeping what was typed', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with Accordance On and the Accordance resource {string}', async (_, typed: string) => {
      await openSettings({ 'resource.accordance': 'on', 'resourceOption.accordance': typed });
    });
    Then('Settings has a field {string} holding {string}', field);
    When('he turns the switch {string} Off', turnsOn);
    Then('Settings has no field {string}', noField);
    And('the setting {string} holds {string}', heldAs);
    When('he turns the switch {string} On', turnsOn);
    And('the app takes the page away', () => run(leavers));
    And('he comes back to Lampas', () => run(returners));
    Then('Settings again has a field {string} holding {string}', field);
    And('Settings says {string}', says);
  });

  Scenario('An app that is not on the phone leaves its switch Off with no details', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he turns the switch {string} On', turnsOn);
    And('the page stays in front for the wait', () => run(timers));
    Then('Settings shows the switch {string} Off with its help {string}', async (_, name: string, help: string) => {
      await waitFor(async () => expect(await switchOf(name)).toHaveAttribute('aria-checked', 'false'));
      expect(screen.getByText(help)).toBeInTheDocument();
    });
    And('Settings has no field {string}', noField);
    And('Settings does not say {string}', doesNotSay);
    And('Settings has no link {string}', noLink);
  });

  Scenario('Bible in Logos is shown only while Logos is On', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    Then('Settings has no section {string}', async (_, name: string) => {
      await settled();
      expect(screen.queryByRole('heading', { name })).toBeNull();
      noGroup(name);
    });
    When('he turns the switch {string} On', turnsOn);
    And('the app takes the page away', () => run(leavers));
    Then('Settings has the section {string}', async (_, name: string) => {
      expect(await screen.findByRole('heading', { name, level: 2 })).toBeInTheDocument();
      expect(await screen.findByRole('group', { name })).toBeInTheDocument();
    });
    When('he turns the switch {string} Off', turnsOn);
    Then('Settings no longer has the section {string}', async (_, name: string) => {
      await waitFor(() => expect(screen.queryByRole('heading', { name })).toBeNull());
      noGroup(name);
    });
  });

  Scenario("The Weave's Grammar row is shown only while the Weave is not Off", ({ Given, When, Then }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    Then('Settings has the group {string} and no group {string}', async (_, shown: string, hidden: string) => {
      await settled();
      await waitFor(() => noGroup(hidden));
      expect(screen.getByRole('group', { name: shown })).toBeInTheDocument();
    });
    When('he taps {string} under {string}', tapsUnder);
    Then('Settings has the group {string}', async (_, name: string) => {
      expect(await screen.findByRole('group', { name })).toBeInTheDocument();
    });
    When('he sets {string} back to {string}', async (_, group: string, chip: string) => tapsUnder(_, chip, group));
    Then('Settings is back to the group {string} and no group {string}', async (_, shown: string, hidden: string) => {
      await waitFor(() => noGroup(hidden));
      expect(screen.getByRole('group', { name: shown })).toBeInTheDocument();
    });
  });

  Scenario('New words at and Move it are shown only while New words a day is not Off', ({ Given, When, Then }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    Then('Settings has the groups {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      for (const name of [a, b, c]) expect(await screen.findByRole('group', { name })).toBeInTheDocument();
    });
    When('he taps {string} under {string}', tapsUnder);
    Then('Settings has the group {string} and no group {string} or {string}', async (_, shown: string, a: string, b: string) => {
      await waitFor(() => noGroup(a));
      noGroup(b);
      expect(screen.getByRole('group', { name: shown })).toBeInTheDocument();
    });
    When('he sets {string} back to {string}', async (_, group: string, chip: string) => tapsUnder(_, chip, group));
    Then('Settings shows the groups {string}, {string} and {string} again', async (_, a: string, b: string, c: string) => {
      for (const name of [a, b, c]) expect(await screen.findByRole('group', { name })).toBeInTheDocument();
    });
  });
});
