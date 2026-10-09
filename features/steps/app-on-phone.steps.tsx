// features/steps/app-on-phone.steps.tsx — runs features/app-on-phone.feature: Settings opens an app once when he turns it On
// (Logos, Accordance) and keeps it On only when the page went away; otherwise it goes back Off and offers Install there.
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
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

let timers: (() => void)[] = [];
let leavers: (() => void)[] = [];
let returners: (() => void)[] = [];
let launched: string[] = [];

// The scenario's steps are tests of their own, so the stubs live until the file ends rather than until each step does.
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

/** The phone's UA, and the page's clock, exits, returns and launches under the test's hand: nothing waits for real time. */
function stubPhone(agent: string): void {
  timers = [];
  leavers = [];
  returners = [];
  launched = [];
  Object.defineProperty(window.navigator, 'userAgent', { value: agent, configurable: true });
  browserEnv.after = (fn) => registered(timers, fn, (n) => (timers = n));
  browserEnv.onAway = (fn) => registered(leavers, fn, (n) => (leavers = n));
  browserEnv.onReturn = (fn) => registered(returners, fn, (n) => (returners = n));
  browserEnv.launch = (url) => void launched.push(url);
  browserEnv.open = () => {};
}

async function openSettings(agent: string, ons: string[] = []): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  for (const id of ons) await db.settings.put({ key: `resource.${id}`, value: 'on' });
  stubPhone(agent);
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
}

const switchOf = (name: string): Promise<HTMLElement> => screen.findByRole('switch', { name });
const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const run = (list: (() => void)[]): void => {
  act(() => {
    for (const fn of [...list]) fn();
  });
};

const feature = await loadFeature('features/app-on-phone.feature');

describeFeature(feature, ({ Scenario }) => {
  const android = (): Promise<void> => openSettings(ANDROID);
  const turnsOn = async (_: unknown, name: string): Promise<void> => {
    await user.click(await switchOf(name));
  };
  const waits = (): void => run(timers);
  const leaves = (): void => run(leavers);
  const isSwitch = (state: 'On' | 'Off') => async (_: unknown, name: string): Promise<void> => {
    const control = await switchOf(name);
    await waitFor(() => expect(control).toHaveAttribute('aria-checked', state === 'On' ? 'true' : 'false'));
  };
  const says = async (_: unknown, text: string): Promise<void> => {
    expect(await screen.findByText(text)).toBeInTheDocument();
  };
  const doesNotSay = (_: unknown, text: string): void => {
    expect(screen.queryByText(text)).toBeNull();
  };
  const heldAs = async (_: unknown, key: string, value: string): Promise<void> => {
    await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
  };
  const installLink = (store: string, pattern: RegExp | string) => async (_: unknown, name: string): Promise<void> => {
    const href = (await screen.findByRole('link', { name })).getAttribute('href') ?? '';
    if (typeof pattern === 'string') expect(href, store).toBe(pattern);
    else expect(href, store).toMatch(pattern);
  };

  Scenario('Accordance is not on the phone, so the switch goes back Off and Install is offered', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone', android);
    When('he turns the switch {string} On', turnsOn);
    And('the page stays in front for the wait', waits);
    Then('the switch {string} is Off', isSwitch('Off'));
    And('Settings says {string}', says);
    And('Settings has an {string} link to the Play Store', installLink('Play Store', /^https:\/\/play\.google\.com\/store\/search\?q=Accordance/));
    And('the setting {string} holds {string}', heldAs);
  });

  Scenario('On an iPhone Install Accordance goes to the App Store', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Settings and the phone is an iPhone', () => openSettings(IPHONE));
    When('he turns the switch {string} On', turnsOn);
    And('the page stays in front for the wait', waits);
    Then(
      'Settings has an {string} link to the App Store',
      installLink('App Store', 'itms-apps://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&q=Accordance'),
    );
  });

  Scenario('Accordance is on the phone, so the switch stays On and the return says it was found', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone', android);
    When('he turns the switch {string} On', turnsOn);
    And('the app takes the page away', leaves);
    And('he comes back to Lampas', () => run(returners));
    And('the page stays in front for the wait', waits);
    Then('the switch {string} is On', isSwitch('On'));
    And('Settings says {string}', says);
    And('Settings does not say {string}', doesNotSay);
    And('the setting {string} holds {string}', heldAs);
  });

  Scenario('Turning on Logos opens the app once, by its own scheme', ({ Given, When, Then }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone', android);
    When('he turns the switch {string} On', turnsOn);
    Then('the app was asked to open with an address that starts {string}', (_, start: string) => {
      expect(launched).toHaveLength(1);
      expect(launched[0].startsWith(start)).toBe(true);
    });
  });

  Scenario("Strong's needs no app, so it is not checked", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone', android);
    When('he turns the switch {string} On', turnsOn);
    Then('no app was asked to open', () => expect(launched).toEqual([]));
    And('the switch {string} is On', isSwitch('On'));
  });

  Scenario('Turning an app Off is not checked', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone with Accordance on', () => openSettings(ANDROID, ['accordance']));
    When('he turns the switch {string} Off', turnsOn);
    Then('no app was asked to open', () => expect(launched).toEqual([]));
    And('the switch {string} is Off', isSwitch('Off'));
  });

  Scenario("The word sheet's Study lists only the resources that are On", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone', android);
    When('he turns the switch {string} On', turnsOn);
    And('the app takes the page away', leaves);
    And('he goes back to the reader', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    And('he taps the word {string} in verse {int}', async (_, text: string, verse: number) => {
      await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
      await screen.findByRole('dialog', { name: 'Word' });
    });
    Then('the Study group {string} is listed', async (_, group: string) => {
      const row = within(screen.getByRole('dialog', { name: 'Word' })).getByRole('group', { name: 'Study' });
      expect(await within(row).findByRole('group', { name: group })).toBeInTheDocument();
    });
    And('the Study group {string} is not listed', (_, group: string) => {
      const row = within(screen.getByRole('dialog', { name: 'Word' })).getByRole('group', { name: 'Study' });
      expect(within(row).queryByRole('group', { name: group })).toBeNull();
    });
  });
});
