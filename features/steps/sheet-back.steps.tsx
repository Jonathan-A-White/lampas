// features/steps/sheet-back.steps.tsx — runs features/sheet-back.feature: the phone's Back on an open bottom sheet (word, Grammar,
// Talk) closes the sheet and stays on the screen beneath; Done, Escape and a tap outside leave no stray history entry.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
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
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';

/** Opens the app on `start` (a hash), then, when `thenReader`, moves on to the Reader as a new Back step; verse 2 is selected unless `select` is false (its Verse view is then open). */
async function open(start: string, thenReader: boolean, select = true): Promise<void> {
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
  await seedHisWords();
  render(<App />);
  if (thenReader) {
    await screen.findByRole('heading', { name: 'Settings' });
    act(() => navigate('home'));
  }
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  if (!select) return;
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
  // in the Verse view when one is open, else in the Reader's own line
  const scope = screen.queryByRole('region', { name: 'Verse view' }) ?? verseEl(verse);
  await user.click(within(scope).getByRole('button', { name: text }));
  await screen.findByRole('dialog', { name: 'Word' });
}

/** Closes the open sheet `which` the way `way` says: Done, a swipe down its handle, a tap on its backdrop, or Escape; then lets the page settle. */
async function dismiss(which: 'grammar' | 'idea', way: string): Promise<void> {
  const sheet = (which === 'grammar' ? grammarSheet() : ideaSheet()) as HTMLElement;
  if (way === 'Done') await user.click(within(sheet).getByRole('button', { name: 'Done' }));
  else if (way === 'a swipe down') {
    const handle = screen.getByTestId(`${which}-handle`);
    fireEvent.touchStart(handle, { touches: [{ clientY: 100 }] });
    fireEvent.touchMove(handle, { touches: [{ clientY: 300 }] });
    fireEvent.touchEnd(handle);
  } else if (way === 'a tap outside') await user.click(screen.getByTestId(`${which}-backdrop`));
  else if (way === 'Escape') await user.keyboard('{Escape}');
  else throw new Error(`no way called ${way}`);
  await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
}

const noSheetOpen = (): void => {
  expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
};

let wordBeforeExample = '';

