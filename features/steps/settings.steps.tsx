// features/steps/settings.steps.tsx — runs features/settings.feature: the gear, the Settings screen, the weave moved
// there, the voice pickers and the Greek pronunciation list. speech synthesis is the honest fake of tests/support/fake-speech.ts, with named voices.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { clearBus, latest } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubSpeech, type FakeSynth, type FakeVoice } from '../../tests/support/fake-speech';

const voice = (lang: string, name: string): FakeVoice => ({ lang, name, voiceURI: name });
const GREEK = voice('el-GR', 'Greek (Greece)');
const CYPRIOT = voice('el-CY', 'Greek (Cyprus)');
const ENGLISH = voice('en-US', 'English (US)');
const FRENCH = voice('fr-FR', 'French (France)');

let synth: FakeSynth;

const user = userEvent.setup();

async function waitForReader(): Promise<void> {
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

async function openWith(voices: FakeVoice[]): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  synth = stubSpeech(voices);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.history.replaceState(null, '', '/');
  render(<App />);
  await waitForReader();
  // the seed lands a moment after the first paint
  await waitFor(async () => expect(await db.words.count()).toBe(63));
}

afterAll(() => {
  cleanup();
  clearBus();
  vi.unstubAllGlobals();
  db.close();
});

const settingsHeading = () => screen.findByRole('heading', { name: 'Settings', level: 1 });
const optionsOf = (select: HTMLElement): string[] => within(select).getAllByRole('option').map((o) => o.textContent ?? '');
const selectedOption = (select: HTMLElement): string => {
  const chosen = within(select).getAllByRole<HTMLOptionElement>('option').find((o) => o.selected);
  return chosen?.textContent ?? '';
};
const greekPicker = () => screen.findByRole('combobox', { name: 'Greek voice' });
const englishPicker = () => screen.findByRole('combobox', { name: 'English voice' });
const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};

async function openSettings(): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await settingsHeading();
}
const goBack = async () => {
  await user.click(screen.getByRole('button', { name: '‹ Reader' }));
  await waitForReader();
};
const setWeaveInSettings = async (label: 'Off' | 'Solid') => {
  await user.click(within(screen.getByRole('group', { name: 'Weave' })).getByRole('button', { name: label }));
  await waitFor(() => expect(latest('weave-changed')?.weave).toBe(label === 'Off' ? 'off' : 'solid'));
};

