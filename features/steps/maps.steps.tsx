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
import { closeMaps } from '../../src/maps/openMaps';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { openSettingsGroup } from '../../tests/support/settings-pages';
import { forgetTestMaps, registerTestMaps } from '../../tests/support/test-maps';

afterAll(() => {
  cleanup();
  closeMaps();
  forgetTestMaps();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** Opens the app on a chapter (the address names it), with the test maps registered. */
async function openOn(title: string, immersive = false): Promise<void> {
  cleanup();
  closeMaps();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  registerTestMaps();
  stubChapterFetch();
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  if (immersive) await db.settings.put({ key: 'immersiveReader', value: 'on' });
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
  const openedImmersive = (_: unknown, title: string) => openOn(title, true);
  const tapVerse = async (_: unknown, n: number) => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const viewHas = async (_: unknown, label: string) => {
    expect(await within(viewEl()).findByRole('button', { name: label })).toBeVisible();
  };
  const viewHasNone = async () => {
    await sleep(100);
    expect(doorsIn(viewEl())).toHaveLength(0);
  };
  const footHas = async (_: unknown, label: string) => {
    await waitFor(() => expect(doorsIn(readerEl()).map((b) => squash(b.textContent))).toEqual([label]));
  };
  const footHasNone = async () => {
    await sleep(100);
    expect(doorsIn(readerEl())).toHaveLength(0);
  };
  const tapDoor = async (_: unknown, label: string) => {
    await user.click(await within(viewEl()).findByRole('button', { name: label }));
  };
  const headed = async (_: unknown, title: string) => {
    await waitFor(async () => expect((await sheetEl()).getAttribute('aria-label')).toBe(title));
  };
  const tapMap = async (_: unknown, title: string) => {
    const row = [...(await sheetEl()).querySelectorAll<HTMLElement>('[data-map-row]')].find((r) => r.querySelector('[data-map-title]')?.textContent === title);
    if (!row) throw new Error(`no map ${title} in the sheet`);
    await user.click(row);
    await mapEl();
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
    expect(within(await sheetEl()).getAllByRole('group').map((g) => g.getAttribute('aria-label'))).toEqual(names.split(', '));
  };
  const tapFootDoor = async (_: unknown, label: string) => {
    await waitFor(() => expect(doorsIn(readerEl())).toHaveLength(1));
    const door = doorsIn(readerEl()).find((b) => squash(b.textContent) === label);
    if (!door) throw new Error(`no door ${label} at the foot`);
    await user.click(door);
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

  Scenario("Every chapter foot has the door, the New Testament's too", ({ Given, Then }) => {
    Given('Lampas is opened on {string}', opened);
    Then('the chapter foot has a button {string}', footHas);
  });

  Scenario('The Immersive reader has no door in the Reader, and the Verse view keeps it', ({ Given, When, Then }) => {
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

  Scenario('A verse that names no place the maps show has the sheet as before', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet has no part for the verse', noPart);
    And('the groups read {string}', groupsRead);
  });

  Scenario("A whole chapter's sheet has no part for a verse and keeps Bible Mapper's order", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When("he taps the foot's door {string}", tapFootDoor);
    Then('the sheet is headed {string}', headed);
    And('the sheet has no part for the verse', noPart);
    And('the groups read {string}', groupsRead);
    And('{string} holds {string}, {string} and {string}', async (_, group: string, a: string, b: string, c: string) => {
      expect(rowsOf(await groupEl(group))).toEqual([a, b, c]);
    });
  });

  Scenario("The chapter foot's door opens the sheet for the chapter", ({ Given, When, Then }) => {
    Given('Lampas is opened on {string}', opened);
    When("he taps the foot's door {string}", async (_, label: string) => {
      await waitFor(() => expect(doorsIn(readerEl())).toHaveLength(1));
      const door = doorsIn(readerEl()).find((b) => squash(b.textContent) === label);
      if (!door) throw new Error(`no door ${label} at the foot`);
      await user.click(door);
    });
    Then('the sheet is headed {string}', headed);
  });

  Scenario('A map opens in the app with its credit and the way back to the site', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he taps the map {string}', tapMap);
    Then('the map is headed {string} with the period {string}', async (_, title: string, when: string) => {
      const box = await mapEl();
      expect(within(box).getByRole('heading', { name: title })).toBeVisible();
      expect(squash(box.querySelector('[data-map-period]')?.textContent)).toBe(when);
    });
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
    When('he opens About', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings', exact: true }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
      await openSettingsGroup(user, 'account');
      await user.click(screen.getByRole('button', { name: 'About', exact: true }));
      await screen.findByRole('heading', { name: 'About', level: 1 });
    });
    Then('About names {string}', (_, name: string) => {
      expect(screen.getAllByText(new RegExp(name.replace('.', '\\.'))).length).toBeGreaterThan(0);
    });
  });
});
