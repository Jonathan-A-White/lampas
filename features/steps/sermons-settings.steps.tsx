// features/steps/sermons-settings.steps.tsx — runs features/sermons-settings.feature: the Sermons section of Settings > Study resources (src/settings/controls/sermons.tsx: the row Sermon sources and Open web sermons in),
// the page of sermon sources it opens (src/sermons/SermonSourcesPage.tsx, mw-qtu3zvz.92) and the Sermons door that follows the switches (src/sermons/useSermons.ts). The registry of sources is four of the tests' own
// (tests/support/sermon-sources.ts), put in SOURCES by the mock below (the settings are made from SOURCES when the app loads); the third needs Logos and the fourth is a list made from Greg Laurie's Logos archive.
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
import { entriesOf } from '../../src/resources/catalogue';
import { closeSermons } from '../../src/sermons/openSermons';
import { LOGOS_RESOURCES } from '../../src/sermons/sources/bundled';
import { writeSetting } from '../../src/settings/registry';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { keepImport } from '../../tests/support/logos-import';
import { forgetTestMaps, registerTestMaps } from '../../tests/support/test-maps';
import { forgetTestThemes, registerTestThemes } from '../../tests/support/test-themes';
import { closeDatabase } from './close-database';

vi.mock('../../src/sermons/sources', async () => {
  const { logosSource, secondSource, sourceOf, testSource } = await import('../../tests/support/sermon-sources');
  return { SOURCES: [testSource, secondSource, logosSource, { ...sourceOf('testlaurie', "Test Laurie's sermons (Logos archive)", {}, 'off'), resources: ['LLS:GRGLRSRMNRCH'] }] };
});

afterAll(async () => {
  cleanup();
  closeSermons();
  forgetTestThemes();
  forgetTestMaps();
  clearBus();
  vi.unstubAllGlobals();
  await closeDatabase();
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
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.library.clear(), db.exportRows.clear()]);
}

async function openStudy(logos: 'on' | 'off'): Promise<void> {
  await reset();
  await db.settings.put({ key: 'resource.logos', value: logos });
  window.history.replaceState(null, '', '/#/settings?group=study');
  render(<App />);
  await screen.findByRole('region', { name: 'Study resources' });
}

const GREG = 'LLS:GRGLRSRMNRCH';
const AUGUSTINE = 'LLS:SLSRHMTRTSTGSTN';
const UNDER = new Set(Object.values(LOGOS_RESOURCES).flat());
/** Ten sermon books of the catalogue that no list stands for, and one more his import lacks. */
const LOOSE = entriesOf('sermons').filter((e) => !UNDER.has(e.resource));
const TEN = LOOSE.slice(0, 10);
const LACKED = LOOSE[10];

/** Opens the app at an address with Logos On or Off, after `seed` has put what the scenario needs on the phone. */
async function openAt(hash: string, logos: 'on' | 'off', seed: () => Promise<unknown> = async () => undefined): Promise<void> {
  await reset();
  await db.settings.put({ key: 'resource.logos', value: logos });
  await seed();
  window.history.replaceState(null, '', `/${hash}`);
  render(<App />);
}

const PAGE = '#/settings?sources=sermons';
const page = async (): Promise<HTMLElement> => {
  await screen.findByRole('heading', { name: 'Sermon sources', level: 1 });
  return waitFor(() => {
    const main = document.querySelector<HTMLElement>('[data-sermon-sources] [data-sources-list]');
    if (!main) throw new Error('the list of sermon sources is not drawn yet');
    return document.querySelector<HTMLElement>('[data-sermon-sources]')!;
  });
};
const sourceSwitch = async (name: string): Promise<HTMLElement> => within(await page()).findByRole('radiogroup', { name });
const chosen = async (name: string): Promise<string[]> =>
  within(await sourceSwitch(name))
    .getAllByRole('radio')
    .filter((b) => b.getAttribute('aria-checked') === 'true')
    .map((b) => b.textContent ?? '');
