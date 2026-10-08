// features/steps/chapter-nav.steps.tsx — runs features/chapter-nav.feature: the next and previous chapter buttons at the foot of a
// chapter. fetch is stubbed with the committed public/data files; "offline" makes a chapter not fetched yet fail as on a phone.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { BOOKS } from '../../src/data/books';
import { clearBus } from '../../src/events/bus';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  setOnLine(true);
  db.close();
});

const user = userEvent.setup();

let offline = false;
function setOnLine(value: boolean): void {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
}

async function openOn(bookName: string, n: number): Promise<void> {
  const code = BOOKS.find((b) => b.name === bookName)?.code;
  cleanup();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  offline = false;
  setOnLine(true);
  stubChapterFetch();
  const served = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL) =>
    offline && !/\/data\/(index|lexicon)\.json$/.test(String(input)) ? Promise.reject(new TypeError('Failed to fetch')) : served(input),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  window.history.replaceState(null, '', `/#/?b=${code}&c=${n}`);
  render(<App />);
  await screen.findByRole('heading', { name: `${bookName} ${n}`, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const foot = () => screen.findByRole('navigation', { name: 'Chapters' });

const feature = await loadFeature('features/chapter-nav.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The foot of 1 John 1 offers the next chapter, which opens from the top and is remembered', ({ Given, Then, And, When }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    Then('the foot of the chapter has a button {string}', async (_, name: string) => {
      expect(await within(await foot()).findByRole('button', { name })).toBeInTheDocument();
    });
    And('the foot also has a button {string}', async (_, name: string) => {
      expect(within(await foot()).getByRole('button', { name })).toBeInTheDocument();
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(await within(await foot()).findByRole('button', { name }));
    });
    Then('the reader is headed {string}', async (_, title: string) => {
      await screen.findByRole('heading', { name: title, level: 1 });
    });
    And('verses are listed', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    When('the app is closed and opened again with no address', async () => {
      await waitFor(() => expect(window.location.hash).toContain('c=2'));
      cleanup();
      clearBus();
      window.history.replaceState(null, '', '/');
      restoreLastRoute();
      render(<App />);
    });
    Then('the reader reopens headed {string}', async (_, title: string) => {
      await screen.findByRole('heading', { name: title, level: 1 });
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
  });

  Scenario('The foot of 1 John 2 goes back to 1 John 1', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    When('he taps {string}', async (_, name: string) => {
      await user.click(await within(await foot()).findByRole('button', { name }));
    });
    Then('the reader is headed {string}', async (_, title: string) => {
      await screen.findByRole('heading', { name: title, level: 1 });
    });
    And('verses are listed', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
  });

  Scenario('The foot of Romans 16 offers 1 Corinthians 1', ({ Given, Then, And, When }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    Then('the foot of the chapter has a button {string}', async (_, name: string) => {
      expect(await within(await foot()).findByRole('button', { name })).toBeInTheDocument();
    });
    And('the foot also has a button {string}', async (_, name: string) => {
      expect(within(await foot()).getByRole('button', { name })).toBeInTheDocument();
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(within(await foot()).getByRole('button', { name }));
    });
    Then('the reader is headed {string}', async (_, title: string) => {
      await screen.findByRole('heading', { name: title, level: 1 });
    });
  });

  Scenario('Matthew 1 has no previous button', ({ Given, Then, And }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    Then('the foot of the chapter has a button {string}', async (_, name: string) => {
      expect(await within(await foot()).findByRole('button', { name })).toBeInTheDocument();
    });
    And('the foot of the chapter has no previous button', async () => {
      const buttons = within(await foot()).getAllByRole('button');
      expect(buttons.filter((b) => b.textContent?.startsWith('‹'))).toHaveLength(0);
    });
  });

  Scenario('Revelation 22 has no next button', ({ Given, Then, And }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    Then('the foot of the chapter has a button {string}', async (_, name: string) => {
      expect(await within(await foot()).findByRole('button', { name })).toBeInTheDocument();
    });
    And('the foot of the chapter has no next button', async () => {
      const buttons = within(await foot()).getAllByRole('button');
      expect(buttons.filter((b) => b.textContent?.endsWith('›'))).toHaveLength(0);
    });
  });

  Scenario('Offline, a chapter not on the phone says so', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on {string} chapter {int}', (_, book: string, n: number) => openOn(book, n));
    And('the phone is offline', () => {
      offline = true;
      setOnLine(false);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(await within(await foot()).findByRole('button', { name }));
    });
    Then('the reader says {string} is not on this phone yet and he is offline', async (_, title: string) => {
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(`${title} is not on this phone yet`);
      expect(alert).toHaveTextContent('offline');
    });
    And('a button {string} is shown', (_, name: string) => {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    });
  });
});
