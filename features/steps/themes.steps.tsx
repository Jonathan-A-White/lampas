// features/steps/themes.steps.tsx — runs features/themes.feature: the Themes line and 'On the same theme' on the Sermons sheet (src/sermons/SermonsSheet.tsx, src/themes/) and the Themes section of Settings > Study resources
// (src/settings/controls/themes.tsx). The sheet's scenarios use theme lists and sermon sources of the tests' own (tests/support/test-themes.ts, test-sermons.ts) over the committed Romans 5 and Jonah 1; the
// Settings scenarios use the two lists the app bundles.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { closeSermons } from '../../src/sermons/openSermons';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { forgetTestMaps, registerTestMaps } from '../../tests/support/test-maps';
import { forgetTestSermons, registerTestSermons } from '../../tests/support/test-sermons';
import { forgetTestThemes, registerTestThemes } from '../../tests/support/test-themes';

// jsdom has no scrollIntoView: a row a link opens Settings at scrolls to itself
Element.prototype.scrollIntoView = function scrollIntoView() {};

afterAll(() => {
  cleanup();
  closeSermons();
  forgetTestSermons();
  forgetTestThemes();
  forgetTestMaps();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

async function reset(): Promise<void> {
  cleanup();
  closeSermons();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  registerTestMaps();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.library.clear()]);
}

/** Opens the app on a chapter (the address names it), with the test sermons and theme lists registered. */
async function openOn(title: string, themes: Parameters<typeof registerTestThemes>[0] = {}): Promise<void> {
  await reset();
  registerTestSermons();
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

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
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
const rowNamed = async (title: string): Promise<HTMLAnchorElement> => {
  const row = [...(await sheetEl()).querySelectorAll<HTMLAnchorElement>('a[data-sermon-row]')].find((r) => r.querySelector('[data-sermon-title]')?.textContent === title);
  if (!row) throw new Error(`no sermon ${title} in the sheet`);
  return row;
};

const feature = await loadFeature('features/themes.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = (_: unknown, title: string) => openOn(title);
  const tapVerse = async (_: unknown, n: number) => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
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
    await user.click(
      await waitFor(() => {
        const line = document.querySelector<HTMLElement>('button[data-place-line]');
        if (!line) throw new Error('no place line');
        return line;
      }),
    );
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const tapDoor = async (_: unknown, label: string) => {
    await user.click(await within(viewEl()).findByRole('button', { name: label }));
  };
  const headed = async (_: unknown, title: string) => {
    await waitFor(async () => expect((await sheetEl()).getAttribute('aria-label')).toBe(title));
  };
  const themesLineReads = async (_: unknown, line: string) => {
    await waitFor(async () => expect(squash((await sheetEl()).querySelector('[data-sermons-themes]')?.textContent)).toBe(line));
  };
  const noThemesLine = async () => {
    // the line comes as soon as the themes are read, after the sermons of the passage
    await waitFor(async () => expect(await partTitles()).not.toEqual([]));
    await act(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));
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
    And('the Themes line reads {string}', themesLineReads);
  });

  Scenario('A passage names the topics of any of its verses', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string}', opened);
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapDoor);
    Then('the sheet is headed {string}', headed);
    And('the Themes line reads {string}', themesLineReads);
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
      const sheet = await sheetEl();
      const hrefs = (selector: string) => [...sheet.querySelectorAll<HTMLAnchorElement>(`${selector} a[data-sermon-row]`)].map((a) => a.getAttribute('href'));
      const passage = [...hrefs('[data-sermons-part="here"]'), ...hrefs('[data-sermons-part="chapter"]')];
      const themed = hrefs('[data-sermons-part="theme"]');
      expect(passage).toHaveLength(4);
      expect(themed.length).toBeGreaterThan(0);
      for (const href of themed) expect(passage).not.toContain(href);
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
