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
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
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

async function openFresh(): Promise<void> {
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
  stubChapterFetch();
  // The network can be cut under the stub: a chapter not fetched yet then fails as on a phone with no signal. The index and the
  // lexicon are in the worker's precache, so they still answer.
  const served = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL) =>
    offline && !/\/data\/(index|lexicon)\.json$/.test(String(input)) ? Promise.reject(new TypeError('Failed to fetch')) : served(input),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
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
  await user.click(within(dialog).getByRole('button', { name }));
}

async function openFromPicker(book: string, n: number): Promise<void> {
  await openPicker();
  await chooseBook(book);
  const dialog = screen.getByRole('dialog', { name: 'Choose a chapter' });
  await user.click(await within(dialog).findByRole('button', { name: `Chapter ${n}` }));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};

const feature = await loadFeature('features/chapter-picker.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A fresh install opens Romans 8', ({ Given, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
    Then('the reader is headed {string}', (_, title: string) => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
    });
  });

  Scenario('The title opens a picker of the 27 books, then the chapters of the book he chooses', ({ Given, When, Then }) => {
    Given('Lampas is opened with nothing saved', openFresh);
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
    Given('Lampas is opened with nothing saved', openFresh);
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
    Given('Lampas is opened with nothing saved', openFresh);
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
    Given('Lampas is opened with nothing saved', openFresh);
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
    Given('Lampas is opened with nothing saved', openFresh);
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
    Given('Lampas is opened with nothing saved', openFresh);
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
});
