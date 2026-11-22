// features/steps/maps.steps.tsx — runs features/maps.feature: the Maps door (src/maps/MapsDoor.tsx) on the Verse view and at the chapter foot, the sheet (MapsSheet.tsx) and the map (MapView.tsx).
// The maps come from a source of the tests' own (tests/support/test-maps.ts), so no data file is read and no picture is fetched; Genesis 10 and Romans 8 are the committed chapters.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { enabledSources, setMapSources } from '../../src/maps';
import { closeMaps } from '../../src/maps/openMaps';
import { setResourceOn, setState } from '../../src/data/repositories';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { findButton } from '../../tests/support/find-button';
import { tapPlaceLine as tapLine } from '../../tests/support/place-line';
import { openSettingsGroup } from '../../tests/support/settings-pages';
import { forgetTestMaps, registerTestMaps, testSource } from '../../tests/support/test-maps';
import { openSettings } from '../../tests/unit/openSettings';
import { closeDatabase } from './close-database';
import { EVERY_BOOK_IDS, keepImport } from '../../tests/support/logos-import';

afterAll(async () => {
  cleanup();
  closeMaps();
  forgetTestMaps();
  vi.unstubAllGlobals();
  await closeDatabase();
});

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

// A source that can be slow to answer, as a real one is while its data is read: from holdSource() its maps wait for letSourceAnswer(). The test source answers at once, which hides a step that looks at the
// sheet before its rows are drawn (mw-qtu3zvz.217).
let held: Promise<void> | undefined;
let letSourceAnswer = (): void => undefined;
const holdSource = (): void => {
  held = new Promise<void>((resolve) => {
    letSourceAnswer = resolve;
  });
};
const slowSource: typeof testSource = {
  ...testSource,
  mapsFor: async (ref) => {
    await held;
    return testSource.mapsFor(ref);
  },
};

// The sign that the sources have answered: each source the screens ask counts its answers, so a step that wants to say 'no door' waits until the sources it asked have given theirs, not for a clock (mw-qtu3zvz.217).
let answered = 0;
let started = 0;
const watched = (source: typeof testSource): typeof testSource => ({
  ...source,
  mapsFor: async (ref, places) => {
    started += 1;
    try {
      return await source.mapsFor(ref, places);
    } finally {
      answered += 1;
    }
  },
});

/** Opens the app on a chapter (the address names it), with the test maps registered. */
async function openOn(title: string, immersive = false, atlas?: { on: boolean; bibleMapper?: boolean }, logos?: 'on' | 'off', slow = false): Promise<void> {
  cleanup();
  closeMaps();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  registerTestMaps({ links: atlas !== undefined, logos: logos !== undefined });
  held = undefined;
  if (slow) setMapSources([slowSource]);
  stubChapterFetch();
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  if (immersive) await db.settings.put({ key: 'immersiveReader', value: 'on' });
  // the real Logos Atlas rides on Logos; with Logos On the shelf holds the Lexham Geographic Commentary on the Pentateuch
  await db.library.clear();
  await keepImport(EVERY_BOOK_IDS);
  if (logos) await setResourceOn('logos', logos === 'on');
  if (logos === 'on') await setState('LLS:LXGEOCOMMPENT', 'on');
  if (atlas) await db.settings.bulkPut([{ key: 'maps.testlinks', value: atlas.on ? 'on' : 'off' }, { key: 'maps.biblemapper', value: atlas.bibleMapper === false ? 'off' : 'on' }]);
  // the sources that are on, each counting its answers (a source that is Off is never asked)
  setMapSources((await enabledSources()).map(watched));
  answered = 0;
  started = 0;
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(() => expect(document.querySelector('[data-reader]')).toHaveAttribute('data-immersive', immersive ? 'on' : 'off'));
}

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const readerEl = () => document.querySelector<HTMLElement>('[data-reader]') as HTMLElement;
const doorsIn = (box: HTMLElement): HTMLElement[] => [...box.querySelectorAll<HTMLElement>('button')].filter((b) => /^Maps\b/.test(squash(b.textContent)));
const sheetEl = () => screen.findByRole('dialog', { name: /^Maps for / });
const mapEl = () => screen.findByRole('dialog', { name: (name) => !name.startsWith('Maps for ') });
const sheetCount = () => document.querySelectorAll('[role="dialog"]').length;
const groupEl = async (name: string) => within(await sheetEl()).findByRole('group', { name });
const rowsOf = (box: HTMLElement): string[] => [...box.querySelectorAll<HTMLElement>('[data-map-row]')].map((r) => squash([r.querySelector('[data-map-title]')?.textContent, r.querySelector('[data-map-period]')?.textContent].filter(Boolean).join(', ')));
const linkIn = (box: HTMLElement, name: string): HTMLAnchorElement => within(box).getByRole('link', { name });

