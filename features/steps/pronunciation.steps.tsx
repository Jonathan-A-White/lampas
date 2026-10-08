// features/steps/pronunciation.steps.tsx — runs features/pronunciation.feature: the word sheet's respelling in the chosen
// pronunciation, and a scheme registered by a test showing up in Settings and on the sheet.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { registerPronunciation } from '../../src/speech/pronunciation';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const user = userEvent.setup();
let unregister: (() => void) | undefined;

async function openFresh(): Promise<void> {
  unregister?.();
  unregister = undefined;
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.history.replaceState(null, '', '/');
  render(<App />);
  await waitForReader();
}

async function waitForReader(): Promise<void> {
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

afterAll(() => {
  unregister?.();
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const sheet = () => screen.getByRole('dialog');

const feature = await loadFeature('features/pronunciation.feature');

describeFeature(feature, ({ Scenario }) => {
  const switchToGreek = async () => {
    await user.click(screen.getByRole('button', { name: 'Greek' }));
    await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
  };
  const tapGreek = async (_: unknown, word: string, verse: number) => {
    await user.click(within(verseEl(verse)).getByRole('button', { name: word }));
  };
  const respelling = (_: unknown, want: string) => expect(within(sheet()).getByTestId('sheet-respelling')).toHaveTextContent(want);

  Scenario('The word sheet respells the word in Modern Greek and shows no beta-code', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', openFresh);
    And('he switches the reader to Greek', switchToGreek);
    When('he taps the Greek word {string} in verse {int}', tapGreek);
    Then('the word sheet shows the respelling {string}', (_, want: string) => expect(within(sheet()).getByTestId('sheet-respelling').textContent).toBe(want));
    And('the word sheet shows no transliteration', () => {
      expect(within(sheet()).queryByTestId('sheet-translit')).toBeNull();
      expect(sheet().textContent).not.toContain('pneuma');
    });
  });

  Scenario('A scheme added to the registry is listed in Settings and respells the word sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', openFresh);
    And('a second pronunciation {string} is registered that respells every word as its capitals', (_, label: string) => {
      unregister = registerPronunciation({
        id: 'shouting',
        label,
        lang: 'el-GR',
        scoringLang: 'el',
        note: 'Test scheme.',
        respell: (word) => word.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase(),
      });
    });
    When("he taps the gear in the reader's header", async () => {
      await user.click(screen.getByRole('button', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    Then('Greek pronunciation lists {string} and {string}', async (_, a: string, b: string) => {
      const group = await screen.findByRole('radiogroup', { name: 'Greek pronunciation' });
      expect(within(group).getAllByRole('radio').map((r) => document.getElementById(r.getAttribute('aria-labelledby') ?? '')?.textContent)).toEqual([a, b]);
    });
    When('he chooses the pronunciation {string}', async (_, label: string) => {
      await user.click(await screen.findByRole('radio', { name: label }));
      await waitFor(async () => expect((await db.settings.get('greekPronunciation'))?.value).toBe('shouting'));
    });
    And('he taps Back on the Settings screen', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await waitForReader();
    });
    And('he switches the reader to Greek', switchToGreek);
    And('he taps the Greek word {string} in verse {int}', tapGreek);
    Then('the word sheet shows the respelling {string}', respelling);
  });
});
