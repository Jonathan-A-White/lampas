// features/steps/reader-chips.steps.tsx — runs features/reader-chips.feature: the Reader's one slim row of chips under the header
// (src/ReaderChips.tsx): Due, Goal, Tip and New words. Layout (the 40 px row, where the text starts) is proven by tests/e2e/reader-top.spec.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { forgetFrequency } from '../../src/data/frequency';
import { keepTip, setGoal } from '../../src/data/repositories';
import { DAY } from '../../src/data/schedule';
import { forgetSkipped } from '../../src/data/skipped';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech } from '../../tests/support/fake-speech';
import { forgetGoalNeeds } from '../../src/useGoalProgress';

const chapter8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const nfc = (s: string): string => s.normalize('NFC');

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

async function freshStore(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  forgetSkipped();
  forgetFrequency();
  forgetGoalNeeds();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  window.location.hash = '';
  stubChapterFetch();
  stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.results.clear(), db.grammarLevels.clear(), db.tips.clear()]);
}

async function openReader(): Promise<void> {
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

/** Exactly `n` words due: the first open leaves his learning words due, so those are cleared first. */
async function makeDue(n: number): Promise<void> {
  const now = Date.now();
  await db.reviews.clear();
  const lemmas = (await db.words.toArray()).slice(0, n).map((w) => w.lemma);
  expect(lemmas).toHaveLength(n);
  await db.reviews.bulkPut(lemmas.map((id) => ({ kind: 'word' as const, id, step: 3, rights: 0, due: now - DAY, lastWhen: now - 10 * DAY, lapses: 0 })));
}

/** His seed words, read once by the app, and nothing else. */
async function openSeeded(prepare: () => Promise<void>): Promise<void> {
  await freshStore();
  await openReader();
  await waitFor(async () => expect(await db.words.count()).toBe(63));
  await prepare();
}

const row = () => screen.queryByTestId('reader-chips');
const chipNames = (): string[] => (row() ? [...row()!.querySelectorAll('button')].map((b) => (b.textContent ?? '').trim()) : []);
const chip = async (text: string): Promise<HTMLElement> => {
  const found = await waitFor(() => {
    const button = [...(row()?.querySelectorAll('button') ?? [])].find((b) => (b.textContent ?? '').trim() === text);
    if (!button) throw new Error(`no chip ${text}; the row has ${chipNames().join(', ')}`);
    return button;
  });
  return found as HTMLElement;
};
const goalChip = () => screen.findByTestId('goal-strip');

async function backToReader(): Promise<void> {
  window.history.back();
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
}

const feature = await loadFeature('features/reader-chips.feature');

describeFeature(feature, ({ Scenario }) => {
  const WITH_EVERYTHING = 'Lampas is opened on Romans 8 with 3 words due, the goal {string} and his seed words';
  const withEverything = async (_: unknown, goal: string) =>
    openSeeded(async () => {
      await makeDue(3);
      await setGoal(goal);
    });

  Scenario('Each chip opens what its strip opened', ({ Given, When, Then, And }) => {
    Given(WITH_EVERYTHING, withEverything);
    Then('the row under the header has the chips {string}, {string} and {string}', async (_, due: string, goal: string, news: string) => {
      await chip(due);
      await goalChip();
      await chip(news);
      expect(chipNames()).toEqual([due, expect.stringMatching(new RegExp(`^${goal} \\d+/\\d+$`)), news]);
    });
    When('he taps the chip {string}', async (_, text: string) => user.click(await chip(text)));
    Then('the Review screen is shown', async () => {
      await screen.findByTestId('due-today');
    });
    When('he goes back to the Reader', backToReader);
    And('he taps the goal chip', async () => user.click(await goalChip()));
    Then('the Goal screen is shown', async () => {
      await screen.findByTestId('goal-title');
    });
    When('he comes back to the Reader once more', backToReader);
    And('he taps the chip {string}', async (_, text: string) => user.click(await chip(text)));
    Then('the teach sheet is shown', async () => {
      await screen.findByRole('dialog', { name: 'New word' });
    });
  });

  Scenario('The chips keep the full text as their accessible names', ({ Given, Then, And }) => {
    Given(WITH_EVERYTHING, withEverything);
    Then('the chip {string} is named {string}', async (_, text: string, name: string) => {
      expect(await chip(text)).toHaveAccessibleName(name);
    });
    And('the goal chip is named with the title, the solid words out of 16 and the ideas', async () => {
      const goal = await goalChip();
      await waitFor(() => expect(goal.textContent).toMatch(/^Goal \d+\/16$/));
      const [solid] = /\d+/.exec(goal.textContent ?? '') ?? [''];
      expect(goal).toHaveAccessibleName(new RegExp(`^Goal: 1 John 1:1, ${solid} of 16 words, \\d+ of \\d+ ideas$`));
    });
    And('the chip {string} is named {string}', async (_, text: string, name: string) => {
      expect(await chip(text)).toHaveAccessibleName(name);
    });
  });

  Scenario('A chip with nothing to show is not drawn, and with no chips no row is', ({ Given, Then, And }) => {
    Given('Lampas is opened on Romans 8 with nothing due, no goal and no new words', async () => {
      await openSeeded(async () => {
        const lemmas = new Set(chapter8.verses.flatMap((v) => v.g.map((w) => nfc(w.l))));
        const now = Date.now();
        await db.words.bulkPut([...lemmas].map((lemma) => ({ lemma, lemmas: [lemma], gloss: '', lesson: 0, state: 'solid' as const, since: now })));
        await db.reviews.clear();
      });
    });
    Then('the row under the header has no chip', async () => {
      await waitFor(() => expect(screen.queryByTestId('new-words')).toBeNull());
      expect(chipNames()).toEqual([]);
    });
    And('the row is not drawn', () => {
      expect(row()).toBeNull();
    });
  });

  Scenario('The row is hidden while a chapter is read aloud', ({ Given, When, Then }) => {
    Given(WITH_EVERYTHING, withEverything);
    When('he taps Read from the top', async () => {
      await chip('Due 3');
      await goalChip();
      await chip('New 3');
      await user.click(screen.getByRole('button', { name: 'Read from the top' }));
    });
    Then('the row under the header has no chip', async () => {
      await waitFor(() => expect(screen.queryByTestId('new-words')).toBeNull());
      expect(chipNames()).toEqual([]);
      expect(screen.queryByTestId('goal-strip')).toBeNull();
    });
    When('he taps Stop', async () => {
      await user.click(await screen.findByRole('button', { name: 'Stop' }));
    });
    Then('the row under the header has the chips {string}, {string} and {string}', async (_, due: string, goal: string, news: string) => {
      await chip(due);
      await goalChip();
      await chip(news);
      expect(chipNames()).toHaveLength(3);
      expect(goal).toBe('Goal');
    });
  });

  Scenario('The Tip chip opens the tip card', ({ Given, Then, When }) => {
    Given('Lampas is opened on Romans 8 with a tip waiting', async () => {
      await openSeeded(async () => {
        await keepTip({ id: 'try-review', title: 'Try Review', body: 'Words come back on a schedule.', action: { label: 'Open Review', screen: 'review' } });
      });
    });
    Then('there is a chip {string} and no tip card', async (_, text: string) => {
      await chip(text);
      expect(screen.queryByTestId('tip-card')).toBeNull();
    });
    When('he taps the chip {string}', async (_, text: string) => user.click(await chip(text)));
    Then('the tip card shows its title', async () => {
      expect(within(await screen.findByTestId('tip-card')).getByText('Try Review')).toBeInTheDocument();
    });
    When('he taps Not now on the tip card', async () => user.click(within(screen.getByTestId('tip-card')).getByRole('button', { name: 'Not now' })));
    Then('there is no chip {string} and no tip card', async () => {
      await waitFor(() => expect(screen.queryByTestId('tip-card')).toBeNull());
      await waitFor(() => expect(screen.queryByTestId('tip-chip')).toBeNull());
    });
  });
});
