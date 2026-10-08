// features/steps/links.steps.tsx — runs features/links.feature: a link in the address (#/?ref=… or #/?word=…) opens the reader on a verse
// or the word sheet of a word, a reference Lampas does not hold opens the nearest place it does with a notice, and the verse panel and the
// word sheet copy (or share) the https form of their link. fetch is stubbed with the committed public/data files; the clipboard and
// navigator.share are replaced here with recorders.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { readerOf } from '../../src/nav/route';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  unshare();
  db.close();
});

const user = userEvent.setup();

/** What the phone's clipboard was given, and whether it refuses. */
let copied: string[] = [];
let shared: { title?: string; url?: string }[] = [];

function stubClipboard(refuse: boolean): void {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText: (text: string) => {
        if (refuse) return Promise.reject(new DOMException('denied', 'NotAllowedError'));
        copied.push(text);
        return Promise.resolve();
      },
    },
  });
}

function unshare(): void {
  Reflect.deleteProperty(window.navigator, 'share');
}

async function openLink(hash: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  stubChapterFetch();
  stubClipboard(false);
  copied = [];
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  window.history.replaceState(null, '', `/${hash}`);
  restoreLastRoute();
  render(<App />);
}

const verseEl = (n: number): HTMLElement | null => document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
const notice = () => document.querySelector<HTMLElement>('[data-link-notice]');
const panel = () => screen.getByRole('region', { name: 'Reading check' });
const wordSheet = () => screen.getByRole('dialog', { name: 'Word' });

