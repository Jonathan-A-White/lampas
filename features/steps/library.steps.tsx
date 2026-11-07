// features/steps/library.steps.tsx — runs features/library.feature: the Library screen (#/library, src/library/LibraryScreen.tsx) and a kind's page (#/library?kind=lexicon,
// src/library/KindPage.tsx), proven in the whole app over the Dexie shelf (src/data/repositories/library.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { getLogosBibles, setLogosBible, setLogosBibleFor, setState, shelfOf, type ShelfState } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { CATALOGUE, entriesOf } from '../../src/resources/catalogue';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const list = (text: string): string[] => text.split(',').map((s) => s.trim());

/** The catalogue entry whose short name (the name a row goes by) is `short`. */
const book = (short: string) => {
  const entry = CATALOGUE.find((e) => e.short === short);
  if (!entry) throw new Error(`no book ${short} in the catalogue`);
  return entry;
};

/** A phone whose old keys all say nothing is ticked, so the shelf takes nothing from them: an empty shelf, then `rows` put on it. */
async function shelfHolds(rows: readonly (readonly [string, ShelfState])[]): Promise<void> {
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear()]);
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
  ]);
  await shelfOf();
  for (const [short, state] of rows) expect(await setState(book(short).resource, state)).toEqual({ ok: true });
}

/** Opens the app at `address`. */
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

