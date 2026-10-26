// features/steps/maps-settings.steps.tsx — runs features/maps-settings.feature: the Maps section of Settings > Study resources (src/settings/controls/maps.tsx): one On/Off row per map source.
// The registry of sources is Bible Mapper's and a second source of the tests' own that needs Logos, put in SOURCES by the mock below (the settings are made from SOURCES when the app loads).
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

vi.mock('../../src/maps/sources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/maps/sources')>();
  const [bibleMapper] = actual.SOURCES;
  return { ...actual, SOURCES: [bibleMapper, { ...bibleMapper, id: 'testlogos', name: 'Test Logos Atlas', describe: 'An atlas of the tests’ own that rides on Logos.', needs: 'logos' as const }] };
});

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

const user = userEvent.setup();

async function openStudy(logos: 'on' | 'off'): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear()]);
  await db.settings.put({ key: 'resource.logos', value: logos });
  window.history.replaceState(null, '', '/#/settings?group=study');
  stubChapterFetch();
  render(<App />);
  await screen.findByRole('region', { name: 'Study resources' });
}

const mapsSection = async (): Promise<HTMLElement> => waitFor(() => {
  const section = document.querySelector<HTMLElement>('[data-section="maps"]');
  if (!section) throw new Error('no Maps section');
  return section;
});
const switchOf = async (name: string) => within(await mapsSection()).findByRole('group', { name });
const pressed = async (name: string): Promise<string[]> => {
  const group = await switchOf(name);
  return within(group)
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent ?? '');
};

const feature = await loadFeature('features/maps-settings.feature');

describeFeature(feature, ({ Scenario }) => {
  const openedWith = (logos: 'on' | 'off') => () => openStudy(logos);
  const shows = async (_: unknown, name: string, value: 'On' | 'Off') => {
    await waitFor(async () => expect(await pressed(name)).toEqual([value]));
  };

  Scenario('The Maps section shows Bible Mapper On', ({ Given, Then }) => {
    Given('Settings is open at Study resources with Logos Off', openedWith('off'));
    Then('the Maps section shows {string} On', (_, name: string) => shows(_, name, 'On'));
  });

  Scenario('Turning Bible Mapper Off is kept', ({ Given, When, Then, And }) => {
    Given('Settings is open at Study resources with Logos Off', openedWith('off'));
    When('he turns {string} Off in the Maps section', async (_, name: string) => {
      await user.click(within(await switchOf(name)).getByRole('button', { name: 'Off' }));
    });
    Then('the Maps section shows {string} Off', (_, name: string) => shows(_, name, 'Off'));
    And('the setting {string} is kept as {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
    });
  });

  Scenario('A source that needs Logos has no row while Logos is Off', ({ Given, Then }) => {
    Given('Settings is open at Study resources with Logos Off', openedWith('off'));
    Then('the Maps section has no row {string}', async (_, name: string) => {
      await pressed('Bible Mapper');
      expect(within(await mapsSection()).queryByRole('group', { name })).toBeNull();
    });
  });

  Scenario('A source that needs Logos has its row once Logos is On', ({ Given, Then }) => {
    Given('Settings is open at Study resources with Logos On', openedWith('on'));
    Then('the Maps section shows {string} On', (_, name: string) => shows(_, name, 'On'));
  });
});
