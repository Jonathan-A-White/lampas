// features/steps/ai-needs-licence.steps.tsx — runs features/ai-needs-licence.feature: on a phone with no licence the AI's entry points are not drawn
// (the Talk bar, the round Ask the tutor button, the Verse view's Ask the tutor and Quiz me, the word sheet's Help with this word); with a licence they are.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { parkShare } from '../../src/data/repositories';
import { setGoal } from '../../src/data/repositories/settings';
import { clearBus } from '../../src/events/bus';
import { LicenceProvider } from '../../src/gate/LicenceProvider';
import { NightlyTuning } from '../../src/tutor/NightlyTuning';
import { askBack } from '../../src/tutor/registry';
import { forgetNightlyStart } from '../../src/tutor/weightsRun';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { fetchLicenceStatus } from '../../src/services/licenceCheck';
import { setVerseAction, type VerseAction } from '../../src/verse/action';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { holdBarIn } from '../../tests/support/composer';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
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
  // these scenarios are not about the welcome of a new licensed reader (src/Welcome.tsx): it is already done
  window.localStorage.setItem('lampas.welcome', 'done');
  stubChapterFetch();
  stubRecognizer();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear()]);
}

/** The whole app under the provider, as src/main.tsx draws it, with a stub chain that holds a licence for this phone's key or does not; waits for the answer. */
async function openApp(hash: string, licensed: boolean, beside?: ReactNode): Promise<void> {
  const chain = newChain();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
  if (licensed) addMint(chain);
  window.history.replaceState(null, '', `/${hash}`);
  restoreLastRoute();
  render(
    <LicenceProvider issuer={ISSUER_PUB} now={() => NOW} check={(key) => fetchLicenceStatus(key, { issuer: ISSUER_PUB, reader: chain })}>
      {beside}
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

async function openVerseView(licensed: boolean, action: VerseAction, ref = 'Rom.8.28'): Promise<void> {
  await fresh();
  setVerseAction(action);
  await openApp(`#/?ref=${ref}`, licensed);
  await screen.findByRole('region', { name: 'Verse view' });
}

async function openGoal(licensed: boolean): Promise<void> {
  await fresh();
  await db.settings.put({ key: 'goal', value: '' });
  await setGoal('1 John 1:1');
  await openApp('#/goal', licensed);
  await screen.findByRole('button', { name: /^Learn next/ });
}

let fake: FakePostern;

/** A phone with a picture shared to Lampas waiting on the Share sheet, and a mill that sees every call. */
async function openShare(licensed: boolean): Promise<void> {
  await fresh();
  fake = makeFakePostern();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  await db.shares.clear();
  await parkShare({ id: 'share-1', createdAt: NOW, files: [{ name: 'shared-1.png', type: 'image/png', bytes: new Uint8Array([1, 2, 3]).buffer }] });
  await openApp('#/share?s=share-1', licensed);
  await screen.findByRole('dialog', { name: 'Share to Lampas' });
}

/** A phone whose tutor was asked back for facts, with 03:00 gone, the nightly run drawn beside the app as src/main.tsx draws it, and a mill that sees every call. */
const AFTER_THREE = { now: () => new Date(2026, 9, 25, 4, 0, 0) };
async function openNight(licensed: boolean): Promise<void> {
  await fresh();
  forgetNightlyStart();
  fake = makeFakePostern();
  fake.kindReplies = {
    'tutor-weights': { status: 'answered', answer: { lists: { Reader: ['progress', 'rusty-words', 'works'] }, reasons: ['The Reader asked for your progress lately, so it is read up front there now.'] } },
  };
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init)));
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, HOLDER.toHex());
  // asked back on the Reader, the screen the plain address is
  window.history.replaceState(null, '', '/');
  await askBack(['progress', 'progress', 'rusty-words'], 1);
  await openApp('#/about', licensed, <NightlyTuning delayMs={0} deps={AFTER_THREE} />);
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
    Given('this phone has no licence and the Verse view of verse 28 is open, last left on Ask the tutor', () => openVerseView(false, 'ask'));
    Then('the Verse view offers only the action {string}, with Copy', offersOnlyListen);
    And('the Verse view has no Hold to ask', () => {
      expect(within(verseView()).queryByTestId('composer')).toBeNull();
      expect(within(verseView()).queryByRole('button', { name: 'Hold to ask' })).toBeNull();
      expect(within(verseView()).queryByRole('region', { name: 'Ask the tutor' })).toBeNull();
    });
  });

  Scenario('With no licence the Verse view of a Hebrew verse offers neither Ask the tutor nor Quiz me, even if Ask the tutor was the action he left it on', ({ Given, Then, And }) => {
    Given('this phone has no licence and the Verse view of Genesis 1:1 is open, last left on Ask the tutor', () => openVerseView(false, 'ask', 'Gen.1.1'));
    Then('the Verse view offers only the action {string}, with Copy', offersOnlyListen);
    And('the Verse view has no Hold to ask', () => {
      expect(within(verseView()).queryByTestId('composer')).toBeNull();
      expect(within(verseView()).queryByRole('button', { name: 'Hold to ask' })).toBeNull();
      expect(within(verseView()).queryByRole('region', { name: 'Ask the tutor' })).toBeNull();
    });
  });

  Scenario('With no licence the Verse view has no Read it aloud, no Hold to read bar and no Reading ladder, even if Read it aloud was the action he left it on', ({ Given, Then, And }) => {
    Given('this phone has no licence and the Verse view of verse 28 is open, last left on Read it aloud', () => openVerseView(false, 'read'));
    Then('the Verse view offers only the action {string}, with Copy', offersOnlyListen);
    And('the Verse view has no Read it aloud, no Hold to read bar and no Reading ladder', () => {
      expect(within(verseView()).queryByRole('button', { name: 'Read it aloud' })).toBeNull();
      expect(within(verseView()).queryByRole('region', { name: 'Reading check' })).toBeNull();
      expect(within(verseView()).queryByRole('button', { name: /^Hold to read/ })).toBeNull();
      expect(document.querySelector('.lp-bar')).toBeNull();
      expect(document.querySelector('[data-ladder-start]')).toBeNull();
      expect(within(verseView()).queryByRole('button', { name: 'Reading ladder' })).toBeNull();
    });
  });

  Scenario('With no licence the Verse view offers no Diagram', ({ Given, Then }) => {
    Given('this phone has no licence and the Verse view of verse 28 is open', () => openVerseView(false, 'listen'));
    Then('the Verse view has no button named Diagram', () => {
      expect(within(verseView()).queryByRole('button', { name: 'Diagram' })).toBeNull();
    });
  });

  Scenario('With a licence the Verse view offers Diagram', ({ Given, Then }) => {
    Given('this phone has a licence and the Verse view of verse 28 is open', () => openVerseView(true, 'listen'));
    Then('the Verse view has a button named Diagram', () => {
      expect(within(verseView()).getByRole('button', { name: 'Diagram' })).toBeInTheDocument();
    });
  });

  Scenario('With a licence the Verse view offers Ask the tutor and Quiz me and the Hold to ask bar', ({ Given, Then, And }) => {
    Given('this phone has a licence and the Verse view of verse 28 is open, last left on Ask the tutor', () => openVerseView(true, 'ask'));
    Then('the Verse view offers the actions {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string) => {
      expect(actionNames().slice(0, 4)).toEqual([a, b, c, d]);
    });
    And('the Verse view has a Hold to ask bar', async () => {
      await waitFor(() => expect(holdBarIn(verseView())).toBeInTheDocument());
    });
  });

  Scenario('With a licence the Verse view has Read it aloud, its Hold to read bar and the Reading ladder', ({ Given, Then }) => {
    Given('this phone has a licence and the Verse view of verse 28 is open, last left on Read it aloud', () => openVerseView(true, 'read'));
    Then('the Verse view has Read it aloud, a Hold to read bar and a Reading ladder', async () => {
      expect(within(verseView()).getByRole('button', { name: 'Read it aloud', pressed: true })).toBeInTheDocument();
      await waitFor(() => expect(document.querySelector('.lp-bar')).not.toBeNull());
      expect(await within(verseView()).findByRole('button', { name: 'Reading ladder' })).toBeInTheDocument();
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

  Scenario('With no licence the Goal screen has no Reading ladder', ({ Given, Then }) => {
    Given('this phone has no licence and the Goal screen is open', () => openGoal(false));
    Then('the Goal screen has no Reading ladder', () => {
      expect(screen.queryByRole('region', { name: 'Reading ladder' })).toBeNull();
      expect(screen.queryByRole('button', { name: /^Reading ladder/ })).toBeNull();
    });
  });

  Scenario('With a licence the Goal screen has the Reading ladder in Greek and English', ({ Given, Then }) => {
    Given('this phone has a licence and the Goal screen is open', () => openGoal(true));
    Then('the Goal screen has the Reading ladder in Greek and English', () => {
      expect(screen.getByRole('button', { name: 'Reading ladder: Greek' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Reading ladder: English' })).toBeInTheDocument();
    });
  });

  Scenario('With no licence the nightly run asks the mill nothing and About has no Tutor tuned line', ({ Given, Then }) => {
    Given('this phone has no licence and the tutor was asked back for facts, after 03:00', () => openNight(false));
    Then('the mill is sent no tutor-weights grist and About has no Tutor tuned line', async () => {
      await screen.findByRole('heading', { name: 'About' });
      // the run is drawn at once and waits for nothing: give it the time it would need
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(fake.received).toEqual([]);
      expect(screen.queryByRole('button', { name: /^Tutor tuned/ })).toBeNull();
    });
  });

  Scenario('With a licence the nightly run tunes the tutor and About says Tutor tuned', ({ Given, Then }) => {
    Given('this phone has a licence and the tutor was asked back for facts, after 03:00', () => openNight(true));
    Then('the mill is sent one tutor-weights grist and About says Tutor tuned 2026-10-25', async () => {
      expect(await screen.findByRole('button', { name: /^Tutor tuned 2026-10-25: 1 change$/ })).toBeInTheDocument();
      expect(fake.received.map((r) => r.grist.kind)).toEqual(['tutor-weights']);
    });
  });

  Scenario('With no licence a shared picture is not read for Bible references', ({ Given, Then }) => {
    Given('this phone has no licence and a picture was shared to Lampas', () => openShare(false));
    Then('the Share sheet does not read the picture: no Bible references from a picture, nothing sent to the mill', async () => {
      const sheet = screen.getByRole('dialog', { name: 'Share to Lampas' });
      expect(within(sheet).getByText(/1 picture/)).toBeInTheDocument();
      expect(within(sheet).queryByText('Finding Bible references...')).toBeNull();
      expect(sheet.querySelector('[data-share-refs]')).toBeNull();
      expect(fake.calls).toEqual([]);
    });
  });
});

function offersOnlyListen(_: unknown, only: string): void {
  expect(actionNames().slice(0, 1)).toEqual([only]);
  expect(actionNames()).not.toContain('Read it aloud');
  expect(actionNames()).not.toContain('Ask the tutor');
  expect(actionNames()).not.toContain('Quiz me');
  expect(within(verseView()).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
}

async function tapWord(_: unknown, verse: number): Promise<void> {
  await user.click(within(document.querySelector<HTMLElement>(`[data-verse="${verse}"]`)!).getByRole('button', { name: 'Therefore' }));
}

async function wordSheetOpens(): Promise<void> {
  expect(await screen.findByRole('dialog', { name: 'Word' })).toBeInTheDocument();
}
