// features/steps/word-sheet-english.steps.tsx — runs features/word-sheet-english.feature: the word sheet's English row and heading
// show a chunk's words without the verse's punctuation at their ends (mw-5r3p30.265). fetch is stubbed with the committed chapters.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

async function openOn(book: string, chapter: number, title: string, view: 'english' | 'greek'): Promise<void> {
  cleanup();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = `#/?b=${book}&c=${chapter}&view=${view}`;
  render(<App />);
  await screen.findByRole('heading', { name: title, level: 1 });
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe(view));
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};

const tap = async (text: string, verse: number): Promise<void> => user.click(within(verseEl(verse)).getByRole('button', { name: text }));
const sheet = () => screen.findByRole('dialog', { name: 'Word' });
const sheetEnglish = async (): Promise<string[]> => within(await sheet()).getAllByTestId('sheet-english').map((el) => el.textContent ?? '');

const feature = await loadFeature('features/word-sheet-english.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Πάντοτε in 1 Thessalonians 5:16 shows its English without the full stop', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on 1 Thessalonians 5 in Greek', () => openOn('1th', 5, '1 Thessalonians 5', 'greek'));
    When('he taps {string} in verse {int}', (_, text: string, verse: number) => tap(text, verse));
    Then('the word sheet shows the English {string}', async (_, english: string) => expect(await sheetEnglish()).toEqual([english]));
    And('verse {int} of the Reader still reads {string}', async (_, verse: number, text: string) => {
      // the Reader's own text is unchanged: back to the English view, the verse keeps its full stop
      await user.click(within(await sheet()).getByRole('button', { name: 'Done' }));
      await user.click(screen.getByRole('button', { name: 'English' }));
      await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('english'));
      const shown = verseEl(verse).querySelector('[data-text]')?.textContent?.replace(/\s+/g, ' ').trim();
      expect(shown).toBe(text);
    });
  });

  Scenario('The English he tapped heads the sheet without the full stop', ({ Given, When, Then }) => {
    Given('Lampas is opened on 1 Thessalonians 5 in English', () => openOn('1th', 5, '1 Thessalonians 5', 'english'));
    When('he taps {string} in verse {int}', (_, text: string, verse: number) => tap(text, verse));
    Then('the word sheet is headed with the English {string}', async (_, english: string) => {
      expect(within(await sheet()).getByTestId('sheet-heading')).toHaveTextContent(`English: “${english}”`);
    });
  });

  Scenario('Quotes and a comma at the ends go, the hyphen inside stays', ({ Given, When, Then }) => {
    Given('Lampas is opened on 2 Corinthians 12 in Greek', () => openOn('2co', 12, '2 Corinthians 12', 'greek'));
    When('he taps {string} in verse {int}', (_, text: string, verse: number) => tap(text, verse));
    Then('the word sheet shows the English {string}', async (_, english: string) => expect(await sheetEnglish()).toEqual([english]));
  });

  Scenario('A comma at the end goes, the apostrophe inside stays', ({ Given, When, Then }) => {
    Given('Lampas is opened on 1 Corinthians 10 in Greek', () => openOn('1co', 10, '1 Corinthians 10', 'greek'));
    When('he taps {string} in verse {int}', (_, text: string, verse: number) => tap(text, verse));
    Then('the word sheet shows the English {string}', async (_, english: string) => expect(await sheetEnglish()).toEqual([english]));
  });
});
