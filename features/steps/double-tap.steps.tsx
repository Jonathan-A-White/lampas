// features/steps/double-tap.steps.tsx — runs features/double-tap.feature: a second tap that lands on the next question's option within the card's
// settling moment (src/ui/settle.ts) chooses nothing and counts nothing, on the placement, Review and the Quick test; a tap after it answers.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { readPlacement } from '../../src/data/placementKeep';
import { mulberry32 } from '../../src/data/quiz';
import { setGoal } from '../../src/data/repositories/settings';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { seedWordsIfFirstOpen } from '../../src/data/repositories/words';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { settle, SETTLE_MS } from '../../src/ui/settle';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(async () => {
  settle.ms = 0;
  cleanup();
  clearBus();
  await usageWritesSettled();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-option]')];

/** Which screen the scenario is on, and so how its answers are counted. */
let counted: () => Promise<number> = async () => 0;

async function freshStore(): Promise<void> {
  cleanup();
  clearBus();
  await usageWritesSettled();
  forgetTrail();
  localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await seedWordsIfFirstOpen();
  await seedScheduleIfFirstOpen();
  await db.reviews.clear();
  await db.meta.put({ key: 'grammarLevelsSeeded', value: '1' });
  localStorage.removeItem('lampas.round');
}

async function openAt(hash: string): Promise<void> {
  window.history.replaceState(null, '', `/${hash}`);
  render(<App newRandom={() => mulberry32(7)} />);
}

/** The card on screen is a new one: the Next of the last is gone and an option is drawn. */
async function newCard(): Promise<void> {
  await waitFor(() => expect(screen.queryByTestId('next')).toBeNull());
  await waitFor(() => expect(options().length).toBeGreaterThan(0));
}

/** The first option, whatever it is: the tap is not a choice he made. */
const firstOption = () => options()[0];

const answered = () => options().some((o) => o.hasAttribute('data-result'));

const feature = await loadFeature('features/double-tap.feature');

describeFeature(feature, ({ Scenario }) => {
  const settling = () => {
    settle.ms = SETTLE_MS;
  };
  const answersFirst = async () => {
    await waitFor(() => expect(options().length).toBeGreaterThan(0));
    // the first card is answered after it has settled, as he would
    await sleep(SETTLE_MS + 50);
    await user.click(firstOption());
    await screen.findByTestId('next');
  };
  const doubleTap = async () => {
    await user.click(await screen.findByTestId('next'));
    await newCard();
    // the second tap of the double tap: the finger comes down where Next was, a moment after the new card is drawn
    await user.click(firstOption());
  };
  const stays = async () => {
    expect(answered()).toBe(false);
    expect(screen.queryByTestId('next')).toBeNull();
  };
  const countIs = async (_: unknown, n: number) => expect(await counted()).toBe(n);
  const reads = () => sleep(SETTLE_MS + 50);
  const taps = async () => user.click(firstOption());
  const shows = async () => {
    await waitFor(() => expect(answered()).toBe(true));
    await screen.findByTestId('next');
  };

  Scenario('A second tap on Next does not answer the next placement question', ({ Given, And, When, Then }) => {
    Given('his goal is {string} and he knows nothing yet', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal.replace(/^Read /, ''));
      // the placement keeps the questions it has counted in its saved state
      counted = async () => readPlacement()?.state.asked.length ?? 0;
    });
    And('a new question ignores taps for a moment', settling);
    When('he opens the placement', () => openAt('#/placement'));
    And('he starts the placement', async () => user.click(await screen.findByRole('button', { name: 'Start' })));
    And('he answers the first question', async () => {
      await answersFirst();
    });
    And('he taps Next and at once taps where an option now sits', doubleTap);
    Then('the second question stays unanswered', stays);
    And('only {int} answer is counted', countIs);
    When('he reads the question for a moment', reads);
    And('he taps an option', taps);
    Then('the second question shows its answer', shows);
    And('{int} answers are counted', async (_, n: number) => {
      await waitFor(async () => expect(await counted()).toBe(n));
    });
  });

  Scenario('A second tap on Next does not answer the next Review question', ({ Given, And, When, Then }) => {
    Given('his words are seeded and a new question ignores taps for a moment', async () => {
      await freshStore();
      settling();
      counted = async () => db.reviews.count();
    });
    When('he opens Review', () => openAt('#/review'));
    And('he starts the round', async () => user.click(await screen.findByRole('button', { name: 'Start' })));
    And('he answers the first question', answersFirst);
    And('he taps Next and at once taps where an option now sits', doubleTap);
    Then('the second question stays unanswered', stays);
    And('only {int} answer is counted', countIs);
    When('he reads the question for a moment', reads);
    And('he taps an option', taps);
    Then('the second question shows its answer', shows);
    And('{int} answers are counted', async (_, n: number) => {
      await waitFor(async () => expect(await counted()).toBe(n));
    });
  });

  Scenario('A second tap on Next does not answer the next Quick test question', ({ Given, And, When, Then }) => {
    Given('his words are seeded and a new question ignores taps for a moment', async () => {
      await freshStore();
      settling();
      counted = async () => db.results.count();
    });
    When('he opens the Quick test', () => openAt('#/test'));
    And('he answers the first question', answersFirst);
    And('he taps Next and at once taps where an option now sits', doubleTap);
    Then('the second question stays unanswered', stays);
    And('only {int} answer is counted', countIs);
    When('he reads the question for a moment', reads);
    And('he taps an option', taps);
    Then('the second question shows its answer', shows);
    And('{int} answers are counted', async (_, n: number) => {
      await waitFor(async () => expect(await counted()).toBe(n));
    });
  });
});
