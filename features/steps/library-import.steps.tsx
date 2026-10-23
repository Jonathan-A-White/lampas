// features/steps/library-import.steps.tsx — runs features/library-import.feature: Import your library (#/library?import, src/library/ImportLibrary.tsx) in the whole app over the Dexie shelf
// (src/data/repositories/library.ts), the file chosen through the real input. A fake Postern stands behind the app so a step can prove that nothing was sent.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { applyImport, getLogosBible, planImport, setState, shelfOf } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { readExport } from '../../src/library/parseExport';
import { forgetTrail } from '../../src/nav/lastRoute';
import { CATALOGUE, CATALOGUE_VERSION } from '../../src/resources/catalogue';
import { stopReading } from '../../src/speech/readAloud';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { stubChapterFetch, type ChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const list = (text: string): string[] => text.split(',').map((s) => s.trim()).filter((s) => s !== '');

/** The catalogue entry whose short name (the name a row goes by) is `short`, or begins `short,` ('Black' is 'Black, Learn to Read NT Greek'). */
const book = (short: string) => {
  const entry = CATALOGUE.find((e) => e.short === short) ?? CATALOGUE.find((e) => e.short.startsWith(`${short},`));
  if (!entry) throw new Error(`no book ${short} in the catalogue`);
  return entry;
};

const TYPES: Record<string, string> = {
  lexicon: 'text.monograph.lexicon',
  grammar: 'text.monograph.grammar',
  bible: 'text.monograph.bible',
  commentary: 'text.monograph.commentary.bible',
  devotional: 'lbx.calendar-devotional',
};
const quote = (text: string): string => (/[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);

/** A list as Logos saves it (CRLF, quoted commas) of the named books of the catalogue, and with `extra`, a book Lampas cannot use. */
function csvOf(shorts: readonly string[], extra: boolean): string {
  const rows = shorts.map((short) => {
    const e = book(short);
    return [e.resource, TYPES[e.kind] ?? 'text.monograph', e.short, e.title, e.series ?? '', 'en', ''];
  });
  if (extra) rows.push(['LLS:A-HEBREW-MANUSCRIPT', 'text.monograph.ancient-manuscript', '', 'A manuscript, in Hebrew', '', 'he', '']);
  return ['ResourceId,Type,AbbreviatedTitle,Title,Series,Languages,ReferenceSupersets', ...rows.map((r) => r.map(quote).join(','))].join('\r\n') + '\r\n';
}

let fake: FakePostern;
let chapters: ChapterFetch;

/** A phone whose old keys all say nothing is ticked, so the shelf takes nothing from them: an empty shelf and no kept list. */
async function shelfHolds(): Promise<void> {
  await db.open();
  await Promise.all([db.meta.clear(), db.settings.clear(), db.library.clear(), db.exportRows.clear()]);
  await db.settings.bulkPut([
    { key: 'resourceOption.logos', value: '[]' },
    { key: 'grammarBooks', value: '[]' },
    { key: 'works', value: '[]' },
    { key: 'devotionalDraw', value: 'none' },
  ]);
  await shelfOf();
}

/** Opens the app at `address`, with the fake Postern behind it. */
async function openAt(address: string): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/${address}`);
  fake = makeFakePostern();
  chapters = stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  render(<App />);
}

/** Opens the import and chooses a file through the input. */
async function chooses(file: File): Promise<void> {
  await openAt('#/library?import');
  await user.upload(await screen.findByLabelText('Logos list file'), file);
}
const csvFile = (text: string): File => new File([text], 'logos-list.csv', { type: 'text/csv' });

const screenSays = async (_: unknown, text: string) => {
  await waitFor(() => expect(document.body).toHaveTextContent(text));
};
const kindsRead = async (_: unknown, text: string) => {
  await waitFor(() => expect(screen.getByTestId('import-kinds')).toHaveTextContent(text));
};
const buttonReads = async (_: unknown, label: string) => {
  expect(await screen.findByRole('button', { name: label })).toBeInTheDocument();
};
const opened = async (_: unknown, title: string) => {
  expect(await screen.findByRole('heading', { name: title, level: 1 })).toBeInTheDocument();
};
const shelfHoldsExactly = async (_: unknown, pinned: string, on: string) => {
  await waitFor(async () => {
    const rows = await shelfOf();
    expect(rows.filter((r) => r.state === 'pinned').map((r) => r.id).sort()).toEqual(list(pinned).map((s) => book(s).resource).sort());
    expect(rows.filter((r) => r.state === 'on').map((r) => r.id).sort()).toEqual(list(on).map((s) => book(s).resource).sort());
  });
};
const keptList = async (_: unknown, books: number, matched: number) => {
  await waitFor(async () => {
    const rows = await db.exportRows.toArray();
    expect([rows.length, rows.filter((r) => r.matched).length]).toEqual([books, matched]);
  });
};
const setsByHand = async (_: unknown, off: string, on: string) => {
  expect(await setState(book(off).resource, 'off')).toEqual({ ok: true });
  expect(await setState(book(on).resource, 'on')).toEqual({ ok: true });
};
const cardSays = async (_: unknown, text: string) => {
  await waitFor(() => expect(screen.getByTestId('library-card')).toHaveTextContent(text));
};
const nothingSent = () => {
  // the fake Postern took in no grist and was called by nothing that writes, and the app asked for nothing outside its own origin
  expect(fake.received).toEqual([]);
  expect(fake.calls.filter((c) => !c.startsWith('GET '))).toEqual([]);
  expect(chapters.requests.filter((u) => !u.startsWith('/'))).toEqual([]);
};
const importsList = async (_: unknown, shorts: string) => {
  const plan = await planImport(readExport(csvOf(list(shorts), false)));
  await applyImport(plan);
};

const feature = await loadFeature('features/library-import.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The list is read and the counts and the reasons are shown', ({ Given, When, Then, And }) => {
    Given('his shelf holds nothing', shelfHolds);
    When('he opens the import and chooses the file {string}', async (_, path: string) => {
      await chooses(new File([readFileSync(path)], basename(path), { type: 'text/csv' }));
    });
    Then('the screen says {string}', screenSays);
    And('the screen shows {string}', screenSays);
    And('the kinds line reads {string}', kindsRead);
    And('the screen counts {string}', screenSays);
    And('the button reads {string}', buttonReads);
    When('he taps {string}', async (_, label: string) => {
      await user.click(await screen.findByRole('button', { name: new RegExp(`^${label}`) }));
    });
    Then('the reasons page lists {string}', async (_, line: string) => {
      const reasons = await screen.findByTestId('import-reasons');
      expect(within(reasons).getByText(line)).toBeInTheDocument();
    });
    And('the reasons page lists {string}', async (_, line: string) => {
      expect(within(screen.getByTestId('import-reasons')).getByText(line)).toBeInTheDocument();
    });
  });

  Scenario('A file that is not a Logos list is refused with one plain line', ({ Given, When, Then, And }) => {
    Given('his shelf holds nothing', shelfHolds);
    When('he opens the import and chooses a file that is not a Logos list', async () => {
      await chooses(csvFile('Id,Name\r\nA,B\r\n'));
    });
    Then('the screen says {string}', async (_, text: string) => {
      expect(await screen.findByRole('alert')).toHaveTextContent(text);
    });
    And('the shelf is still empty', async () => {
      expect(await shelfOf()).toEqual([]);
      expect(await db.exportRows.count()).toBe(0);
    });
  });

  Scenario('Turn on writes the shelf with the pins and his Bible and keeps the list', ({ Given, When, Then, And }) => {
    Given('his shelf holds nothing', shelfHolds);
    When('he opens the import and chooses a list of {string} and a book Lampas cannot use', async (_, shorts: string) => {
      await chooses(csvFile(csvOf(list(shorts), true)));
    });
    Then('the screen says {string}', screenSays);
    And('the screen shows {string}', screenSays);
    And('the kinds line reads {string}', kindsRead);
    And('the button reads {string}', buttonReads);
    When('he taps the button {string}', async (_, label: string) => {
      await user.click(await screen.findByRole('button', { name: label }));
    });
    Then('the page {string} is open', opened);
    And('the shelf holds {string} Pinned and {string} On and nothing else', shelfHoldsExactly);
    And('the Bible in Logos is {string}', async (_, short: string) => {
      await waitFor(async () => expect(await getLogosBible()).toBe(book(short).resource));
    });
    And('the kept list has {int} books, {int} of them matched', keptList);
    And('the card says it was imported from a list of {int} books', async (_, books: number) => {
      await cardSays(null, `from a list of ${books} books`);
    });
    And('nothing was sent', nothingSent);
  });

  Scenario('A state he set by hand survives a second import', ({ Given, When, Then, And }) => {
    Given('he has imported the list {string}', async (_, shorts: string) => {
      await shelfHolds();
      await importsList(null, shorts);
    });
    When('he sets {string} to Off and {string} to On', setsByHand);
    And('he opens the import and chooses a list of {string} and a book Lampas cannot use', async (_, shorts: string) => {
      await chooses(csvFile(csvOf(list(shorts), true)));
    });
    Then('the screen says {string}', screenSays);
    And('the button reads {string}', buttonReads);
    When('he taps the button {string}', async (_, label: string) => {
      await user.click(await screen.findByRole('button', { name: label }));
    });
    Then('the shelf holds {string} Pinned and {string} On and nothing else', shelfHoldsExactly);
    And('the kept list has {int} books, {int} of them matched', keptList);
  });

  Scenario('The list is matched again after the catalogue changes', ({ Given, When, Then, And }) => {
    Given('he imported a list under an older catalogue that did not list {string} or {string}', async (_, a: string, b: string) => {
      await shelfHolds();
      const row = (resource: string, title: string, matched: boolean) => ({ resource, type: 'text.monograph', title, series: '', languages: 'en', refs: '', matched });
      await db.exportRows.bulkPut([row(book('BDAG').resource, 'BDAG', true), row(book(a).resource, a, false), row(book(b).resource, b, false)]);
      const note = { at: Date.UTC(2026, 9, 8), books: 3, matched: 1, newSince: 0, version: `${CATALOGUE_VERSION}-older` };
      await db.meta.put({ key: 'libraryImport', value: JSON.stringify(note) });
    });
    When('he opens the Library', async () => {
      await openAt('#/library');
    });
    Then('the card says {string}', cardSays);
    And('the shelf holds {string} On and nothing else', async (_, on: string) => shelfHoldsExactly(null, '', on));
    When('he opens the Library again', async () => {
      await openAt('#/library');
    });
    Then('the card still says {string}', cardSays);
  });
});
