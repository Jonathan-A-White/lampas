// features/steps/links.steps.tsx — runs features/links.feature: a link in the address (#/?ref=… or #/?word=…) opens the reader on a chapter with the verse
// at the top (no Verse view, nothing selected, Immersive left as it was: mw-5r3p30.1025, .1028) or the word sheet of a word, a reference Lampas does not hold opens the nearest place it does with a notice, and the Verse view and the
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
import { seedHisWords } from '../../tests/support/his-words';

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

/** Immersive reader is On on the phone before the link is opened. */
let immersiveBefore = false;

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
  if (immersiveBefore) await db.settings.put({ key: 'immersiveReader', value: 'on' });
  immersiveBefore = false;
  window.history.replaceState(null, '', `/${hash}`);
  restoreLastRoute();
  await seedHisWords();
  render(<App />);
}

const notice = () => document.querySelector<HTMLElement>('[data-link-notice]');
const panel = () => screen.getByRole('region', { name: 'Verse view' });
const wordSheet = () => screen.getByRole('dialog', { name: 'Word' });

async function headed(title: string): Promise<void> {
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

/** The Reader was asked to bring the verse to the top of its box (data-brought-verse; jsdom has no layout to measure). */
async function broughtToTop(n: number): Promise<void> {
  await waitFor(() => expect(document.querySelector('[data-reader]')).toHaveAttribute('data-brought-verse', String(n)));
}

/** The address is the plain reader address: the chapter, no verse, no passage, no link. */
async function plainAddress(book: string, chapter: number): Promise<void> {
  await waitFor(() => expect(readerOf(window.location.hash)).toMatchObject({ book, chapter }));
  expect(window.location.hash).not.toContain('ref=');
  expect(readerOf(window.location.hash).verse).toBeUndefined();
  expect(readerOf(window.location.hash).passage).toBeUndefined();
}

const noVerseView = () => expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull();

const feature = await loadFeature('features/links.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A reference opens the reader with the verse at the top and no Verse view', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
    And('no verse is selected', () => {
      expect(document.querySelector('[data-verse][data-selected="true"]')).toBeNull();
    });
    And('no Verse view is open', noVerseView);
    And('there is no notice', () => {
      expect(notice()).toBeNull();
    });
    And('the address names book {string} and chapter {int} and nothing else of the link', (_, book: string, chapter: number) => plainAddress(book, chapter));
  });

  Scenario('A range opens the reader at its first verse', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
    And('no verse is selected', () => {
      expect(document.querySelector('[data-verse][data-selected="true"]')).toBeNull();
    });
    And('no Verse view is open', noVerseView);
    And('there is no notice', () => {
      expect(notice()).toBeNull();
    });
  });

  Scenario('Immersive On beforehand stays On after a verse link (mw-5r3p30.1028)', ({ Given, And, Then }) => {
    Given('Immersive reader is On', () => {
      immersiveBefore = true;
    });
    And('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('Immersive reader is still On', async () => {
      await waitFor(() => expect(document.querySelector('[data-reader]')).toHaveAttribute('data-immersive', 'on'));
      expect((await db.settings.get('immersiveReader'))?.value).toBe('on');
    });
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
  });

  Scenario('Immersive Off beforehand stays Off after a verse link', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('Immersive reader is still Off', async () => {
      await waitFor(() => expect(document.querySelector('[data-reader]')).toHaveAttribute('data-immersive', 'off'));
      expect((await db.settings.get('immersiveReader'))?.value ?? 'off').toBe('off');
    });
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
  });

  Scenario('Verse 0 brings verse 1 to the top', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
    And('no Verse view is open', noVerseView);
  });

  Scenario('An OSIS reference to another book opens it', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
    And('the address names book {string} and chapter {int} and nothing else of the link', (_, book: string, chapter: number) => plainAddress(book, chapter));
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

  Scenario('A verse past the end of the chapter brings the last verse to the top and says what was asked for', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
    And('no Verse view is open', noVerseView);
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

  Scenario('An Old Testament reference opens the chapter in English with the verse at the top and no Verse view', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
    And('no verse is selected', () => {
      expect(document.querySelector('[data-verse][data-selected="true"]')).toBeNull();
    });
    And('no Verse view is open', noVerseView);
    And('there is no notice', () => {
      expect(notice()).toBeNull();
    });
    And('the address names book {string} and chapter {int} and nothing else of the link', (_, book: string, chapter: number) => plainAddress(book, chapter));
  });

  Scenario('A numbered Old Testament book opens by its OSIS code', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
    And('there is no notice', () => {
      expect(notice()).toBeNull();
    });
    And('the address names book {string} and chapter {int} and nothing else of the link', (_, book: string, chapter: number) => plainAddress(book, chapter));
  });

  Scenario('An Old Testament verse past the end of its chapter brings the last verse to the top and says what was asked for', ({ Given, Then, And }) => {
    Given('a link {string} is opened', (_, hash: string) => openLink(hash));
    Then('the reader is headed {string}', (_, title: string) => headed(title));
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
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
    And('verse {int} is brought to the top', (_, n: number) => broughtToTop(n));
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

  Scenario('The Verse view of an Old Testament verse copies its text ending in the https link', ({ Given, When, Then }) => {
    Given('the address {string} is opened', (_, hash: string) => openLink(hash));
    When('he taps Copy on the Verse view', async () => {
      await user.click(within(await screen.findByRole('region', { name: 'Verse view' })).getByRole('button', { name: 'Copy' }));
    });
    Then('the clipboard text ends with {string}', async (_, url: string) => {
      await waitFor(() => expect(copied).toHaveLength(1));
      expect(copied[0].split('\n').at(-1)).toBe(url);
    });
  });

  Scenario('The Verse view copies its text ending in the https link', ({ Given, When, Then, And }) => {
    Given('the address {string} is opened', (_, hash: string) => openLink(hash));
    When('he taps Copy on the Verse view', async () => {
      await user.click(within(await screen.findByRole('region', { name: 'Verse view' })).getByRole('button', { name: 'Copy' }));
    });
    Then('the clipboard text ends with {string}', async (_, url: string) => {
      await waitFor(() => expect(copied).toHaveLength(1));
      expect(copied[0].split('\n').at(-1)).toBe(url);
    });
    And('the Verse view says {string}', async (_, text: string) => {
      await waitFor(() => expect(panel()).toHaveTextContent(text));
    });
  });

  Scenario('The Verse view has no Share button where the phone cannot share', ({ Given, Then }) => {
    Given('the address {string} is opened', async (_, hash: string) => {
      unshare();
      await openLink(hash);
    });
    Then('the Verse view has no Share button', async () => {
      await headed('Romans 8');
      await screen.findByRole('region', { name: 'Verse view' });
      expect(within(panel()).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
      expect(within(panel()).queryByRole('button', { name: 'Share' })).toBeNull();
    });
  });

  Scenario('The Verse view shares the https link of its verse where the phone can share', ({ Given, And, When, Then }) => {
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
    And('the address {string} is opened', (_, hash: string) => openLink(hash));
    When('he taps Share on the Verse view', async () => {
      await headed('Romans 8');
      await user.click(within(await screen.findByRole('region', { name: 'Verse view' })).getByRole('button', { name: 'Share' }));
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

  Scenario('A phone that refuses the clipboard shows the text to copy by hand', ({ Given, And, When, Then }) => {
    Given('the address {string} is opened', (_, hash: string) => openLink(hash));
    And('the clipboard refuses', () => {
      stubClipboard(true);
    });
    When('he taps Copy on the Verse view', async () => {
      await user.click(within(await screen.findByRole('region', { name: 'Verse view' })).getByRole('button', { name: 'Copy' }));
    });
    Then('the Verse view shows the text ending in {string} to copy by hand', async (_, url: string) => {
      await waitFor(() => expect((within(panel()).getByRole('textbox', { name: 'Text to copy' }) as HTMLTextAreaElement).value.split('\n').at(-1)).toBe(url));
    });
  });
});
