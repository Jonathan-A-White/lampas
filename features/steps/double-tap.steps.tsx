// features/steps/double-tap.steps.tsx — runs features/double-tap.feature: a second tap that lands on the next question's option within the card's
// settling moment (src/ui/settle.ts) chooses nothing and counts nothing, on the placement, Review and the Quick test; a tap after it answers.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
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
  vi.restoreAllMocks();
  cleanup();
  clearBus();
  await usageWritesSettled();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
// The settle window counts performance.now() (src/ui/settle.ts), so the scenarios hold that clock by hand: it moves only when a step says how long
// he took, never because the host is slow. A tap 'at once' lands 0 ms after the card, however long the steps in between took on the wall clock.
let elapsed = 0;
const holdClock = () => {
  if (!vi.isMockFunction(performance.now)) vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
};
const passTime = async (ms: number) => {
  // a card stamps its moment in an effect: let the card on screen stamp it before the clock moves, or the time would pass before it began
  await act(async () => {});
  elapsed += ms;
};
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
    holdClock();
    settle.ms = SETTLE_MS;
  };
  const answersFirst = async () => {
    await waitFor(() => expect(options().length).toBeGreaterThan(0));
    // the first card is answered after it has settled, as he would
    await passTime(SETTLE_MS + 50);
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
  // he reads what is on screen: the clock moves on only once the screen he means has been drawn, or it would be drawn after the time had passed
  const readsOnce = (drawn?: () => Promise<unknown>) => async () => {
    await drawn?.();
    await passTime(SETTLE_MS + 50);
  };
  const reads = readsOnce();
  const readsIntro = readsOnce(() => screen.findByRole('button', { name: 'Start over' }));
  const readsConfirm = readsOnce(() => screen.findByTestId('start-over-confirm'));
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
    // the intro settles like a card: he reads it before he taps Start
    And('he starts the placement', async () => {
      await readsOnce(() => screen.findByRole('button', { name: 'Start' }))();
      await user.click(await screen.findByRole('button', { name: 'Start' }));
    });
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

  Scenario('A second tap on Next does not open the Parsing drill from the Quick test', ({ Given, And, When, Then }) => {
    const drillButton = () => screen.getByRole('button', { name: /^Parsing drill/ });
    Given('his words are seeded and a new question ignores taps for a moment', async () => {
      await freshStore();
      settling();
    });
    When('he opens the Quick test', () => openAt('#/test'));
    And('he answers the first question', answersFirst);
    And('he taps Next and {int} ms later taps the Parsing drill button', async (_, ms: number) => {
      await user.click(await screen.findByTestId('next'));
      await newCard();
      // the Next row is gone and the button has moved up under the finger
      await passTime(ms);
      await user.click(drillButton());
    });
    Then('the Quick test is still on question 2', async () => {
      expect(screen.getByText(/^2 of \d+$/)).toBeInTheDocument();
    });
    And('the Parsing drill is not open', async () => {
      expect(window.location.hash).toBe('#/test');
    });
    When('he reads the question for a moment', reads);
    And('he taps the Parsing drill button', async () => user.click(drillButton()));
    Then('the Parsing drill is open', async () => {
      await waitFor(() => expect(window.location.hash).toBe('#/drill'));
    });
  });
  const keptCount = () => readPlacement()?.state.asked.length ?? 0;
  const intro = async (n: number) => {
    expect(await screen.findByTestId('placement-kept')).toHaveTextContent(`${n} questions answered so far`);
    expect(keptCount()).toBe(n);
  };
  const tapNamed = async (name: string) => user.click(await screen.findByRole('button', { name }));
  const seedKept = async (goal: string, n: number) => {
    await freshStore();
    await setGoal(goal.replace(/^Read /, ''));
    settle.ms = 0;
    await openAt('#/placement');
    await user.click(await screen.findByRole('button', { name: 'Start' }));
    for (let i = 0; i < n; i += 1) {
      await waitFor(() => expect(options().length).toBeGreaterThan(0));
      await waitFor(() => expect(screen.getByTestId('placement-question')).toHaveTextContent(`Question ${i + 1} ·`));
      await user.click(firstOption());
      await user.click(await screen.findByTestId('next'));
    }
    await waitFor(() => expect(keptCount()).toBe(n));
    cleanup();
    clearBus();
  };

  Scenario('A second tap on Place me does not throw away the placement he kept', ({ Given, And, When, Then }) => {
    Given('his goal is {string} and he has answered {int} placement questions', async (_, goal: string, n: number) => seedKept(goal, n));
    And('a new question ignores taps for a moment', settling);
    When('he opens the Goal screen', () => openAt('#/goal'));
    And('he taps Place me and {int} ms later taps where Start over now sits', async (_, ms: number) => {
      await user.click(await screen.findByRole('button', { name: /^Place (me|again)/ }));
      await screen.findByRole('button', { name: 'Start over' });
      await passTime(ms);
      await user.click(screen.getByRole('button', { name: 'Start over' }));
    });
    Then('the placement intro shows with his {int} answers kept', async (_, n: number) => {
      await intro(n);
      expect(screen.queryByRole('button', { name: 'Yes, start over' })).toBeNull();
    });
    And('Go on is still offered', () => {
      expect(screen.getByRole('button', { name: 'Go on' })).toBeInTheDocument();
    });
    When('he reads the question for a moment', reads);
    And('he taps Go on', () => tapNamed('Go on'));
    Then('the question line says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('placement-question')).toHaveTextContent(text));
    });
  });

  Scenario('A deliberate Start over asks first and then starts over', ({ Given, And, When, Then }) => {
    Given('his goal is {string} and he has answered {int} placement questions', async (_, goal: string, n: number) => seedKept(goal, n));
    And('a new question ignores taps for a moment', settling);
    When('he opens the placement', () => openAt('#/placement'));
    And('he reads the question for a moment', readsIntro);
    And('he taps Start over', () => tapNamed('Start over'));
    Then('it asks whether to throw his {int} answers away', async (_, n: number) => {
      expect(await screen.findByTestId('start-over-confirm')).toHaveTextContent(`${n} answers`);
    });
    And('{int} answers are still kept', (_, n: number) => {
      expect(keptCount()).toBe(n);
    });
    When('he waits a moment on the question', readsConfirm);
    And('he taps Keep my answers', () => tapNamed('Keep my answers'));
    Then('the placement intro shows with his {int} answers kept', async (_, n: number) => {
      await intro(n);
    });
    When('he taps Start over again', async () => {
      await readsIntro();
      await tapNamed('Start over');
    });
    And('he waits a little longer on the question', readsConfirm);
    And('he taps Yes, start over', () => tapNamed('Yes, start over'));
    Then('the question line says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('placement-question')).toHaveTextContent(text));
    });
    And('only {int} answers are kept', async (_, n: number) => {
      await waitFor(() => expect(keptCount()).toBe(n));
    });
  });
});
