// features/steps/sheet-back.steps.tsx — runs features/sheet-back.feature: the phone's Back on an open bottom sheet (word, Grammar,
// Talk) closes the sheet and stays on the screen beneath; Done, Escape and a tap outside leave no stray history entry.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readdirSync, readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { navigate } from '../../src/nav/route';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';

/** Opens the app on `start` (a hash), then, when `then` is 'reader', moves on to the Reader as a new Back step; verse 2 is selected. */
async function open(start: string, thenReader: boolean): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', `/${start}`);
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.grammarKnown.clear()]);
  render(<App />);
  if (thenReader) {
    await screen.findByRole('heading', { name: 'Settings' });
    act(() => navigate('home'));
  }
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  await user.click(await screen.findByRole('button', { name: 'Verse 2' }));
  await waitFor(() => expect(window.location.hash).toContain('v=2'));
}

/** The phone's Back, and the page settling after it. */
async function back(): Promise<void> {
  await act(async () => {
    window.history.back();
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const wordSheet = () => screen.queryByRole('dialog', { name: 'Word' });
const grammarSheet = () => screen.queryByRole('dialog', { name: 'Grammar' });
const ideaSheet = () => screen.queryByRole('dialog', { name: 'Idea' });
const talkSheet = () => screen.queryByRole('dialog', { name: /^Talk about / });

async function tapsWord(text: string, verse: number): Promise<void> {
  await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
  await screen.findByRole('dialog', { name: 'Word' });
}

const feature = await loadFeature('features/sheet-back.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Back on the word sheet closes it and the Reader still shows Romans 8 at the same verse', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with verse 2 selected', () => open('', false));
    And('he taps "For" in verse 2', () => tapsWord('For', 2));
    When('he goes back', back);
    Then('the word sheet is closed', async () => {
      await waitFor(() => expect(wordSheet()).toBeNull());
    });
    And('the Reader shows Romans 8 at verse 2', () => {
      expect(screen.getByRole('heading', { level: 1, name: /Romans 8/ })).toBeTruthy();
      expect(window.location.hash).toContain('v=2');
      expect(screen.getByRole('button', { name: 'Verse 2' }).getAttribute('aria-pressed')).toBe('true');
    });
  });

  Scenario('Done closes the sheet and the next Back does what it did before the sheet opened', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Settings and then on Romans 8 with verse 2 selected', () => open('#/settings', true));
    And('he taps "For" in verse 2', () => tapsWord('For', 2));
    When('he taps Done on the word sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'Done' }));
    });
    Then('the word sheet is closed', async () => {
      await waitFor(() => expect(wordSheet()).toBeNull());
    });
    When('he goes back', back);
    Then('the Settings screen is open', async () => {
      await screen.findByRole('heading', { name: 'Settings' });
      expect(window.location.hash).toBe('#/settings');
    });
  });

  Scenario('Back on the Grammar sheet closes only that sheet; a second Back closes the word sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with verse 2 selected', () => open('', false));
    And('he taps "For" in verse 2', () => tapsWord('For', 2));
    And('he taps the term "conjunction" on the word sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'conjunction', exact: true }));
      await screen.findByRole('dialog', { name: 'Grammar' });
    });
    When('he goes back', back);
    Then('the Grammar sheet is closed and the word sheet is still open', async () => {
      await waitFor(() => expect(grammarSheet()).toBeNull());
      expect(wordSheet()).not.toBeNull();
    });
    When('he goes back once more', back);
    Then('the word sheet is closed', async () => {
      await waitFor(() => expect(wordSheet()).toBeNull());
    });
  });

  Scenario('Back closes the idea sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with verse 2 selected', () => open('', false));
    And('he taps "of the" in verse 2', () => tapsWord('of the', 2));
    And('he taps the term "genitive" on the word sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'genitive', exact: true }));
      await screen.findByRole('dialog', { name: 'Grammar' });
    });
    And('he taps Learn this idea on the Grammar sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'Learn this idea' }));
      await screen.findByRole('dialog', { name: 'Idea' });
    });
    When('he goes back', back);
    Then('the idea sheet is closed and the Grammar sheet is still open', async () => {
      await waitFor(() => expect(ideaSheet()).toBeNull());
      expect(grammarSheet()).not.toBeNull();
      expect(wordSheet()).not.toBeNull();
    });
    When('he goes back once more', back);
    Then('the Grammar sheet is closed and the word sheet is still open', async () => {
      await waitFor(() => expect(grammarSheet()).toBeNull());
      expect(wordSheet()).not.toBeNull();
    });
  });

  Scenario('Back on the Talk sheet closes it', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with verse 2 selected', () => open('', false));
    And('he opens the Talk sheet', async () => {
      await user.click(await screen.findByRole('button', { name: 'Talk' }));
      await screen.findByRole('dialog', { name: /^Talk about / });
    });
    When('he goes back', back);
    Then('the Talk sheet is closed', async () => {
      await waitFor(() => expect(talkSheet()).toBeNull());
    });
    And('the Reader shows Romans 8 at verse 2', () => {
      expect(window.location.hash).toContain('v=2');
      expect(screen.getByRole('button', { name: 'Verse 2' }).getAttribute('aria-pressed')).toBe('true');
    });
  });

  Scenario('Back on the Ask for another approach sheet closes it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Settings with the Ask for another approach sheet open', async () => {
      cleanup();
      stopReading();
      clearBus();
      vi.unstubAllGlobals();
      window.localStorage.clear();
      window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
      window.history.replaceState(null, '', '/#/settings');
      stubChapterFetch();
      await db.open();
      await db.settings.clear();
      render(<App />);
      await user.click(await screen.findByRole('button', { name: 'Ask for another approach' }));
      await screen.findByRole('dialog', { name: 'Ask for another approach' });
    });
    When('he goes back', back);
    Then('the Ask for another approach sheet is closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ask for another approach' })).toBeNull());
    });
    And('the Settings screen is open', async () => {
      await screen.findByRole('heading', { name: 'Settings' });
      expect(window.location.hash).toBe('#/settings');
    });
  });

  Scenario('Escape and a tap outside leave no stray entry either', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Settings and then on Romans 8 with verse 2 selected', () => open('#/settings', true));
    And('he taps "For" in verse 2', () => tapsWord('For', 2));
    And('he taps outside the word sheet', async () => {
      await user.click(screen.getByTestId('sheet-backdrop'));
      await waitFor(() => expect(wordSheet()).toBeNull());
      await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    });
    And('he taps "For" in verse 2 again', () => tapsWord('For', 2));
    And('he presses Escape', async () => {
      await user.keyboard('{Escape}');
      await waitFor(() => expect(wordSheet()).toBeNull());
      await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    });
    When('he goes back', back);
    Then('the Settings screen is open', async () => {
      await screen.findByRole('heading', { name: 'Settings' });
    });
  });

  Scenario('Every sheet in the app uses the shared hook', ({ Then }) => {
    Then('every component that closes with Done as a sheet uses the shared hook', () => {
      const sheets = readdirSync('src')
        .filter((name) => name.endsWith('.tsx'))
        .filter((name) => readFileSync(`src/${name}`, 'utf8').includes('role="dialog"'));
      expect(sheets.sort()).toEqual(['AskApproachSheet.tsx', 'ChapterPicker.tsx', 'GrammarSheet.tsx', 'IdeaSheet.tsx', 'Talk.tsx', 'WordSheet.tsx']);
      for (const name of sheets) expect(readFileSync(`src/${name}`, 'utf8'), name).toMatch(/useSheetBack\(/);
    });
  });
});
