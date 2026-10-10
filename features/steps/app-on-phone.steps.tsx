// features/steps/app-on-phone.steps.tsx — runs features/app-on-phone.feature: turning a study app On in Settings opens nothing and checks
// nothing; the row offers Get <App>. Nothing here stubs the browser's own opening: a hidden-link click, window.open or a navigation is recorded.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126 Mobile Safari/537.36';

/** every address the page tried to go to: a clicked link (the hidden one Settings used to probe with included) or window.open */
let opened: string[] = [];
let openSpy: ReturnType<typeof vi.spyOn> | null = null;

const recordClick = (e: MouseEvent): void => {
  const a = (e.target as Element | null)?.closest?.('a[href]');
  if (a) {
    opened.push(a.getAttribute('href') ?? '');
    e.preventDefault();
  }
};

afterAll(() => {
  document.removeEventListener('click', recordClick, true);
  openSpy?.mockRestore();
  vi.useRealTimers();
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

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
  opened = [];
  Object.defineProperty(window.navigator, 'userAgent', { value: agent, configurable: true });
  openSpy?.mockRestore();
  openSpy = vi.spyOn(window, 'open').mockImplementation((url) => {
    opened.push(String(url));
    return null;
  });
  document.removeEventListener('click', recordClick, true);
  document.addEventListener('click', recordClick, true);
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

const feature = await loadFeature('features/app-on-phone.feature');

describeFeature(feature, ({ Scenario }) => {
  const android = (): Promise<void> => openSettings(ANDROID);
  const androidWithAccordance = (): Promise<void> => openSettings(ANDROID, ['accordance']);
  const turnsOn = async (_: unknown, name: string): Promise<void> => {
    await user.click(await switchOf(name));
  };
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
  const hasNoText = (_: unknown, part: string): void => {
    expect(document.body.textContent ?? '').not.toContain(part);
  };
  const hasLink = async (_: unknown, name: string): Promise<void> => {
    expect(await screen.findByRole('link', { name })).toBeInTheDocument();
  };
  const hasNoLink = (_: unknown, name: string): void => {
    expect(screen.queryByRole('link', { name })).toBeNull();
  };
  const heldAs = async (_: unknown, key: string, value: string): Promise<void> => {
    await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
  };
  const openedNothing = (): void => {
    expect(opened).toEqual([]);
    expect(openSpy).not.toHaveBeenCalled();
  };

  Scenario('Turning Logos On opens nothing and offers Get Logos', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone', android);
    When('he turns the switch {string} On', turnsOn);
    Then('nothing was opened: no navigation, no window.open and no app address', openedNothing);
    And('the switch {string} is On', isSwitch('On'));
    And('Settings has the group {string}', async (_, name: string) => {
      expect(await screen.findByRole('group', { name })).toBeInTheDocument();
    });
    And('Settings says {string}', says);
    And('Settings has a link {string}', hasLink);
  });

  Scenario('Accordance On offers Get Accordance on Google Play and stays On', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone', android);
    When('he turns the switch {string} On', async (_, name: string) => {
      const control = await switchOf(name);
      // the page's own clock, under the test's hand, from the tap on
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
      act(() => {
        fireEvent.click(control);
      });
    });
    And('{int} seconds pass', async (_, seconds: number) => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(seconds * 1000);
      });
      vi.useRealTimers();
    });
    Then('the switch {string} is On', isSwitch('On'));
    And('Settings says {string}', says);
    And('the link {string} goes to {string}', async (_, name: string, href: string) => {
      expect(await screen.findByRole('link', { name })).toHaveAttribute('href', href);
    });
    And('the setting {string} holds {string}', heldAs);
    And('nothing was opened: no navigation, no window.open and no app address', openedNothing);
  });

  Scenario('Turning an app Off hides its details and says nothing about looking for it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone with Accordance on', androidWithAccordance);
    When('he turns the switch {string} Off', turnsOn);
    Then('the switch {string} is Off', isSwitch('Off'));
    And('Settings has no link {string}', hasNoLink);
    And('Settings does not say {string}', doesNotSay);
    And('Settings also does not say {string}', doesNotSay);
    And('Settings has no text with {string}', hasNoText);
    And('nothing was opened: no navigation, no window.open and no app address', openedNothing);
  });

  Scenario('Settings never says it is looking for an app or that it found one', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone', android);
    When('he turns the switch {string} On', turnsOn);
    And('he also turns the switch {string} On', turnsOn);
    Then('Settings has no text with {string}', hasNoText);
    And('Settings has no text with {string} either', hasNoText);
  });

  Scenario("Strong's needs no app, so it offers no Get link", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone', android);
    When('he turns the switch {string} On', turnsOn);
    Then('the switch {string} is On', isSwitch('On'));
    And('Settings has no link {string}', hasNoLink);
    And('nothing was opened: no navigation, no window.open and no app address', openedNothing);
  });

  Scenario("The word sheet's Study lists only the resources that are On", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Settings and the phone is an Android phone', android);
    When('he turns the switch {string} On', turnsOn);
    And('he goes back to the reader', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    And('he taps the word {string} in verse {int}', async (_, text: string, verse: number) => {
      await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
      // The sheet mounts before its study resources are read (a liveQuery answers later, later still on a loaded host): wait for the Study row
      // (same race as mw-5r3p30.135).
      await within(await screen.findByRole('dialog', { name: 'Word' })).findByRole('group', { name: 'Study' });
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
