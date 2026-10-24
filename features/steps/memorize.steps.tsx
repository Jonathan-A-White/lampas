// features/steps/memorize.steps.tsx — runs features/memorize.feature: a whole list, or one verse in the Verse view, enters memorizing in English, and the languages beyond follow the Greek dial.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

async function start(step: number, hash: (listId: number) => string, list?: string[]): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
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
    Then('Romans 8:28 and 2 Thessalonians 3:3 are memorized in English', async () => {
      await waitFor(async () => expect(await memorized()).toEqual(['en:2Thess.3.3', 'en:Rom.8.28']));
    });
    And('the list says {string}', async (_, line: string) => {
      expect(await screen.findByText(line)).toBeInTheDocument();
    });
    And('each New Testament row reads {string}', async (_, label: string) => {
      for (const name of ['Romans 8:28', '2 Thessalonians 3:3']) {
        const row = screen.getByRole('link', { name }).closest('li') as HTMLElement;
        expect(await within(row).findByRole('button', { name: label })).toBeInTheDocument();
      }
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
});
