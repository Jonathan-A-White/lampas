// features/steps/devotionals-page.steps.tsx — runs features/devotionals-page.feature: Settings > Daily > Devotional sources (mw-r9xo1pj.4): one On | Off per source of devotionals, Which devotional listing and
// Random drawing only from the sources that are On, Tools gaining no door.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { MORNING_REPHIL_ID, RANDOM, devotionalForDay, tickedDevotionals } from '../../src/data/daily/devotionals';
import { devotionalDraw, setState, shelfOf } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { CATALOGUE } from '../../src/resources/catalogue';
import { readDrawSources } from '../../src/settings/devotionalSources';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { closeDatabase } from './close-database';
import { EVERY_BOOK_IDS, keepImport } from '../../tests/support/logos-import';

afterAll(async () => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  await closeDatabase();
});

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const list = (text: string): string[] => text.split(/,\s*/);

const book = (short: string) => {
  const entry = CATALOGUE.find((e) => e.short === short);
  if (!entry) throw new Error(`no book ${short} in the catalogue`);
  return entry;
};

/** A phone whose old keys say nothing is ticked, so the shelf takes nothing from them: an empty shelf, then `shorts` put On (features/steps/settings-library.steps.tsx does the same). */
async function shelfHolds(shorts: readonly string[], settings: Record<string, string>): Promise<void> {
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear()]);
  await keepImport(EVERY_BOOK_IDS);
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
    ...Object.entries(settings).map(([key, value]) => ({ key, value })),
  ]);
  await shelfOf();
  for (const short of shorts) expect(await setState(book(short).resource, 'on')).toEqual({ ok: true });
}

async function openAt(address: string): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/${address}`);
  stubChapterFetch();
  render(<App />);
}

const feature = await loadFeature('features/devotionals-page.feature');

describeFeature(feature, ({ Scenario }) => {
  const dailyWith = (logos: 'on' | 'off') => async (_: unknown, shelf: string) => {
    await shelfHolds(list(shelf), { devotional: RANDOM, 'resource.logos': logos });
    await openAt('#/settings?group=daily');
    await screen.findByRole('group', { name: 'Which devotional' });
    await screen.findByRole('group', { name: 'Brookfield First' });
  };
  const section = () => screen.findByRole('region', { name: 'Devotional sources' });
  const sourceNames = async () => within(await section()).getAllByRole('group').map((g) => g.getAttribute('aria-label') ?? '');
  const hasSources = async (_: unknown, names: string) => {
    await waitFor(async () => expect(await sourceNames()).toEqual(list(names)));
  };
  const picker = () => screen.findByRole('group', { name: 'Which devotional' });
  const offered = async () => (await within(await picker()).findAllByRole('radio')).map((r) => r.textContent?.replace('✓', '').trim() ?? '').sort();
  const picks = async (_: unknown, names: string) => {
    await waitFor(async () => expect(await offered()).toEqual(list(names).sort()));
  };
  const turns = (value: 'On' | 'Off') => async (_: unknown, name: string) => {
    await user.click(within(await screen.findByRole('group', { name })).getByRole('button', { name: value }));
    await waitFor(() => expect(within(screen.getByRole('group', { name })).getByRole('button', { name: value })).toHaveAttribute('aria-pressed', 'true'));
  };
  const isOn = async (_: unknown, name: string, says: string) => {
    expect(within(await screen.findByRole('group', { name })).getByRole('button', { name: 'On' })).toHaveAttribute('aria-pressed', 'true');
    const row = (await screen.findByRole('group', { name })).closest('[data-setting]') as HTMLElement;
    expect(row).toHaveTextContent(says);
  };
  /** the ids Random draws over a year of days, by the app's own readers of the draw and its sources */
  const yearOfDraws = async (): Promise<string[]> => {
    const [sources, draw] = await Promise.all([readDrawSources(), devotionalDraw()]);
    const ticked = tickedDevotionals(draw);
    return Array.from({ length: 400 }, (_, i) => devotionalForDay(RANDOM, ticked, new Date(2026, 0, 1 + i), undefined, true, sources).id);
  };

  Scenario('The section lists both sources', ({ Given, Then, And }) => {
    Given('the shelf holds the devotionals {string} and Settings > Daily is open with Logos On', dailyWith('on'));
    Then('the "Devotional sources" section has the sources {string}', hasSources);
    And('{string} is On and says {string}', isOn);
    And('the source {string} is On and says {string}', isOn);
  });

  Scenario('Turning Morning RePhil Off takes it out of the picker and the draw', ({ Given, When, Then, And }) => {
    Given('the shelf holds the devotionals {string} and Settings > Daily is open with Logos On', dailyWith('on'));
    When('he turns {string} Off', turns('Off'));
    Then('the Which devotional picker offers {string}', picks);
    And('Random never draws Morning RePhil in a year of days', async () => {
      const drawn = await yearOfDraws();
      expect(drawn).not.toContain(MORNING_REPHIL_ID);
      expect(drawn.length).toBe(400);
    });
  });

  Scenario('Turning Logos devotionals Off leaves only Morning RePhil', ({ Given, When, Then, And }) => {
    Given('the shelf holds the devotionals {string} and Settings > Daily is open with Logos On', dailyWith('on'));
    When('he turns {string} Off', turns('Off'));
    Then('the Which devotional picker offers {string}', picks);
    And('Random never draws a Logos devotional in a year of days', async () => {
      expect(new Set(await yearOfDraws())).toEqual(new Set([MORNING_REPHIL_ID]));
    });
    And('Random draws Morning RePhil on some day of a year', async () => {
      expect(await yearOfDraws()).toContain(MORNING_REPHIL_ID);
    });
  });

  Scenario('With Logos Off the Logos devotionals row is not shown and none is drawn', ({ Given, Then, And }) => {
    Given('the shelf holds the devotionals {string} and Settings > Daily is open with Logos Off', dailyWith('off'));
    Then('the "Devotional sources" section has the sources {string}', hasSources);
    And('Random never draws a Logos devotional in a year of days', async () => {
      expect(new Set(await yearOfDraws())).toEqual(new Set([MORNING_REPHIL_ID]));
    });
  });

  Scenario('Tools has no Devotionals door', ({ Given, Then }) => {
    Given('the shelf holds the devotionals {string} and Tools is open with Logos On', async (_: unknown, shelf: string) => {
      await shelfHolds(list(shelf), { 'resource.logos': 'on' });
      await openAt('#/tools');
      await screen.findByRole('list', { name: 'Tools' });
    });
    Then('Tools has no door {string}', async (_: unknown, name: string) => {
      const tools = await screen.findByRole('list', { name: 'Tools' });
      expect(within(tools).queryByRole('button', { name: new RegExp(`^${name}`) })).toBeNull();
    });
  });
});
