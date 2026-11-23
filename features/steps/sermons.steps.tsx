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
import { ownedResources, setDevotionalDraw, shelfOf } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { setMapSources } from '../../src/maps';
import { forgetTrail } from '../../src/nav/lastRoute';
import { activeSources, enabledSources, setSermonSources } from '../../src/sermons';
import { closeSermons } from '../../src/sermons/openSermons';
import { stubChapterFetch, type ChapterFetch } from '../../tests/support/chapter-fetch';
import { findButton } from '../../tests/support/find-button';
import { tapPlaceLine } from '../../tests/support/place-line';
import { forgetTestMaps, registerTestMaps, TEST_CARDS, testSource as testMapSource } from '../../tests/support/test-maps';
import { forgetTestArchives, forgetTestSermons, registerTestArchives, registerTestSermons, sermonAt, testSource, toldOf } from '../../tests/support/test-sermons';
import { forgetTestThemes, registerTestThemes } from '../../tests/support/test-themes';
import { closeDatabase } from './close-database';
import { keepImport } from '../../tests/support/logos-import';

afterAll(async () => {
  cleanup();
  closeSermons();
  forgetTestSermons();
  forgetTestArchives();
  forgetTestThemes();
  forgetTestMaps();
  vi.unstubAllGlobals();
  await closeDatabase();
});

const user = userEvent.setup();
// a real-time wait: the helper of the one window below in which nothing must happen
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

interface Phone {
  /** the Reader's saved view */
  view?: string;
  /** a Maps source with a map of Romans 5, to show the Sermons door after the Maps door */
  maps?: boolean;
  sermons?: Parameters<typeof registerTestSermons>[0];
  /** the first test source as one that can be held (holdSource): its rows then wait for letSourceAnswer */
  slow?: boolean;
  /** his Logos sermon archives (the catalogue's, by Resource ID) on the shelf, and whether Logos is On: Greg Laurie's On and J. D. Greear's Pinned, or (`only: 'off'`) Skip Heitzig's Off */
  archives?: { logos: 'on' | 'off'; only?: 'off' | 'listed'; /** the Resource IDs his kept Library import holds (mw-qtu3zvz.94); both archives when left out */ owned?: string[] };
}

let fetched: ChapterFetch;

// A source that can be slow to answer, as a real one is while its book's file is read: from holdSource() its rows wait for letSourceAnswer(). The tests' own sources answer at once, which hides a step that
// looks at the sheet before its rows are drawn (mw-qtu3zvz.194).
let held: Promise<void> | undefined;
let letSourceAnswer = (): void => undefined;
const holdSource = (): void => {
  held = new Promise<void>((resolve) => {
    letSourceAnswer = resolve;
  });
};
const slowSource: typeof testSource = {
  ...testSource,
  sermonsFor: async (place) => {
    await held;
    return testSource.sermonsFor(place);
  },
};

// The sign that the sources have answered: each source the screens ask counts its answers, so a step that wants to say 'no door' can wait until the sources it asked have given theirs, not for a clock (mw-qtu3zvz.218).
let answered = 0;
const watched = (source: typeof testSource): typeof testSource => ({
  ...source,
  sermonsFor: async (place) => {
    try {
      return await source.sermonsFor(place);
    } finally {
      answered += 1;
    }
  },
});

