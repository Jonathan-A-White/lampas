// features/steps/word-tip.steps.tsx — runs features/word-tip.feature: the one-time tip on a word's sheet (bsv-kit/tips, kept in localStorage).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

async function openReader(clear: boolean): Promise<void> {
  cleanup();
  clearBus();
  forgetChapters();
  vi.unstubAllGlobals();
  stubChapterFetch();
  if (clear) window.localStorage.clear();
  window.location.hash = '';
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const sheet = () => screen.getByRole('dialog', { name: 'Word' });
const tapsWord = async (_: unknown, text: string, verse: number): Promise<void> => {
  await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
  await screen.findByRole('dialog', { name: 'Word' });
};
const closesAndTaps = async (_: unknown, text: string, verse: number): Promise<void> => {
  await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
  await tapsWord(_, text, verse);
};
const showsTip = async (_: unknown, text: string): Promise<void> => {
  const tip = await within(sheet()).findByRole('note');
  expect(tip).toHaveTextContent(text);
  expect(within(tip).getByRole('button', { name: 'Got it' })).toBeInTheDocument();
};
const showsNoTip = async (): Promise<void> => {
  // give a late answer from the tips list time to come
  await new Promise<void>((resolve) => setTimeout(resolve, 60));
  expect(within(sheet()).queryByRole('note')).toBeNull();
};

const feature = await loadFeature('features/word-tip.feature');

describeFeature(feature, ({ Scenario }) => {
  const given = 'Lampas is opened on Romans 8 and no tip has been dismissed';

  Scenario('The first tap on a word shows the tip', ({ Given, When, Then }) => {
    Given(given, () => openReader(true));
    When('he taps the word {string} in verse {int}', tapsWord);
    Then('the word sheet shows the tip {string} with a Got it button', showsTip);
  });

  Scenario('Got it dismisses the tip for good, across a close and across a new opening', ({ Given, When, And, Then }) => {
    Given(given, () => openReader(true));
    When('he taps the word {string} in verse {int}', tapsWord);
    And('he taps Got it on the tip', async () => {
      await user.click(within(await within(sheet()).findByRole('note')).getByRole('button', { name: 'Got it' }));
    });
    Then('the word sheet shows no tip', showsNoTip);
    When('he closes the word sheet and taps the word {string} in verse {int}', closesAndTaps);
    Then('the word sheet still shows no tip', showsNoTip);
    When('Lampas is opened again', () => openReader(false));
    And('he then taps the word {string} in verse {int}', tapsWord);
    Then('the word sheet shows no tip once more', showsNoTip);
  });

  Scenario('Closing the sheet without Got it keeps the tip for the next tap', ({ Given, When, And, Then }) => {
    Given(given, () => openReader(true));
    When('he taps the word {string} in verse {int}', tapsWord);
    And('he closes the word sheet and taps the word {string} in verse {int}', closesAndTaps);
    Then('the word sheet shows the tip {string} with a Got it button', showsTip);
  });
});