/** A book's control: the radio group named by the book's short name. */
const control = (short: string) => screen.getByRole('radiogroup', { name: short });
const setting = (short: string): string | undefined => within(control(short)).queryAllByRole('radio').find((r) => r.getAttribute('aria-checked') === 'true')?.textContent ?? undefined;
const kindRow = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}\\b`) });
/** The names of the books on a kind page, top to bottom; the Greek ones when the page is grouped (Lexicons: Hebrew, then Greek, mw-5r3p30.1117). */
const listed = (): string[] => {
  const rows = Array.from(screen.getByTestId('searchable-list-box').querySelectorAll('h2, [role="radiogroup"]'));
  const greek = rows.findIndex((el) => el.tagName === 'H2' && el.textContent === 'Greek');
  return rows.slice(greek + 1).map((g) => g.getAttribute('aria-label') ?? '');
};

const feature = await loadFeature('features/library.feature');

describeFeature(feature, ({ Scenario }) => {
  const opened = async (_: unknown, title: string) => {
    expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
  };
  const pageSays = async (_: unknown, text: string) => {
    await waitFor(() => expect(screen.getByTestId('kind-status')).toHaveTextContent(new RegExp(`^${text}$`)));
  };
  let before: string[] = [];
  const orderIs = (_: unknown, first: string, second: string) => {
    const names = listed();
    expect(names.slice(0, 2)).toEqual([first, second]);
    // the rest are off, in title order
    const rest = names.slice(2);
    for (const name of rest) expect(setting(name)).toBe('Off');
    before = names;
  };
  const staysPut = (_: unknown, first: string, second: string) => {
    const names = listed();
    expect(names.slice(0, 2)).toEqual([first, second]);
    // the one he turned on has not moved from under his thumb
    expect(names).toEqual(before);
  };
  const setTo = async (_: unknown, short: string, to: string) => {
    const group = await screen.findByRole('radiogroup', { name: short });
    await user.click(within(group).getByRole('radio', { name: to }));
  };
  const isSet = async (_: unknown, short: string, to: string) => {
    await waitFor(() => expect(setting(short)).toBe(to));
  };
  const opensKind = async (_: unknown, kind: string) => {
    await openAt(`#/library?kind=${kind}`);
  };
  const searches = async (_: unknown, text: string) => {
    const field = await screen.findByRole('searchbox', { name: 'Search your books' });
    await user.clear(field);
    await user.type(field, text);
  };
  const rowReads = async (_: unknown, label: string, reads: string) => {
    await waitFor(() => expect(within(kindRow(label)).getByTestId('kind-count')).toHaveTextContent(new RegExp(`^${reads}$`)));
  };
  const resultTitles = (): string[] => screen.queryAllByTestId('result-title').map((e) => e.textContent ?? '');

  Scenario('The home shows the card and the nine kinds with counts from the shelf', ({ Given, When, Then, And }) => {
    Given(
      'his shelf holds the lexicons {string} On with {string} pinned, the grammar {string} On and Settings sets the Bible {string} for every part',
      async (_, lexicons: string, pinned: string, grammar: string, bible: string) => {
        await shelfHolds([...list(lexicons).map((l): [string, ShelfState] => [l, l === pinned ? 'pinned' : 'on']), [grammar, 'on']]);
        await setLogosBible(book(bible).resource);
      },
    );
    When('he opens the Library', async () => {
      await openAt('#/library');
    });
    Then('the page {string} is open', opened);
    And('the card counts {int} books on out of all the books of the catalogue', async (_, on: number) => {
      await waitFor(() => expect(screen.getByTestId('library-card')).toHaveTextContent(`${on} of the ${CATALOGUE.length} books Lampas can open are on.`));
    });
    And('the kinds listed are {string}', (_, kinds: string) => {
      expect(screen.getAllByTestId('kind-row').map((r) => r.getAttribute('data-label'))).toEqual(list(kinds));
    });
    And('the rows read', async (_, table: { kind: string; reads: string }[]) => {
      for (const { kind, reads } of table) await rowReads(null, kind, reads);
    });
    When('the shelf puts {string} Off', async (_, short: string) => {
      await setState(book(short).resource, 'off');
    });
    Then('the row {string} reads {string}', rowReads);
  });

  Scenario('A kind page lists its books pinned first, then on, then off', ({ Given, When, Then, And }) => {
    Given('his shelf holds the lexicons {string} On with {string} pinned', async (_, lexicons: string, pinned: string) => {
      await shelfHolds(list(lexicons).map((l): [string, ShelfState] => [l, l === pinned ? 'pinned' : 'on']));
    });
    When('he opens the Library at the kind {string}', opensKind);
    Then('the page {string} is open', opened);
    And('the page says {string}', pageSays);
    And('the Greek books are listed with {string} first, then {string}, then those that are off', async (_, first: string, second: string) => {
      await waitFor(() => orderIs(null, first, second));
    });
    And('{string} is set to {string} and {string} is set to {string} and {string} is set to {string}', async (_, a: string, as: string, b: string, bs: string, c: string, cs: string) => {
      await waitFor(() => expect([setting(a), setting(b), setting(c)]).toEqual([as, bs, cs]));
    });
    When('he sets {string} to {string}', setTo);
    Then('{string} is set to {string}', isSet);
    And('the count now reads {string}', pageSays);
    And('the Greek books are still where they were, {string} first, then {string}', async (_, first: string, second: string) => {
      await waitFor(() => staysPut(null, first, second));
    });
  });

  Scenario('All on turns a kind On and All off turns it Off', ({ Given, When, And, Then }) => {
    Given('his shelf holds the lexicons {string} On with {string} pinned', async (_, lexicons: string, pinned: string) => {
      await shelfHolds(list(lexicons).map((l): [string, ShelfState] => [l, l === pinned ? 'pinned' : 'on']));
    });
    When('he opens the Library at the kind {string}', opensKind);
    And('he taps {string}', async (_, label: string) => {
      await user.click(await screen.findByRole('button', { name: label }));
    });
    Then('every lexicon is set to On or Pin', async () => {
      await waitFor(() => {
        for (const e of entriesOf('lexicon')) expect(['On', 'Pin']).toContain(setting(e.short));
      });
    });
    And('{string} is set to {string}', isSet);
    And('the page says {string}', pageSays);
    When('he then taps {string}', async (_, label: string) => {
      await user.click(await screen.findByRole('button', { name: label }));
    });
    Then('every lexicon is set to {string}', async (_, to: string) => {
      await waitFor(() => {
        for (const e of entriesOf('lexicon')) expect(setting(e.short)).toBe(to);
      });
    });
    And('the count reads {string}', pageSays);
  });

  Scenario('Search finds by title and by author across kinds and opens the kind page at the book', ({ Given, When, And, Then }) => {
    Given('his shelf holds nothing', async () => {
      await shelfHolds([]);
    });
    When('he opens the Library', async () => {
      await openAt('#/library');
    });
    And('he searches the Library for {string}', searches);
    Then('the results include the commentary {string} and the devotional {string}', async (_, commentary: string, devotional: string) => {
      await waitFor(() => expect(resultTitles()).toEqual(expect.arrayContaining([commentary, devotional])));
    });
    When('he then searches for {string}', searches);
    Then('the results are only the devotional {string}', async (_, title: string) => {
      await waitFor(() => expect(resultTitles()).toEqual([title]));
    });
    When('he searches again for {string}', searches);
    Then('the results are only the lexicon {string}', async (_, title: string) => {
      await waitFor(() => expect(resultTitles()).toEqual([title]));
    });
    When('he taps the result {string}', async (_, title: string) => {
      await searches(null, title);
      await user.click(await screen.findByRole('button', { name: new RegExp(`^${title}`) }));
    });
    Then('the page {string} is open', opened);
    And('the address names the book {string}', (_, short: string) => {
      const query = window.location.hash.split('?')[1] ?? '';
      expect(new URLSearchParams(query).get('book')).toBe(book(short).resource);
    });
    And('the book {string} is marked as the one he came for', async (_, short: string) => {
      await waitFor(() => expect(control(short).closest('[aria-current]')).toHaveAttribute('aria-current', 'true'));
    });
  });

  Scenario('A fourth pin is refused with its line', ({ Given, When, And, Then }) => {
    Given('his shelf holds the lexicons {string} On and pinned', async (_, lexicons: string) => {
      await shelfHolds(list(lexicons).map((l): [string, ShelfState] => [l, 'pinned']));
    });
    When('he opens the Library at the kind {string}', opensKind);
    And('he sets {string} to {string}', setTo);
    Then('the line {string} is shown', async (_, line: string) => {
      expect(await screen.findByRole('alert')).toHaveTextContent(line);
    });
    And('{string} is set to {string}', isSet);
    When('he then sets {string} to {string}', setTo);
    And('he pins {string} again', async (_, short: string) => setTo(null, short, 'Pin'));
    Then('{string} now shows {string}', isSet);
    And('the line {string} is not shown', async (_, line: string) => {
      await waitFor(() => expect(screen.queryByText(line)).not.toBeInTheDocument());
    });
  });

  const sets = async (_: unknown, nt: string, ot: string, apocrypha: string) => {
    await setLogosBibleFor('nt', book(nt).resource);
    await setLogosBibleFor('ot', book(ot).resource);
    await setLogosBibleFor('apocrypha', book(apocrypha).resource);
  };
  /** The marks under a Bible's name on the Bibles page ('Set for NT'), or null when it has none: the name is the title line of its row, the marks the line after it. */
  const markOf = (short: string): string | null => {
    const title = screen.getAllByText(short, { selector: 'p' }).find((p) => p.className.includes('font-medium'));
    return title?.parentElement?.querySelector('[data-testid="bible-marks"]')?.textContent ?? null;
  };
  const isMarked = async (_: unknown, short: string, mark: string) => {
    await waitFor(() => expect(markOf(short)).toBe(mark));
  };
  const hasNoMark = async (_: unknown, short: string) => {
    await screen.findAllByText(short, { selector: 'p' });
    await waitFor(() => expect(markOf(short)).toBeNull());
  };
  const asks = async (_: unknown, short: string) => {
    await user.click(await screen.findByRole('button', { name: `Set for… ${short}` }));
  };

  Scenario('Bibles show the parts they are set for, read from Settings', ({ Given, When, Then, And }) => {
    Given('his shelf holds nothing', async () => {
      await shelfHolds([]);
    });
    And('Settings sets the New Testament to {string}, the Old Testament to {string} and the Apocrypha to {string}', sets);
    When('he opens the Library at the kind {string}', opensKind);
    Then('the page {string} is open', opened);
    And('{string} is marked {string}', isMarked);
    And('the mark of {string} reads {string}', isMarked);
    And('the line under {string} says {string}', isMarked);
    And('{string} has no mark', hasNoMark);
    And('the page says {string}', pageSays);
    And('the page has no button {string}', (_, label: string) => {
      expect(screen.queryByRole('button', { name: label })).not.toBeInTheDocument();
    });
    And('no book of the kind offers {string}', (_, label: string) => {
      expect(screen.queryAllByRole('radio', { name: label })).toEqual([]);
    });
    When('Settings sets the Old Testament to {string}', async (_, short: string) => {
      await setLogosBibleFor('ot', book(short).resource);
    });
    Then('{string} is now marked {string}', isMarked);
    And('{string} now carries no mark', hasNoMark);
  });

  const holds = async (_: unknown, nt: string, ot: string, apocrypha: string) => {
    await waitFor(async () => expect(await getLogosBibles()).toEqual({ nt: book(nt).resource, ot: book(ot).resource, apocrypha: book(apocrypha).resource }));
  };

  Scenario('Choosing a Bible asks which part and sets only that part', ({ Given, When, Then, And }) => {
    Given('his shelf holds nothing', async () => {
      await shelfHolds([]);
    });
    And('Settings sets the New Testament to {string}, the Old Testament to {string} and the Apocrypha to {string}', sets);
    When('he opens the Library at the kind {string}', opensKind);
    And('he taps Set for on {string}', asks);
    Then('the parts offered for {string} are {string}', async (_, short: string, parts: string) => {
      const group = await screen.findByRole('group', { name: `Set ${short} for` });
      expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(list(parts));
    });
    When('he sets {string} for {string}', async (_, short: string, part: string) => {
      const group = await screen.findByRole('group', { name: `Set ${short} for` });
      await user.click(within(group).getByRole('button', { name: part }));
    });
    Then('Settings holds the New Testament {string}, the Old Testament {string} and the Apocrypha {string}', holds);
    And('{string} is marked {string}', isMarked);
    And('{string} has no mark', hasNoMark);
  });

  Scenario('Choosing All three sets every part the Bible holds and leaves the rest', ({ Given, When, Then, And }) => {
    Given('his shelf holds nothing', async () => {
      await shelfHolds([]);
    });
    And('Settings sets the New Testament to {string}, the Old Testament to {string} and the Apocrypha to {string}', sets);
    When('he opens the Library at the kind {string}', opensKind);
    And('he taps Set for on {string}', asks);
    And('he sets {string} for {string}', async (_, short: string, part: string) => {
      const group = await screen.findByRole('group', { name: `Set ${short} for` });
      await user.click(within(group).getByRole('button', { name: part }));
    });
    Then('{string} is marked {string}', isMarked);
    And('the mark of {string} reads {string}', isMarked);
    And('{string} has no mark', hasNoMark);
  });

  Scenario('Devotionals shows no Pin', ({ Given, When, Then, And }) => {
    Given('his shelf holds nothing', async () => {
      await shelfHolds([]);
    });
    When('he opens the Library at the kind {string}', opensKind);
    Then('the page {string} is open', opened);
    And('no book of the kind offers {string}', async (_, label: string) => {
      await screen.findAllByRole('radiogroup');
      expect(screen.queryAllByRole('radio', { name: label })).toEqual([]);
    });
    And('every book of the kind offers {string} and {string}', (_, a: string, b: string) => {
      const groups = screen.getAllByRole('radiogroup');
      expect(groups).toHaveLength(entriesOf('devotional').length);
      for (const group of groups) expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual([a, b]);
    });
  });
});
