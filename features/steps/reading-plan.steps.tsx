// features/steps/reading-plan.steps.tsx — runs features/reading-plan.feature: the listening plan in the Bible view (the reading plan piece of Today, src/today/Today.tsx, opened by the Today chip in the chips row; src/plan/StartPlan.tsx,
// the marks in the chapter picker). Layout (the row at 360 px, the picker's grids at 390 px) is proven by tests/e2e/reading-plan.spec.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { setDeveloper } from '../../src/data/repositories';
import { getReadingPlan, startPlan } from '../../src/data/repositories/readingPlan';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { browserEnv } from '../../src/resources/openApp';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';

const user = userEvent.setup();

const real = { ...browserEnv };

afterAll(() => {
  Object.assign(browserEnv, real);
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

type Start = { code: string; chapter: number };
const START: Record<string, Start> = { 'Leviticus 4': { code: 'lev', chapter: 4 }, 'Luke 15': { code: 'luk', chapter: 15 } };

/** Opens the app on Romans 8 with the plan started at `start` (or none), `due` words due (his seed words) or no Greek at all. */
async function openWith({ start, off, due }: { start?: Start; off?: boolean; due?: number }): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  localStorage.setItem('lampas.welcome', 'done');
  vi.unstubAllGlobals();
  stubChapterFetch();
  browserEnv.open = () => undefined;
  window.history.replaceState(null, '', '/');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear()]);
  if (off) await db.settings.put({ key: 'readingPlan', value: 'off' });
  if (start) await startPlan('whole-bible', start);
  if (due) await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  if (due) {
    // the first open leaves his learning words due: exactly `due` words are left due
    await waitFor(async () => expect(await db.words.count()).toBe(63));
    const now = Date.now();
    await db.reviews.clear();
    const lemmas = (await db.words.toArray()).slice(0, due).map((w) => w.lemma);
    await db.reviews.bulkPut(lemmas.map((id) => ({ kind: 'word' as const, id, step: 3, rights: 0, due: now - DAY, lastWhen: now - 10 * DAY, lapses: 0 })));
  }
}

const row = () => screen.getByTestId('reader-chips');
const todayChip = (): Promise<HTMLElement> => screen.findByTestId('today-chip');
const planPiece = (): Promise<HTMLElement> => screen.findByRole('region', { name: 'Reading plan', exact: true });

async function openToday(): Promise<void> {
  await user.click(await todayChip());
  await screen.findByRole('heading', { name: 'Today', level: 1 });
}

async function planPieceSays(...texts: string[]): Promise<void> {
  for (const text of texts) await waitFor(async () => expect(await planPiece()).toHaveTextContent(text));
}
const chipButtons = (): HTMLElement[] => [...row().querySelectorAll<HTMLElement>('button')];

async function openPicker(): Promise<HTMLElement> {
  await user.click(screen.getByRole('heading', { name: 'Romans 8', level: 1 }).querySelector('button') as HTMLElement);
  return screen.findByRole('dialog', { name: 'Choose a chapter' });
}

const feature = await loadFeature('features/reading-plan.feature');

