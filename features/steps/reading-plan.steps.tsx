// features/steps/reading-plan.steps.tsx — runs features/reading-plan.feature: the listening plan in the Bible view (src/plan/PlanChip.tsx in the chips row, src/plan/StartPlan.tsx,
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
const planChip = (): Promise<HTMLElement> => screen.findByTestId('plan-chip');
const chipButtons = (): HTMLElement[] => [...row().querySelectorAll<HTMLElement>('button:not([data-settings-search])')];

async function openPicker(): Promise<HTMLElement> {
  await user.click(screen.getByRole('heading', { name: 'Romans 8', level: 1 }).querySelector('button') as HTMLElement);
  return screen.findByRole('dialog', { name: 'Choose a chapter' });
}

const feature = await loadFeature('features/reading-plan.feature');

describeFeature(feature, ({ Scenario }) => {
  const lev4 = () => openWith({ start: START['Leviticus 4'] });
  const luke15 = () => openWith({ start: START['Luke 15'] });

  Scenario('The chip names the next chapter and how far she is', ({ Given, Then, And }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4', lev4);
    Then('the Plan chip says {string} and {string}', async (_, next: string, count: string) => {
      const chip = await planChip();
      await waitFor(() => expect(chip.textContent).toContain(next));
      expect(chip.textContent).toContain(count);
    });
    And('the Plan chip is named {string}', async (_, name: string) => {
      expect(await planChip()).toHaveAccessibleName(name);
    });
  });

  Scenario("Tapping the chip opens the next chapter's send-off sheet", ({ Given, When, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4', lev4);
    When('he taps the Plan chip', async () => user.click(await planChip()));
    Then('the send-off sheet {string} is shown', async (_, title: string) => {
      expect(await screen.findByRole('dialog', { name: title })).toBeTruthy();
    });
  });

  Scenario('With the plan off the chip invites her to start one', ({ Given, Then, When }) => {
    Given('Lampas is opened with the Reading plan off', () => openWith({ off: true }));
    Then('the Plan chip says {string}', async (_, text: string) => {
      const chip = await planChip();
      await waitFor(() => expect(chip.textContent?.trim()).toBe(text));
    });
    When('he taps the Plan chip', async () => user.click(await planChip()));
    Then('the sheet {string} is shown with the plan {string}', async (_, title: string, plan: string) => {
      const sheet = await screen.findByRole('dialog', { name: title });
      expect(within(sheet).getByRole('button', { name: plan })).toBeTruthy();
    });
  });

  Scenario('Starting the plan at a chapter marks everything before it done', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with the Reading plan off', () => openWith({ off: true }));
    When('he taps the Plan chip', async () => user.click(await planChip()));
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
    Then('the Plan chip says {string} and {string}', async (_, next: string, count: string) => {
      await waitFor(async () => expect((await planChip()).textContent).toContain(next));
      expect((await planChip()).textContent).toContain(count);
    });
    And('the Reading plan setting is On', async () => {
      await waitFor(async () => expect((await db.settings.get('readingPlan'))?.value).toBe('on'));
      expect(screen.queryByRole('dialog', { name: 'Where are you starting?' })).toBeNull();
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
      await planChip();
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

  Scenario('A reader with no Greek activity sees the Plan chip alone', ({ Given, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4 and no Greek activity', () => openWith({ start: START['Leviticus 4'] }));
    Then('the row has no Due chip, no Goal chip and no Tip chip, and the Plan chip', async () => {
      await planChip();
      // the chapter's New words chip may come as the chapter's words are read; it is the Reader's own, the plan adds nothing else
      await waitFor(() => expect(chipButtons().map((b) => b.dataset.testid).filter((id) => id !== 'new-words')).toEqual(['plan-chip']));
    });
  });

  Scenario('A reader with Greek activity sees both', ({ Given, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4 and 3 words due', () => openWith({ start: START['Leviticus 4'], due: 3 }));
    Then('the row holds the chips {string} and the Plan chip', async (_, due: string) => {
      await planChip();
      await waitFor(() => expect(chipButtons().map((b) => (b.textContent ?? '').trim())).toContain(due));
      expect(chipButtons().some((b) => b.dataset.testid === 'plan-chip')).toBe(true);
    });
  });

  Scenario('Every chip has an accessible name', ({ Given, Then }) => {
    Given('Lampas is opened with a reading plan started at Leviticus 4 and 3 words due', () => openWith({ start: START['Leviticus 4'], due: 3 }));
    Then('every chip in the row is named', async () => {
      await planChip();
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
