// features/steps/chapter-picker.steps.tsx — runs features/chapter-picker.feature: the Reader's title opens a book and chapter
// picker, the open chapter is remembered, and a chapter that cannot be fetched says so. fetch is stubbed with the committed
// public/data files; "offline" makes every fetch that gets as far as the network fail the way a phone's does.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import type { BookIndex, Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { readerOf } from '../../src/nav/route';
import { audibleStartOf } from '../../src/resources/audioBible';
import { chapterLink } from '../../src/resources/logosBible';
import { browserEnv } from '../../src/resources/openApp';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const realEnv = { ...browserEnv };
let timers: (() => void)[] = [];
let opened: string[] = [];

afterAll(() => {
  Object.assign(browserEnv, realEnv);
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  setOnLine(true);
  db.close();
});

const user = userEvent.setup();
const index = JSON.parse(readFileSync('public/data/index.json', 'utf8')) as BookIndex;
const chapterFile = (book: string, n: number) => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;

let offline = false;
function setOnLine(value: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

async function openFresh(settings: Record<string, string> = {}): Promise<void> {
  cleanup();
  // Unmounting the last scenario's open sheet steps history back (useSheetBack); jsdom lands that popstate a moment later, and it must land before
  // this scenario's address is set, not in the middle of it.
  await new Promise((resolve) => setTimeout(resolve, 30));
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  offline = false;
  setOnLine(true);
  timers = [];
  opened = [];
  browserEnv.after = (fn) => {
    timers.push(fn);
    return () => {
      timers = timers.filter((t) => t !== fn);
    };
  };
  browserEnv.onAway = () => () => {};
  browserEnv.open = (url) => void opened.push(url);
  stubChapterFetch();
  // The network can be cut under the stub: a chapter not fetched yet then fails as on a phone with no signal. The index and the
  // lexicon are in the worker's precache, so they still answer.
  const served = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL) =>
    offline && !/\/data\/(index|lexicon)\.json$/.test(String(input)) ? Promise.reject(new TypeError('Failed to fetch')) : served(input),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  window.history.replaceState(null, '', '/');
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function back(): Promise<void> {
  await act(async () => {
    window.history.back();
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

const picker = () => screen.queryByRole('dialog', { name: 'Choose a chapter' });
const books = () => [...(picker()?.querySelectorAll('[data-book]') ?? [])].map((el) => el.textContent?.trim() ?? '');
const chapters = () => [...(picker()?.querySelectorAll('[data-chapter]') ?? [])].map((el) => Number(el.getAttribute('data-chapter')));

async function openPicker(): Promise<void> {
  await user.click(within(screen.getByRole('heading', { level: 1 })).getByRole('button'));
  await screen.findByRole('dialog', { name: 'Choose a chapter' });
}

async function chooseBook(name: string): Promise<void> {
  const dialog = await screen.findByRole('dialog', { name: 'Choose a chapter' });
  // an Old Testament row also says 'Opens in Logos', so its name is matched from its start
  await user.click(within(dialog).getByRole('button', { name: new RegExp(`^${name}`) }));
}

async function openFromPicker(book: string, n: number): Promise<void> {
  await openPicker();
  await chooseBook(book);
  const dialog = screen.getByRole('dialog', { name: 'Choose a chapter' });
  await user.click(await within(dialog).findByRole('button', { name: `Chapter ${n}` }));
}

const withLogos = (on: boolean): Record<string, string> => (on ? { 'resource.logos': 'on' } : {});
const withAudio = (on: boolean): Record<string, string> => (on ? { audioBible: 'word-of-promise' } : {});

/** the panel an Old Testament chapter opens under the grid */
const choice = (): HTMLElement => {
  const panels = picker()?.querySelectorAll<HTMLElement>('[data-ot-choice]') ?? [];
  if (panels.length !== 1) throw new Error(`${panels.length} choices on screen`);
  return panels[0];
};
const tapChapter = async (_: unknown, n: number): Promise<void> => {
  await user.click(await within(picker()!).findByRole('button', { name: `Chapter ${n}` }));
};
const offersOnly = async (_: unknown, title: string, only: string): Promise<void> => {
  await waitFor(() => expect(choice()).toHaveAccessibleName(`${title}: read or listen`));
  expect([...choice().querySelectorAll('a')].map((l) => l.textContent)).toEqual([only]);
};

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};

const feature = await loadFeature('features/chapter-picker.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A fresh install opens Romans 8', ({ Given, Then }) => {
    Given('Lampas is opened with nothing saved', () => openFresh());
    Then('the reader is headed {string}', (_, title: string) => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    });
  });

  Scenario('The title opens a picker of the 27 books, then the chapters of the book he chooses', ({ Given, When, Then }) => {
    Given('Lampas is opened with nothing saved', () => openFresh());
    When('he taps the title', openPicker);
    Then('the picker lists the 27 books from {string} to {string} in order', (_, first: string, last: string) => {
      const shown = books();
      expect(shown).toHaveLength(27);
      expect(shown[0]).toBe(first);
      expect(shown[26]).toBe(last);
      expect(shown).toEqual(index.books.map((b) => b.name));
    });
    When('he chooses the book {string}', (_, name: string) => chooseBook(name));
    Then('the picker lists chapters {int} to {int}', async (_, from: number, to: number) => {
      await waitFor(() => expect(chapters()).toEqual(Array.from({ length: to - from + 1 }, (_, i) => from + i)));
    });
  });

  Scenario('Choosing 1 John 1 opens it with its Greek, English, word sheet and Talk', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with nothing saved', () => openFresh());
    When('he opens {string} chapter {int} from the picker', (_, book: string, n: number) => openFromPicker(book, n));
    Then('the reader is headed {string}', async (_, title: string) => {
      await screen.findByRole('heading', { name: title, level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    And('the picker is closed', async () => {
      await waitFor(() => expect(picker()).toBeNull());
    });
    And('verse 1 reads as the English of 1 John 1 verse 1', () => {
      const expected = chapterFile('1jn', 1).verses[0].e.map((c) => c.t).join(' ');
      expect(verseEl(1).querySelector('[data-text]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(expected);
      expect(document.querySelectorAll('[data-verse]')).toHaveLength(chapterFile('1jn', 1).verses.length);
    });
    And('the address names book {string} and chapter {int}', async (_, book: string, n: number) => {
      await waitFor(() => expect(readerOf(window.location.hash)).toMatchObject({ book, chapter: n }));
    });
    When('he taps the first English word of verse 1', async () => {
      const first = chapterFile('1jn', 1).verses[0].e[0].t.trim();
      await user.click(within(verseEl(1)).getAllByRole('button', { name: first })[0]);
    });
    Then('the word sheet shows the Greek of that word in 1 John 1', async () => {
      const dialog = await screen.findByRole('dialog', { name: 'Word' });
      const verse = chapterFile('1jn', 1).verses[0];
      const greek = verse.e[0].g.map((i) => verse.g[i].t);
      expect(within(dialog).getAllByTestId('sheet-word').map((el) => el.textContent)).toEqual(greek);
    });
    When('he closes the word sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
    });
    And('he opens the Talk sheet', async () => {
      await user.click(await screen.findByRole('button', { name: 'Talk' }));
    });
    Then('the Talk sheet is headed {string}', async (_, title: string) => {
      await screen.findByRole('dialog', { name: title });
    });
  });

  Scenario('Back closes the picker and stays on the chapter', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with nothing saved', () => openFresh());
    When('he taps the title', openPicker);
    And('he goes back', back);
    Then('the picker is closed', async () => {
      await waitFor(() => expect(picker()).toBeNull());
    });
    And('the reader is headed {string}', (_, title: string) => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    });
  });

  Scenario('The open chapter is remembered when the app is reopened', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', () => openFresh());
    And('he opens {string} chapter {int} from the picker', (_, book: string, n: number) => openFromPicker(book, n));
    When('the app is closed and opened again with no address', async () => {
      await screen.findByRole('heading', { name: '1 John 1', level: 1 });
      await waitFor(() => expect(window.location.hash).toContain('b=1jn'));
      cleanup();
      clearBus();
      window.history.replaceState(null, '', '/');
      restoreLastRoute();
      render(<App />);
    });
    Then('the reader is headed {string}', async (_, title: string) => {
      await screen.findByRole('heading', { name: title, level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
  });

  Scenario("The chapter is remembered even when the app opens on another screen's address", ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', () => openFresh());
    And('he opens {string} chapter {int} from the picker', (_, book: string, n: number) => openFromPicker(book, n));
    When('he goes to the Test screen', async () => {
      await screen.findByRole('heading', { name: '1 John 1', level: 1 });
      await user.click(await screen.findByRole('button', { name: 'Settings' }));
      await user.click(await screen.findByRole('button', { name: 'Words' }));
      await user.click(await screen.findByRole('button', { name: 'Test' }));
    });
    Then('the Test screen offers the {string}', async (_, label: string) => {
      await screen.findByRole('button', { name: label });
    });
  });

  Scenario('A chapter that cannot be fetched says so and gives a way back', ({ Given, And, When, Then }) => {
    Given('Lampas is opened with nothing saved', () => openFresh());
    And('the phone is offline', () => {
      offline = true;
      setOnLine(false);
    });
    When('he opens {string} chapter {int} from the picker', (_, book: string, n: number) => openFromPicker(book, n));
    Then('the reader says {string} is not on this phone yet and he is offline', async (_, title: string) => {
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(`${title} is not on this phone yet`);
      expect(alert).toHaveTextContent('offline');
    });
    And('a button {string} is shown', (_, name: string) => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });
    When('the phone is back online and he taps {string}', async (_, name: string) => {
      offline = false;
      setOnLine(true);
      await user.click(screen.getByRole('button', { name }));
    });
    Then('the reader is headed {string}', async (_, title: string) => {
      await screen.findByRole('heading', { name: title, level: 1 });
    });
    And('verses are listed', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
  });

  Scenario('An Old Testament chapter offers a choice before it leaves the app', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with Logos on and the Audio Bible on', () => openFresh({ ...withLogos(true), ...withAudio(true) }));
    When('he taps the title', openPicker);
    And('he chooses the book {string}', (_, name: string) => chooseBook(name));
    And('he taps chapter {int}', tapChapter);
    Then('no app was opened', () => {
      expect(opened).toEqual([]);
      expect(timers).toEqual([]);
    });
    And('the choice for {string} offers {string} and {string}', async (_, title: string, a: string, b: string) => {
      await waitFor(() => expect(choice()).toHaveAccessibleName(`${title}: read or listen`));
      expect([...choice().querySelectorAll('a')].map((l) => l.textContent)).toEqual([a, b]);
    });
    And('the choice says {string}', (_, text: string) => {
      expect(choice()).toHaveTextContent(text);
    });
    And("{string} is the chapter's Logos link", (_, name: string) => {
      const link = within(choice()).getByRole('link', { name });
      expect(link.getAttribute('href')).toBe(chapterLink('jdg', 3, 'LLS:LGCYSTNDRDBBLSB')?.url);
    });
    And("{string} is Audible's link at the start of Judges 3", (_, name: string) => {
      const link = within(choice()).getByRole('link', { name: new RegExp(name) });
      expect(new URL(link.getAttribute('href') ?? '').searchParams.get('position_from_start')).toBe(String(audibleStartOf('jdg', 3)));
    });
    And('the reader is headed {string}', (_, title: string) => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    });
  });

  Scenario('A second chapter moves the choice', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with Logos on and the Audio Bible on', () => openFresh({ ...withLogos(true), ...withAudio(true) }));
    When('he taps the title', openPicker);
    And('he chooses the book {string}', (_, name: string) => chooseBook(name));
    And('he taps chapter {int}', tapChapter);
    Then('the choice for {string} offers {string} and {string}', async (_, title: string) => {
      await waitFor(() => expect(choice()).toHaveAccessibleName(`${title}: read or listen`));
    });
    When('he then taps chapter {int}', async (_, n: number) => {
      await user.click(within(picker()!).getByRole('button', { name: `Chapter ${n}` }));
    });
    Then('the choice has moved to {string} offering {string} and {string}', async (_, title: string, a: string, b: string) => {
      await waitFor(() => expect(choice()).toHaveAccessibleName(`${title}: read or listen`));
      expect([...choice().querySelectorAll('a')].map((l) => l.textContent)).toEqual([a, b]);
    });
    And('there is one choice on screen', () => {
      expect(picker()?.querySelectorAll('[data-ot-choice]')).toHaveLength(1);
    });
  });

  Scenario('Read in Logos arms the fallback like the chapter link did', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with Logos on and the Audio Bible on', () => openFresh({ ...withLogos(true), ...withAudio(true) }));
    When('he taps the title', openPicker);
    And('he chooses the book {string}', (_, name: string) => chooseBook(name));
    And('he taps chapter {int}', tapChapter);
    And('he taps {string}', async (_, name: string) => {
      await user.click(await within(choice()).findByRole('link', { name }));
    });
    And('the page stays in front for the wait', () => {
      for (const t of [...timers]) t();
    });
    Then('the address {string} was opened', (_, url: string) => {
      expect(opened).toEqual([url]);
    });
  });

  Scenario('With only Logos on the choice is the one row', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with Logos on and the Audio Bible off', () => openFresh({ ...withLogos(true), ...withAudio(false) }));
    When('he taps the title', openPicker);
    And('he chooses the book {string}', (_, name: string) => chooseBook(name));
    And('he taps chapter {int}', tapChapter);
    Then('the choice for {string} offers only {string}', offersOnly);
  });

  Scenario('With only the Audio Bible on the choice is the one row and Logos can be turned on', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with Logos off and the Audio Bible on', () => openFresh({ ...withLogos(false), ...withAudio(true) }));
    When('he taps the title', openPicker);
    And('he chooses the book {string}', (_, name: string) => chooseBook(name));
    And('he taps chapter {int}', tapChapter);
    Then('the choice for {string} offers only {string}', offersOnly);
    And('the picker says {string}', async (_, text: string) => {
      expect(await within(picker()!).findByRole('status')).toHaveTextContent(text);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(within(picker()!).getByRole('button', { name }));
    });
    Then('the choice for {string} offers {string} and {string}', async (_, title: string, a: string, b: string) => {
      await waitFor(() => expect([...choice().querySelectorAll('a')].map((l) => l.textContent)).toEqual([a, b]));
      expect(choice()).toHaveAccessibleName(`${title}: read or listen`);
    });
  });

  Scenario('With both off the picker says Logos is off and names Audio Bible in Settings', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with Logos off and the Audio Bible off', () => openFresh({ ...withLogos(false), ...withAudio(false) }));
    When('he taps the title', openPicker);
    And('he chooses the book {string}', (_, name: string) => chooseBook(name));
    Then('the picker says {string}', async (_, text: string) => {
      expect(await within(picker()!).findByRole('status')).toHaveTextContent(text);
    });
    And('the picker names {string}', (_, text: string) => {
      expect(within(picker()!).getByRole('status')).toHaveTextContent(text);
    });
    And('no chapter is offered', () => {
      expect(chapters()).toEqual([]);
    });
  });
});
