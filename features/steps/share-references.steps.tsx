// features/steps/share-references.steps.tsx — runs features/share-references.feature: the Bible references listed on the 'Share to Lampas' sheet
// (src/share/ShareReferences.tsx, mw-s1dc0n.1) and, for a shared picture, those the find-refs grist reads from it (src/share/findRefs.ts, mw-s1dc0n.2). The share is
// a row in Dexie as the worker parks it; the app is the whole App, so a tapped link opens the Reader. The mill is the fake Postern of tests/support/fake-postern.ts,
// the canvas the image seam of src/images/shrink.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { parkShare, setLogosBible, setResourceOn } from '../../src/data/repositories';
import { DEFAULT_LOGOS_BIBLE } from '../../src/resources/logosBible';
import { clearBus } from '../../src/events/bus';
import { imageSeam } from '../../src/images/shrink';
import { tutorTimings } from '../../src/services/tutor';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';

const realSeam = { ...imageSeam };

afterAll(() => {
  cleanup();
  stopReading();
  Object.assign(imageSeam, realSeam);
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';

let fake: FakePostern;

/** Opens the app at the Share screen with `text` (or one picture) parked as the waiting share. `fresh` starts from an empty phone; a second share keeps what the phone kept. */
async function open(text: string, fresh: boolean, picture: false | 'held' | 'failing' = false): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  Object.assign(imageSeam, realSeam);
  tutorTimings.pollMs = 20;
  stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  const kept = fresh ? null : window.localStorage.getItem('lampas.shareRefsOrder');
  window.localStorage.clear();
  if (kept) window.localStorage.setItem('lampas.shareRefsOrder', kept);
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/share?s=share-1');
  fake = makeFakePostern();
  // a picture's grist waits for the step that answers it, or fails at once
  if (picture === 'failing') fake.kindReplies['find-refs'] = { status: 'failed', reason: 'could not read it' };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  imageSeam.decode = async () => ({ width: 1200, height: 800, source: null });
  imageSeam.encode = async () => new Blob([new Uint8Array(50_000).fill(7)], { type: 'image/jpeg' });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.talkPictures.clear(), db.shares.clear()]);
  await parkShare({
    id: 'share-1',
    createdAt: Date.now(),
    text: text || undefined,
    files: picture ? [{ name: 'shared-1.png', type: 'image/png', bytes: new Uint8Array([1, 2, 3]).buffer }] : [],
  });
  render(<App />);
  await screen.findByRole('dialog', { name: 'Share to Lampas' });
}

const sheet = () => screen.getByRole('dialog', { name: 'Share to Lampas' });
const links = () => Array.from(sheet().querySelectorAll<HTMLAnchorElement>('a[data-share-ref]'));
const linkNamed = (name: string): HTMLAnchorElement => {
  const found = links().find((a) => a.textContent === name);
  if (!found) throw new Error(`no link ${name}`);
  return found;
};

/** What the mill answers the find-refs grist with. */
const answered = (...pairs: [string, string][]) => ({ status: 'answered' as const, answer: { references: pairs.map(([printed, ref]) => ({ printed, ref })) } });
/** 'a' at 'b' and 'c' at 'd' from the step's four strings. */
const pairsOf = (strings: string[]): [string, string][] => Array.from({ length: strings.length / 2 }, (_, i) => [strings[2 * i]!, strings[2 * i + 1]!]);
const sheetShows = async (_: unknown, heading: string, name: string) => {
  expect(await within(sheet()).findByRole('heading', { name: heading })).toBeInTheDocument();
  expect(links().map((l) => l.textContent)).toEqual([name]);
};

const feature = await loadFeature('features/share-references.feature');

