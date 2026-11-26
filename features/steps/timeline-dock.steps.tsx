// features/steps/timeline-dock.steps.tsx — runs features/timeline-dock.feature: the Timeline row of the Split sheet (src/reader/split/SplitChooser.tsx), the dock's row and body when it holds the
// timeline (src/timeline/TimelineDock.tsx, TimelineStrip.tsx) and the setting that keeps it (splitTimeline). The data is the rig's own Theographic files, loaded as the app loads them. jsdom has no
// layout and no canvas: the strip is given a box of 390 by 282 px here (its own getBoundingClientRect), which is what its lanes and buttons are worked out from; nothing is drawn. jsdom has no
// matchMedia either, which the strip reads as reduced motion, so every move lands at once.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { findButton, queryButton } from '../../tests/support/find-button';
import { sheetEntriesGone } from '../../tests/support/sheet-history';
import { closeDatabase } from './close-database';

const STRIP = { width: 390, height: 282 };
const ownRect = HTMLElement.prototype.getBoundingClientRect;

beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement): DOMRect {
    if (!this.hasAttribute('data-timeline-strip')) return ownRect.call(this);
    return { x: 0, y: 0, left: 0, top: 0, right: STRIP.width, bottom: STRIP.height, width: STRIP.width, height: STRIP.height, toJSON: () => ({}) };
  };
});

afterAll(async () => {
  cleanup();
  HTMLElement.prototype.getBoundingClientRect = ownRect;
  vi.unstubAllGlobals();
  await closeDatabase();
});

const user = userEvent.setup();
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

const dockEl = () => document.querySelector<HTMLElement>('[data-dock]');
const stripEl = () => document.querySelector<HTMLElement>('[data-timeline-strip]');
const sheetEl = (name: string) => screen.findByRole('dialog', { name });
/** What the strip says of where it stands: the words a screen reader hears with the strip's name. */
const stands = (): string => {
  const strip = stripEl();
  const id = strip?.getAttribute('aria-describedby');
  return squash(id ? document.getElementById(id)?.textContent : '');
};

/** A row of the Split sheet by its name (its first line; whose it is stands on the second). */
const rowOf = async (sheet: HTMLElement, label: string): Promise<HTMLElement> =>
  waitFor(() => {
    const row = [...sheet.querySelectorAll<HTMLElement>('[data-split-text]')].find((r) => squash(r.querySelector('span > span')?.textContent) === label);
    if (!row) throw new Error(`no row named ${label}`);
    return row;
  });

/** Draws the app on a chapter ('Isaiah 1': the book's name and the chapter), keeping what the store holds. */
async function draw(title: string): Promise<void> {
  cleanup();
  await sheetEntriesGone();
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

/** A fresh phone on a chapter, with `settings` already kept. */
async function openOn(title: string, settings: Record<string, string> = {}): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  await db.settings.bulkPut(Object.entries(settings).map(([key, value]) => ({ key, value })));
  await draw(title);
}

/** The strip has come to rest with every book's file read. */
async function stripReady(): Promise<void> {
  await waitFor(() => expect(stripEl()).toHaveAttribute('data-timeline-loaded'));
}

const feature = await loadFeature('features/timeline-dock.feature');

