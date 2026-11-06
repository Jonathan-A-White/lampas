// features/steps/settings-library.steps.tsx — runs features/settings-library.feature: Settings after the library (mw-rfjjzd.5): the Your Logos library row, Bible in Logos opening Library > Bibles,
// Daily's devotional picker and In the draw reading the shelf, and the Settings search finding a book by its title.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setState, shelfOf } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { libraryOf } from '../../src/nav/route';
import { CATALOGUE } from '../../src/resources/catalogue';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
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

/** A phone whose old keys all say nothing is ticked, so the shelf takes nothing from them: an empty shelf, then `shorts` put On. `settings` are kept beside. */
async function shelfHolds(shorts: readonly string[], settings: Record<string, string> = {}): Promise<void> {
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear()]);
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

const kept = async (key: string): Promise<unknown> => (await db.settings.get(key))?.value;
const region = () => screen.findByRole('region', { name: 'Study resources' });

const feature = await loadFeature('features/settings-library.feature');

describeFeature(feature, ({ Scenario }) => {
  const studyWith = (logos: 'on' | 'off') => async (_: unknown, shelf: string) => {
    await shelfHolds(list(shelf), { 'resource.logos': logos });
    await openAt('#/settings?group=study');
    await region();
  };
  const rowButton = (name: string) => screen.findByRole('button', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) });
  const tapsRow = async (_: unknown, name: string) => {
    await user.click(await rowButton(name));
  };
  const libraryHome = async () => {
    expect(await screen.findByRole('heading', { name: 'Your Logos library', level: 1 })).toBeInTheDocument();
  };
  const dailyWith = async (_: unknown, shelf: string) => {
    await shelfHolds(list(shelf), { devotional: 'random', 'resource.logos': 'on' });
    await openAt('#/settings?group=daily');
    await screen.findByRole('group', { name: 'Which devotional' });
  };
  const picker = () => screen.findByRole('group', { name: 'Which devotional' });
  const offered = async () => (await within(await picker()).findAllByRole('radio')).map((r) => r.textContent?.replace('✓', '').trim() ?? '').sort();

  const homeWith = async (_: unknown, shelf: string) => {
    await shelfHolds(list(shelf), { 'resource.logos': 'on' });
    await openAt('#/settings');
    await screen.findByRole('searchbox', { name: 'Search settings' });
  };

  Scenario('The Settings home has no Your Logos library row; Which languages? is first', ({ Given, Then, And }) => {
    Given('the shelf holds the books {string} and Settings is open at its home', homeWith);
    Then('the first row under the search field is {string}', async (_, label: string) => {
      const first = await waitFor(() => {
        const el = (document.querySelector('main') as HTMLElement).querySelector<HTMLElement>('[data-setting]');
        expect(el).not.toBeNull();
        return el as HTMLElement;
      });
      expect(first.dataset.setting).toBe('languages');
      expect(first).toHaveTextContent(label);
    });
    And('the Settings home shows no row {string}', async (_, name: string) => {
      await screen.findByRole('list', { name: 'Settings groups' });
      expect(document.querySelector('[data-setting="library"]')).toBeNull();
      expect(screen.queryByRole('button', { name: new RegExp(`^${name}`) })).toBeNull();
    });
  });

  const toolsWithLogos = async (_: unknown, shelf: string) => {
    await shelfHolds(list(shelf), { 'resource.logos': 'on' });
    await openAt('#/tools');
    await screen.findByRole('list', { name: 'Tools' });
  };
  const toolDoor = async (name: string) => within(await screen.findByRole('list', { name: 'Tools' })).findByRole('button', { name: new RegExp(`^${name}`) });
  const doorSays = async (_: unknown, name: string, says: string) => {
    await waitFor(async () => expect(await toolDoor(name)).toHaveTextContent(says));
  };

  Scenario('With Logos On, Tools lists Your Logos library with its count and opens the Library', ({ Given, Then, When }) => {
    Given('the shelf holds the books {string} and Tools is open with Logos On', toolsWithLogos);
    Then('the Tools door {string} says {string}', doorSays);
    When('he taps the Tools door {string}', async (_, name: string) => {
      await user.click(await toolDoor(name));
    });
    Then('the Library home opens', libraryHome);
  });

  Scenario('The count follows the shelf', ({ Given, Then }) => {
    Given('the shelf holds the books {string} and Tools is open with Logos On', toolsWithLogos);
    Then('the Tools door {string} says {string}', doorSays);
  });

  Scenario('With Logos Off, Study resources show nothing of Logos under the switch', ({ Given, Then, And }) => {
    Given('the shelf holds the books {string} and Settings is open at Study resources with Logos Off', studyWith('off'));
    Then('Study resources show no Your Logos library row and no Bible in Logos', async () => {
      const section = await region();
      await waitFor(() => expect(within(section).getByRole('switch', { name: 'Logos' })).toHaveAttribute('aria-checked', 'false'));
      expect(document.querySelector('[data-setting="library"]')).toBeNull();
      expect(document.querySelector('[data-under-logos]')).toBeNull();
      expect(within(section).queryByRole('button', { name: /^Your Logos library/ })).toBeNull();
      expect(within(section).queryByText(/Bible in Logos/)).toBeNull();
      for (const key of ['logosBible', 'logosBibleOt', 'logosBibleApocrypha']) expect(document.querySelector(`[data-setting="${key}"]`)).toBeNull();
    });
    And('the Settings search for {string} shows no book of the library', async (_, text: string) => {
      await openAt('#/settings');
      await user.type(await screen.findByRole('searchbox', { name: 'Search settings' }), text);
      await waitFor(() => expect(screen.getByRole('searchbox', { name: 'Search settings' })).toHaveValue(text));
      expect(screen.queryByRole('list', { name: 'Matching books' })).toBeNull();
      expect(screen.queryByRole('button', { name: /BDAG/ })).toBeNull();
    });
  });

  Scenario('The Study resources group hint names the library', ({ Given, Then }) => {
    Given('the shelf holds the books {string} and Settings is open at its home', homeWith);
    Then('the Study resources group hint is {string}', async (_, hint: string) => {
      const groups = await screen.findByRole('list', { name: 'Settings groups' });
      expect(within(groups).getByRole('button', { name: /^Study resources/ })).toHaveTextContent(hint);
    });
  });

  Scenario('An old link to the library setting opens the Library', ({ Given, When, Then }) => {
    Given('the shelf holds the books {string} and Settings is open at its home', homeWith);
    When('the old address {string} is opened', async (_, address: string) => {
      await act(async () => {
        window.location.hash = address;
      });
    });
    Then('the Library home opens', libraryHome);
  });

  Scenario('The Settings search finds Your Logos library in Tools', ({ Given, When, Then }) => {
    Given('the shelf holds the books {string} and Settings is open at its home', homeWith);
    When('he searches Settings for {string}', async (_, text: string) => {
      await user.type(await screen.findByRole('searchbox', { name: 'Search settings' }), text);
    });
    Then('the search answers the row {string} under {string}', async (_, title: string, group: string) => {
      const answer = await screen.findByRole('button', { name: new RegExp(`^${title}`) });
      expect(answer).toHaveTextContent(group);
    });
    When('he taps the answer {string}', async (_, title: string) => {
      await user.click(await screen.findByRole('button', { name: new RegExp(`^${title}`) }));
    });
    Then('the Library home opens', libraryHome);
  });

  Scenario('Bible in Logos opens Library > Bibles, where the Resource ID can be typed', ({ Given, When, Then, And }) => {
    Given('the shelf holds the books {string} and Settings is open at Study resources with Logos On', studyWith('on'));
    When('he taps the row {string}', tapsRow);
    Then('the Library opens at Bibles', async () => {
      expect(await screen.findByRole('heading', { name: 'Bibles', level: 1 })).toBeInTheDocument();
      expect(libraryOf(window.location.hash)).toEqual({ kind: 'bible' });
    });
    When('he types the Resource ID {string} on the Bibles page', async (_, id: string) => {
      const field = await screen.findByRole('textbox', { name: 'Resource ID' });
      await user.clear(field);
      await user.type(field, id);
    });
    Then('the setting {string} holds nothing', async (_, key: string) => {
      expect(await kept(key)).toBeUndefined();
    });
    When('he sets the typed Resource ID for {string}', async (_, part: string) => {
      await user.click(within(await screen.findByRole('group', { name: /^Set LLS:/ })).getByRole('button', { name: part }));
    });
    Then('the setting {string} holds {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect(await kept(key)).toBe(value));
    });
    And('the New Testament key {string} still holds {string}', async (_, key: string, value: string) => {
      expect(await kept(key)).toBe(value);
    });
  });

  Scenario('Choosing a Bible in the Library sets the part he names, as Settings does', ({ Given, When, And, Then }) => {
    Given('the shelf holds the books {string} and Settings is open at Study resources with Logos On', studyWith('on'));
    When('he taps the row {string}', tapsRow);
    And('he chooses the Bible {string} for {string} on the Bibles page', async (_, short: string, part: string) => {
      await user.click(await screen.findByRole('button', { name: `Set for… ${short}` }));
      await user.click(within(await screen.findByRole('group', { name: `Set ${short} for` })).getByRole('button', { name: part }));
    });
    Then('the setting {string} holds {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect(await kept(key)).toBe(value));
    });
  });

  Scenario('Which devotional is a searchable picker of the devotionals that are on, with Random', ({ Given, Then, When }) => {
    Given('the shelf holds the devotionals {string} and Settings is open at Daily with Which devotional on Random', dailyWith);
    const picks = async (_: unknown, names: string) => {
      await waitFor(async () => expect(await offered()).toEqual(list(names).sort()));
    };
    Then('the Which devotional picker offers {string}', picks);
    When('he searches the Which devotional picker for {string}', async (_, text: string) => {
      await user.type(await screen.findByRole('searchbox', { name: 'Search Which devotional' }), text);
    });
    Then('the Which devotional picker narrows to {string}', picks);
    When('he picks {string} in the Which devotional picker', async (_, name: string) => {
      await user.click(within(await picker()).getByRole('radio', { name }));
    });
    Then('the setting {string} holds {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect(await kept(key)).toBe(value));
    });
  });

  Scenario('In the draw follows the shelf', ({ Given, Then, When, And }) => {
    Given('the shelf holds the devotionals {string} and Settings is open at Daily with Which devotional on Random', dailyWith);
    Then('In the draw says {string}', async (_, text: string) => {
      const draw = await screen.findByRole('group', { name: 'In the draw' });
      await waitFor(() => expect(draw).toHaveTextContent(text));
    });
    When('he turns the devotional {string} Off in the Library', async (_, title: string) => {
      await setState(book(title).resource, 'off');
    });
    And('Settings is open at Daily with Which devotional on Random', async () => {
      await openAt('#/settings?group=daily');
      await screen.findByRole('group', { name: 'Which devotional' });
    });
    Then('In the draw now says {string}', async (_, text: string) => {
      const draw = await screen.findByRole('group', { name: 'In the draw' });
      await waitFor(() => expect(draw).toHaveTextContent(text));
    });
  });

  Scenario('The Settings search finds a book by its title', ({ Given, When, Then }) => {
    Given('the shelf holds the books {string} and Settings is open at its home', async (_, shelf: string) => {
      await shelfHolds(list(shelf), { 'resource.logos': 'on' });
      await openAt('#/settings');
      await screen.findByRole('searchbox', { name: 'Search settings' });
    });
    When('he searches Settings for {string}', async (_, text: string) => {
      await user.type(await screen.findByRole('searchbox', { name: 'Search settings' }), text);
    });
    Then('the search answers the book {string}', async (_, title: string) => {
      const books = await screen.findByRole('list', { name: 'Matching books' });
      expect(await within(books).findByRole('button', { name: new RegExp(`^${title}`) })).toBeInTheDocument();
    });
    When('he taps the answer {string}', async (_, title: string) => {
      await user.click(await screen.findByRole('button', { name: new RegExp(`^${title}`) }));
    });
    Then('the Library opens at Lexicons at the book {string}', async (_, short: string) => {
      expect(await screen.findByRole('heading', { name: 'Lexicons', level: 1 })).toBeInTheDocument();
      expect(libraryOf(window.location.hash)).toEqual({ kind: 'lexicon', book: book(short).resource });
    });
  });
});
