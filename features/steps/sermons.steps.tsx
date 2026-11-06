// features/steps/sermons.steps.tsx — runs features/sermons.feature: the Sermons door (src/sermons/SermonsDoor.tsx) on the Verse view, after the Maps door, and the sheet (SermonsSheet.tsx).
// The sermons come from sources of the tests' own (tests/support/test-sermons.ts), so no data file is read and no page is fetched; Romans 5 and Jonah 1 are the committed chapters.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { setMapSources } from '../../src/maps';
import { forgetTrail } from '../../src/nav/lastRoute';
import { closeSermons } from '../../src/sermons/openSermons';
import { stubChapterFetch, type ChapterFetch } from '../../tests/support/chapter-fetch';
import { forgetTestMaps, registerTestMaps, TEST_CARDS, testSource as testMapSource } from '../../tests/support/test-maps';
import { forgetTestSermons, registerTestSermons } from '../../tests/support/test-sermons';
import { forgetTestThemes, registerTestThemes } from '../../tests/support/test-themes';

afterAll(() => {
  cleanup();
  closeSermons();
  forgetTestSermons();
  forgetTestThemes();
  forgetTestMaps();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

interface Phone {
  /** the Reader's saved view */
  view?: string;
  /** a Maps source with a map of Romans 5, to show the Sermons door after the Maps door */
  maps?: boolean;
  sermons?: Parameters<typeof registerTestSermons>[0];
}

let fetched: ChapterFetch;

/** Opens the app on a chapter (the address names it), with the test sermons registered. */
async function openOn(title: string, phone: Phone = {}): Promise<void> {
  cleanup();
  closeSermons();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  registerTestSermons(phone.sermons);
  // these scenarios are about the sermons of the passage: the theme lists are none (features/themes.feature has them)
  registerTestThemes({ none: true });
  registerTestMaps();
  if (phone.maps) setMapSources([{ ...testMapSource, mapsFor: async () => TEST_CARDS['rom.8'] }]);
  fetched = stubChapterFetch();
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  if (phone.view) await db.settings.put({ key: 'readerView', value: phone.view });
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const sheetEl = () => screen.findByRole('dialog', { name: /^Sermons for / });
const sheetCount = () => document.querySelectorAll('[role="dialog"]').length;
const doorsIn = (box: HTMLElement): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('button')].filter((b) => /^Sermons\b/.test(squash(b.textContent)));
const rowNamed = async (title: string): Promise<HTMLAnchorElement> => {
  const row = [...(await sheetEl()).querySelectorAll<HTMLAnchorElement>('a[data-sermon-row]')].find((r) => r.querySelector('[data-sermon-title]')?.textContent === title);
  if (!row) throw new Error(`no sermon ${title} in the sheet`);
  return row;
};
const partTitles = async (): Promise<string[]> => [...(await sheetEl()).querySelectorAll('h3')].map((h) => squash(h.textContent));
const partRows = async (part: string): Promise<string[]> => {
  const group = await within(await sheetEl()).findByRole('group', { name: part });
  return [...group.querySelectorAll('[data-sermon-title]')].map((t) => squash(t.textContent));
};

const feature = await loadFeature('features/sermons.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = (_: unknown, title: string) => openOn(title);
  const tapVerse = async (_: unknown, n: number) => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const viewHas = async (_: unknown, label: string) => {
    expect(await within(viewEl()).findByRole('button', { name: label })).toBeVisible();
  };
  const viewHasNone = async () => {
    // the door is drawn as soon as its count comes back
    await sleep(100);
    expect(doorsIn(viewEl())).toHaveLength(0);
  };
  const tapDoor = async (_: unknown, label: string) => {
    await user.click(await within(viewEl()).findByRole('button', { name: label }));
  };
  const headed = async (_: unknown, title: string) => {
    await waitFor(async () => expect((await sheetEl()).getAttribute('aria-label')).toBe(title));
  };
  const opensWith = async (_: unknown, first: string, then: string) => {
    await sheetEl();
    await waitFor(async () => expect(await partTitles()).toEqual(then === 'nothing' ? [first] : [first, then]));
  };
  const holds = async (_: unknown, part: string, ...titles: string[]) => {
    await waitFor(async () => expect(await partRows(part)).toEqual(titles));
  };
  const holdsOne = (_: unknown, part: string, a: string) => holds(_, part, a);
  const holdsTwo = (_: unknown, part: string, a: string, b: string) => holds(_, part, a, b);
  const holdsThree = (_: unknown, part: string, a: string, b: string, c: string) => holds(_, part, a, b, c);
  const holdsFour = (_: unknown, part: string, a: string, b: string, c: string, d: string) => holds(_, part, a, b, c, d);
  const tapHeading = async (_: unknown, text: string) => {
    const heading = await waitFor(() => {
      const found = [...document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')].find((h) => squash(h.textContent) === text);
      if (!found) throw new Error(`no heading ${text}`);
      return found;
    });
    await user.click(within(heading).getByRole('button'));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const tapPlaceLine = async () => {
    await user.click(
      await waitFor(() => {
        const line = document.querySelector<HTMLElement>('button[data-place-line]');
        if (!line) throw new Error('no place line');
        return line;
      }),
    );
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const rowReads = async (_: unknown, title: string, line: string) => {
    await waitFor(async () => expect(squash((await rowNamed(title)).querySelector('[data-sermon-meta]')?.textContent)).toBe(line));
  };
  const back = async () => {
    act(() => window.history.back());
    await sleep(60);
  };

  Scenario('A verse with sermons has the door on the Verse view', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    And('no verse of the text holds a Sermons door', () => {
      for (const verse of document.querySelectorAll<HTMLElement>('[data-verse]')) expect(doorsIn(verse)).toHaveLength(0);
    });
  });

  Scenario('The door is there in the source view too', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} with the saved view {string}', (_, title: string, view: string) => openOn(title, { view }));
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
  });

  Scenario('An Old Testament verse read in the Hebrew has the door', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the saved view {string}', (_, title: string, view: string) => openOn(title, { view }));
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the part {string} holds {string}', holdsOne);
    And('after it the part {string} holds {string}', holdsOne);
  });

  Scenario('The door comes after the Maps door', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} with the Maps door', (_, title: string) => openOn(title, { maps: true }));
    When('he taps verse {int}', tapVerse);
    Then('the tools line reads {string} and then {string}', async (_, first: string, then: string) => {
      await within(viewEl()).findByRole('button', { name: then });
      const tools = within(screen.getByRole('group', { name: 'Tools' })).getAllByRole('button');
      const names = tools.map((b) => squash(b.textContent));
      expect(names.indexOf(first)).toBeGreaterThanOrEqual(0);
      expect(names.indexOf(then)).toBe(names.indexOf(first) + 1);
    });
  });

  Scenario('A chapter whose sermons are none has no door', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has no Sermons door', viewHasNone);
  });

  Scenario('Sources that answer nothing leave no door', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} with sources that have no sermons', (_, title: string) => openOn(title, { sermons: { none: true } }));
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has no Sermons door', viewHasNone);
  });

  Scenario('Sources that are all Off leave no door', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} with every source Off', (_, title: string) => openOn(title, { sermons: { off: true } }));
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has no Sermons door', viewHasNone);
  });

  Scenario('The sheet groups the sermons on the verse and in the chapter', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the sheet opens with {string} and then {string}', opensWith);
    And('the part {string} holds {string} and {string}', holdsTwo);
    And('after it the part {string} holds {string} and {string}', holdsTwo);
  });

  Scenario('A row gives the preacher, the date and where the sermon opens', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the row {string} reads {string}', rowReads);
    And('the row {string} is a link to {string} that opens in a new tab and is 44 px tall', async (_, title: string, url: string) => {
      const row = await rowNamed(title);
      expect(row).toHaveAttribute('href', url);
      expect(row).toHaveAttribute('target', '_blank');
      expect(row.getAttribute('rel')).toContain('noopener');
      expect(row.className).toContain('min-h-11');
    });
    And('the row {string} reads {string}', rowReads);
  });

  Scenario('Two sources are counted together, each in its own order', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the second test source', (_, title: string) => openOn(title, { sermons: { second: true } }));
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the part {string} holds {string}, {string} and {string}', holdsThree);
    And('the sheet names the credit of {string} and {string}', async (_, a: string, b: string) => {
      const credits = [...(await sheetEl()).querySelectorAll('[data-sermon-credit]')].map((c) => squash(c.textContent));
      expect(credits).toEqual([`${a}: ${a}, a source of the tests’ own`, `${b}: ${b}, a source of the tests’ own`]);
    });
  });

  Scenario('A passage opened from a section heading says On these verses', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps the heading {string}', tapHeading);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the sheet opens with {string} and then {string}', opensWith);
    And('the part {string} holds {string} and {string}', holdsTwo);
    And('after it the part {string} holds {string} and {string}', holdsTwo);
  });

  Scenario('The place line opens the whole chapter, and its sheet is headed with the chapter', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps the place line', tapPlaceLine);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the sheet opens with {string} and then nothing', (_, first: string) => opensWith(_, first, 'nothing'));
    And('the part {string} holds {string}, {string}, {string} and {string}', holdsFour);
  });

  Scenario('Offline the rows stay and say they need the internet', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('the phone goes offline', async () => {
      await sheetEl();
      const online = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
      act(() => void window.dispatchEvent(new Event('offline')));
      afterAll(() => online.mockRestore());
    });
    Then('the row {string} reads {string}', rowReads);
    And('the sheet still has {int} rows', async (_, n: number) => {
      expect((await sheetEl()).querySelectorAll('a[data-sermon-row]')).toHaveLength(n);
    });
  });

  Scenario('Back closes the sheet and leaves the Verse view', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he goes Back', back);
    Then('no sheet is open and the Verse view shows', async () => {
      await waitFor(() => expect(sheetCount()).toBe(0));
      expect(viewEl()).toBeInTheDocument();
    });
  });

  Scenario('Tapping a sermon asks for nothing before it is tapped', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('no page outside the app has been asked for', async () => {
      await sheetEl();
      expect(fetched.requests.filter((url) => !url.startsWith('/'))).toEqual([]);
      expect(fetched.requests.filter((url) => url.includes('sermon'))).toEqual([]);
    });
  });
});
