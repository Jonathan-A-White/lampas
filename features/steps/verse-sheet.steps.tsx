// features/steps/verse-sheet.steps.tsx — runs features/verse-sheet.feature: the panel under a tapped verse is headed by the
// reference and shows the verse's own text in the view's language, before the Read button.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { keepVerseReading, setReaderView } from '../../src/data/repositories';
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

async function open(view: 'english' | 'greek'): Promise<void> {
  cleanup();
  clearBus();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.readings.clear()]);
  await setReaderView(view);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const panel = () => screen.getByRole('region', { name: 'Reading check' });

const feature = await loadFeature('features/verse-sheet.feature');

describeFeature(feature, ({ Scenario }) => {
  const tapNumber = async () => {
    await user.click(await screen.findByRole('button', { name: 'Verse 22', exact: true }));
    await screen.findByRole('region', { name: 'Reading check' });
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
    const read = within(panel()).getByRole('button', { name: 'Read', exact: true });
    expect(text.compareDocumentPosition(read) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  };

  Scenario('The Greek view shows the Greek of Romans 8:22 under the reference', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the Greek view', () => open('greek'));
    When('he taps the number of verse 22', tapNumber);
    Then('the panel is headed {string}', headed);
    And('the panel shows the Greek of verse 22 in Greek type', showsVerse('greek', 'grc'));
    And('the verse comes before the Read button', verseBeforeRead);
  });

  Scenario('The English view shows the English of Romans 8:22 under the reference', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 in the English view', () => open('english'));
    When('he taps the number of verse 22', tapNumber);
    Then('the panel is headed {string}', headed);
    And('the panel shows the English of verse 22 in English type', showsVerse('english', 'en'));
    And('the verse comes before the Read button', verseBeforeRead);
  });

  Scenario('A kept reading with a word from another verse does not head the panel', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 in the Greek view', () => open('greek'));
    And('a kept reading of verse 22 lists the word {string}', async (_, word: string) => {
      await keepVerseReading('rom.8.22', 'some-to-fix', [{ word, chunks: ['ἀπ', 'εκ', 'δεχ', 'όμεθα'], tip: 'Say it slowly.' }], 'One word.', 'el');
    });
    When('he taps the number of verse 22', tapNumber);
    And('he taps {string}', async (_, name: string) => {
      await user.click(await within(panel()).findByRole('button', { name, exact: true }));
    });
    Then('the panel is headed {string}', headed);
    And('the panel shows the Greek of verse 22 in Greek type', showsVerse('greek', 'grc'));
  });
});