const feature = await loadFeature('features/sheet-back.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
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
    Given('Lampas is opened on Settings and then on Romans 8', () => open('#/settings', true, false));
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

  Scenario("Back walks the Grammar sheet's trail one term at a time (word card, plural, singular)", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on 1 John 2 in Greek', () => open('#/?b=1jn&c=2&view=greek', false, false));
    And('he taps "Τεκνία" in verse 1', () => tapsWord('Τεκνία', 1));
    And('he taps the term "plural" on the word sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'plural', exact: true }));
      await screen.findByRole('dialog', { name: 'Grammar' });
    });
    And('he taps the related term "singular" on the Grammar sheet', async () => {
      await user.click(within(grammarSheet() as HTMLElement).getByRole('button', { name: 'singular', exact: true }));
      await within(grammarSheet() as HTMLElement).findByRole('heading', { name: 'singular' });
    });
    When('he goes back', back);
    Then('the Grammar sheet shows "plural"', async () => {
      await within(grammarSheet() as HTMLElement).findByRole('heading', { name: 'plural' });
      expect(wordSheet()).not.toBeNull();
    });
    When('he goes back once more', back);
    Then('the Grammar sheet is closed and the word sheet is still open', async () => {
      await waitFor(() => expect(grammarSheet()).toBeNull());
      expect(wordSheet()).not.toBeNull();
    });
    When('he goes back a third time', back);
    Then('the word sheet is closed', async () => {
      await waitFor(() => expect(wordSheet()).toBeNull());
    });
    And('the Reader shows 1 John 2', () => {
      expect(screen.getByRole('heading', { level: 1, name: /1 John 2/ })).toBeTruthy();
    });
  });

  Scenario('Back from an example word returns to the idea sheet, then the Grammar sheet, then the first word', ({ Given, And, When, Then }) => {
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
    And('he taps the first example on the idea sheet', async () => {
      wordBeforeExample = (wordSheet() as HTMLElement).textContent ?? '';
      const [first] = await within(ideaSheet() as HTMLElement).findAllByTestId('idea-example');
      await user.click(first as HTMLElement);
    });
    Then('the idea sheet and the Grammar sheet are gone and the word sheet shows the example', async () => {
      await waitFor(() => expect(ideaSheet()).toBeNull());
      expect(grammarSheet()).toBeNull();
      expect(wordSheet()).not.toBeNull();
      expect((wordSheet() as HTMLElement).textContent).not.toBe(wordBeforeExample);
    });
    When('he goes back', back);
    Then('the idea sheet is open again over the Grammar sheet, and the word sheet shows what it did before the example', async () => {
      await screen.findByRole('dialog', { name: 'Idea' });
      expect(grammarSheet()).not.toBeNull();
      expect((wordSheet() as HTMLElement).textContent).toBe(wordBeforeExample);
    });
    When('he goes back once more', back);
    Then('the idea sheet is closed and the Grammar sheet is still open', async () => {
      await waitFor(() => expect(ideaSheet()).toBeNull());
      expect(grammarSheet()).not.toBeNull();
      expect(wordSheet()).not.toBeNull();
    });
    When('he goes back a third time', back);
    Then('the Grammar sheet is closed and the word sheet is still open', async () => {
      await waitFor(() => expect(grammarSheet()).toBeNull());
      expect(wordSheet()).not.toBeNull();
    });
    When('he goes back a fourth time', back);
    Then('the word sheet is closed', async () => {
      await waitFor(() => expect(wordSheet()).toBeNull());
    });
  });

  Scenario('Done after moves inside a sheet leaves no entry behind', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Settings and then on Romans 8', () => open('#/settings', true, false));
    And('he taps "For" in verse 2', () => tapsWord('For', 2));
    And('he taps the term "conjunction" on the word sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'conjunction', exact: true }));
      await screen.findByRole('dialog', { name: 'Grammar' });
    });
    And('he taps the related term "particle" on the Grammar sheet', async () => {
      await user.click(within(grammarSheet() as HTMLElement).getByRole('button', { name: 'particle', exact: true }));
      await within(grammarSheet() as HTMLElement).findByRole('heading', { name: 'particle' });
    });
    And('he taps Done on the Grammar sheet', async () => {
      await user.click(within(grammarSheet() as HTMLElement).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(grammarSheet()).toBeNull());
      await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    });
    When('he goes back', back);
    Then('the Settings screen is open', async () => {
      await screen.findByRole('heading', { name: 'Settings' });
      expect(window.location.hash).toBe('#/settings');
    });
  });

  Scenario('Done on the word sheet after an example word leaves no entry behind', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Settings and then on Romans 8', () => open('#/settings', true, false));
    And('he taps "of the" in verse 2', () => tapsWord('of the', 2));
    And('he taps the term "genitive" on the word sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'genitive', exact: true }));
      await screen.findByRole('dialog', { name: 'Grammar' });
    });
    And('he taps Learn this idea on the Grammar sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'Learn this idea' }));
      await screen.findByRole('dialog', { name: 'Idea' });
    });
    And('he taps the first example on the idea sheet', async () => {
      const [first] = await within(ideaSheet() as HTMLElement).findAllByTestId('idea-example');
      await user.click(first as HTMLElement);
      await waitFor(() => expect(ideaSheet()).toBeNull());
    });
    And('he taps Done on the word sheet', async () => {
      await user.click(within(wordSheet() as HTMLElement).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(wordSheet()).toBeNull());
      await act(() => new Promise((resolve) => setTimeout(resolve, 30)));
    });
    When('he goes back', back);
    Then('the Settings screen is open', async () => {
      await screen.findByRole('heading', { name: 'Settings' });
      expect(window.location.hash).toBe('#/settings');
    });
  });

  Scenario('Back on the Talk sheet closes it', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8', () => open('', false, false));
    And('he opens the Talk sheet', async () => {
      await user.click(await screen.findByRole('button', { name: 'Talk' }));
      await screen.findByRole('dialog', { name: /^Talk about / });
    });
    When('he goes back', back);
    Then('the Talk sheet is closed', async () => {
      await waitFor(() => expect(talkSheet()).toBeNull());
    });
    And('the Reader shows Romans 8', () => {
      expect(screen.getByRole('heading', { level: 1, name: /Romans 8/ })).toBeTruthy();
      expect(window.location.hash).not.toContain('v=');
    });
  });

  Scenario('Back on the teach sheet closes it', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8', () => open('', false, false));
    And('he opens the teach sheet', async () => {
      await user.click(await screen.findByTestId('new-words'));
      await screen.findByRole('dialog', { name: 'New word' });
    });
    When('he goes back', back);
    Then('the teach sheet is closed', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'New word' })).toBeNull());
    });
    And('the Reader shows Romans 8', () => {
      expect(screen.getByRole('heading', { level: 1, name: /Romans 8/ })).toBeTruthy();
      expect(window.location.hash).not.toContain('v=');
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
      await seedHisWords();
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
    Given('Lampas is opened on Settings and then on Romans 8', () => open('#/settings', true, false));
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

  ScenarioOutline('<way> on the Grammar sheet closes the Grammar sheet and the word card with it', ({ Given, And, When, Then }, row) => {
    Given('Lampas is opened on 1 John 2 in Greek', () => open('#/?b=1jn&c=2&view=greek', false, false));
    And('he taps "Τεκνία" in verse 1', () => tapsWord('Τεκνία', 1));
    And('he taps the term "plural" on the word sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'plural', exact: true }));
      await screen.findByRole('dialog', { name: 'Grammar' });
    });
    When('he dismisses the Grammar sheet with <way>', () => dismiss('grammar', row.way));
    Then('no sheet is open', () => waitFor(noSheetOpen));
    And('the Reader shows 1 John 2', () => {
      expect(screen.getByRole('heading', { level: 1, name: /1 John 2/ })).toBeTruthy();
    });
  });

  ScenarioOutline('<way> on the idea sheet closes the idea sheet, the Grammar sheet and the word card', ({ Given, And, When, Then }, row) => {
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
    When('he dismisses the idea sheet with <way>', () => dismiss('idea', row.way));
    Then('no sheet is open', () => waitFor(noSheetOpen));
    And('the Reader shows Romans 8 at verse 2', () => {
      expect(screen.getByRole('heading', { level: 1, name: /Romans 8/ })).toBeTruthy();
      expect(window.location.hash).toContain('v=2');
    });
  });

  Scenario('Done on the Grammar sheet over the word card takes every entry off, so Back does not reopen a sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Settings and then on Romans 8', () => open('#/settings', true, false));
    And('he taps "For" in verse 2', () => tapsWord('For', 2));
    And('he taps the term "conjunction" on the word sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'conjunction', exact: true }));
      await screen.findByRole('dialog', { name: 'Grammar' });
    });
    And('he taps Done on the Grammar sheet', () => dismiss('grammar', 'Done'));
    When('he goes back', back);
    Then('the Settings screen is open', async () => {
      await screen.findByRole('heading', { name: 'Settings' });
      expect(window.location.hash).toBe('#/settings');
    });
    And('no sheet is open', noSheetOpen);
  });

  Scenario('Done on the idea sheet over the Grammar sheet and the word card takes every entry off', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Settings and then on Romans 8', () => open('#/settings', true, false));
    And('he taps "of the" in verse 2', () => tapsWord('of the', 2));
    And('he taps the term "genitive" on the word sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'genitive', exact: true }));
      await screen.findByRole('dialog', { name: 'Grammar' });
    });
    And('he taps Learn this idea on the Grammar sheet', async () => {
      await user.click(screen.getByRole('button', { name: 'Learn this idea' }));
      await screen.findByRole('dialog', { name: 'Idea' });
    });
    And('he taps Done on the idea sheet', () => dismiss('idea', 'Done'));
    When('he goes back', back);
    Then('the Settings screen is open', async () => {
      await screen.findByRole('heading', { name: 'Settings' });
      expect(window.location.hash).toBe('#/settings');
    });
    And('no sheet is open', noSheetOpen);
  });

  Scenario('Every sheet in the app uses the shared hook', ({ Then }) => {
    Then('every component that closes with Done as a sheet uses the shared hook', () => {
      const sheets = readdirSync('src')
        .filter((name) => name.endsWith('.tsx'))
        .filter((name) => readFileSync(`src/${name}`, 'utf8').includes('role="dialog"'));
      expect(sheets.sort()).toEqual(['AskApproachSheet.tsx', 'ChapterPicker.tsx', 'CheckSheet.tsx', 'DrillItScreen.tsx', 'GrammarSheet.tsx', 'IdeaSheet.tsx', 'LetterDrillScreen.tsx', 'PlanDrillScreen.tsx', 'ReadingDrill.tsx', 'Talk.tsx', 'TeachSheet.tsx', 'TryItSheet.tsx', 'WordSheet.tsx']);
      for (const name of sheets) expect(readFileSync(`src/${name}`, 'utf8'), name).toMatch(/useSheetBack\(/);
    });
  });
});