const feature = await loadFeature('features/maps.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = (_: unknown, title: string) => openOn(title);
  const openedWithAtlas = (_: unknown, title: string) => openOn(title, false, { on: true });
  const openedWithoutAtlas = (_: unknown, title: string) => openOn(title, false, { on: false });
  const openedWithAtlasAlone = (_: unknown, title: string) => openOn(title, false, { on: true, bibleMapper: false });
  const openedImmersive = (_: unknown, title: string) => openOn(title, true);
  const openedWithLogos = (_: unknown, title: string) => openOn(title, false, undefined, 'on');
  const openedSlow = (_: unknown, title: string) => openOn(title, false, undefined, undefined, true);
  const openedWithoutLogos = (_: unknown, title: string) => openOn(title, false, undefined, 'off');
  const tapVerse = async (_: unknown, n: number) => {
    answered = 0;
    started = 0;
    await user.click(await findButton(`Verse ${n}`));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const viewHas = async (_: unknown, label: string) => {
    expect(await findButton(label, viewEl)).toBeVisible();
  };
  const viewHasNone = async () => {
    // the sources the app asks are the ones enabledSources gives; the answers are counted from the tap that opened the Verse view (tapVerse)
    const asked = (await enabledSources()).length;
    await waitFor(() => expect(answered).toBeGreaterThanOrEqual(asked));
    // an answer is drawn after the source has given it (a state set): let it be drawn before the look
    await act(async () => {});
    expect(doorsIn(viewEl())).toHaveLength(0);
  };
  // Every source the screens have asked has answered, and what it answered is drawn: the look for a 'nothing opened' step is made after this, never after a clock. A screen that asks no source has nothing to wait for.
  // A screen's ask first reads which sources are on (enabledSources) and only then asks them: reading it again here queues behind that read, so an ask begun is counted in `started` before the wait.
  const sourcesAnswered = async () => {
    await enabledSources();
    await waitFor(() => expect(answered).toBeGreaterThanOrEqual(started));
    await act(async () => {});
  };
  const footHasNone = async () => {
    // a door at the foot would be drawn from a source's answer: wait for every source asked since the page opened, then look
    await sourcesAnswered();
    expect(doorsIn(readerEl())).toHaveLength(0);
  };
  const tapPlaceLine = async () => {
    await tapLine();
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const tapDoor = async (_: unknown, label: string) => {
    await user.click(await findButton(label, viewEl));
  };
  const headed = async (_: unknown, title: string) => {
    await waitFor(async () => expect((await sheetEl()).getAttribute('aria-label')).toBe(title));
  };
  // The sheet's rows are drawn after the sheet is open, once the sources have answered: a step that wants a row waits for it (waitFor, looking in the sheet again each time), never looks once (mw-qtu3zvz.217).
  const mapRow = (title: string): Promise<HTMLElement> =>
    waitFor(async () => {
      const row = [...(await sheetEl()).querySelectorAll<HTMLElement>('[data-map-row]')].find((r) => r.querySelector('[data-map-title]')?.textContent === title);
      if (!row) throw new Error(`no map ${title} in the sheet`);
      return row;
    });
  const tapMap = async (_: unknown, title: string) => {
    await user.click(await mapRow(title));
    await mapEl();
  };
  const mapHeaded = async (_: unknown, title: string, when: string) => {
    const box = await mapEl();
    expect(within(box).getByRole('heading', { name: title })).toBeVisible();
    expect(squash(box.querySelector('[data-map-period]')?.textContent)).toBe(when);
  };
  const creditReads = async (_: unknown, credit: string, host: string, url: string) => {
    const box = await mapEl();
    expect(squash(box.querySelector('[data-map-credit]')?.textContent)).toBe(credit);
    const link = linkIn(box, host);
    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('target', '_blank');
  };
  const linksTo = async (_: unknown, name: string, url: string) => {
    expect(linkIn(await mapEl(), name)).toHaveAttribute('href', url);
  };
  const back = async () => {
    act(() => window.history.back());
    await sleep(60);
  };

  const tapHeading = async (_: unknown, text: string) => {
    const heading = await waitFor(() => {
      const found = [...document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')].find((h) => squash(h.textContent) === text);
      if (!found) throw new Error(`no heading ${text}`);
      return found;
    });
    await user.click(within(heading).getByRole('button'));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  /** The sheet's h3 headings: the parts of a verse's sheet ('For this verse', 'In this chapter'), or the groups of a chapter's. */
  const sheetParts = async () => [...(await sheetEl()).querySelectorAll('h3')].map((h) => squash(h.textContent));
  const partHolds = async (title: string) => {
    const part = (await sheetEl()).querySelector<HTMLElement>('[data-maps-part="verse"]');
    expect(squash(part?.querySelector('h3')?.textContent)).toBe(title);
    return [...(part as HTMLElement).querySelectorAll<HTMLElement>('[data-map-row]')].map((r) =>
      squash([r.querySelector('[data-map-title]')?.textContent, [r.querySelector('[data-map-period]')?.textContent, r.querySelector('[data-map-matched]')?.textContent].filter(Boolean).join(' · ')].filter(Boolean).join(', ')),
    );
  };
  /** A part of the verse's sheet ('For this verse') or a group ('Events') and the rows it holds, each as title, then period and the matched places. */
  const holds = async (name: string, rows: string[]) => {
    const found = name.startsWith('For ') ? await partHolds(name) : rowsOf(await groupEl(name));
    expect(found).toEqual(rows);
  };
  const holdsOne = (_: unknown, name: string, a: string) => holds(name, [a]);
  const holdsTwo = (_: unknown, name: string, a: string, b: string) => holds(name, [a, b]);
  const noPart = async () => {
    const box = await sheetEl();
    expect(box.querySelector('[data-maps-part]')).toBeNull();
    expect([...box.querySelectorAll('h3')].map((h) => squash(h.textContent))).toEqual(['Events', 'Regions', 'Videos']);
  };
  const groupsRead = async (_: unknown, names: string) => {
    // the sheet's groups come when the maps are read: wait for them, as a loaded host answers late
    await waitFor(async () => expect(within(await sheetEl()).queryAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(names.split(', ')));
  };

  const blockEl = async (name: string) => within(await sheetEl()).findByRole('group', { name });
  const linkRow = (title: string): Promise<HTMLAnchorElement> =>
    waitFor(async () => {
      const row = [...(await sheetEl()).querySelectorAll<HTMLAnchorElement>('a[data-map-row]')].find((r) => r.querySelector('[data-map-title]')?.textContent === title);
      if (!row) throw new Error(`no link row ${title} in the sheet`);
      return row;
    });
  const blockHolds = async (_: unknown, name: string, a: string, b?: string) => {
    expect(rowsOf(await blockEl(name))).toEqual(b === undefined ? [a] : [a, b]);
  };
  const linkOpensWithFallback = async (_: unknown, title: string, url: string, fallback: string) => {
    const row = await linkRow(title);
    expect(row).toHaveAttribute('href', url);
    expect(row).toHaveAttribute('data-fallback', fallback);
    expect(row.className).toContain('min-h-11');
    expect(row.textContent).toContain('↗');
  };
  const linkOpensInBrowser = async (_: unknown, title: string, url: string) => {
    const row = await linkRow(title);
    expect(row).toHaveAttribute('href', url);
    expect(row).toHaveAttribute('target', '_blank');
    expect(row).not.toHaveAttribute('data-fallback');
  };
  const tapLinkRow = async (_: unknown, title: string) => {
    const row = await linkRow(title);
    // jsdom cannot navigate: the tap is let through to the app's own handler and then stopped
    const stop = (event: Event) => event.preventDefault();
    document.addEventListener('click', stop);
    await user.click(row);
    document.removeEventListener('click', stop);
  };

  const openAbout = async () => {
    await openSettings(user);
    await openSettingsGroup(user, 'account');
    await user.click(screen.getByRole('button', { name: 'About', exact: true }));
    await screen.findByRole('heading', { name: 'About', level: 1 });
  };
  const aboutNames = (_: unknown, name: string) => {
    expect(screen.getAllByText(new RegExp(name.replace('.', '\\.'))).length).toBeGreaterThan(0);
  };

  Scenario('A verse with maps has the door on the Verse view', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    And('no verse of the text holds a Maps door', () => {
      for (const verse of document.querySelectorAll<HTMLElement>('[data-verse]')) expect(doorsIn(verse)).toHaveLength(0);
    });
  });

  Scenario('A chapter with no maps has no door', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string}', opened);
    Then('the chapter foot has no Maps door', footHasNone);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has no Maps door', viewHasNone);
  });

  Scenario("No chapter foot has the door, the New Testament's too", ({ Given, When, Then }) => {
    Given('Lampas is opened on {string}', opened);
    Then('the chapter foot has no Maps door', footHasNone);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
  });

  Scenario('A chapter that has maps has no door at its foot with the Immersive reader Off', ({ Given, Then }) => {
    Given('Lampas is opened on {string}', opened);
    Then('the chapter foot has no Maps door', footHasNone);
  });

  Scenario('Nor with the Immersive reader On, and the Verse view keeps the door', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} with the Immersive reader On', openedImmersive);
    Then('the chapter foot has no Maps door', footHasNone);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
  });

  Scenario('The sheet groups the maps and gives each its period', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the groups read {string}', async (_, names: string) => {
      const groups = within(await sheetEl()).getAllByRole('group');
      expect(groups.map((g) => g.getAttribute('aria-label'))).toEqual(names.split(', '));
    });
    And('{string} holds {string} and {string}', async (_, group: string, a: string, b: string) => {
      expect(rowsOf(await groupEl(group))).toEqual([a, b]);
    });
    And('{string} holds {string}, {string} and {string}', async (_, group: string, a: string, b: string, c: string) => {
      expect(rowsOf(await groupEl(group))).toEqual([a, b, c]);
    });
    And('the video {string} opens {string} in the browser', async (_, title: string, url: string) => {
      const link = within(await groupEl('Videos')).getByRole('link', { name: new RegExp(title) });
      expect(link).toHaveAttribute('href', url);
      expect(link).toHaveAttribute('target', '_blank');
    });
  });

  Scenario('A verse that names a place leads with the maps that show it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the sheet opens with {string} and then {string}', async (_, first: string, then: string) => {
      expect(await sheetParts()).toEqual([first, then]);
    });
    And('the part {string} holds {string} and {string}', holdsTwo);
    And('the groups read {string}', groupsRead);
    And('{string} holds {string}', holdsOne);
    And('{string} holds {string} and {string}', holdsTwo);
  });

  Scenario('A passage that names a place says For these verses', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the sheet opens with {string} and then nothing', async (_, first: string) => {
      expect(await sheetParts()).toEqual([first]);
    });
    And('the part {string} holds {string}', holdsOne);
  });

  Scenario('The place line opens the whole chapter, and its Verse view has the door', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps the place line', tapPlaceLine);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the groups read {string}', groupsRead);
  });

  Scenario('A verse that names no place the maps show has the sheet as before', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet has no part for the verse', noPart);
    And('the groups read {string}', groupsRead);
  });

  Scenario('A map opens in the app with its credit and the way back to the site', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he taps the map {string}', tapMap);
    Then('the map is headed {string} with the period {string}', mapHeaded);
    And("the map's picture is {string}", async (_, src: string) => {
      expect((await mapEl()).querySelector('img')).toHaveAttribute('src', src);
    });
    And('the credit reads {string} and {string} links to {string}', creditReads);
    And('{string} links to {string}', linksTo);
    And('{string} opens {string}', linksTo);
    And('the link {string} goes to {string}', linksTo);
    When("he taps the map's picture", async () => {
      await user.click(within(await mapEl()).getByRole('button', { name: /zoom|fit/i }));
    });
    Then('the picture is shown at twice the width', async () => {
      expect((await mapEl()).querySelector<HTMLElement>('[data-map-zoom]')).toHaveAttribute('data-map-zoom', 'in');
    });
    When("he taps the map's picture again", async () => {
      await user.click(within(await mapEl()).getByRole('button', { name: /zoom|fit/i }));
    });
    Then('the picture is shown at the width of the box', async () => {
      expect((await mapEl()).querySelector<HTMLElement>('[data-map-zoom]')).toHaveAttribute('data-map-zoom', 'fit');
    });
  });

  Scenario('The sheet opens before a slow source has answered, and a step that taps a map waits for its row', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with a source that can be slow to answer', openedSlow);
    When('he taps verse {int}', tapVerse);
    And('he taps {string} while its source is slow to answer', async (_, label: string) => {
      // the door is drawn from the answer the source gave before it was held: wait for it, then hold the source, so the sheet's own ask is the slow one
      await findButton(label, viewEl);
      holdSource();
      await tapDoor(_, label);
    });
    Then('the sheet is headed {string}', headed);
    And('he taps the map {string} before the source answers', async (_, title: string) => {
      // the tap is begun while the source is still held and the sheet has no row, and the source answers only once the sheet has been looked at and found empty: a tap that looks once fails here
      const tapped = tapMap(_, title).then(
        () => undefined,
        (error: unknown) => error,
      );
      expect((await sheetEl()).querySelectorAll('[data-map-row]')).toHaveLength(0);
      letSourceAnswer();
      const error = await tapped;
      if (error) throw error;
    });
    Then('the map is headed {string} with the period {string}', mapHeaded);
  });

  Scenario('Back from the map returns to the sheet, then to the verse', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he taps the map {string}', tapMap);
    And('he goes Back', back);
    Then('the sheet is headed {string}', headed);
    When('he goes Back', back);
    Then('no sheet is open and the Verse view shows', async () => {
      await waitFor(() => expect(sheetCount()).toBe(0));
      expect(viewEl()).toBeInTheDocument();
    });
  });

  Scenario("Offline the picture's place says so and every link stays", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he taps the map {string}', tapMap);
    And('the picture fails to load', async () => {
      fireEvent.error((await mapEl()).querySelector('img') as HTMLImageElement);
    });
    Then("the map's picture place says {string}", async (_, line: string) => {
      expect(await within(await mapEl()).findByText(line)).toBeVisible();
    });
    And('{string} links to {string}', linksTo);
    And('the credit reads {string} and {string} links to {string}', creditReads);
  });

  Scenario('About lists Bible Mapper', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string}', opened);
    When('he opens About', openAbout);
    Then('About names {string}', aboutNames);
  });

  Scenario('Both sources answer: Bible Mapper\'s block, then the link-only source\'s under its name', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the test atlas On', openedWithAtlas);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the groups read {string}', groupsRead);
    And('{string} holds {string} and {string}', holdsTwo);
    And('the {string} block holds {string} and {string}', blockHolds);
    And('the row {string} opens {string} and falls back to {string}', linkOpensWithFallback);
    And('the row {string} opens {string} in the browser', linkOpensInBrowser);
  });

  Scenario("A link-only source's row opens its link and never the map view", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the test atlas On', openedWithAtlas);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he taps the link row {string}', tapLinkRow);
    Then('only the sheet is open', async () => {
      // a map view opened by the tap would be drawn from the sources' answers: wait for them, then look
      await sourcesAnswered();
      expect(sheetCount()).toBe(1);
      expect(document.querySelector('[data-map-zoom]')).toBeNull();
    });
  });

  Scenario("Where Bible Mapper has no map for the chapter the other source's block is the sheet", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the test atlas On', openedWithAtlas);
    Then('the chapter foot has no Maps door', footHasNone);
    When('he taps the place line', tapPlaceLine);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the groups read {string}', groupsRead);
    And('the {string} block holds {string}', (_, name: string, a: string) => blockHolds(_, name, a));
  });

  Scenario('With the link-only source off the sheet is as before', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} with the test atlas Off', openedWithoutAtlas);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the groups read {string}', groupsRead);
  });

  Scenario('With Bible Mapper off and the link-only source on, only its block', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with the test atlas On and Bible Mapper Off', openedWithAtlasAlone);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the groups read {string}', groupsRead);
    And('the {string} block holds {string} and {string}', blockHolds);
  });

  Scenario("With Logos On, a verse's sheet ends with the Logos Atlas block: the atlas at the places and the commentary at the verse", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with Logos On', openedWithLogos);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the groups read {string}', groupsRead);
    And('the {string} block holds {string} and {string}', blockHolds);
    And('the row {string} opens {string} in the browser', linkOpensInBrowser);
    And('the row {string} opens {string} and falls back to {string}', linkOpensWithFallback);
  });

  Scenario('Where Bible Mapper has no map and the commentary does not cover the book, the Logos Atlas block alone is the sheet', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with Logos On', openedWithLogos);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the groups read {string}', groupsRead);
    And('the {string} block holds {string}', (_, name: string, a: string) => blockHolds(_, name, a));
    And('the row {string} opens {string} in the browser', linkOpensInBrowser);
  });

  Scenario("A verse the atlas has a map for lists that map, not the base map", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with Logos On', openedWithLogos);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the groups read {string}', groupsRead);
    And('the {string} block holds {string}, {string} and {string}', async (_, name: string, a: string, b: string, c: string) => {
      expect(rowsOf(await blockEl(name))).toEqual([a, b, c]);
    });
  });

  Scenario('With Logos Off the Logos Atlas has no block', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string} with Logos Off', openedWithoutLogos);
    When('he taps verse {int}', tapVerse);
    Then('the Verse view has a button {string}', viewHas);
    When('he taps {string}', tapDoor);
    Then('the groups read {string}', groupsRead);
  });

  Scenario('About lists the Logos Atlas', ({ Given, When, Then }) => {
    Given('Lampas is opened on {string}', opened);
    When('he opens About', openAbout);
    Then('About names {string}', aboutNames);
  });
});