const byTest = (id: string): HTMLElement | null => document.querySelector<HTMLElement>(`[data-testid="${id}"]`);


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
const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const doorsIn = (box: HTMLElement): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('button')].filter((b) => /^Sermons\b/.test(squash(b.textContent)));

const feature = await loadFeature('features/sermons-settings.feature');

describeFeature(feature, ({ Scenario }) => {
  const openedWith = (logos: 'on' | 'off') => () => openStudy(logos);
  const pageWith = (logos: 'on' | 'off') => async () => {
    await openAt(PAGE, logos);
    await page();
  };
  const withImport = async () => {
    await openAt(PAGE, 'on', () => keepImport([...TEN.map((e) => e.resource), GREG]));
    await page();
  };
  const shows = async (_: unknown, name: string, value: string) => {
    await waitFor(async () => expect(await chosen(name)).toEqual([value]));
  };
  const turn = async (_: unknown, name: string, value: string) => {
    await user.click(within(await sourceSwitch(name)).getByRole('radio', { name: value }));
  };
  const keptAs = async (_: unknown, key: string, value: string) => {
    await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
  };
  const statusReads = async (_: unknown, line: string) => {
    await waitFor(() => expect(squash(byTest('sources-line')?.textContent)).toBe(line));
  };
  const headerReads = async (_: unknown, count: string) => {
    await waitFor(() => expect(squash(byTest('sources-status')?.textContent)).toBe(count));
  };
  const pageOpenWith = async (_: unknown, count: string) => {
    await page();
    await headerReads(_, count);
  };
  const noSource = async (_: unknown, name: string) => {
    const main = await page();
    expect(within(main).queryByRole('radiogroup', { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })).toBeNull();
  };
  const noHeading = async () => {
    expect(within(await page()).queryAllByRole('heading', { level: 2 })).toEqual([]);
  };
  const noPin = async () => {
    const main = await page();
    expect(within(main).queryByRole('radio', { name: /pin/i })).toBeNull();
    for (const group of within(main).getAllByRole('radiogroup')) expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Off', 'On']);
  };
  const groupOf = async (title: string): Promise<HTMLElement> => {
    const heading = await within(await page()).findByRole('heading', { name: title, level: 2 });
    return heading.closest<HTMLElement>('[data-group]')!;
  };
  const groupReads = async (title: string, count: string) => {
    const group = await groupOf(title);
    await waitFor(() => expect(squash(group.querySelector('[data-testid="group-count"]')?.textContent)).toBe(count));
  };
  const types = async (_: unknown, words: string) => {
    await user.type(within(await page()).getByRole('searchbox', { name: 'Search sermon sources' }), words);
  };
  const taps = async (_: unknown, name: string) => {
    await user.click(within(await page()).getByRole('button', { name }));
  };
  const lineShown = async (_: unknown, line: string) => {
    expect(await within(await page()).findByText(line)).toBeVisible();
  };
  const undoLine = async (_: unknown, line: string) => {
    await waitFor(() => expect(squash(byTest('sources-undo')?.textContent)).toBe(`${line}Undo`));
  };
  const viewHas = async (_: unknown, label: string) => {
    expect(await within(viewEl()).findByRole('button', { name: label })).toBeVisible();
  };
  const turnOffInSettings = async (_: unknown, name: string) => {
    await writeSetting(IDS[name] as 'sermons.testsecond', 'off');
  };
  const IDS: Record<string, string> = { 'Test Sermons': 'sermons.testsermons', 'Test Second Sermons': 'sermons.testsecond' };
  const firstBook = [...TEN].sort((a, b) => a.short.localeCompare(b.short, 'en', { numeric: true }))[0];

  Scenario('The Sermons section holds one row for every source, with its count', ({ Given, Then, And }) => {
    Given('Settings is open at Study resources with Logos Off', openedWith('off'));
    Then('the Sermons section holds the rows {string} and {string}', async (_, first: string, second: string) => {
      const section = await sermonsSection();
      await waitFor(() => expect([...section.querySelectorAll<HTMLElement>('[data-setting]')].map((row) => row.dataset.setting)).toEqual(['sermonSources', 'sermonsOpenWeb']));
      expect(within(section).getByRole('button', { name: new RegExp(`^${first}`) })).toBeVisible();
      expect(within(section).getByRole('heading', { name: second, level: 3 })).toBeVisible();
    });
    And('the row {string} reads {string}', async (_, _name: string, count: string) => {
      await waitFor(() => expect(squash(byTest('sources-count')?.textContent)).toBe(count));
    });
    And('the Sermons section has no switch for {string}', async (_, name: string) => {
      const section = await sermonsSection();
      expect(within(section).queryByRole('group', { name })).toBeNull();
      expect(within(section).queryByRole('radiogroup', { name })).toBeNull();
    });
  });

  Scenario('The row opens the page of sermon sources, each Off or On and none with a Pin', ({ Given, When, Then, And }) => {
    Given('Settings is open at Study resources with Logos Off', openedWith('off'));
    When('he opens the row {string}', async (_, name: string) => {
      await user.click(await within(await sermonsSection()).findByRole('button', { name: new RegExp(`^${name}`) }));
    });
    Then('the page of sermon sources is open with {string} in its header', pageOpenWith);
    And('the list shows {string} as {string}', shows);
    And('{string} is in the list too, {string}', shows);
    And('no source has a Pin', noPin);
    And('two sources have no search field', async () => {
      expect(within(await page()).queryByRole('searchbox')).toBeNull();
    });
    And('the back button {string} returns to the Sermons section', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name }));
      await screen.findByRole('region', { name: 'Study resources' });
      await sermonsSection();
    });
  });

  Scenario('Turning a source Off is kept and counted at once', ({ Given, When, Then, And }) => {
    Given('the page of sermon sources is open with Logos Off', pageWith('off'));
    When('he turns {string} to {string}', turn);
    Then('the list shows {string} as {string}', shows);
    And('the setting {string} is kept as {string}', keptAs);
    And('the status line reads {string}', statusReads);
    And('the header count reads {string}', headerReads);
  });

  Scenario('A Logos source is not listed while Logos is Off', ({ Given, Then, And }) => {
    Given('the page of sermon sources is open with Logos Off', pageWith('off'));
    Then('the list has no source {string}', noSource);
    And('the list has no group heading', noHeading);
    And('no card speaks of Logos', async () => {
      expect(byTest('sources-import')).toBeNull();
      expect(byTest('sources-logos-off')).toBeNull();
      expect((await page()).textContent).not.toMatch(/Logos/);
    });
  });

  Scenario('With Logos On and no import a card says how to import', ({ Given, Then, And }) => {
    Given('the page of sermon sources is open with Logos On', pageWith('on'));
    Then('the list shows {string} as {string}', shows);
    And('the list has no source {string}', noSource);
    And('a card reads {string}', async (_, words: string) => {
      await waitFor(() => expect(squash(byTest('sources-import')?.querySelector('p')?.textContent)).toBe(words));
    });
    And('the card\'s button {string} opens the Library\'s Import', async (_, name: string) => {
      await user.click(within(byTest('sources-import')!).getByRole('button', { name }));
      await waitFor(() => expect(window.location.hash).toBe('#/library?import'));
    });
  });

  Scenario('His sermon books are in the same list, a list standing for the book it is made from', ({ Given, Then, And }) => {
    Given('the page of sermon sources is open with Logos On and an import of ten sermon books and Greg Laurie\'s archive', withImport);
    Then('the search field reads {string}', async (_, placeholder: string) => {
      expect(within(await page()).getByRole('searchbox', { name: 'Search sermon sources' })).toHaveAttribute('placeholder', placeholder);
    });
    And('the status line reads {string}', statusReads);
    And('the group {string} reads {string} and holds {string}', async (_, title: string, count: string, name: string) => {
      await groupReads(title, count);
      expect(within(await groupOf(title)).getByRole('radiogroup', { name })).toBeVisible();
    });
    And('the second group {string} reads {string}', (_, title: string, count: string) => groupReads(title, count));
    And('the list has no source {string}', noSource);
    And('a sermon book his import lacks is not listed', async () => {
      const main = await page();
      expect(main.querySelector(`[data-source="${CSS.escape(TEN[0].resource)}"]`)).not.toBeNull();
      expect(main.querySelector(`[data-source="${CSS.escape(LACKED.resource)}"]`)).toBeNull();
      expect(main.querySelector(`[data-source="${CSS.escape(GREG)}"]`)).toBeNull();
    });
    And('no source has a Pin', noPin);
  });

  Scenario('A sermon book switched On is kept on his shelf', ({ Given, When, Then, And }) => {
    Given('the page of sermon sources is open with Logos On and an import of ten sermon books and Greg Laurie\'s archive', withImport);
    When('he turns the first sermon book to {string}', async (_, value: string) => {
      const row = (await page()).querySelector<HTMLElement>(`[data-source="${CSS.escape(firstBook.resource)}"]`)!;
      await user.click(within(row).getByRole('radio', { name: value }));
    });
    Then('that sermon book is {string} on his shelf', async (_, state: string) => {
      await waitFor(async () => expect((await db.library.get(firstBook.resource))?.state).toBe(state));
    });
    And('the header count reads {string}', headerReads);
    And('the second group {string} reads {string}', (_, title: string, count: string) => groupReads(title, count));
  });

  Scenario('With a search typed the two buttons act on what is shown, and Undo puts it back', ({ Given, When, Then, And }) => {
    Given('the page of sermon sources is open with Logos On and an import of ten sermon books and Greg Laurie\'s archive', withImport);
    When('he types {string} in the search', types);
    Then('the status line reads {string}', statusReads);
    And('the two buttons read {string} and {string}', async (_, on: string, off: string) => {
      const main = await page();
      expect(within(main).getByRole('button', { name: on })).toBeVisible();
      expect(within(main).getByRole('button', { name: off })).toBeVisible();
    });
    When('he taps the button {string}', taps);
    Then('the count under the search becomes {string}', statusReads);
    And('the line {string} stands with an Undo', undoLine);
    And('the source {string}, which the search does not show, is not written', async (_, key: string) => {
      await waitFor(async () => expect((await db.settings.get('sermons.testsecond'))?.value).toBe('off'));
      expect(await db.settings.get(key)).toBeUndefined();
    });
    When('he chooses {string}', taps);
    Then('the count is back at {string}', statusReads);
    And('the setting {string} is kept as {string}', keptAs);
  });

  Scenario('All off says no verse has a Sermons door, and Undo brings the sources back', ({ Given, When, Then, And }) => {
    Given('the page of sermon sources is open with Logos Off', pageWith('off'));
    When('he taps the button {string}', taps);
    Then('the status line reads {string}', statusReads);
    And('the header count reads {string}', headerReads);
    And('the line {string} stands with an Undo', undoLine);
    And('the line {string} is shown', lineShown);
    When('he chooses {string}', taps);
    Then('the count is back at {string}', statusReads);
  });

  Scenario('All on turns every source on, the books on his shelf too', ({ Given, When, Then, And }) => {
    Given('the page of sermon sources is open with Logos On and an import of ten sermon books and Greg Laurie\'s archive', withImport);
    When('he taps the button {string}', taps);
    Then('the status line reads {string}', statusReads);
    And('the line {string} stands with an Undo', undoLine);
    And('ten sermon books are on his shelf', async () => {
      await waitFor(async () => expect((await db.library.where('kind').equals('sermons').toArray()).filter((r) => r.state === 'on').map((r) => r.id).sort()).toEqual(TEN.map((e) => e.resource).sort()));
    });
  });

  Scenario('A search with no match offers Ask for a preacher', ({ Given, When, Then, And }) => {
    Given('the page of sermon sources is open with Logos On and an import of ten sermon books and Greg Laurie\'s archive', withImport);
    When('he types {string} in the search', types);
    Then('the line {string} is shown', lineShown);
    And('{string} is offered under it', async (_, name: string) => {
      expect(await within(await page()).findByText(name)).toBeVisible();
    });
  });

  Scenario('A book with more than sermons is in the list and in the Library, with one switch', ({ Given, When, Then, And }) => {
    Given('the page of sermon sources is open with Logos On and Augustine\'s Homilies on John pinned in his Library', async () => {
      await openAt(PAGE, 'on', async () => {
        await keepImport([AUGUSTINE]);
        await db.library.put({ id: AUGUSTINE, kind: 'commentary', state: 'pinned', since: 1 });
      });
      await page();
    });
    Then('the list shows {string} as {string}', shows);
    And('that row says {string}', async (_, words: string) => {
      const row = (await page()).querySelector<HTMLElement>(`[data-source="${CSS.escape(AUGUSTINE)}"]`)!;
      expect(squash(within(row).getByRole('button', { name: new RegExp(`^${words}`) }).textContent)).toMatch(new RegExp(`^${words}`));
    });
    When('he turns {string} to {string}', turn);
    Then('the book {string} is off his shelf, so it is Off in the Library too', async (_, id: string) => {
      await waitFor(async () => expect(await db.library.get(id)).toBeUndefined());
    });
  });

  Scenario('Logos turned Off after sources were on', ({ Given, Then, And }) => {
    Given('the page of sermon sources is open with Logos Off and an import of ten sermon books, one of them On', async () => {
      await openAt(PAGE, 'off', async () => {
        await keepImport(TEN.map((e) => e.resource));
        await db.library.put({ id: TEN[0].resource, kind: 'sermons', state: 'on', since: 1 });
      });
      await page();
    });
    Then('the list has no group heading', noHeading);
    And('the foot line reads {string}', async (_, line: string) => {
      await waitFor(() => expect(squash(byTest('sources-logos-off')?.textContent)).toBe(line));
    });
  });

  Scenario('The old Library > Sermons address opens the one list', ({ Given, Then, And }) => {
    Given('Lampas is opened at {string} with Logos On', (_, hash: string) => openAt(hash, 'on'));
    Then('the page of sermon sources is open with {string} in its header', pageOpenWith);
    And('the address is {string}', (_, hash: string) => {
      expect(window.location.hash).toBe(hash);
    });
  });

  Scenario("A link to a source's setting opens the list at its row", ({ Given, Then, And }) => {
    Given('Lampas is opened at {string} with Logos Off', (_, hash: string) => openAt(hash, 'off'));
    Then('the page of sermon sources is open with {string} in its header', pageOpenWith);
    And('the row of {string} is marked', async (_, name: string) => {
      const group = await sourceSwitch(name);
      await waitFor(() => expect(group.closest('[data-source]')).toHaveAttribute('aria-current', 'true'));
    });
    And('that row is the row of the setting {string}, highlighted as a setting\'s row is', async (_, key: string) => {
      await waitFor(() => expect(document.querySelector<HTMLElement>(`[data-setting="${key}"]`)).toHaveAttribute('data-highlighted', ''));
      expect(document.querySelector<HTMLElement>(`[data-setting="${key}"]`)).toHaveAttribute('data-source', key);
    });
  });

  Scenario('A link to a Logos list his import lacks says why it is not listed', ({ Given, Then, And }) => {
    Given('Lampas is opened at {string} with Logos On', (_, hash: string) => openAt(hash, 'on'));
    Then('the page of sermon sources is open with {string} in its header', pageOpenWith);
    And('the list has no source {string}', async (_, name: string) => {
      expect(within(await page()).queryByRole('radiogroup', { name })).toBeNull();
    });
    And('a note reads {string}', async (_, words: string) => {
      await waitFor(() => expect(squash(document.querySelector<HTMLElement>('[data-source-needs]')?.textContent)).toBe(words));
    });
  });

  Scenario('The Library has no Sermons row', ({ Given, Then }) => {
    Given('Lampas is opened at {string} with Logos On', (_, hash: string) => openAt(hash, 'on'));
    Then('the Library lists {string}', async (_, kinds: string) => {
      await screen.findByRole('heading', { name: 'Your Logos library', level: 1 });
      await waitFor(() => expect([...document.querySelectorAll<HTMLElement>('[data-testid="kind-row"]')].map((row) => row.dataset.label).join(', ')).toBe(kinds));
    });
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
