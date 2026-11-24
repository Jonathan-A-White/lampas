// features/steps/settings-search.steps.tsx — runs features/settings-search.feature: the search field at the top of the Settings home, which lists the rows it finds with their group.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';
import { EVERY_BOOK_IDS, keepImport } from '../../tests/support/logos-import';
import { openSettings } from '../../tests/unit/openSettings';
import { closeDatabase } from './close-database';

const user = userEvent.setup();

// jsdom draws no layout and has no scrollIntoView: a found setting's page scrolls to its row
Element.prototype.scrollIntoView = function scrollIntoView() {};

afterAll(async () => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  await closeDatabase();
});

async function openSettingsPage(seed: Record<string, string> = {}, imported = false): Promise<void> {
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
  if (imported) await keepImport(EVERY_BOOK_IDS);
  await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
  await openSettings(user);
  // the home draws its groups from a live query: wait for the last one before searching
  await groupButton('Account');
}

// inside the list of groups: the dials above it have buttons of their own ('Reading in Greek')
const groupButton = async (title: string): Promise<HTMLElement> => within(await screen.findByRole('list', { name: 'Settings groups' })).findByRole('button', { name: new RegExp(`^${title}`) });

const searchField = (): Promise<HTMLElement> => screen.findByRole('searchbox', { name: 'Search settings' });
const found = (label: string): HTMLElement | null =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-found]')).find((el) => el.querySelector('span')?.textContent === label) ?? null;
const groups = (): HTMLElement | null => document.querySelector<HTMLElement>('[aria-label="Settings groups"]');

const feature = await loadFeature('features/settings-search.feature');

