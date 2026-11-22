// features/steps/themes.steps.tsx — runs features/themes.feature: the Themes line and 'On the same theme' on the Sermons sheet (src/sermons/SermonsSheet.tsx, src/themes/) and the Themes section of Settings > Study resources
// (src/settings/controls/themes.tsx). The sheet's scenarios use theme lists and sermon sources of the tests' own (tests/support/test-themes.ts, test-sermons.ts) over the committed Romans 5 and Jonah 1; the
// Settings scenarios use the two lists the app bundles.
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
import { setSermonSources } from '../../src/sermons';
import { closeSermons } from '../../src/sermons/openSermons';
import type { SermonSource } from '../../src/sermons/types';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { findButton } from '../../tests/support/find-button';
import { tapPlaceLine as tapLine } from '../../tests/support/place-line';
import { sheetEntriesGone } from '../../tests/support/sheet-history';
import { forgetTestMaps, registerTestMaps } from '../../tests/support/test-maps';
import { sourceOf } from '../../tests/support/sermon-sources';
import { offSource, TEST_ROWS, forgetTestSermons, registerTestSermons } from '../../tests/support/test-sermons';
import { forgetTestThemes, registerTestThemes } from '../../tests/support/test-themes';
import { closeDatabase } from './close-database';

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

afterAll(async () => {
  cleanup();
  closeSermons();
  forgetTestSermons();
  forgetTestThemes();
  forgetTestMaps();
  clearBus();
  vi.unstubAllGlobals();
  await closeDatabase();
});

const user = userEvent.setup();
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

async function reset(): Promise<void> {
  cleanup();
  // a scenario that ended with the Sermons sheet open: its step Back lands before the next scenario sets its address, or the app opens on the verse beneath (mw-qtu3zvz.227, tests/support/sheet-history.ts)
  await sheetEntriesGone();
  closeSermons();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  registerTestMaps();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.library.clear()]);
  // a phone whose shelf holds no default book: with no list kept the shelf says what he has (mw-5r3p30.1189), and the old keys' defaults would put forty books on it
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
  ]);
}

/** Opens the app on a chapter (the address names it), with the test sermons and theme lists registered. */
async function openOn(title: string, themes: Parameters<typeof registerTestThemes>[0] = {}, sources?: SermonSource[], turnedOn: string[] = []): Promise<void> {
  await reset();
  if (sources) setSermonSources(sources);
  else registerTestSermons();
  await db.settings.bulkPut(turnedOn.map((id) => ({ key: `sermons.${id}`, value: 'on' })));
  registerTestThemes(themes);
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function openStudy(): Promise<void> {
  await reset();
  window.history.replaceState(null, '', '/#/settings?group=study');
  render(<App />);
  await screen.findByRole('region', { name: 'Study resources' });
}

const sheetEl = () => screen.findByRole('dialog', { name: /^Sermons for / });
const themesSection = async (): Promise<HTMLElement> =>
  waitFor(() => {
    const section = document.querySelector<HTMLElement>('[data-section="themes"]');
    if (!section) throw new Error('no Themes section');
    return section;
  });
const switchOf = async (name: string) => within(await themesSection()).findByRole('group', { name });
const pressed = async (name: string): Promise<string[]> =>
  within(await switchOf(name))
    .getAllByRole('button')
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => b.textContent ?? '');
const partTitles = async (): Promise<string[]> => [...(await sheetEl()).querySelectorAll('h3')].map((h) => squash(h.textContent));
/** The titles of the rows of a group of the sheet, and the position of the group among its siblings. */
const groupRows = async (name: string): Promise<string[]> => {
  const group = await within(await sheetEl()).findByRole('group', { name });
  return [...group.querySelectorAll('[data-sermon-title]')].map((t) => squash(t.textContent));
};
const themeGroups = async (): Promise<string[]> => [...(await sheetEl()).querySelectorAll('[data-theme-topic]')].map((g) => g.getAttribute('aria-label') ?? '');
// The sheet's rows are drawn after the sheet is open (the sources answer later), so the row is waited for, not looked for once (mw-indx1x6.92).
const rowNamed = (title: string): Promise<HTMLAnchorElement> =>
  waitFor(async () => {
    const row = [...(await sheetEl()).querySelectorAll<HTMLAnchorElement>('a[data-sermon-row]')].find((r) => r.querySelector('[data-sermon-title]')?.textContent === title);
    if (!row) throw new Error(`no sermon ${title} in the sheet`);
    return row;
  });

