// features/steps/greek-voice-test.steps.tsx — runs features/greek-voice-test.feature: Settings > Reading voices names the Greek voice in use and its Test
// says πατήρ, then ἀγάπη (mw-5r3p30.357); a Greek voice picked there is kept and said everywhere. Speech is the honest fake of tests/support/fake-speech.ts,
// with named voices.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/quiz';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { noVoiceHelp, setVoice, stopSpeaking } from '../../src/speech/greek';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubSpeech, type FakeSynth, type FakeVoice } from '../../tests/support/fake-speech';
import { asSpoken } from '../../tests/support/spoken-word';
import { seedHisWords } from '../../tests/support/his-words';
import { openSettingsGroup } from '../../tests/support/settings-pages';

const voice = (lang: string, name: string): FakeVoice => ({ lang, name, voiceURI: name });
const GREEK = voice('el-GR', 'Greek (Greece)');
const CYPRIOT = voice('el-CY', 'Greek (Cyprus)');
const ENGLISH = voice('en-US', 'English (US)');

const user = userEvent.setup();
let synth: FakeSynth;

async function openWith(voices: FakeVoice[]): Promise<void> {
  cleanup();
  act(() => stopSpeaking());
  clearBus();
  forgetTrail();
  localStorage.clear();
  vi.unstubAllGlobals();
  stubChapterFetch();
  synth = stubSpeech(voices);
  setVoice('greek', null);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.results.clear()]);
  window.history.replaceState(null, '', '/');
  await seedHisWords();
  render(<App newRandom={() => mulberry32(7)} />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
}

afterAll(() => {
  act(() => stopSpeaking());
  cleanup();
  clearBus();
  setVoice('greek', null);
  vi.unstubAllGlobals();
  db.close();
});

const inUse = () => screen.findByTestId('greek-voice-in-use');
const openSettings = async () => {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await openSettingsGroup(user, 'listening');
};
const tapTest = async () => {
  synth.spoken.length = 0;
  await user.click(within(await inUse()).getByRole('button', { name: 'Test the Greek voice' }));
};
const saysInUse = async (_: unknown, name: string) => {
  await waitFor(async () => expect((await inUse()).querySelector('[role=status]')?.textContent).toBe(`In use: ${name}`));
};
const saysBoth = (_: unknown, name: string, first: string, second: string, lang: string) => {
  expect(synth.spoken.map((u) => [u.text.normalize('NFC'), u.voice?.name, u.lang])).toEqual([
    [first.normalize('NFC'), name, lang],
    [second.normalize('NFC'), name, lang],
  ]);
};

const feature = await loadFeature('features/greek-voice-test.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Settings names the Greek voice in use, and Test says πατήρ, then ἀγάπη in it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with two Greek voices', () => openWith([ENGLISH, GREEK, CYPRIOT]));
    When('he opens Settings', openSettings);
    Then('Reading voices says the Greek voice in use is {string}', saysInUse);
    When('he taps Test under the Greek voice', tapTest);
    Then('the voice {string} says {string}, then {string}, in lang {string}', saysBoth);
    And('Test reads Stop while it speaks', async () => {
      expect(synth.speaking).toBe(true);
      expect(await within(await inUse()).findByRole('button', { name: 'Stop the test' })).toHaveTextContent('Stop');
    });
  });

  Scenario('A second tap on Test stops it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with two Greek voices', () => openWith([ENGLISH, GREEK, CYPRIOT]));
    When('he opens Settings', openSettings);
    And('he taps Test under the Greek voice', tapTest);
    And('he taps Stop under the Greek voice', async () => {
      await user.click(await within(await inUse()).findByRole('button', { name: 'Stop the test' }));
    });
    Then('nothing is being said', () => {
      expect(synth.speaking).toBe(false);
      expect(synth.calls.at(-1)).toBe('cancel');
    });
    And('Test reads Test again', async () => {
      expect(await within(await inUse()).findByRole('button', { name: 'Test the Greek voice' })).toHaveTextContent('Test');
    });
  });

  Scenario('Another Greek voice picked there is kept and said everywhere', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with two Greek voices', () => openWith([ENGLISH, GREEK, CYPRIOT]));
    When('he opens Settings', openSettings);
    And('he picks the Greek voice {string}', async (_, name: string) => {
      await user.selectOptions(await screen.findByRole('combobox', { name: 'Greek voice' }), name);
      await waitFor(async () => expect((await db.settings.get('voice.greek'))?.value).toBe(name));
    });
    Then('Reading voices says the Greek voice in use is {string}', saysInUse);
    When('he taps Test under the Greek voice', tapTest);
    Then('the voice {string} says {string}, then {string}, in lang {string}', saysBoth);
    When('Lampas is reopened at the Settings address', async () => {
      act(() => stopSpeaking());
      cleanup();
      clearBus();
      // a page opened afresh: the speaker knows no voice until the saved one is read
      setVoice('greek', null);
      window.history.replaceState(null, '', '/#/settings');
      render(<App newRandom={() => mulberry32(7)} />);
      await screen.findByRole('heading', { name: 'Settings', level: 1 });
    });
    Then('Reading voices still says the Greek voice in use is {string}', saysInUse);
    When('he opens the Quick test and taps {string}', async (_, name: string) => {
      act(() => stopSpeaking());
      cleanup();
      localStorage.removeItem('lampas.round');
      window.history.replaceState(null, '', '/#/test');
      render(<App newRandom={() => mulberry32(7)} />);
      await screen.findByTestId('prompt');
      synth.spoken.length = 0;
      await user.click(screen.getByRole('button', { name: new RegExp(name) }));
    });
    Then('the word of the question is said by the voice {string}', async (_, name: string) => {
      const prompt = screen.getByTestId('prompt').textContent ?? '';
      await waitFor(() => expect(synth.spoken.at(-1)?.text).toBe(asSpoken(prompt)));
      expect(synth.spoken.at(-1)?.voice?.name).toBe(name);
      expect(synth.spoken.at(-1)?.lang).toBe('el-GR');
    });
  });

  Scenario('A phone with no Greek voice is told where to get one, and has no Test', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with only an English voice', () => openWith([ENGLISH]));
    When('he opens Settings', openSettings);
    Then('Reading voices says there is no Greek voice and where to get one', async () => {
      await waitFor(async () => expect((await inUse()).querySelector('[role=status]')?.textContent).toBe(noVoiceHelp()));
    });
    And('there is no Test under the Greek voice', async () => {
      expect(within(await inUse()).queryByRole('button')).toBeNull();
    });
  });
});
