// features/steps/share-references.steps.tsx — runs features/share-references.feature: the Bible references listed on the 'Share to Lampas' sheet
// (src/share/ShareReferences.tsx, mw-s1dc0n.1). The share is a row in Dexie as the worker parks it; the app is the whole App, so a tapped link opens the Reader.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { parkShare } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';

/** Opens the app at the Share screen with `text` parked as the waiting share. `fresh` starts from an empty phone; a second share keeps what the phone kept. */
async function open(text: string, fresh: boolean): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  const kept = fresh ? null : window.localStorage.getItem('lampas.shareRefsOrder');
  window.localStorage.clear();
  if (kept) window.localStorage.setItem('lampas.shareRefsOrder', kept);
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/#/share?s=share-1');
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.talkPictures.clear(), db.shares.clear()]);
  await parkShare({ id: 'share-1', createdAt: Date.now(), text, files: [] });
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
});