describeFeature(feature, ({ Scenario }) => {
  const lev4 = () => openWith({ start: START['Leviticus 4'] });
  const luke15 = () => openWith({ start: START['Luke 15'] });

  Scenario('Today names the next chapter and how far she is', ({ Given, When, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4', lev4);
    When('he opens Today from the Reader', openToday);
    Then('the Reading plan piece says {string} and {string}', async (_, next: string, count: string) => planPieceSays(next, count));
  });

  Scenario("Listen in Audible opens the next chapter's send-off sheet", ({ Given, When, And, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4', lev4);
    When('he opens Today from the Reader', openToday);
    And('he taps Listen in Audible on Today', async () => user.click(await within(await planPiece()).findByRole('link', { name: /^Listen in Audible/ })));
    Then('the send-off sheet {string} is shown', async (_, title: string) => {
      expect(await screen.findByRole('dialog', { name: title })).toBeTruthy();
    });
  });

  Scenario('With the plan off Today invites her to start one', ({ Given, Then, When }) => {
    Given('Lampas is opened with the Reading plan off', () => openWith({ off: true }));
    When('he opens Today from the Reader', openToday);
    Then('the Reading plan piece says {string}', async (_, text: string) => planPieceSays(text));
    When('he taps Start a plan on Today', async () => user.click(await within(await planPiece()).findByRole('button', { name: 'Start a plan' })));
    Then('the sheet {string} is shown with the plan {string}', async (_, title: string, plan: string) => {
      const sheet = await screen.findByRole('dialog', { name: title });
      expect(within(sheet).getByRole('button', { name: plan })).toBeTruthy();
    });
  });

  Scenario('Starting the plan at a chapter marks everything before it done', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Reading plan off', () => openWith({ off: true }));
    When('he opens Today from the Reader', openToday);
    And('he taps Start a plan on Today', async () => user.click(await within(await planPiece()).findByRole('button', { name: 'Start a plan' })));
    And('he picks the plan {string}', async (_, plan: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Start a listening plan' });
      await user.click(within(sheet).getByRole('button', { name: plan }));
    });
    Then('the chapter picker {string} is shown', async (_, title: string) => {
      expect(await screen.findByRole('dialog', { name: title })).toBeTruthy();
    });
    When('he chooses Leviticus 1 there', async () => {
      const picker = await screen.findByRole('dialog', { name: 'Where are you starting?' });
      await user.click(await within(picker).findByRole('button', { name: /^Leviticus/ }));
      await user.click(await within(picker).findByRole('button', { name: 'Chapter 1' }));
    });
    Then('the Reading plan piece says {string} and {string}', async (_, next: string, count: string) => planPieceSays(next, count));
    And('the Reading plan setting is On', async () => {
      await waitFor(async () => expect((await db.settings.get('readingPlan'))?.value).toBe('on'));
      expect(screen.queryByRole('dialog', { name: 'Where are you starting?' })).toBeNull();
      // the sheets closed by going Back, which jsdom lands a turn later: Today is under them, and the next scenario must not see the traversal arrive after it set its address
      await waitFor(() => expect(window.location.hash).toBe('#/today'));
    });
  });

  Scenario('Settings has the same entry', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Reading plan off', () => openWith({ off: true }));
    When('he opens Settings', async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    And('he taps {string} in Settings', async (_, name: string) => user.click(await screen.findByRole('button', { name })));
    Then('the sheet {string} is shown with the plan {string}', async (_, title: string, plan: string) => {
      const sheet = await screen.findByRole('dialog', { name: title });
      expect(within(sheet).getByRole('button', { name: plan })).toBeTruthy();
    });
  });

  Scenario('The chapter picker marks the chapters done and the next', ({ Given, When, Then }) => {
    Given('Lampas is opened with a reading plan started at Luke 15', luke15);
    When('he opens the chapter picker at Matthew', async () => {
      await todayChip();
      const picker = await openPicker();
      await user.click(await within(picker).findByRole('button', { name: /^Matthew/ }));
    });
    Then('the Matthew chapters are all marked done and none is marked next', async () => {
      const grid = await screen.findByRole('group', { name: 'Matthew chapters' });
      await waitFor(() => expect(grid.querySelectorAll('[data-done]').length).toBe(28));
      expect(grid.querySelectorAll('[data-chapter]').length).toBe(28);
      expect(grid.querySelector('[data-next]')).toBeNull();
    });
    When('he goes back to the books and opens Luke', async () => {
      const picker = screen.getByRole('dialog', { name: 'Choose a chapter' });
      await user.click(within(picker).getByRole('button', { name: /Books/ }));
      await user.click(await within(picker).findByRole('button', { name: /^Luke/ }));
    });
    Then('Luke 14 is marked done and Luke 15 is marked next and Luke 16 is neither', async () => {
      const grid = await screen.findByRole('group', { name: 'Luke chapters' });
      await waitFor(() => expect(grid.querySelector('[data-chapter="15"][data-next]')).not.toBeNull());
      expect(grid.querySelector('[data-chapter="14"]')).toHaveAttribute('data-done');
      expect(grid.querySelector('[data-chapter="15"]')).not.toHaveAttribute('data-done');
      expect(grid.querySelector('[data-chapter="16"]')).not.toHaveAttribute('data-done');
      expect(grid.querySelector('[data-chapter="16"]')).not.toHaveAttribute('data-next');
    });
    When('he goes back to the books and opens Leviticus', async () => {
      const picker = screen.getByRole('dialog', { name: 'Choose a chapter' });
      await user.click(within(picker).getByRole('button', { name: /Books/ }));
      await user.click(await within(picker).findByRole('button', { name: /^Leviticus/ }));
    });
    Then('every Leviticus chapter is marked done', async () => {
      const grid = await screen.findByRole('group', { name: 'Leviticus chapters' });
      await waitFor(() => expect(grid.querySelectorAll('[data-done]').length).toBe(27));
    });
  });

  Scenario('A reader with no Greek activity sees the Today chip alone', ({ Given, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4 and no Greek activity', () => openWith({ start: START['Leviticus 4'] }));
    Then('the row has no Goal chip and no Tip chip, and the Today chip', async () => {
      await todayChip();
      // the chapter's New words chip may come as the chapter's words are read; it is the Reader's own, the plan adds nothing else
      await waitFor(() => expect(chipButtons().map((b) => b.dataset.testid).filter((id) => id !== 'new-words')).toEqual(['today-chip']));
    });
  });

  Scenario('A reader with words due sees no Due or Plan chip, only Today', ({ Given, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4 and 3 words due', () => openWith({ start: START['Leviticus 4'], due: 3 }));
    Then('the row holds the Today chip and no Due chip and no Plan chip', async () => {
      await todayChip();
      await waitFor(() => expect(chipButtons().some((b) => b.dataset.testid === 'today-chip')).toBe(true));
      // the 3 words due are Today's to count now, not a chip's
      expect(chipButtons().some((b) => /^Due/.test(b.getAttribute('aria-label') ?? '') || b.dataset.testid === 'plan-chip')).toBe(false);
    });
  });

  Scenario('Every chip has an accessible name', ({ Given, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4 and 3 words due', () => openWith({ start: START['Leviticus 4'], due: 3 }));
    Then('every chip in the row is named', async () => {
      await todayChip();
      await waitFor(() => expect(chipButtons().length).toBeGreaterThan(1));
      for (const chip of chipButtons()) expect(chip.getAttribute('aria-label') ?? '').not.toBe('');
    });
  });

  Scenario('The Developer row resets the plan for the demo', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4', lev4);
    When('he turns Developer mode on and opens Settings', async () => {
      await setDeveloper('on');
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    And('he taps {string} in Settings', async (_, name: string) => user.click(await screen.findByRole('button', { name })));
    Then('the Reading plan setting is Off and no plan is kept', async () => {
      await waitFor(async () => expect((await db.settings.get('readingPlan'))?.value).toBe('off'));
      expect(await getReadingPlan()).toBeUndefined();
      expect(await db.settings.get('readingPlanState')).toBeUndefined();
    });
    When('he taps {string} in Settings', async (_, name: string) => user.click(await screen.findByRole('button', { name })));
    And('he picks the plan {string}', async (_, plan: string) => {
      const sheet = await screen.findByRole('dialog', { name: 'Start a listening plan' });
      await user.click(within(sheet).getByRole('button', { name: plan }));
    });
    And('he chooses Leviticus 1 there', async () => {
      const picker = await screen.findByRole('dialog', { name: 'Where are you starting?' });
      await user.click(await within(picker).findByRole('button', { name: /^Leviticus/ }));
      await user.click(await within(picker).findByRole('button', { name: 'Chapter 1' }));
    });
    Then('the Reading plan setting is On and the plan starts at Leviticus 1', async () => {
      await waitFor(async () => expect((await db.settings.get('readingPlan'))?.value).toBe('on'));
      expect((await getReadingPlan())?.start).toEqual({ code: 'lev', chapter: 1 });
    });
  });
});