describeFeature(feature, ({ Scenario }) => {
  const openNothing = () => openSettingsPage();
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
    Given('Lampas is opened on Settings with Logos On', () => openSettingsPage({ 'resource.logos': 'on' }));
    When('he types {string} in the Settings search', typed);
    Then('Settings finds {string} in {string}', findsIn);
    And('Settings finds {string} in {string}', findsIn);
    And('Settings finds no {string}', findsNo);
    And('Settings lists no groups', listsNoGroups);
  });

  Scenario('Clearing the search lists the groups again', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with Logos On', () => openSettingsPage({ 'resource.logos': 'on' }));
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

  const chooses = async (_: unknown, label: string): Promise<void> => {
    const hit = await waitFor(() => {
      const el = found(label);
      expect(el, label).not.toBeNull();
      return el!;
    });
    await user.click(hit);
  };
  const pageOpen = async (_: unknown, title: string): Promise<void> => {
    expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
  };

  Scenario('Choosing a found setting opens its page at that row', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    And('he chooses {string} among the found', chooses);
    Then('the {string} page is open', pageOpen);
    And('the group {string} is shown', async (_, name: string) => {
      expect(await screen.findByRole('group', { name })).toBeInTheDocument();
    });
  });

  // What Lampas has counted is a door of the home, no row of a group (mw-6ww.175.103): the search lists it 'in Settings' and a tap opens its own page
  Scenario('Typing counted finds What Lampas has counted and choosing it opens its page', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('Settings finds {string} in {string}', findsIn);
    And('Settings lists no groups', listsNoGroups);
    When('he chooses {string} among the found', chooses);
    Then('the {string} page is open', async (_, title: string) => {
      await pageOpen(_, title);
      expect(window.location.hash).toBe('#/settings?page=counted');
    });
  });

  Scenario('The search matches the hint of What Lampas has counted', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('Settings finds {string} in {string}', findsIn);
    // the door is the only thing found, so there is no list of matching settings for findsNo to wait on: the step before has waited for the answer
    And('Settings finds no {string}', (_, label: string) => {
      expect(found(label)).toBeNull();
    });
  });

  // mw-6ww.175.108: the counted page and the sermon sources page are drawn in the home's place, and the home must find what he typed when he is back, as it does after a group's page
  const tapsBack = async (_: unknown, label: string): Promise<void> => {
    await user.click(await screen.findByRole('button', { name: label }));
  };
  const searchHolds = async (_: unknown, text: string): Promise<void> => {
    expect(await searchField()).toHaveValue(text);
  };

  Scenario('The search keeps what he typed when he comes back from What Lampas has counted', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    And('he chooses {string} among the found', chooses);
    Then('the {string} page is open', pageOpen);
    When('he taps the back arrow {string}', tapsBack);
    Then('the Settings search holds {string}', searchHolds);
    And('Settings finds {string} in {string}', findsIn);
    And('Settings lists no groups', listsNoGroups);
  });

  // mw-qtu3zvz.281: a list too long to read among the settings is ONE row with its count (data-found-list), and a tap opens the list filtered to the search
  const listRow = (list: 'sermons' | 'library'): HTMLElement | null => document.querySelector<HTMLElement>(`[data-found-list="${list}"]`);
  const waitForListRow = (list: 'sermons' | 'library'): Promise<HTMLElement> =>
    waitFor(() => {
      const row = listRow(list);
      expect(row, `the row of ${list}`).not.toBeNull();
      return row!;
    });
  /** How many the row says match: 'Sermon sources · 14 match ›' is 14. */
  const said = (row: HTMLElement): number => Number(/· (\d+) match/.exec(row.textContent ?? '')?.[1]);
  let saidSermons = 0;
  const oneRowOfSermons = async (): Promise<void> => {
    const row = await waitForListRow('sermons');
    expect(row.textContent).toMatch(/^Sermon sources · \d+ match/);
    saidSermons = said(row);
    expect(saidSermons).toBeGreaterThan(0);
    expect(document.querySelectorAll('[data-found^="sermons."]')).toHaveLength(0);
  };
  const tapsSermonRow = async (): Promise<void> => {
    await user.click(await waitForListRow('sermons'));
  };

  Scenario('The search keeps what he typed when he comes back from the sermon sources', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    And('he taps the row of sermon sources among the found', tapsSermonRow);
    Then('the {string} page is open', pageOpen);
    When('he taps the back arrow {string}', tapsBack);
    Then('the Settings search holds {string}', searchHolds);
    And('Settings lists no groups', listsNoGroups);
  });

  Scenario('Typing sermons lists the settings first and the sermon sources as one row with their count', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('Settings finds {string} in {string}', findsIn);
    And('Settings finds {string} in {string}', findsIn);
    And('the sermon sources are one row that says how many match', oneRowOfSermons);
    And('that row comes after the found settings', async () => {
      const row = await waitForListRow('sermons');
      for (const label of ['Sermon sources', 'Open web sermons in']) {
        expect(found(label)!.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING, label).toBeTruthy();
      }
    });
    And('no single sermon source is listed', () => {
      expect(document.querySelectorAll('[data-found^="sermons."]')).toHaveLength(0);
      expect(document.querySelectorAll('[data-found-book]')).toHaveLength(0);
    });
  });

  Scenario('Tapping the row of sermon sources opens the list filtered, and Back returns to the same search', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    And('he taps the row of sermon sources among the found', async () => {
      await oneRowOfSermons();
      await tapsSermonRow();
    });
    Then('the {string} page is open', pageOpen);
    And('the page lists only the sources the row said matched', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-source]')).toHaveLength(saidSermons));
      expect(within(document.querySelector<HTMLElement>('[data-testid="sources-line"]')!).getByText(new RegExp(`${saidSermons} shown`))).toBeInTheDocument();
    });
    When('he taps the back arrow {string}', tapsBack);
    Then('the Settings search holds {string}', searchHolds);
    And('the sermon sources are one row that says how many match', async () => {
      await oneRowOfSermons();
    });
    And('Settings finds {string} in {string}', findsIn);
  });

  Scenario('A search that matches one sermon source still answers it as the row of sermon sources', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    Then('the sermon sources are one row that says how many match', oneRowOfSermons);
    And('no single sermon source is listed', () => {
      expect(document.querySelectorAll('[data-found^="sermons."]')).toHaveLength(0);
    });
  });

  Scenario('The books of his library that match are one row that opens the Library filtered', ({ Given, When, Then, And }) => {
    let saidBooks = 0;
    Given('Lampas is opened on Settings with Logos On and a library import holding every book', () => openSettingsPage({ 'resource.logos': 'on' }, true));
    When('he types {string} in the Settings search', typed);
    Then('the books of his library are one row that says how many match', async () => {
      const row = await waitForListRow('library');
      expect(row.textContent).toMatch(/^Books of your library · \d+ match/);
      saidBooks = said(row);
      expect(saidBooks).toBeGreaterThan(1);
    });
    And('no single book of the library is listed', () => {
      expect(document.querySelectorAll('[data-found-book]')).toHaveLength(0);
    });
    When('he taps the row of the books of his library among the found', async () => {
      await user.click(await waitForListRow('library'));
    });
    Then('the {string} page is open', pageOpen);
    And('the Library search holds {string} and lists as many books as the row said', async (_, text: string) => {
      expect(await screen.findByRole('searchbox', { name: 'Search your books' })).toHaveValue(text);
      const results = await screen.findByTestId('library-results');
      expect(within(results).getAllByRole('button')).toHaveLength(saidBooks);
    });
    When('he taps the back arrow {string}', tapsBack);
    Then('the Settings search holds {string}', searchHolds);
    And('the books of his library are one row that says how many match', async () => {
      expect(said(await waitForListRow('library'))).toBe(saidBooks);
    });
  });

  Scenario("The search keeps what he typed when he comes back from a group's page", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with nothing chosen', openNothing);
    When('he types {string} in the Settings search', typed);
    And('he chooses {string} among the found', chooses);
    Then('the {string} page is open', pageOpen);
    When('he taps the back arrow {string}', tapsBack);
    Then('the Settings search holds {string}', searchHolds);
    And('Settings finds {string} in {string}', findsIn);
  });
});
