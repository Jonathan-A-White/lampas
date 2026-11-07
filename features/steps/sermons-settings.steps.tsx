// features/steps/sermons-settings.steps.tsx — runs features/sermons-settings.feature: the Sermons section of Settings > Study resources (src/settings/controls/sermons.tsx): one On/Off row per sermon source,
// and the Sermons door that follows the switches (src/sermons/useSermons.ts). The registry of sources is three of the tests' own (tests/support/sermon-sources.ts), put in SOURCES by the mock below (the
// settings are made from SOURCES when the app loads); the third needs Logos.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { closeSermons } from '../../src/sermons/openSermons';
import { writeSetting } from '../../src/settings/registry';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { forgetTestMaps, registerTestMaps } from '../../tests/support/test-maps';
import { forgetTestThemes, registerTestThemes } from '../../tests/support/test-themes';

vi.mock('../../src/sermons/sources', async () => {
  const { logosSource, secondSource, testSource } = await import('../../tests/support/sermon-sources');
  return { SOURCES: [testSource, secondSource, logosSource] };
});

afterAll(() => {
  cleanup();
  closeSermons();
  forgetTestThemes();
  forgetTestMaps();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

async function reset(): Promise<void> {
  cleanup();
  closeSermons();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  registerTestMaps();
  // these scenarios are about the sermons of the passage: the theme lists are none
  registerTestThemes({ none: true });
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.library.clear()]);
}

async function openStudy(logos: 'on' | 'off'): Promise<void> {
  await reset();
  await db.settings.put({ key: 'resource.logos', value: logos });
  window.history.replaceState(null, '', '/#/settings?group=study');
  render(<App />);
  await screen.findByRole('region', { name: 'Study resources' });
}

async function openOn(title: string): Promise<void> {
  await reset();
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const sermonsSection = async (): Promise<HTMLElement> =>
  waitFor(() => {
    const section = document.querySelector<HTMLElement>('[data-section="sermons"]');
    if (!section) throw new Error('no Sermons section');
    return section;
  });
const switchOf = async (name: string) => within(await sermonsSection()).findByRole('group', { name });
const pressed = async (name: string): Promise<string[]> =>
  within(await switchOf(name))
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent ?? '');
const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const doorsIn = (box: HTMLElement): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('button')].filter((b) => /^Sermons\b/.test(squash(b.textContent)));

const feature = await loadFeature('features/sermons-settings.feature');

describeFeature(feature, ({ Scenario }) => {
  const openedWith = (logos: 'on' | 'off') => () => openStudy(logos);
  const shows = async (_: unknown, name: string, value: 'On' | 'Off') => {
    await waitFor(async () => expect(await pressed(name)).toEqual([value]));
  };
  const turnOff = async (_: unknown, name: string) => {
    await user.click(within(await switchOf(name)).getByRole('button', { name: 'Off' }));
  };
  const keptAs = async (_: unknown, key: string, value: string) => {
    await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
  };
  const viewHas = async (_: unknown, label: string) => {
    expect(await within(viewEl()).findByRole('button', { name: label })).toBeVisible();
  };
  const turnOffInSettings = async (_: unknown, name: string) => {
    await writeSetting(IDS[name] as 'sermons.testsecond', 'off');
  };
  const IDS: Record<string, string> = { 'Test Sermons': 'sermons.testsermons', 'Test Second Sermons': 'sermons.testsecond' };

  Scenario('The Sermons section shows each source On to start', ({ Given, Then, And }) => {
    Given('Settings is open at Study resources with Logos Off', openedWith('off'));
    Then('the Sermons section shows {string} On', (_, name: string) => shows(_, name, 'On'));
    And('it also holds a row {string} that is On', (_, name: string) => shows(_, name, 'On'));
  });

  Scenario('Turning a source Off is kept', ({ Given, When, Then, And }) => {
    Given('Settings is open at Study resources with Logos Off', openedWith('off'));
    When('he turns {string} Off in the Sermons section', turnOff);
    Then('the Sermons section shows {string} Off', (_, name: string) => shows(_, name, 'Off'));
    And('the setting {string} is kept as {string}', keptAs);
  });

  Scenario('A source that needs Logos has no row while Logos is Off', ({ Given, Then }) => {
    Given('Settings is open at Study resources with Logos Off', openedWith('off'));
    Then('the Sermons section has no row {string}', async (_, name: string) => {
      await pressed('Test Sermons');
      expect(within(await sermonsSection()).queryByRole('group', { name })).toBeNull();
    });
  });

  Scenario('A source that needs Logos has its row once Logos is On', ({ Given, Then }) => {
    Given('Settings is open at Study resources with Logos On', openedWith('on'));
    Then('the Sermons section shows {string} On', (_, name: string) => shows(_, name, 'On'));
  });

  Scenario("The Sermons door's count falls when a source goes Off", ({ Given, When, Then }) => {
    Given('Lampas is opened on {string}', (_, title: string) => openOn(title));
    When('he taps verse {int}', async (_, n: number) => {
      await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
      await screen.findByRole('region', { name: 'Verse view' });
    });
    Then('the Verse view has a button {string}', viewHas);
    When('{string} is turned Off in Settings', turnOffInSettings);
    Then('the door now reads {string}', viewHas);
    When('he also turns {string} Off in Settings', turnOffInSettings);
    Then('the Verse view has no Sermons door', async () => {
      await sleep(150);
      expect(doorsIn(viewEl())).toHaveLength(0);
    });
  });
});