/** A source that is On and has only the Romans 5:12-21 sermons, away from verse 8, and the Off source that has every row: Atonement links 5:12-21, Love-Hatred only 5:6-8 and Jonah 1:4-10. */
const farSources = (): SermonSource[] => [sourceOf('testsermons', 'Test Sermons', { rom: TEST_ROWS.rom.filter((r) => r.id === 'reign' || r.id === 'adam') }), offSource];

const feature = await loadFeature('features/themes.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = (_: unknown, title: string) => openOn(title);
  const tapVerse = async (_: unknown, n: number) => {
    // findButton, not a role query over the chapter's hundreds of buttons (mw-indx1x6.125, tests/unit/step-verse-button-query.test.ts)
    await user.click(await findButton(`Verse ${n}`));
    await screen.findByRole('region', { name: 'Verse view' });
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
  const tapPlaceLine = async () => {
    await tapLine();
    await screen.findByRole('region', { name: 'Verse view' });
  };
  // findButton, not a role query: the Verse view of a whole chapter holds the chapter's ~hundreds of chunk buttons, and findByRole works out each one's name at every poll, outrunning the wait on a loaded host and, by
  // hogging the event loop, starving the database the door's sermons are read from, so the door came after the wait had ended (mw-indx1x6.118)
  const tapDoor = async (_: unknown, label: string) => {
    await user.click(await findButton(label));
  };
  const headed = async (_: unknown, title: string) => {
    await waitFor(async () => expect((await sheetEl()).getAttribute('aria-label')).toBe(title));
  };
  const chipNames = async (): Promise<string[]> => [...(await sheetEl()).querySelectorAll('[data-sermons-themes] [data-theme-chip]')].map((c) => squash(c.textContent));
  const themesLineOffers = async (_: unknown, line: string) => {
    await waitFor(async () => expect((await chipNames()).join(' · ')).toBe(line));
  };
  const hasButton = async (_: unknown, label: string) => {
    await waitFor(async () => expect(within((await sheetEl()).querySelector('[data-sermons-themes]') as HTMLElement).getByRole('button', { name: label })).toBeTruthy());
  };
  const noThemesLine = async () => {
    // the line comes as soon as the themes are read, after the sermons of the passage: the sheet says when they are (data-themes-read on its title), so the absence is looked at once they are, not after a clock
    await waitFor(async () => expect((await sheetEl()).querySelector('[role="status"], h3')).not.toBeNull());
    await waitFor(async () => expect((await sheetEl()).querySelector('[data-themes-read]')).not.toBeNull());
    expect((await sheetEl()).querySelector('[data-sermons-themes]')).toBeNull();
  };
  const opensWithTwo = async (_: unknown, first: string, then: string) => {
    await waitFor(async () => expect(await partTitles()).toEqual(then === 'nothing' ? [first] : [first, then]));
  };
  const themeHolds = async (_: unknown, group: string, title: string) => {
    await waitFor(async () => expect(await groupRows(group)).toEqual([title]));
  };
  const afterIt = async (_: unknown, group: string, title: string) => {
    await themeHolds(_, group, title);
    // headed groups come in the order of the topics' sizes: the one named here is the later one
    const groups = await themeGroups();
    expect(groups.indexOf(group)).toBeGreaterThan(0);
  };
  const rowReads = async (_: unknown, title: string, line: string) => {
    await waitFor(async () => expect(squash((await rowNamed(title)).querySelector('[data-sermon-meta]')?.textContent)).toBe(line));
  };

  Scenario('The sheet names the topics of the verse under its title', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the Themes line offers {string}', themesLineOffers);
  });

  Scenario('A passage names the topics of any of its verses', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the Themes line offers {string}', themesLineOffers);
  });

  Scenario('A theme whose sermons are all in a source that is Off is not on the Themes line', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with a source On whose sermons are far from verse 8, and an Off source that has the rest', (_, title: string) => openOn(title, {}, farSources()));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the Themes line offers {string}', themesLineOffers);
  });

  Scenario('The same Off source turned On puts its themes on the Themes line', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with a source On whose sermons are far from verse 8, and an Off source that has the rest turned On', (_, title: string) => openOn(title, {}, farSources(), ['testoff']));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the Themes line offers {string}', themesLineOffers);
  });

  Scenario('A theme is a button that lists its sermons, with a way back', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    And('he taps the theme {string}', async (_, name: string) => {
      await user.click(await waitFor(async () => within(await sheetEl()).getByRole('button', { name })));
    });
    Then('the theme {string} holds {string}, {string} and {string}', async (_, group: string, a: string, b: string, c: string) => {
      await waitFor(async () => expect(await groupRows(group)).toEqual([a, b, c]));
    });
    And('the Themes line is gone', async () => {
      expect((await sheetEl()).querySelector('[data-sermons-themes]')).toBeNull();
    });
    When('he goes back to the sheet', async () => {
      await user.click(within(await sheetEl()).getByRole('button', { name: /Back to the sheet/ }));
    });
    Then('the Themes line now offers {string}', themesLineOffers);
    And('the sheet opens with {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      await waitFor(async () => expect(await partTitles()).toEqual([a, b, c]));
    });
  });

  Scenario('Past four themes the Themes line says More, and More shows the rest', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with five themes', (_, title: string) => openOn(title, { more: true }));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the Themes line offers {string}', themesLineOffers);
    And('the Themes line has a {string} button', hasButton);
    When('he taps {string}', tapDoor);
    Then('the Themes line now offers {string}', themesLineOffers);
    And('the Themes line then has a {string} button', hasButton);
  });

  Scenario('A whole chapter has no Themes line and no sermons on the same theme', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps the place line', tapPlaceLine);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the sheet has no Themes line', noThemesLine);
    And('the sheet opens with {string} and then nothing', (_, first: string) => opensWithTwo(_, first, 'nothing'));
  });

  Scenario('The sermons on the same theme follow In this chapter, headed by their topic', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet opens with {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      await waitFor(async () => expect(await partTitles()).toEqual([a, b, c]));
    });
    And('the theme {string} holds {string}', themeHolds);
    And('after it the theme {string} holds {string}', afterIt);
    And('no sermon of the passage is repeated on the same theme', async () => {
      await waitFor(async () => {
        const sheet = await sheetEl();
        const hrefs = (selector: string) => [...sheet.querySelectorAll<HTMLAnchorElement>(`${selector} a[data-sermon-row]`)].map((a) => a.getAttribute('href'));
        const passage = [...hrefs('[data-sermons-part="here"]'), ...hrefs('[data-sermons-part="chapter"]')];
        const themed = hrefs('[data-sermons-part="theme"]');
        expect(passage).toHaveLength(4);
        expect(themed.length).toBeGreaterThan(0);
        for (const href of themed) expect(passage).not.toContain(href);
      });
    });
  });

  Scenario('A sermon on two topics is on the narrower one, across two lists', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with a second theme list', (_, title: string) => openOn(title, { second: true }));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the theme {string} holds {string}', themeHolds);
    And('after it the theme {string} holds {string}', afterIt);
    And('the sheet names the credit of {string} and {string}', async (_, a: string, b: string) => {
      await waitFor(async () => {
        const credits = [...(await sheetEl()).querySelectorAll('[data-sermon-credit]')].map((c) => squash(c.textContent));
        expect(credits.filter((c) => /Themes/.test(c))).toEqual([`${a}: ${a}, a source of the tests’ own`, `${b}: ${b}, a source of the tests’ own`]);
      });
    });
  });

  Scenario('A theme list that is Off leaves no line and no rows', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} with every theme list Off', (_, title: string) => openOn(title, { off: true }));
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the sheet has no Themes line', noThemesLine);
    And('the sheet opens with {string} and then {string}', opensWithTwo);
  });

  Scenario('A sermon on the same theme is a plain link out like the others', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps verse {int}', tapVerse);
    And('he taps {string}', tapDoor);
    Then('the theme {string} holds {string}', themeHolds);
    And('the row {string} reads {string}', rowReads);
    And('the row {string} is a link to {string}', async (_, title: string, url: string) => {
      const row = await rowNamed(title);
      expect(row).toHaveAttribute('href', url);
      expect(row).toHaveAttribute('target', '_blank');
      expect(row.getAttribute('rel')).toContain('noopener');
      expect(row.className).toContain('min-h-11');
    });
  });

  Scenario('Settings has an On or Off row for each theme list, both On to start', ({ Given, Then, And }) => {
    Given('Settings is open at Study resources', openStudy);
    Then('the Themes section shows {string} On', async (_, name: string) => {
      await waitFor(async () => expect(await pressed(name)).toEqual(['On']));
    });
    And('the Themes section shows {string} On', async (_, name: string) => {
      await waitFor(async () => expect(await pressed(name)).toEqual(['On']));
    });
  });

  Scenario('Turning a theme list Off is kept', ({ Given, When, Then, And }) => {
    Given('Settings is open at Study resources', openStudy);
    When('he turns {string} Off in the Themes section', async (_, name: string) => {
      await user.click(within(await switchOf(name)).getByRole('button', { name: 'Off' }));
    });
    Then('the Themes section shows {string} Off', async (_, name: string) => {
      await waitFor(async () => expect(await pressed(name)).toEqual(['Off']));
    });
    And('the setting {string} is kept as {string}', async (_, key: string, value: string) => {
      await waitFor(async () => expect((await db.settings.get(key))?.value).toBe(value));
    });
  });
});