describeFeature(feature, ({ Scenario }) => {
  let opened = '';
  const open = async (_: unknown, title: string) => {
    opened = title;
    await openOn(title);
  };
  const docked = async (_: unknown, title: string) => {
    opened = title;
    await openOn(title, { readerSplit: 'on', splitTimeline: 'on' });
    await waitFor(() => expect(stripEl()).not.toBeNull());
    await stripReady();
  };
  const tapSplit = async (_: unknown, n: number, label: string) => {
    await user.click(await findButton(`Verse ${n}`));
    const view = await screen.findByRole('region', { name: 'Verse view' });
    await user.click(await findButton(label, () => within(view).getByRole('group', { name: 'Tools' })));
  };
  const choose = async (_: unknown, label: string) => {
    const sheet = await screen.findByRole('dialog', { name: /^Beside / });
    await user.click(await rowOf(sheet, label));
  };
  const rowReads = async (_: unknown, name: string, whole: string, close: string) => {
    await waitFor(() => expect(dockEl()).not.toBeNull());
    const row = dockEl()!.querySelector<HTMLElement>('[data-dock-handle]')!;
    await waitFor(() => expect(squash(row.querySelector('[data-dock-title]')?.textContent)).toBe(name));
    const labels = [...row.querySelectorAll('button')].map((b) => squash(b.textContent));
    expect(labels.slice(-2)).toEqual([whole, close]);
  };
  const pressed = (on: boolean) => async (_: unknown, label: string) => {
    await waitFor(() => expect(queryButton(label, dockEl()!)).toHaveAttribute('aria-pressed', String(on)));
  };
  const standsOn = async (_: unknown, words: string) => {
    await stripReady();
    await waitFor(() => expect(stands()).toBe(words));
  };
  const press = async (_: unknown, label: string) => {
    await user.click(await findButton(label));
    await act(async () => {});
  };
  const nameIs = async (_: unknown, name: string) => {
    await waitFor(() => expect(squash(dockEl()?.querySelector('[data-dock-title]')?.textContent)).toBe(name));
  };

  Scenario('The Split sheet offers Timeline beside the texts and the map', ({ Given, When, Then, And }) => {
    Given('the Reader is open on {string}', open);
    When('he taps verse {number} and then {string}', tapSplit);
    Then('the sheet {string} offers {string} with {string} under it', async (_, name: string, label: string, whose: string) => {
      const sheet = await sheetEl(name);
      const row = await rowOf(sheet, label);
      expect(squash(row.textContent)).toContain(whose);
      expect(row).not.toHaveAttribute('aria-current');
    });
    And('{string} comes after the texts and before {string}', async (_, label: string, last: string) => {
      const sheet = await screen.findByRole('dialog', { name: /^Beside / });
      // the map's row is drawn when the chapter's maps have been read; a chapter with none ends with the Timeline
      const rows = [...sheet.querySelectorAll<HTMLElement>('[data-split-text]')].map((row) => row.dataset.splitText);
      const at = rows.indexOf('timeline');
      expect(at).toBeGreaterThan(0);
      expect(rows.slice(0, at)).toEqual(['hebrew', 'english']);
      expect(rows.slice(at + 1).every((row) => row === 'map')).toBe(true);
      expect([label, last]).toEqual(['Timeline', 'A map']);
    });
  });

  Scenario("Timeline docks a strip at the chapter's time, with the chapter's events and people marked", ({ Given, When, Then, And }) => {
    Given('the Reader is open on {string}', open);
    When('he taps verse {number} and then {string}', tapSplit);
    And('he chooses {string} in the sheet', choose);
    Then('the sheet and the Verse view are closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Beside / })).toBeNull());
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull());
    });
    And('the dock\'s row reads {string}, {string} and {string}', rowReads);
    And('{string} is not pressed', pressed(false));
    And('the strip stands on {string}', standsOn);
    And('the strip has a button {string}', async (_, label: string) => {
      expect(await findButton(label, stripEl()!)).toHaveAttribute('data-mark');
    });
    And('the strip has a button for the life of {string}, {string}, {string} and {string}', async (_, a: string, b: string, c: string, d: string) => {
      for (const name of [a, b, c, d]) expect(await findButton(new RegExp(`^${name}, about \\d+ to \\d+ BC$`), stripEl()!)).toHaveAttribute('data-mark', expect.stringMatching(/^p/));
    });
  });

  Scenario("The credit line shows and the Bible Mapper link opens at the strip's year", ({ Given, Then, And }) => {
    Given('the Timeline is docked beside {string}', docked);
    Then('the dock shows the credit {string}', (_, credit: string) => {
      expect(squash(dockEl()!.querySelector('[data-timeline-credit]')?.textContent)).toBe(credit);
    });
    And('the link {string} opens {string}', async (_, name: string, href: string) => {
      await stripReady();
      const link = within(dockEl()!).getByRole('link', { name });
      await waitFor(() => expect(link).toHaveAttribute('href', href));
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  Scenario('Whole Bible zooms out to the whole Bible and back', ({ Given, When, Then, And }) => {
    Given('the Timeline is docked beside {string}', docked);
    When('he presses {string}', press);
    Then('{string} is pressed', pressed(true));
    And('the strip stands on {string}', standsOn);
    And('the strip has no button {string} to press', async (_, label: string) => {
      expect(await findButton(label, stripEl()!)).toHaveAttribute('aria-disabled', 'true');
    });
    When('he presses {string} again', press);
    Then('{string} is not pressed', pressed(false));
    And('the strip is back on {string}', standsOn);
  });

  Scenario("Later moves on through time, and the chapter's name at the side goes back", ({ Given, When, Then, And }) => {
    Given('the Timeline is docked beside {string}', docked);
    When('he presses {string} three times', async (_, label: string) => {
      for (let i = 0; i < 3; i++) await press(_, label);
    });
    Then('the strip stands on {string}', standsOn);
    And('the strip offers {string}', async (_, label: string) => {
      expect(await findButton(label, stripEl()!)).toBeVisible();
    });
    When('he presses {string}', press);
    Then('the strip is back on {string}', standsOn);
  });

  Scenario('Zoom in and Zoom out double and halve, and Earlier moves back through time', ({ Given, When, Then }) => {
    Given('the Timeline is docked beside {string}', docked);
    When('he presses {string}', press);
    Then('the strip stands on {string}', standsOn);
    When('he presses {string} and then {string}', async (_, first: string, second: string) => {
      await press(_, first);
      await press(_, second);
    });
    Then('the strip has moved to {string}', standsOn);
  });

  Scenario('A reload brings the timeline back', ({ Given, When, Then, And }) => {
    Given('the Timeline is docked beside {string}', docked);
    When('the app is opened again', async () => {
      await draw(opened);
    });
    Then('the dock\'s row reads {string}, {string} and {string}', rowReads);
    And('the strip stands on {string}', standsOn);
  });

  Scenario("A text chosen from the dock's name takes the timeline's place", ({ Given, When, Then, And }) => {
    Given('the Timeline is docked beside {string}', docked);
    When("he taps the dock's name", async () => {
      await user.click(dockEl()!.querySelector<HTMLElement>('[data-dock-handle] button[aria-haspopup="dialog"]')!);
    });
    Then('the sheet {string} has {string} ticked', async (_, name: string, label: string) => {
      const sheet = await sheetEl(name);
      expect(await rowOf(sheet, label)).toHaveAttribute('aria-current', 'true');
    });
    When('he chooses {string} in the sheet', choose);
    Then("the dock's name is {string}", nameIs);
    And('the dock has no strip', async () => {
      await waitFor(() => expect(stripEl()).toBeNull());
    });
  });

  Scenario('A book with no dated event says so and shows the whole Bible', ({ Given, Then, And }) => {
    Given('the Timeline is docked beside {string}', docked);
    Then("the dock's name is {string}", nameIs);
    And('the strip stands on {string}', standsOn);
  });
});
