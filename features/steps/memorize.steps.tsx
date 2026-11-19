// features/steps/memorize.steps.tsx — runs features/memorize.feature: a whole list, or one verse in the Verse view, enters memorizing in English, and the languages beyond follow the Greek dial.
// A second tap on a list's switch while the first is still being written (mw-qtu3zvz.227) is made on a phone slow to write (holdScheduleWrites), with the app-wide tap guard on and its clock driven.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { createVerseList, setGreekInterest } from '../../src/data/repositories';
import { listMemorized } from '../../src/data/repositories/memorize';
import { clearBus } from '../../src/events/bus';
import type { GreekLevel } from '../../src/settings/definitions/greekInterest';
import { stopReading } from '../../src/speech/readAloud';
import { settle, SETTLE_MS } from '../../src/ui/settle';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { closeDatabase } from './close-database';

afterAll(async () => {
  settle.ms = 0;
  vi.restoreAllMocks();
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  await closeDatabase();
});

const user = userEvent.setup();

async function start(step: number, hash: (listId: number) => string, list?: string[]): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  // a scenario that failed half-way leaves no held write, held clock or settle moment to the next one
  settle.ms = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.verseLists.clear(), db.reviews.clear(), db.recalls.clear(), db.settings.clear(), db.meta.clear()]);
  await setGreekInterest(step as GreekLevel);
  const row = list ? await createVerseList('Refuge', list, 1) : undefined;
  window.history.replaceState(null, '', `/${hash(row?.id ?? 0)}`);
  render(<App />);
}

const memorized = async (): Promise<string[]> => (await listMemorized()).map((r) => `${r.lang}:${r.ref}`).sort();
const listSwitch = () => screen.getByRole('switch', { name: 'Memorize this list' });

/** A phone slow to write (mw-qtu3zvz.227): a write of the schedule alone (a transaction on db.reviews and no other table, which is how a verse is memorized) does not start until the step lets it go, so
 *  what the screen draws stays behind the tap. A write that names other tables too is let through: the app's own start-up (seedLevelsIfFirstOpen) writes the schedule with three more, after the screen
 *  is drawn. `waiting()` is how many writes are held: a step looks at it, so a hold that holds nothing, or something else, fails the step instead of passing it. */
function holdScheduleWrites(): { waiting: () => number; letGo: () => void } {
  let waiting = 0;
  let open: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  const real = db.transaction.bind(db) as unknown as (...args: unknown[]) => Promise<unknown>;
  const spy = vi.spyOn(db, 'transaction').mockImplementation(((...args: unknown[]) => {
    if (args.length !== 3 || args[1] !== db.reviews) return real(...args);
    waiting += 1;
    return gate.then(() => real(...args));
  }) as never);
  return {
    waiting: () => waiting,
    letGo: () => {
      spy.mockRestore();
      open();
    },
  };
}
const verseView = () => screen.findByRole('region', { name: 'Verse view' });
const VIEW_HASH = '#/?b=rom&c=8&view=english&weave=off&v=28';

