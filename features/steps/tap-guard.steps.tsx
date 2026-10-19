// features/steps/tap-guard.steps.tsx — runs features/tap-guard.feature: the second tap of a double tap that changed the screen or opened a sheet lands, within
// the settle moment, on what the first brought up, and does nothing (src/ui/tapGuard.ts); a tap after the moment works.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
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
// The settle moment counts performance.now() (src/ui/settle.ts): the scenarios hold that clock by hand, so it moves only when a step says he waited.
let elapsed = 0;
const holdClock = () => {
  if (!vi.isMockFunction(performance.now)) vi.spyOn(performance, 'now').mockImplementation(() => elapsed);
};
const passTime = async (ms: number) => {
  // the guard hears a sheet come or go a microtask after the commit: let it before the clock moves
  await act(async () => {});
  elapsed += ms;
};
const reads = () => passTime(SETTLE_MS + 50);

const byText = (text: string): HTMLElement => {
  const starts = new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
  const found = screen.queryAllByRole('button', { name: text })[0] ?? screen.queryAllByRole('button', { name: starts })[0];
  if (!found) throw new Error(`no button "${text}"`);
  return found;
};
const chapterName = () => screen.getByRole('button', { name: /^Romans 8/ });
const picker = () => screen.queryByRole('dialog', { name: /Choose a/ });

async function fresh(hash: string): Promise<void> {
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
  holdClock();
  settle.ms = SETTLE_MS;
  window.history.replaceState(null, '', `/${hash}`);
  render(<App />);
  // the screen is drawn and its own first moment has passed
  await waitFor(() => expect(screen.getAllByRole('button').length).toBeGreaterThan(2));
  await reads();
}

const feature = await loadFeature('features/tap-guard.feature');

describeFeature(feature, ({ Scenario }) => {
  const given = (_: unknown, hash: string) => fresh(hash);
  const tapsTwo = async (_: unknown, first: string, second: string) => {
    await user.click(byText(first));
    await waitFor(() => expect(() => byText(second)).not.toThrow());
    await user.click(byText(second));
  };
  const addressIs = async (_: unknown, hash: string) => {
    await act(async () => {});
    expect(window.location.hash).toBe(hash);
  };
  const backThenName = async (_: unknown, back: string) => {
    await user.click(byText(back));
    await waitFor(() => expect(chapterName()).toBeInTheDocument());
    await user.click(chapterName());
  };
  const readerBare = async () => {
    await act(async () => {});
    expect(chapterName()).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  };
  const pickerOpen = async () => {
    await act(async () => {});
    expect(picker()).not.toBeNull();
  };

  Scenario("A second tap on Settings' About row does not open the Preface", ({ Given, When, Then }) => {
    Given('he is on {string} and a screen ignores taps for a moment', given);
    When('he taps {string} and at once taps {string}', tapsTwo);
    Then('the address is {string}', addressIs);
  });

  Scenario("A second tap on Settings' Paradigms row does not open a table", ({ Given, When, Then }) => {
    Given('he is on {string} and a screen ignores taps for a moment', given);
    When('he taps {string} and at once taps {string}', tapsTwo);
    Then('the address is {string}', addressIs);
  });

  Scenario("A second tap on Settings' About you row does not set his pace", ({ Given, When, Then, And }) => {
    Given('he is on {string} and a screen ignores taps for a moment', given);
    When('he taps {string} and at once taps {string}', tapsTwo);
    Then('the address is {string}', addressIs);
    And('no pace is marked', async () => {
      await act(async () => {});
      for (const pace of ['Quick', 'Steady', 'Slow']) expect(screen.getByRole('button', { name: pace })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  Scenario("A second tap on About's back button does not open the chapter picker", ({ Given, When, Then, And }) => {
    Given('he is on {string} and a screen ignores taps for a moment', given);
    When("he taps {string} and at once taps the chapter's name", backThenName);
    Then('the Reader shows with no sheet over it', readerBare);
    When('he waits a moment', reads);
    And("he taps the chapter's name", () => user.click(chapterName()));
    Then('the chapter picker is open', pickerOpen);
  });

  Scenario("A second tap on the Verse view's back button does not open the chapter picker", ({ Given, When, Then }) => {
    Given('he is on {string} and a screen ignores taps for a moment', given);
    When("he taps {string} and at once taps the chapter's name", backThenName);
    Then('the Reader shows with no sheet over it', readerBare);
  });

  Scenario("A second tap on the chapter's name does not shut the picker it opened", ({ Given, When, Then }) => {
    Given('he is on {string} and a screen ignores taps for a moment', given);
    When("he taps the chapter's name and at once taps outside the picker", async () => {
      await user.click(chapterName());
      await waitFor(() => expect(picker()).not.toBeNull());
      await user.click(screen.getByTestId('sheet-backdrop'));
    });
    Then('the chapter picker is open', pickerOpen);
  });

  Scenario('A second tap on a section heading opens no word', ({ Given, When, Then }) => {
    Given('he is on {string} and a screen ignores taps for a moment', given);
    When('he taps the heading {string} and at once taps a word of its passage', async (_: unknown, heading: string) => {
      await user.click(await screen.findByRole('button', { name: heading }));
      await waitFor(() => expect(window.location.hash).toContain('p=1'));
      const word = await waitFor(() => {
        const found = document.querySelector<HTMLElement>('[data-word]');
        expect(found).not.toBeNull();
        return found!;
      });
      await user.click(word);
    });
    Then('the passage is open with no word sheet over it', async () => {
      await act(async () => {});
      expect(window.location.hash).toContain('p=1');
      expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull();
    });
  });
});
