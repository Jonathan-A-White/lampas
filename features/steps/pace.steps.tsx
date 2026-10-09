// features/steps/pace.steps.tsx — runs features/pace.feature: Settings > New words > New words a day (Off, 3, 5, 10), and the pace dial
// (src/data/pace.ts, src/usePace.ts) that takes the Reader's 'New words: N' strip away while many words are due.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { forgetFrequency } from '../../src/data/frequency';
import { getNewWordsADay } from '../../src/data/repositories';
import { DAY } from '../../src/data/schedule';
import { forgetSkipped } from '../../src/data/skipped';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

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
  window.localStorage.clear();
  window.location.hash = '';
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.results.clear(), db.grammarLevels.clear()]);
}

async function openReader(): Promise<void> {
  await freshStore();
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
}

const group = (name: string): HTMLElement => screen.getByRole('group', { name });
const pressed = (chip: string) => within(group('New words a day')).getByRole('button', { name: chip, exact: true });
const openSettings = async () => {
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  await screen.findByRole('group', { name: 'New words a day' });
};

const feature = await loadFeature('features/pace.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Settings offers New words a day with Off, 3, 5, 10', ({ Given, Then, When }) => {
    Given('Lampas is opened on Settings with nothing chosen for pace', async () => {
      await freshStore();
      render(<App />);
      await openSettings();
    });
    Then('New words a day offers {string}, {string}, {string} and {string}, and {string} is chosen', async (_, a: string, b: string, c: string, d: string, chosen: string) => {
      expect(within(group('New words a day')).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b, c, d]);
      await waitFor(() => expect(pressed(chosen)).toHaveAttribute('aria-pressed', 'true'));
      expect(screen.queryByTestId('pace-note')).toBeNull();
    });
    When('he taps {string} under New words a day', async (_, chip: string) => user.click(pressed(chip)));
    Then('{string} is chosen under New words a day and is kept', async (_, chip: string) => {
      await waitFor(() => expect(pressed(chip)).toHaveAttribute('aria-pressed', 'true'));
      expect(await getNewWordsADay()).toBe(Number(chip));
    });
  });

  Scenario('with 25 words due the header offers no new words and Settings says Dialled back', ({ Given, And, Then, When }) => {
    Given('Lampas is opened on Romans 8 with his seed words for pace', openReader);
    And('{int} of his words are due', async (_, n: number) => {
      await screen.findByTestId('new-words');
      const lemmas = (await db.words.toArray()).map((w) => w.lemma).slice(0, n);
      expect(lemmas).toHaveLength(n);
      await db.reviews.bulkPut(lemmas.map((id) => ({ kind: 'word', id, step: 3, due: Date.now() - DAY, lastWhen: Date.now() - 10 * DAY, lapses: 0, rights: 0 })));
    });
    Then('the Reader shows no New words strip for pace', async () => {
      await waitFor(() => expect(screen.queryByTestId('new-words')).toBeNull());
    });
    When('he opens Settings', openSettings);
    Then('Settings says {string} under New words a day', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('pace-note')).toHaveTextContent(text));
    });
  });

  Scenario('Off hides the New words chip', ({ Given, Then, When }) => {
    Given('Lampas is opened on Romans 8 with his seed words for pace', openReader);
    Then('the strip under the Reader\'s header reads {string} for pace', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('new-words')).toHaveTextContent(text));
    });
    When('he turns New words a day Off', async () => {
      await openSettings();
      await user.click(pressed('Off'));
      await waitFor(() => expect(pressed('Off')).toHaveAttribute('aria-pressed', 'true'));
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
    });
    Then('the Reader shows no New words strip for pace', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      await waitFor(() => expect(screen.queryByTestId('new-words')).toBeNull());
    });
  });
});