const feature = await loadFeature('features/settings.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('The gear opens Settings and Back returns to the reader', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH, GREEK]));
    When("he taps the gear in the reader's header", openSettings);
    Then('the Settings screen is shown', async () => {
      await settingsHeading();
    });
    And('the address is {string}', (_, hash: string) => expect(window.location.hash).toBe(hash));
    When('he taps Back on the Settings screen', goBack);
    Then('the reader is shown again', () => {
      expect(screen.getByRole('heading', { name: 'Romans 8', level: 1 })).toBeVisible();
      expect(screen.queryByRole('heading', { name: 'Settings', level: 1 })).toBeNull();
    });
  });

  Scenario('Turning the weave on in Settings weaves the reader', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH, GREEK]));
    When("he taps the gear in the reader's header", openSettings);
    And('he sets Weave to Solid words in Settings', () => setWeaveInSettings('Solid'));
    Then('the bus has heard the weave is solid', () => expect(latest('weave-changed')?.weave).toBe('solid'));
    When('he taps Back on the Settings screen', goBack);
    Then('verse 1 of the reader has woven Greek words', async () => {
      await waitFor(() => expect(verseEl(1).querySelectorAll('[data-woven]').length).toBeGreaterThan(0));
    });
    And("the reader's header has no Weave switch", () => {
      expect(screen.queryByRole('group', { name: 'Weave' })).toBeNull();
    });
  });

  Scenario('A chosen Greek voice is used by the speaker buttons', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on a phone with two Greek voices', () => openWith([ENGLISH, GREEK, CYPRIOT]));
    When("he taps the gear in the reader's header", openSettings);
    And('he chooses the Greek voice {string} in Settings', async (_, name: string) => {
      await user.selectOptions(await greekPicker(), name);
    });
    And('he taps Back on the Settings screen', goBack);
    And('he switches the reader to Greek', async () => {
      await user.click(screen.getByRole('button', { name: 'Greek' }));
      await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
    });
    And('he taps the play button of verse {int}', async (_, n: number) => {
      await user.click(within(verseEl(n)).getByRole('button', { name: 'Hear the verse' }));
    });
    Then('the phone speaks verse {int} with the voice {string}', (_, __: number, name: string) => {
      expect(synth.spoken[synth.spoken.length - 1]?.voice?.name).toBe(name);
    });
  });

  Scenario("The voice pickers list the phone's voices by language, with Phone default first", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with two Greek voices', () => openWith([ENGLISH, GREEK, CYPRIOT, FRENCH]));
    When("he taps the gear in the reader's header", openSettings);
    Then('the Greek voice picker offers {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      expect(optionsOf(await greekPicker())).toEqual([a, b, c]);
    });
    And('the English voice picker offers {string} and {string}', async (_, a: string, b: string) => {
      expect(optionsOf(await englishPicker())).toEqual([a, b]);
    });
  });

  Scenario('Greek pronunciation shows Modern Greek, selected', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH, GREEK]));
    When("he taps the gear in the reader's header", openSettings);
    Then('Greek pronunciation lists only {string}', async (_, label: string) => {
      const group = await screen.findByRole('radiogroup', { name: 'Greek pronunciation' });
      expect(within(group).getAllByRole('radio').map((r) => r.getAttribute('aria-labelledby')).map((id) => document.getElementById(id ?? '')?.textContent)).toEqual([label]);
    });
    And('{string} is selected', async (_, label: string) => {
      expect(await screen.findByRole('radio', { name: label })).toBeChecked();
    });
  });

  Scenario('Settings survive a reload', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on a phone with two Greek voices', () => openWith([ENGLISH, GREEK, CYPRIOT]));
    When("he taps the gear in the reader's header", openSettings);
    And('he sets Weave to Solid words in Settings', () => setWeaveInSettings('Solid'));
    And('he chooses the Greek voice {string} in Settings', async (_, name: string) => {
      await user.selectOptions(await greekPicker(), name);
      await waitFor(async () => expect((await db.settings.get('voice.greek'))?.value).toBe(name));
    });
    And('he chooses the English voice {string} in Settings', async (_, name: string) => {
      await user.selectOptions(await englishPicker(), name);
      await waitFor(async () => expect((await db.settings.get('voice.english'))?.value).toBe(name));
    });
    And('Lampas is reopened at the Settings address', async () => {
      cleanup();
      clearBus();
      render(<App />);
      await settingsHeading();
    });
    Then('the Settings screen is shown', async () => {
      await settingsHeading();
    });
    And('Weave is set to Solid words in Settings', async () => {
      await waitFor(() =>
        expect(within(screen.getByRole('group', { name: 'Weave' })).getByRole('button', { name: 'Solid' })).toHaveAttribute('aria-pressed', 'true'),
      );
    });
    And('the Greek voice picker shows {string}', async (_, name: string) => {
      await waitFor(async () => expect(selectedOption(await greekPicker())).toBe(name));
    });
    And('the English voice picker shows {string}', async (_, name: string) => {
      await waitFor(async () => expect(selectedOption(await englishPicker())).toBe(name));
    });
    And('{string} is selected', async (_, label: string) => {
      expect(await screen.findByRole('radio', { name: label })).toBeChecked();
    });
  });

  Scenario('Words and About are reachable from Settings', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH, GREEK]));
    When("he taps the gear in the reader's header", openSettings);
    And('he taps {string} on the Settings screen', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label }));
    });
    Then('the Words screen is shown', async () => {
      await screen.findByRole('heading', { name: 'Words', level: 1 });
    });
  });
});
