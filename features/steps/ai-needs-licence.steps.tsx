// features/steps/ai-needs-licence.steps.tsx — runs features/ai-needs-licence.feature: on a phone with no licence the AI's entry points are not drawn
// (the Talk bar, the round Ask the tutor button, the Verse view's Ask the tutor and Quiz me, the word sheet's Help with this word); with a licence they are.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setGoal } from '../../src/data/repositories/settings';
import { clearBus } from '../../src/events/bus';
import { LicenceProvider } from '../../src/gate/LicenceProvider';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { fetchLicenceStatus } from '../../src/services/licenceCheck';
import { setVerseAction } from '../../src/verse/action';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { holdBarIn } from '../../tests/support/composer';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { LicenceProbe } from '../../tests/support/licence-probe';
import { addMint, HOLDER, ISSUER_PUB, newChain } from '../../tests/support/licence-chain';

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const NOW = Date.parse('2026-10-12T12:00:00.000Z');

async function fresh(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.localStorage.clear();
  stubChapterFetch();
  stubRecognizer();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
}

/** The whole app under the provider, as src/main.tsx draws it, with a stub chain that holds a licence for this phone's key or does not; waits for the answer. */
async function openApp(hash: string, licensed: boolean): Promise<void> {
  const chain = newChain();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
  if (licensed) addMint(chain);
  window.history.replaceState(null, '', `/${hash}`);
  restoreLastRoute();
  render(
    <LicenceProvider issuer={ISSUER_PUB} now={() => NOW} check={(key) => fetchLicenceStatus(key, { issuer: ISSUER_PUB, reader: chain })}>
      <App />
      <LicenceProbe />
    </LicenceProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('licence-state').textContent).toBe(licensed ? 'licensed' : 'not-licensed'));
}

async function openReader(licensed: boolean): Promise<void> {
  await fresh();
  await openApp('', licensed);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function openVerseView(licensed: boolean): Promise<void> {
  await fresh();
  setVerseAction('ask');
  await openApp('#/?ref=Rom.8.28', licensed);
  await screen.findByRole('region', { name: 'Verse view' });
}

async function openGoal(licensed: boolean): Promise<void> {
  await fresh();
  await db.settings.put({ key: 'goal', value: '' });
  await setGoal('1 John 1:1');
  await openApp('#/goal', licensed);
  await screen.findByRole('button', { name: /^Learn next/ });
}

const askButton = () => document.querySelector('[data-ask-tutor]');
const verseView = () => screen.getByRole('region', { name: 'Verse view' });
const actionNames = () => within(within(verseView()).getByRole('group', { name: 'Actions' })).getAllByRole('button').map((b) => b.textContent);

const feature = await loadFeature('features/ai-needs-licence.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('With no licence the Reader has no Talk bar and no Ask the tutor button', ({ Given, Then, And }) => {
    Given('this phone has no licence and Romans 8 is open', () => openReader(false));
    Then('the Reader has no Talk bar', () => expect(document.querySelector('[data-talk-bar]')).toBeNull());
    And('the Reader has no Ask the tutor button', () => expect(askButton()).toBeNull());
  });

  Scenario('With a licence the Reader has the Talk bar and the Ask the tutor button', ({ Given, Then, And }) => {
    Given('this phone has a licence and Romans 8 is open', () => openReader(true));
    Then('the Reader has a Talk bar', async () => {
      await waitFor(() => expect(document.querySelector('[data-talk-bar]')).not.toBeNull());
    });
    And('the Reader has an Ask the tutor button', () => expect(askButton()).not.toBeNull());
  });

  Scenario('With no licence the Verse view offers neither Ask the tutor nor Quiz me, even if Ask the tutor was the action he left it on', ({ Given, Then, And }) => {
    Given('this phone has no licence and the Verse view of verse 28 is open, last left on Ask the tutor', () => openVerseView(false));
    Then('the Verse view offers the actions {string} and {string}', (_, first: string, second: string) => {
      expect(actionNames().slice(0, 2)).toEqual([first, second]);
      expect(actionNames()).not.toContain('Ask the tutor');
      expect(actionNames()).not.toContain('Quiz me');
    });
    And('the Verse view has no Hold to ask', () => {
      expect(within(verseView()).queryByTestId('composer')).toBeNull();
      expect(within(verseView()).queryByRole('button', { name: 'Hold to ask' })).toBeNull();
      expect(within(verseView()).queryByRole('region', { name: 'Ask the tutor' })).toBeNull();
    });
  });

  Scenario('With a licence the Verse view offers Ask the tutor and Quiz me and the Hold to ask bar', ({ Given, Then, And }) => {
    Given('this phone has a licence and the Verse view of verse 28 is open, last left on Ask the tutor', () => openVerseView(true));
    Then('the Verse view offers the actions {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string) => {
      expect(actionNames().slice(0, 4)).toEqual([a, b, c, d]);
    });
    And('the Verse view has a Hold to ask bar', async () => {
      await waitFor(() => expect(holdBarIn(verseView())).toBeInTheDocument());
    });
  });

  Scenario('With no licence the word sheet has no Help with this word', ({ Given, When, Then, And }) => {
    Given('this phone has no licence and Romans 8 is open', () => openReader(false));
    When('he taps a word in verse {int}', tapWord);
    Then('the word sheet opens', wordSheetOpens);
    And('the word sheet has no Help with this word', () => {
      expect(screen.queryByRole('group', { name: 'Help with this word' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Ask the tutor' })).toBeNull();
    });
  });

  Scenario('With a licence the word sheet has Help with this word, with Ask the tutor', ({ Given, When, Then, And }) => {
    Given('this phone has a licence and Romans 8 is open', () => openReader(true));
    When('he taps a word in verse {int}', tapWord);
    Then('the word sheet opens', wordSheetOpens);
    And('the word sheet has Help with this word with Ask the tutor', () => {
      const help = screen.getByRole('group', { name: 'Help with this word' });
      expect(within(help).getByRole('button', { name: 'Ask the tutor' })).toBeInTheDocument();
    });
  });

  Scenario('With no licence the Goal screen has no Ask the tutor button', ({ Given, Then }) => {
    Given('this phone has no licence and the Goal screen is open', () => openGoal(false));
    Then('the Goal screen has no Ask the tutor button', () => expect(askButton()).toBeNull());
  });

  Scenario('With a licence the Goal screen has the Ask the tutor button', ({ Given, Then }) => {
    Given('this phone has a licence and the Goal screen is open', () => openGoal(true));
    Then('the Goal screen has an Ask the tutor button', () => expect(askButton()).not.toBeNull());
  });
});

async function tapWord(_: unknown, verse: number): Promise<void> {
  await user.click(within(document.querySelector<HTMLElement>(`[data-verse="${verse}"]`)!).getByRole('button', { name: 'Therefore' }));
}

async function wordSheetOpens(): Promise<void> {
  expect(await screen.findByRole('dialog', { name: 'Word' })).toBeInTheDocument();
}
