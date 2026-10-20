// features/steps/sheet-double-tap.steps.tsx — runs features/sheet-double-tap.feature: a second tap that lands, within the settle moment, on what lies
// under a sheet that just closed (or in a sheet or card that just opened) does nothing; a tap after the moment works (src/ui/tapGuard.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { setGoal } from '../../src/data/repositories/settings';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { settle, SETTLE_MS } from '../../src/ui/settle';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { seedHisWords } from '../../tests/support/his-words';
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
// The settle moment counts performance.now() (src/ui/settle.ts), so the scenarios hold that clock by hand: it moves only when a step says he waited,
// never because the host is slow. A tap 'at once' lands 0 ms after the last, however long the steps in between took on the wall clock.
let elapsed = 0;
const holdClock = () => {
  if (!vi.isMockFunction(performance.now)) vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
};
const passTime = async (ms: number) => {
  // a sheet starts its moment in an effect: let what is on screen start it before the clock moves
  await act(async () => {});
  elapsed += ms;
};
const reads = () => passTime(SETTLE_MS + 50);

const ideaSheets = () => screen.queryAllByRole('dialog', { name: 'Idea' });
const doneOf = (sheet: HTMLElement) => within(sheet).getByRole('button', { name: 'Done', exact: true });
const change = () => screen.getByText('Change', { selector: 'button' });
const row = (lemma: string) => document.querySelector<HTMLElement>(`button[data-lemma="${lemma}"]`)!;

async function freshStore(goal: string): Promise<void> {
  cleanup();
  clearBus();
  await usageWritesSettled();
  forgetTrail();
  localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await seedHisWords();
  await seedScheduleIfFirstOpen();
  await db.meta.put({ key: 'grammarLevelsSeeded', value: '1' });
  await setGoal(goal);
}

async function openAt(hash: string): Promise<void> {
  window.history.replaceState(null, '', `/${hash}`);
  render(<App />);
}

const feature = await loadFeature('features/sheet-double-tap.feature');

describeFeature(feature, ({ Scenario }) => {
  const given = async (_: unknown, goal: string) => {
    await freshStore(goal);
    holdClock();
    settle.ms = SETTLE_MS;
    // the sheets the last scenario left open closed as it was cleaned up, and swallow taps for their moment: let it pass
    await reads();
  };
  const opensLearn = async () => {
    await openAt('#/goal');
    await user.click(await screen.findByTestId('learn-next'));
    await waitFor(() => expect(ideaSheets()).toHaveLength(1));
    await waitFor(() => expect(within(ideaSheets()[0]).queryByTestId('idea-loading')).toBeNull());
    await reads();
  };
  const opensRho = async () => {
    await user.click(within(ideaSheets()[0]).getByRole('button', { name: 'About rho' }));
    await waitFor(() => expect(ideaSheets()).toHaveLength(2));
    await waitFor(() => expect(within(ideaSheets()[1]).queryByTestId('idea-loading')).toBeNull());
    await reads();
  };

  Scenario("A second tap on the Learn sheet's Done does not open Settings", ({ Given, When, And, Then }) => {
    Given('his goal is {string} and a sheet ignores taps for a moment', given);
    When('he opens the Learn sheet from the Goal screen', opensLearn);
    And('he taps Done and at once taps Change', async () => {
      await user.click(doneOf(ideaSheets()[0]));
      await waitFor(() => expect(ideaSheets()).toHaveLength(0));
      await user.click(change());
    });
    Then('no idea sheet is open', () => {
      expect(ideaSheets()).toHaveLength(0);
    });
    And('the Goal screen is still shown', async () => {
      await act(async () => {});
      expect(window.location.hash).toBe('#/goal');
      expect(screen.getByTestId('goal-title')).toHaveTextContent('Read 1 John 1');
    });
    When('he waits a moment', reads);
    And('he taps Change', () => user.click(change()));
    Then('Settings is open', async () => {
      await waitFor(() => expect(window.location.hash).toBe('#/settings?section=goal'));
    });
  });

  Scenario("A second tap on the Rho sheet's Done does not close the Learn sheet", ({ Given, When, And, Then }) => {
    Given('his goal is {string} and a sheet ignores taps for a moment', given);
    When('he opens the Learn sheet from the Goal screen', opensLearn);
    And('he opens the Rho sheet from it', opensRho);
    And("he taps the Rho sheet's Done and at once the Learn sheet's Done", async () => {
      await user.click(doneOf(ideaSheets()[1]));
      await waitFor(() => expect(ideaSheets()).toHaveLength(1));
      await user.click(doneOf(ideaSheets()[0]));
    });
    Then('only the Learn sheet is open', async () => {
      await act(async () => {});
      expect(ideaSheets()).toHaveLength(1);
      expect(within(ideaSheets()[0]).getByRole('heading', { name: 'The Greek alphabet' })).toBeInTheDocument();
    });
  });

  Scenario("A second tap on Drill it does not spend the drill's Hint", ({ Given, When, And, Then }) => {
    Given('his goal is {string} and a sheet ignores taps for a moment', given);
    When('he opens the Learn sheet from the Goal screen', opensLearn);
    And('he opens the Rho sheet from it', opensRho);
    And('he taps Drill it and at once taps Hint', async () => {
      await user.click(within(ideaSheets()[1]).getByRole('button', { name: 'Drill it', exact: true }));
      const drill = await screen.findByRole('dialog', { name: 'Drill it' });
      await user.click(within(drill).getByRole('button', { name: 'Hint', exact: true }));
    });
    Then('the drill is open with its Hint unspent', async () => {
      const drill = screen.getByRole('dialog', { name: 'Drill it' });
      await act(async () => {});
      expect(within(drill).queryByTestId('hint-line')).toBeNull();
      expect(within(drill).getByRole('button', { name: 'Hint', exact: true })).toBeEnabled();
    });
  });

  Scenario('A second tap on a word does not drop it, and one on Drop does not change another', ({ Given, When, And, Then }) => {
    let learning = '';
    let other = '';
    let otherState = '';
    Given('his goal is {string} and a sheet ignores taps for a moment', given);
    When('he opens Words', async () => {
      await openAt('#/words');
      await waitFor(() => expect(document.querySelector('button[data-state="learning"]')).not.toBeNull());
      const rows = [...document.querySelectorAll<HTMLElement>('button[data-lemma]')];
      learning = rows.find((r) => r.dataset.state === 'learning')!.dataset.lemma!;
      const second = rows.find((r) => r.dataset.lemma !== learning)!;
      other = second.dataset.lemma!;
      otherState = second.dataset.state!;
      await reads();
    });
    And('he taps a learning word and at once taps Drop', async () => {
      await user.click(row(learning));
      const ask = await screen.findByRole('alertdialog');
      await user.click(within(ask).getByRole('button', { name: 'Drop', exact: true }));
    });
    Then('the word is still learning and Drop is still asked', async () => {
      await act(async () => {});
      expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      expect((await db.words.get(learning))?.state).toBe('learning');
    });
    When('he waits a moment', reads);
    And('he taps Drop and at once taps another word', async () => {
      await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Drop', exact: true }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
      await user.click(row(other));
    });
    Then('the word is dropped and the other word is unchanged', async () => {
      await waitFor(async () => expect((await db.words.get(learning))?.state).toBe('dropped'));
      await act(async () => {});
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect((await db.words.get(other))?.state).toBe(otherState);
    });
  });
});