async function headed(title: string): Promise<void> {
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const feature = await loadFeature('features/links.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A reference opens the reader with the verse selected', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is selected', async (_, n: number) => {
      await waitFor(() => expect(verseEl(n)).toHaveAttribute('data-selected', 'true'));
    });
    And('there is no notice', () => {
      expect(notice()).toBeNull();
    });
    And('the address names book {string}, chapter {int} and verse {int}', async (_, book: string, chapter: number, verse: number) => {
      await waitFor(() => expect(readerOf(window.location.hash)).toMatchObject({ book, chapter, verse }));
    });
  });

  Scenario('An OSIS reference to another book opens it', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is selected', async (_, n: number) => {
      await waitFor(() => expect(verseEl(n)).toHaveAttribute('data-selected', 'true'));
    });
    And('the address names book {string}, chapter {int} and verse {int}', async (_, book: string, chapter: number, verse: number) => {
      await waitFor(() => expect(readerOf(window.location.hash)).toMatchObject({ book, chapter, verse }));
    });
  });

  Scenario('A chapter alone opens the chapter with no verse selected', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('no verse is selected', () => {
      expect(document.querySelector('[data-verse][data-selected="true"]')).toBeNull();
    });
    And('there is no notice', () => {
      expect(notice()).toBeNull();
    });
  });

  Scenario('A verse past the end of the chapter opens the last verse and says what was asked for', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is selected', async (_, n: number) => {
      await waitFor(() => expect(verseEl(n)).toHaveAttribute('data-selected', 'true'));
    });
    And('the notice reads {string}', async (_, text: string) => {
      await waitFor(() => expect(notice()).toHaveTextContent(text));
    });
  });

  Scenario('A chapter past the end of the book opens the last chapter and says what was asked for', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('no verse is selected', () => {
      expect(document.querySelector('[data-verse][data-selected="true"]')).toBeNull();
    });
    And('the notice reads {string}', async (_, text: string) => {
      await waitFor(() => expect(notice()).toHaveTextContent(text));
    });
  });

  Scenario('A book Lampas does not hold opens the chapter he had open and says what was asked for', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('the notice reads {string}', async (_, text: string) => {
      await waitFor(() => expect(notice()).toHaveTextContent(text));
    });
  });

  Scenario('The notice can be dismissed', ({ Given, When, Then }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    When('he dismisses the notice', async () => {
      await waitFor(() => expect(notice()).not.toBeNull());
      await user.click(within(notice() as HTMLElement).getByRole('button', { name: 'Dismiss' }));
    });
    Then('there is no notice', () => {
      expect(notice()).toBeNull();
    });
  });

  Scenario('The web+lampas: form reaches the same verse', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is selected', async (_, n: number) => {
      await waitFor(() => expect(verseEl(n)).toHaveAttribute('data-selected', 'true'));
    });
  });

  Scenario("A Strong's number opens the word sheet of its word", ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the word sheet shows {string} meaning {string}', async (_, lemma: string, gloss: string) => {
      await screen.findByRole('dialog', { name: 'Word' });
      expect(within(wordSheet()).getByTestId('sheet-word')).toHaveTextContent(lemma);
      expect(within(wordSheet()).getByTestId('sheet-gloss')).toHaveTextContent(gloss);
    });
    And('the word sheet has no Parsing row', () => {
      expect(within(wordSheet()).queryByTestId('sheet-parse')).toBeNull();
    });
  });

  Scenario('A lemma opens the word sheet of that word', ({ Given, Then }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the word sheet shows {string} meaning {string}', async (_, lemma: string, gloss: string) => {
      await screen.findByRole('dialog', { name: 'Word' });
      expect(within(wordSheet()).getByTestId('sheet-word')).toHaveTextContent(lemma);
      expect(within(wordSheet()).getByTestId('sheet-gloss')).toHaveTextContent(gloss);
    });
  });

  Scenario('A word Lampas does not hold says so and opens the reader', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('the notice reads {string}', async (_, text: string) => {
      await waitFor(() => expect(notice()).toHaveTextContent(text));
    });
    And('no word sheet is open', () => {
      expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull();
    });
  });

  Scenario('The verse panel copies the https link of its verse', ({ Given, When, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    When('he taps Copy link on the verse panel', async () => {
      await headed('Romans 8');
      await user.click(within(await screen.findByRole('region', { name: 'Reading check' })).getByRole('button', { name: 'Copy link' }));
    });
    Then('the clipboard holds {string}', async (_, url: string) => {
      await waitFor(() => expect(copied).toEqual([url]));
    });
    And('the panel says {string}', async (_, text: string) => {
      await waitFor(() => expect(panel()).toHaveTextContent(text));
    });
  });

  Scenario('The verse panel has no Share button where the phone cannot share', ({ Given, Then }) => {
    Given('a link {string} is opened', async (_, hash: string) => {
      unshare();
      await openLink(hash);
    });
    Then('the verse panel has no Share button', async () => {
      await headed('Romans 8');
      await screen.findByRole('region', { name: 'Reading check' });
      expect(within(panel()).getByRole('button', { name: 'Copy link' })).toBeInTheDocument();
      expect(within(panel()).queryByRole('button', { name: 'Share' })).toBeNull();
    });
  });

  Scenario('The verse panel shares the https link of its verse where the phone can share', ({ Given, And, When, Then }) => {
    Given('the phone can share', () => {
      shared = [];
      Object.defineProperty(window.navigator, 'share', {
        configurable: true,
        value: (data: { title?: string; url?: string }) => {
          shared.push(data);
          return Promise.resolve();
        },
      });
    });
    And('a link {string} is opened', (_, hash: string) => openLink(hash));
    When('he taps Share on the verse panel', async () => {
      await headed('Romans 8');
      await user.click(within(await screen.findByRole('region', { name: 'Reading check' })).getByRole('button', { name: 'Share' }));
    });
    Then('the phone is asked to share {string}', async (_, url: string) => {
      await waitFor(() => expect(shared).toHaveLength(1));
      expect(shared[0].url).toBe(url);
      unshare();
    });
  });

  Scenario('The word sheet copies the https link of its word', ({ Given, When, Then }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    When('he taps Copy link on the word sheet', async () => {
      await screen.findByRole('dialog', { name: 'Word' });
      await user.click(within(wordSheet()).getByRole('button', { name: 'Copy link' }));
    });
    Then('the clipboard holds {string}', async (_, url: string) => {
      await waitFor(() => expect(copied).toEqual([url]));
    });
  });

  Scenario('A phone that refuses the clipboard shows the link to copy by hand', ({ Given, And, When, Then }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    And('the clipboard refuses', () => {
      stubClipboard(true);
    });
    When('he taps Copy link on the verse panel', async () => {
      await headed('Romans 8');
      await user.click(within(await screen.findByRole('region', { name: 'Reading check' })).getByRole('button', { name: 'Copy link' }));
    });
    Then('the panel shows the link {string} to copy by hand', async (_, url: string) => {
      await waitFor(() => expect(within(panel()).getByRole('textbox', { name: 'Link to copy' })).toHaveValue(url));
    });
  });
});