/** Opens the app on a chapter (the address names it), with the test sermons registered. */
async function openOn(title: string, phone: Phone = {}): Promise<void> {
  cleanup();
  closeSermons();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  registerTestSermons(phone.sermons);
  // the catalogue holds no sermon of a book by passage (mw-qtu3zvz.239): Fresh Sermons is told of one at Romans 5:8, Things New and Old: Old and New Testament Studies of one there and one at Romans 8:1
  registerTestArchives(toldOf('LLS:FRESHSERMS', [sermonAt('rom', 5, 8, 'ref=Bible.Ro5.8')]), toldOf('LLS:NWOLDSCOFLD', [sermonAt('rom', 5, 8, 'ref=Bible.Ro5.8'), sermonAt('rom', 8, 1, 'off=8100')]));
  held = undefined;
  if (phone.slow) setSermonSources([slowSource]);
  setSermonSources(activeSources().map(watched));
  answered = 0;
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
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.library.clear()]);
  // a phone whose shelf holds no default book: with no list kept the shelf says what he has (mw-5r3p30.1189), and the old keys' defaults would put forty books on it
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
  ]);
  // the shelf takes those old keys into rows before the app draws: left to the first reader it is written while the door asks for his books, and on a busy machine the door waited on that write past a step's 10 s
  await setDevotionalDraw('none');
  if (phone.archives) {
    await db.settings.put({ key: 'resource.logos', value: phone.archives.logos });
    const shelf: { id: string; state: 'on' | 'pinned' }[] =
      phone.archives.only === 'off' ? [] : phone.archives.only === 'listed' ? [{ id: 'LLS:GRGLRSRMNRCH', state: 'on' }, { id: 'LLS:NWOLDSCOFLD', state: 'on' }] : [{ id: 'LLS:FRESHSERMS', state: 'on' }, { id: 'LLS:NWOLDSCOFLD', state: 'pinned' }];
    // two sermon books no passage list stands for (Greg Laurie's archive is his list's own, and has no In Logos row: mw-qtu3zvz.92); the row once Pinned is written as the Library wrote it
    await db.library.bulkPut(shelf.map((r) => ({ ...r, kind: 'sermons', since: 1 })));
    await keepImport(phone.archives.owned ?? ['LLS:FRESHSERMS', 'LLS:NWOLDSCOFLD', 'LLS:GRGLRSRMNRCH', 'LLS:SKPHTZGSRMN']);
  }
  if (phone.view) await db.settings.put({ key: 'readerView', value: phone.view });
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const sheetEl = () => screen.findByRole('dialog', { name: /^Sermons for / });
const sheetCount = () => document.querySelectorAll('[role="dialog"]').length;
const doorsIn = (box: HTMLElement): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('button')].filter((b) => /^Sermons\b/.test(squash(b.textContent)));
// What the sheet shows is drawn after the sheet is open: its rows once the sources have answered, its 'In Logos' group once his shelf and his import are read (two live queries; mw-indx1x6.78).
// So no helper here looks at the sheet once: inSheet makes the look inside a waitFor, with what the step says of what it finds, and makes it again until that holds (mw-qtu3zvz.194).
const inSheet = <T,>(look: (sheet: HTMLElement) => T): Promise<T> => waitFor(async () => look(await sheetEl()));
const rowTitled = (kind: 'sermon' | 'archive', title: string, says: (row: HTMLAnchorElement) => void): Promise<HTMLAnchorElement> =>
  inSheet((sheet) => {
    const row = [...sheet.querySelectorAll<HTMLAnchorElement>(`a[data-${kind}-row]`)].find((r) => r.querySelector('[data-sermon-title]')?.textContent === title);
    if (!row) throw new Error(`no ${kind} ${title} in the sheet`);
    says(row);
    return row;
  });
/** Waits for the sermon row titled `title` and for what the step `says` of it. */
const rowNamed = (title: string, says: (row: HTMLAnchorElement) => void) => rowTitled('sermon', title, says);
/** The same for a row of the 'In Logos' group. */
const archiveNamed = (title: string, says: (row: HTMLAnchorElement) => void) => rowTitled('archive', title, says);
const partsAre = (titles: string[]) => inSheet((sheet) => expect([...sheet.querySelectorAll('h3')].map((h) => squash(h.textContent))).toEqual(titles));

