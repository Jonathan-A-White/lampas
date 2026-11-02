// features/steps/septuagint.steps.tsx — runs features/septuagint.feature: the Reader reads an Old Testament book in the Septuagint (mw-u2w5klk.11). The chapters are the fixtures in
// tests/fixtures/data-lxx (Genesis 1 and Greek Psalm 22, built by scripts/data-build-lxx.ts); Genesis 1 in the Hebrew is tests/fixtures/data/gen/1.json; Isaiah is not in the Septuagint's index.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOKS } from '../../src/data/books';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(async () => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  await usageWritesSettled();
  db.close();
});

const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();

/** Opens the app on a chapter (the address names it) with the Septuagint set as given and these settings saved. */
async function openOn(title: string, septuagint: 'on' | 'off', settings: Record<string, string> = {}): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-theme');
  stubChapterFetch();
  const at = title.lastIndexOf(' ');
  const book = BOOKS.find((b) => b.name === title.slice(0, at));
  if (!book) throw new Error(`no book ${title}`);
  window.history.replaceState(null, '', `/#/?b=${book.code}&c=${title.slice(at + 1)}`);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  // the Hebrew view of a chapter needs the Hebrew dial (mw-gdcyf98.3): these scenarios are of a phone with Hebrew All in, and the Greek dial unplaced (All in)
  await db.settings.put({ key: 'hebrewInterest', value: '5' });
  await db.settings.put({ key: 'septuagint', value: septuagint });
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const switchEl = (): HTMLElement => screen.getByRole('group', { name: 'Language' });

const feature = await loadFeature('features/septuagint.feature');

describeFeature(feature, ({ Scenario }) => {
  const switchOffers = async (_: unknown, a: string, b: string): Promise<void> => {
    await waitFor(() => expect(within(switchEl()).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b]));
  };
  const subtitleReads = async (_: unknown, text: string): Promise<void> => {
    await waitFor(() => expect(squash(document.querySelector('[data-reader-subtitle]')?.textContent)).toBe(text));
  };
  const noSubtitle = (): void => {
    expect(document.querySelector('[data-reader-subtitle]')).toBeNull();
  };
  const titleReads = async (_: unknown, text: string): Promise<void> => {
    await waitFor(() => expect(squash(screen.getByRole('heading', { level: 1 }).textContent)).toBe(text));
  };

  Scenario('With the setting off Genesis 1 is the Hebrew', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint off', () => openOn('Genesis 1', 'off'));
    Then('the language switch offers {string} and {string}', switchOffers);
    And('no header subtitle is shown', noSubtitle);
  });

  Scenario("With the setting on Genesis 1 is the Greek with Brenton's English under verse 1", ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Genesis 1', 'on', { readerView: view }));
    Then('the language switch offers {string} and {string}', switchOffers);
    And('verse 1 begins with the Greek {string}', async (_: unknown, word: string) => {
      await waitFor(() => expect(squash(verseEl(1).querySelector('[data-word="0"]')?.textContent)).toBe(word));
    });
    And('the English under verse 1 is {string}', (_: unknown, text: string) => {
      expect(squash(verseEl(1).querySelector('[data-lxx-english]')?.textContent)).toBe(text);
    });
    And('the header subtitle reads {string}', subtitleReads);
    And('the title reads {string}', titleReads);
  });

  Scenario("In the English view the verse is Brenton's English", ({ Given, Then }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Genesis 1', 'on', { readerView: view }));
    Then('verse 1 reads {string}', async (_: unknown, text: string) => {
      await waitFor(() => expect(squash(verseEl(1).querySelector('[data-text]')?.textContent)).toBe(text));
    });
  });

  Scenario('Psalms 23 is Greek Psalm 22 and its first verse says both numbers', ({ Given, Then, And }) => {
    Given('Lampas is opened on Psalms 23 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Psalms 23', 'on', { readerView: view }));
    Then('the title reads {string}', titleReads);
    And('the number of the first verse reads {string}', (_: unknown, text: string) => {
      expect(squash(verseEl(1).querySelector('[data-verse-number]')?.textContent)).toBe(text);
    });
    And('the header subtitle reads {string}', subtitleReads);
  });

  Scenario('A book whose Septuagint is not shipped stays Hebrew and says so', ({ Given, Then, And }) => {
    Given('Lampas is opened on Isaiah 1 with the Septuagint on and the saved view {string}', (_: unknown, view: string) => openOn('Isaiah 1', 'on', { readerView: view }));
    Then('the language switch offers {string} and {string}', switchOffers);
    And('the note reads {string}', async (_: unknown, text: string) => {
      await waitFor(() => expect(squash(document.querySelector('[data-septuagint-not-ready]')?.textContent)).toBe(text));
    });
    And('no header subtitle is shown', noSubtitle);
  });

  Scenario('The Weave is off on a Septuagint chapter and a hint says why once', ({ Given, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with the Septuagint on and the Weave {string}', (_: unknown, weave: string) => openOn('Genesis 1', 'on', { weave }));
    Then('the language switch offers {string} and {string}', switchOffers);
    And('the tip reads {string}', async (_: unknown, text: string) => {
      await waitFor(() => expect(squash(document.querySelector('[data-hint-card="septuagint-weave"]')?.textContent)).toContain(text));
    });
  });
});
