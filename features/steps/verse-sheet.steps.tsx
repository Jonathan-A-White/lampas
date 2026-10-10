// features/steps/verse-sheet.steps.tsx — runs features/verse-sheet.feature: the Verse view of a tapped verse is headed by the
// reference and shows the verse's own text in the view's language, big, above its hold bar.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { keepVerseReading, setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { readingText } from '../../src/services/reading';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse22 = chapter.verses.find((v) => v.n === 22);
if (!verse22) throw new Error('no verse 22');

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';

type WeaveValue = 'off' | 'solid';
async function open(view: 'english' | 'greek', weave: WeaveValue = 'off'): Promise<void> {
  cleanup();
  clearBus();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.readings.clear()]);
  await setReaderView(view);
  await setWeave(weave);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  if (weave === 'solid' && view === 'english') await waitFor(() => expect(document.querySelectorAll('[data-reader] [data-woven]').length).toBeGreaterThan(0));
}

const weaveOf = (label: string): WeaveValue => (label === 'Solid words' ? 'solid' : 'off');
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const readerLine = (n: number): HTMLElement => {
  const line = document.querySelector<HTMLElement>(`[data-verse="${n}"] [data-text]`);
  if (!line) throw new Error(`no line for verse ${n}`);
  return line;
};
const sheetVerse = (): HTMLElement => panel().querySelector<HTMLElement>('[data-sheet-verse]') as HTMLElement;


const panel = () => screen.getByRole('region', { name: 'Verse view' });

const feature = await loadFeature('features/verse-sheet.feature');

describeFeature(feature, ({ Scenario }) => {
  const tapNumber = async () => {
    await user.click(await screen.findByRole('button', { name: 'Verse 22', exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const headed = (_: unknown, reference: string) => {
    expect(within(panel()).getByRole('heading', { name: reference })).toBeInTheDocument();
    expect(within(panel()).getAllByRole('heading')[0]).toHaveTextContent(reference);
  };
  const showsVerse = (view: 'english' | 'greek', lang: string) => () => {
    const text = panel().querySelector('[data-sheet-verse]');
    expect(text).toHaveTextContent(readingText(verse22, view));
    expect(text).toHaveAttribute('lang', lang);
  };
  const verseBeforeRead = () => {
    const text = panel().querySelector('[data-sheet-verse]') as HTMLElement;
    const bar = within(panel()).getByRole('button', { name: /^(Hold to|Play) / });
    expect(text.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  };

  Scenario('The Greek view shows the Greek of Romans 8:22 under the reference', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the Greek view', () => open('greek'));
    When('he taps the number of verse 22', tapNumber);
    Then('the Verse view is headed {string}', headed);
    And('the Verse view shows the Greek of verse 22 in Greek type', showsVerse('greek', 'grc'));
    And('the verse comes before the control at the foot', verseBeforeRead);
  });

  Scenario('The English view shows the English of Romans 8:22 under the reference', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view', () => open('english'));
    When('he taps the number of verse 22', tapNumber);
    Then('the Verse view is headed {string}', headed);
    And('the Verse view shows the English of verse 22 in English type', showsVerse('english', 'en'));
    And('the verse comes before the control at the foot', verseBeforeRead);
  });

  Scenario('A kept reading with a word from another verse does not head the panel', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in the Greek view', () => open('greek'));
    And('a kept reading of verse 22 lists the word {string}', async (_, word: string) => {
      await keepVerseReading('rom.8.22', 'some-to-fix', [{ word, chunks: ['ἀπ', 'εκ', 'δεχ', 'όμεθα'], tip: 'Say it slowly.' }], 'One word.', 'el');
    });
    When('he taps the number of verse 22', tapNumber);
    And('he chooses {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    });
    And('he taps {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    });
    Then('the Verse view is headed {string}', headed);
    And('the Verse view shows the Greek of verse 22 in Greek type', showsVerse('greek', 'grc'));
  });

  const tapNumberOf = (n: number) => async () => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const sameWords = () => waitFor(() => expect(squash(sheetVerse().textContent)).toBe(squash(readerLine(1).textContent)));
  const hasWoven = () => waitFor(() => expect(sheetVerse().querySelectorAll('[data-woven]').length).toBeGreaterThan(0));
  const noWoven = () => waitFor(() => expect(sheetVerse().querySelectorAll('[data-woven]').length).toBe(0));
  const openWith = (view: 'english' | 'greek') => (_: unknown, weave: string) => open(view, weaveOf(weave));
  const setWeaveTo = async (_: unknown, weave: string) => {
    await act(() => setWeave(weaveOf(weave)));
  };

  Scenario('With the weave on, the English view\'s Verse view shows the verse woven as the reader does', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith('english'));
    When('he taps the number of verse 1', tapNumberOf(1));
    Then('the Verse view\'s verse has the same words as the reader\'s line for verse 1', sameWords);
    And('the Verse view\'s verse has a Greek word woven in', async () => {
      await hasWoven();
      expect(sheetVerse().querySelector('[data-woven]')).toHaveAttribute('lang', 'grc');
    });
    And('the Verse view\'s woven words are tappable like the reader\'s', async () => {
      await user.click(sheetVerse().querySelector('[data-woven]') as HTMLElement);
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
    });
  });

  Scenario('With the weave off, the English view\'s Verse view shows plain English', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith('english'));
    When('he taps the number of verse 1', tapNumberOf(1));
    Then('the Verse view\'s verse has the same words as the reader\'s line for verse 1', sameWords);
    And('the Verse view\'s verse has no Greek word woven in', noWoven);
  });

  Scenario('The Greek view\'s Verse view shows the Greek, whatever the weave', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the Greek view with the weave {string}', openWith('greek'));
    When('he taps the number of verse 1', tapNumberOf(1));
    Then('the Verse view\'s verse has the same words as the reader\'s line for verse 1', sameWords);
    And('the Verse view\'s verse has no Greek word woven in', noWoven);
  });

  Scenario('The Verse view follows the weave and the view when they change while it is open', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in the English view with the weave {string}', openWith('english'));
    And('he taps the number of verse 1', tapNumberOf(1));
    When('the weave is set to {string}', setWeaveTo);
    Then('the Verse view\'s verse has a Greek word woven in', hasWoven);
    And('the Verse view\'s verse has the same words as the reader\'s line for verse 1', sameWords);
    When('the weave is then set to {string}', setWeaveTo);
    Then('the Verse view\'s verse has no Greek word woven in', noWoven);
    When('the view is set to Greek', async () => {
      await act(() => setReaderView('greek'));
    });
    Then('the Verse view\'s verse shows the Greek of verse 1 as the reader\'s line does', sameWords);
  });
});