const feature = await loadFeature('features/sermons.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = (_: unknown, title: string) => openOn(title);
  const tapVerse = async (_: unknown, n: number) => {
    answered = 0;
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const viewHas = async (_: unknown, label: string) => {
    expect(await findButton(label)).toBeVisible();
  };
  const viewHasNone = async () => {
    // the sources the app asks are the ones enabledSources gives, as it does for the door; none On means nothing is asked. The answers are counted from the tap that opened the Verse view (tapVerse)
    const asked = (await enabledSources()).length;
    await waitFor(() => expect(answered).toBeGreaterThanOrEqual(asked));
    // an answer is drawn after the source has given it: a state set, and for a door of a Logos book the shelf and his import read: let those be read and drawn before the look
    await act(async () => {
      await Promise.all([shelfOf(), ownedResources()]);
    });
    expect(doorsIn(viewEl())).toHaveLength(0);
  };
  // findButton, not a role query: the Verse view of a whole chapter holds the chapter's ~hundreds of chunk buttons, and findByRole works out each one's name at every poll, so on a loaded host it outran the wait and starved
  // the database the door's count is read from (mw-indx1x6.118)
  const tapDoor = async (_: unknown, label: string) => {
    await user.click(await findButton(label));
  };
  const headed = async (_: unknown, title: string) => {
    await waitFor(async () => expect((await sheetEl()).getAttribute('aria-label')).toBe(title));
  };
  const opensWith = async (_: unknown, first: string, then: string) => {
    await partsAre(then === 'nothing' ? [first] : [first, then]);
  };
  const holds = async (_: unknown, part: string, ...titles: string[]) => {
    await waitFor(async () => expect([...(await within(await sheetEl()).findByRole('group', { name: part })).querySelectorAll('[data-sermon-title]')].map((t) => squash(t.textContent))).toEqual(titles));
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
  const tapPlaceLineAndWait = async () => {
    await tapPlaceLine();
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const rowReads = async (_: unknown, title: string, line: string) => {
    await rowNamed(title, (row) => expect(squash(row.querySelector('[data-sermon-meta]')?.textContent)).toBe(line));
  };
  const rowIsLink = async (_: unknown, title: string, url: string) => {
    await rowNamed(title, (row) => {
      expect(row).toHaveAttribute('href', url);
      expect(row).toHaveAttribute('target', '_blank');
      expect(row.getAttribute('rel')).toContain('noopener');
      expect(row.className).toContain('min-h-11');
    });
  };
  const stillHasRows = async (_: unknown, n: number) => {
    await inSheet((sheet) => expect(sheet.querySelectorAll('a[data-sermon-row]')).toHaveLength(n));
  };
  const archiveIsLink = async (_: unknown, title: string, url: string) => {
    const resource = /^logosres:([^;]+);(.*)$/.exec(url)!;
    await archiveNamed(title, (row) => {
      expect(row).toHaveAttribute('href', url);
      expect(row.getAttribute('data-fallback')).toBe(`https://ref.ly/logosres/${encodeURIComponent(resource[1])}?${resource[2]}`);
      expect(row.className).toContain('min-h-11');
    });
  };
  // the step after Back waits for what Back shows (findBy / waitFor), so Back itself waits for nothing
  const back = async () => {
    await act(async () => window.history.back());
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
      await findButton(then);
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

  Scenario('A chapter whose source is slow to answer has no door until it has answered, and then still none', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on {string} with a source that can be slow to answer', (_, title: string) => openOn(title, { slow: true }));
    And('the source is held', holdSource);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has no Sermons door once the source has answered', async () => {
      // the look is begun while the source is held and may not end before the source has answered: a look that waits on a clock, or on nothing, ends here
      let ended = false;
      const looked = viewHasNone().then(
        () => {
          ended = true;
        },
        (error: unknown) => {
          ended = true;
          return error;
        },
      );
      await sleep(300); // a real-time wait: nothing must happen in it, the look must still be waiting on the held source, and the held source gives no signal that its look has gone by
      expect(ended).toBe(false);
      letSourceAnswer();
      const error = await looked;
      if (error) throw error;
    });
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
    And('the row {string} is a link to {string} that opens in a new tab and is 44 px tall', rowIsLink);
    And('the row {string} reads {string}', rowReads);
  });

  Scenario('The sheet opens before a slow source has answered, and its rows come when it answers', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with a source that can be slow to answer', (_, title: string) => openOn(title, { slow: true }));
    When('he taps verse {int}', tapVerse);
    And('he taps {string} while its source is slow to answer', async (_, label: string) => {
      // the door is drawn from the answer the source gave before it was held: wait for it, then hold the source, so the sheet's own ask is the slow one (the owned-check reads the shelf too, mw-5r3p30.1189, so the door may come after this step began)
      await findButton(label);
      holdSource();
      await tapDoor(_, label);
    });
    Then('the sheet is headed {string}', headed);
    And('the row {string} comes when the source answers, a link to {string} that opens in a new tab and is 44 px tall', async (_, title: string, url: string) => {
      // the look is begun while the source is still held and the sheet has no row, and the source answers only once that look has been made (it was asked for first): a look that does not wait fails here
      const looked = rowIsLink(_, title, url).then(
        () => undefined,
        (error: unknown) => error,
      );
      expect((await sheetEl()).querySelectorAll('a[data-sermon-row]')).toHaveLength(0);
      letSourceAnswer();
      const error = await looked;
      if (error) throw error;
    });
    And('the sheet still has {int} rows', stillHasRows);
  });

  Scenario('Two sources are counted together, each in its own order', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the second test source', (_, title: string) => openOn(title, { sermons: { second: true } }));
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the part {string} holds {string}, {string} and {string}', holdsThree);
    And('the sheet names the credit of {string} and {string}', async (_, a: string, b: string) => {
      await inSheet((sheet) => expect([...sheet.querySelectorAll('[data-sermon-credit]')].map((c) => squash(c.textContent))).toEqual([`${a}: ${a}, a source of the tests’ own`, `${b}: ${b}, a source of the tests’ own`]));
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
    When('he taps the place line', tapPlaceLineAndWait);
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
    And('the sheet still has {int} rows', stillHasRows);
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
      // once its rows are drawn: before that the sources have not answered, and the check would say nothing of them
      await inSheet((sheet) => expect(sheet.querySelectorAll('a[data-sermon-row]').length).toBeGreaterThan(0));
      expect(fetched.requests.filter((url) => !url.startsWith('/'))).toEqual([]);
      expect(fetched.requests.filter((url) => url.includes('sermon'))).toEqual([]);
    });
  });

  const importHolds = (_: unknown, title: string) => openOn(title, { archives: { logos: 'on', owned: ['LLS:NWOLDSCOFLD'] } });
  const archiveOpened = (logos: 'on' | 'off', only?: 'off' | 'listed') => (_: unknown, title: string) => openOn(title, { archives: { logos, ...(only ? { only } : {}) } });
  const opensWithThree = async (_: unknown, first: string, second: string, third: string) => {
    await partsAre([first, second, third]);
  };


  Scenario('A book a passage list stands for has no In Logos row', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with Logos On and Greg Laurie’s archive On beside a sermon book', archiveOpened('on', 'listed'));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet opens with {string}, {string} and {string}', opensWithThree);
    And('the part {string} holds {string}', holdsOne);
  });

  Scenario('A verse with no listed sermon still has the door where a sermon book holds a sermon on it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with Logos On and two sermon archives on his shelf', archiveOpened('on'));
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', async (_, label: string) => {
      expect(await within(screen.getByRole('region', { name: 'Verse view' })).findByRole('button', { name: label })).toBeVisible();
    });
    When('he taps {string}', tapDoor);
    Then('the sheet says {string}', async (_, line: string) => {
      expect(await within(await sheetEl()).findByText(line)).toBeVisible();
    });
    And('the part {string} holds only {string}', holdsOne);
  });

  Scenario('His Logos sermon books are the In Logos group, by name, one that was Pinned no longer first', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with Logos On and two sermon archives on his shelf', archiveOpened('on'));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet opens with {string}, {string} and {string}', opensWithThree);
    And('the part {string} holds {string} and {string}', async (_, part: string, a: string, b: string) => {
      await waitFor(async () => expect([...(await within(await sheetEl()).findByRole('group', { name: part })).querySelectorAll('[data-sermon-title]')].map((t) => squash(t.textContent))).toEqual([a, b]));
    });
    And('the archive {string} reads {string}', async (_, title: string, line: string) => {
      await archiveNamed(title, (row) => expect(squash(row.querySelector('[data-sermon-meta]')?.textContent)).toBe(line));
    });
    And('the archive {string} is a link to {string} with the ref.ly address as its fallback and is 44 px tall', archiveIsLink);
    And('the sheet still has {int} rows', stillHasRows);
  });

  Scenario('An archive that is Off, or one not on his shelf, is not in the group', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with Logos On and only an Off archive', archiveOpened('on', 'off'));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet opens with {string} and then {string}', opensWith);
  });

  Scenario('An archive on his shelf that his Library import lacks is not in the group', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with two sermon archives on his shelf and an import that holds only Things New and Old: Old and New Testament Studies', importHolds);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet opens with {string}, {string} and {string}', opensWithThree);
    And('the part {string} holds {string}', holdsOne);
  });

  Scenario('With Logos Off there is no In Logos group', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with Logos Off and two sermon archives on his shelf', archiveOpened('off'));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet opens with {string} and then {string}', opensWith);
  });

  Scenario('A whole chapter opens each archive at the sermon it holds in the chapter', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with Logos On and two sermon archives on his shelf', archiveOpened('on'));
    When('he taps the place line', tapPlaceLineAndWait);
    And('he taps {string}', tapDoor);
    Then('the archive {string} is a link to {string} with the ref.ly address as its fallback and is 44 px tall', archiveIsLink);
  });
});