describeFeature(feature, ({ Scenario }) => {
  const sharedWords = (_: unknown, text: string) => open(text, true);
  const inOrder = (_: unknown, a: string, b: string, c?: string) => {
    expect(links().map((l) => l.textContent)).toEqual(c === undefined ? [a, b] : [a, b, c]);
  };

  Scenario('Shared words with two references list two links', ({ Given, Then, And }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    Then('the sheet shows {string} with the links {string} and {string}', (_, heading: string, a: string, b: string) => {
      expect(within(sheet()).getByRole('heading', { name: heading })).toBeInTheDocument();
      expect(links().map((l) => l.textContent)).toEqual([a, b]);
    });
    And('the link {string} goes to {string}', (_, name: string, href: string) => {
      expect(linkNamed(name).getAttribute('href')).toBe(href);
    });
    And('the link {string} also goes to {string}', (_, name: string, href: string) => {
      expect(linkNamed(name).getAttribute('href')).toBe(href);
    });
  });

  Scenario('A link opens the Reader on the verse', ({ Given, When, Then }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(linkNamed(name));
    });
    Then('the Reader is open at Romans 8 verse 28', async () => {
      await waitFor(() => expect(document.querySelector('[data-verse][data-selected="true"]')).not.toBeNull());
      expect(document.querySelector('[data-verse][data-selected="true"]')).toHaveTextContent(/28/);
      expect(window.location.hash).toContain('c=8');
    });
  });

  const card = () => screen.getByRole('dialog', { name: 'Genesis 1:28' });

  Scenario('An Old Testament reference opens the not-in-Lampas card, not another chapter', ({ Given, When, Then, And }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(linkNamed(name));
    });
    Then('a card headed {string} says {string}', async (_, heading: string, line: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      expect(await within(dialog).findByText(new RegExp(line))).toBeInTheDocument();
    });
    And('the Reader is not opened', () => {
      expect(window.location.hash).toContain('/share');
      expect(document.querySelector('[data-link-notice]')).toBeNull();
      expect(sheet()).toBeInTheDocument();
    });
    When('he closes the card', async () => {
      await user.click(within(card()).getByRole('button', { name: 'Close' }));
    });
    Then('the sheet shows the link {string} again', async (_, name: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Genesis 1:28' })).toBeNull());
      expect(linkNamed(name)).toBeInTheDocument();
    });
  });

  Scenario('With Logos on, the card for an Old Testament reference offers Open in Logos', ({ Given, When, Then, And }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    And('Logos is linked and his Bible is the LSB', async () => {
      await setResourceOn('logos', true);
      await setLogosBible(DEFAULT_LOGOS_BIBLE);
    });
    When('he taps the link {string}', async (_, name: string) => {
      await user.click(linkNamed(name));
    });
    Then('a card headed {string} says {string}', async (_, heading: string, line: string) => {
      const dialog = await screen.findByRole('dialog', { name: heading });
      expect(await within(dialog).findByText(new RegExp(line))).toBeInTheDocument();
    });
    And('the card has an Open in Logos link', async () => {
      expect(await within(card()).findByRole('link', { name: 'Open in Logos' })).toBeInTheDocument();
    });
  });

  Scenario('The references keep the order of the page, a repeat at its first place', ({ Given, Then }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    Then('the links are, in order, {string}, {string} and {string}', inOrder);
  });

  Scenario('Bible order groups them under each book, and the choice is kept', ({ Given, When, Then, And }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    When('he taps {string}', async (_, label: string) => {
      await user.click(within(sheet()).getByRole('button', { name: label }));
    });
    Then('the links are, in order, {string}, {string} and {string}', inOrder);
    And('the books listed are {string} then {string}', (_, a: string, b: string) => {
      expect(Array.from(sheet().querySelectorAll('h4')).map((h) => h.textContent)).toEqual([a, b]);
    });
    When('the Share screen is opened again with a share of the words {string}', (_, text: string) => open(text, false));
    Then('the links are, in order, {string} and {string}', inOrder);
  });

  Scenario('Words with no reference say so', ({ Given, Then }) => {
    Given('the Share screen is opened with a share of the words {string}', sharedWords);
    Then('the sheet says {string}', (_, text: string) => {
      expect(within(sheet()).getByText(text)).toBeInTheDocument();
      expect(links()).toHaveLength(0);
    });
  });

  Scenario('A shared picture is read for its references, and a book that is not a book is dropped', ({ Given, Then, When, And }) => {
    Given('the Share screen is opened with a shared picture', async () => {
      await open('', true, 'held');
    });
    Then('the sheet says {string}', async (_, text: string) => {
      expect(await within(sheet()).findByText(text)).toBeInTheDocument();
    });
    When('the mill answers with the references {string} at {string} and {string} at {string}', async (_, ...strings: string[]) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      await fake.answer(answered(...pairsOf(strings)));
    });
    Then('the sheet shows {string} with the link {string}', sheetShows);
    And('the link {string} goes to {string}', (_, name: string, href: string) => {
      expect(linkNamed(name).getAttribute('href')).toBe(href);
    });
    And('the picture went to the find-refs grind alone, with its language', () => {
      expect(fake.received).toHaveLength(1);
      expect(fake.received[0]!.grist.kind).toBe('find-refs');
      expect(fake.received[0]!.input).toEqual({ language: 'en' });
      expect(fake.received[0]!.attachments).toHaveLength(1);
      expect(fake.received[0]!.attachments[0]!.mime).toBe('image/jpeg');
    });
  });

  Scenario('A grist that fails says so, and Try again reads the picture again', ({ Given, Then, When, And }) => {
    Given('the Share screen is opened with a shared picture, and the mill fails the grist', async () => {
      await open('', true, 'failing');
    });
    Then('the sheet says {string}', async (_, text: string) => {
      expect(await within(sheet()).findByRole('alert')).toHaveTextContent(text);
    });
    When('the mill will answer with the references {string} at {string}', (_, printed: string, ref: string) => {
      fake.kindReplies['find-refs'] = answered([printed, ref]);
    });
    And('he taps {string}', async (_, label: string) => {
      await user.click(within(sheet()).getByRole('button', { name: label }));
    });
    Then('the sheet shows {string} with the link {string}', sheetShows);
  });
});