const feature = await loadFeature('features/memorize.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('I memorize a whole list', ({ Given, When, Then, And }) => {
    Given('my Greek setting is step {int} and I have a list {string} holding {string}', async (_, step: number, __: string, refs: string) => {
      await start(step, (id) => `#/lists/${id}`, refs.split(', '));
      await screen.findByRole('switch', { name: 'Memorize this list' });
    });
    When('I turn on Memorize this list', async () => {
      await user.click(screen.getByRole('switch', { name: 'Memorize this list' }));
    });
    Then('Romans 8:28, Psalm 62:1-2 and 2 Thessalonians 3:3 are memorized in English', async () => {
      await waitFor(async () => expect(await memorized()).toEqual(['en:2Thess.3.3', 'en:Ps.62.1-2', 'en:Rom.8.28']));
    });
    And('each row reads {string}', async (_, label: string) => {
      for (const name of ['Romans 8:28', 'Psalm 62:1-2', '2 Thessalonians 3:3']) {
        const row = screen.getByRole('link', { name }).closest('li') as HTMLElement;
        expect(await within(row).findByRole('button', { name: label })).toBeInTheDocument();
      }
    });
  });

  Scenario('A second tap on Memorize this list, made while the first is still being written, turns it off again', ({ Given, When, Then, And }) => {
    let slow: ReturnType<typeof holdScheduleWrites>;
    Given('my Greek setting is step {int} and I have a list {string} holding {string}', async (_, step: number, __: string, refs: string) => {
      await start(step, (id) => `#/lists/${id}`, refs.split(', '));
      await screen.findByRole('switch', { name: 'Memorize this list' });
    });
    And('the phone is slow to write what I memorize', () => {
      slow = holdScheduleWrites();
    });
    When('I tap Memorize this list, and again {int} ms later while the first tap is still being written', async (_, ms: number) => {
      // the app-wide guard is on, as on his phone, and drops a second tap on the switch within its moment: this one comes after it, by the guard's own clock
      expect(ms).toBeGreaterThan(SETTLE_MS);
      settle.ms = SETTLE_MS;
      let now = performance.now();
      const clock = vi.spyOn(performance, 'now').mockImplementation(() => now);
      try {
        await user.click(listSwitch());
        // the first tap's three writes have reached the phone and wait there
        await waitFor(() => expect(slow.waiting()).toBe(3));
        await act(async () => {});
        now += ms;
        // nothing is written yet, so the switch is still drawn Off when he taps it again
        expect(await memorized()).toEqual([]);
        expect(listSwitch()).toHaveAttribute('aria-checked', 'false');
        await user.click(listSwitch());
      } finally {
        clock.mockRestore();
        settle.ms = 0;
      }
    });
    And('the phone writes what it held', () => {
      slow.letGo();
    });
    Then('a screen reader is told {string}', async (_, said: string) => {
      // the words of the SECOND tap, once it has been written: the switch reads Off before anything is written too, so the steps after this one look only now
      await waitFor(() => expect(document.querySelector('[data-live-region]')?.textContent?.trim()).toBe(said));
    });
    And('the switch Memorize this list reads {string}', async (_, label: string) => {
      await waitFor(() => expect(listSwitch()).toHaveTextContent(label));
      expect(listSwitch()).toHaveAttribute('aria-checked', label === 'On' ? 'true' : 'false');
    });
    And('nothing of the list is memorized', async () => {
      expect(await memorized()).toEqual([]);
    });
  });

  Scenario('I pick one verse in the Verse view', ({ Given, When, Then }) => {
    Given('my Greek setting is step {int} and the Verse view is open on Romans 8:28', async (_, step: number) => {
      await start(step, () => VIEW_HASH);
      await verseView();
    });
    When('I tap Memorize', async () => {
      await user.click(await within(await verseView()).findByRole('button', { name: 'Memorize' }));
    });
    Then('the Verse view reads {string}', async (_, label: string) => {
      expect(await within(await verseView()).findByRole('button', { name: label })).toBeInTheDocument();
    });
    When('I switch Greek on in its sheet', async () => {
      await user.click(await within(await verseView()).findByRole('button', { name: 'Memorizing · English' }));
      const sheet = await screen.findByRole('dialog', { name: 'Memorize Rom 8:28' });
      await user.click(within(sheet).getByRole('switch', { name: 'Greek' }));
    });
    Then('Romans 8:28 is memorized in English and Greek', async () => {
      await waitFor(async () => expect(await memorized()).toEqual(['el:Rom.8.28', 'en:Rom.8.28']));
    });
  });

  Scenario('A reader with no Greek gets English only', ({ Given, When, Then }) => {
    Given('my Greek setting is step {int} and the Verse view is open on Romans 8:28', async (_, step: number) => {
      await start(step, () => VIEW_HASH);
      await verseView();
    });
    When('I tap Memorize', async () => {
      await user.click(await within(await verseView()).findByRole('button', { name: 'Memorize' }));
    });
    Then('the Verse view reads {string}', async (_, label: string) => {
      expect(await within(await verseView()).findByRole('button', { name: label })).toBeInTheDocument();
    });
    When("I tap the Verse view's Memorizing · English", async () => {
      await user.click(await within(await verseView()).findByRole('button', { name: 'Memorizing · English' }));
    });
    Then('no sheet opens and nothing is memorized', async () => {
      await within(await verseView()).findByRole('button', { name: 'Memorize' });
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(await memorized()).toEqual([]);
      expect(screen.queryByRole('switch', { name: 'Greek' })).toBeNull();
    });
  });

  Scenario('I go straight from the Verse view to practising it', ({ Given, When, Then }) => {
    Given('my Greek setting is step {int} and the Verse view is open on Romans 8:28', async (_, step: number) => {
      await start(step, () => VIEW_HASH);
      await verseView();
    });
    When('I tap Memorize', async () => {
      await user.click(await within(await verseView()).findByRole('button', { name: 'Memorize' }));
    });
    Then('the Verse view offers Rehearse', async () => {
      expect(await within(await verseView()).findByRole('button', { name: 'Rehearse' })).toBeInTheDocument();
    });
    When('I tap Rehearse', async () => {
      await user.click(await within(await verseView()).findByRole('button', { name: 'Rehearse' }));
    });
    Then('a memorize session opens on Romans 8:28', async () => {
      await waitFor(() => expect(window.location.hash).toBe('#/memorize/Rom.8.28/en'));
    });
  });
});
