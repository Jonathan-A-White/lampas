// features/steps/hebrew-voice-test.steps.tsx — runs features/hebrew-voice-test.feature: Settings > Listening names the Hebrew voice in use and its Test says שָׁלוֹם
// (mw-5r3p30.909), as features/greek-voice-test.feature does for Greek. Speech is the honest fake of tests/support/fake-speech.ts, with named voices.
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
import { setVoice, stopSpeaking } from '../../src/speech/greek';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubSpeech, type FakeSynth, type FakeVoice } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';
import { openSettingsGroup } from '../../tests/support/settings-pages';
import { openSettings } from '../../tests/unit/openSettings';

const voice = (lang: string, name: string): FakeVoice => ({ lang, name, voiceURI: name });
const HEBREW = voice('he-IL', 'Hebrew (Israel)');
const ALTERNATE = voice('he-IL', 'Hebrew (Alternate)');
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
  setVoice('hebrew', null);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.results.clear()]);
  // the Hebrew voice row is shown from the Hebrew dial's Curious up
  await db.settings.put({ key: 'hebrewInterest', value: '5' });
  window.history.replaceState(null, '', '/');
  await seedHisWords();
  render(<App newRandom={() => mulberry32(7)} />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
}

afterAll(() => {
  act(() => stopSpeaking());
  cleanup();
  clearBus();
  setVoice('hebrew', null);
  vi.unstubAllGlobals();
  db.close();
});

const inUse = () => screen.findByTestId('hebrew-voice-in-use');
const openSettingsPage = async () => {
  await openSettings(user);
  await openSettingsGroup(user, 'listening');
};
const tapTest = async () => {
  synth.spoken.length = 0;
  await user.click(within(await inUse()).getByRole('button', { name: 'Test the Hebrew voice' }));
};
const saysInUse = async (_: unknown, name: string) => {
  await waitFor(async () => expect((await inUse()).querySelector('[role=status]')?.textContent).toBe(`In use: ${name}`));
};
const saysWord = (_: unknown, name: string, word: string, lang: string) => {
  expect(synth.spoken.map((u) => [u.text.normalize('NFC'), u.voice?.name, u.lang])).toEqual([[word.normalize('NFC'), name, lang]]);
};

const feature = await loadFeature('features/hebrew-voice-test.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Test under the Hebrew voice says a Hebrew word in the voice in use', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with the Hebrew dial at All in on a phone with two Hebrew voices', () => openWith([ENGLISH, HEBREW, ALTERNATE]));
    When('he opens Settings', openSettingsPage);
    Then('Listening says the Hebrew voice in use is {string}', saysInUse);
    When('he taps Test under the Hebrew voice', tapTest);
    Then('the voice {string} says {string}, in lang {string}', saysWord);
    And('Test reads Stop while it speaks', async () => {
      expect(synth.speaking).toBe(true);
      expect(await within(await inUse()).findByRole('button', { name: 'Stop the test' })).toHaveTextContent('Stop');
    });
    When('he taps Stop under the Hebrew voice', async () => {
      await user.click(await within(await inUse()).findByRole('button', { name: 'Stop the test' }));
    });
    Then('nothing is being said', () => {
      expect(synth.speaking).toBe(false);
      expect(synth.calls.at(-1)).toBe('cancel');
    });
  });

  Scenario('Another Hebrew voice picked there is kept and Test says the word in it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with the Hebrew dial at All in on a phone with two Hebrew voices', () => openWith([ENGLISH, HEBREW, ALTERNATE]));
    When('he opens Settings', openSettingsPage);
    And('he picks the Hebrew voice {string}', async (_, name: string) => {
      await user.selectOptions(await screen.findByRole('combobox', { name: 'Hebrew voice' }), name);
      await waitFor(async () => expect((await db.settings.get('voice.hebrew'))?.value).toBe(name));
    });
    Then('Listening says the Hebrew voice in use is {string}', saysInUse);
    When('he taps Test under the Hebrew voice', tapTest);
    Then('the voice {string} says {string}, in lang {string}', saysWord);
  });

  Scenario('A phone with no Hebrew voice is told so, and has no Test', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with the Hebrew dial at All in on a phone with only an English voice', () => openWith([ENGLISH]));
    When('he opens Settings', openSettingsPage);
    Then('Listening says there is no Hebrew voice on this phone', async () => {
      await waitFor(async () => expect((await inUse()).querySelector('[role=status]')?.textContent).toBe('No Hebrew voice on this phone'));
    });
    And('there is no Test under the Hebrew voice', async () => {
      expect(within(await inUse()).queryByRole('button')).toBeNull();
    });
  });
});
