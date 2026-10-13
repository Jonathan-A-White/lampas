// features/steps/quick-test-hear.steps.tsx — runs features/quick-test-hear.feature: the "Tap to hear" bar on a Quick
// test question speaks the word on a tap, plays it to its end with no finger down, and a second tap stops it (hearing is
// always a tap, docs/pwa-best-practices.md section 12). speech synthesis is the honest fake of tests/support/fake-speech.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/quiz';
import { stopSpeaking } from '../../src/speech/greek';
import { stubSpeech, GREEK_VOICE, ENGLISH_VOICE, type FakeSynth, type FakeVoice } from '../../tests/support/fake-speech';
import { asSpoken } from '../../tests/support/spoken-word';

const user = userEvent.setup();
const rom8 = readFileSync('public/data/rom/8.json', 'utf8');

let synth: FakeSynth;

afterAll(() => {
  stopSpeaking();
  cleanup();
  db.close();
  vi.unstubAllGlobals();
});

async function openWith(voices: FakeVoice[]): Promise<void> {
  cleanup();
  vi.unstubAllGlobals();
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(rom8)));
  synth = stubSpeech(voices);
  forgetChapters();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear()]);
  window.location.hash = '#/test';
  localStorage.removeItem('lampas.round');
  render(<App newRandom={() => mulberry32(7)} />);
  await screen.findByRole('heading', { name: 'Quick test' });
  await screen.findByTestId('prompt');
}

const openQuickTest = (): Promise<void> => openWith([GREEK_VOICE, ENGLISH_VOICE]);
const bar = (name: string): HTMLElement => screen.getByRole('button', { name: new RegExp(name) });
const promptText = (): string => screen.getByTestId('prompt').textContent ?? '';


const feature = await loadFeature('features/quick-test-hear.feature');

const tapBar = async (_: unknown, name: string): Promise<void> => user.click(bar(name));
const isSpoken = (): void => {
  expect(synth.spoken).toHaveLength(1);
  expect(synth.spoken[0].text).toBe(asSpoken(promptText()));
};

describeFeature(feature, ({ Scenario }) => {
  Scenario('Tapping the bar says the word once', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with a Greek voice and the Quick test is on its first question', openQuickTest);
    When('he taps {string}', tapBar);
    Then('the phone is told to speak the word of the question with lang {string}', (_, lang: string) => {
      isSpoken();
      // a one-letter word (ὁ) goes to the Greek voice too, in its pronunciation's form (mw-5r3p30.262)
      expect(synth.spoken[0].lang).toBe(lang);
    });
    And('the word is being spoken', () => expect(synth.speaking).toBe(true));
  });

  Scenario('The word plays on with no finger down', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with a Greek voice and the Quick test is on its first question', openQuickTest);
    When('he taps {string}', tapBar);
    And('the word has been spoken to its end', () => act(() => synth.finish()));
    Then('the word was spoken once and never cancelled', () => {
      isSpoken();
      expect(synth.speaking).toBe(false);
      expect(synth.calls[synth.calls.length - 1]).not.toBe('cancel');
    });
  });

  Scenario('A second tap while it speaks stops it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with a Greek voice and the Quick test is on its first question', openQuickTest);
    When('he taps {string}', tapBar);
    And('he taps {string}', tapBar);
    Then('the speech is stopped', () => {
      expect(synth.speaking).toBe(false);
      expect(synth.calls[synth.calls.length - 1]).toBe('cancel');
      expect(synth.spoken).toHaveLength(1);
    });
  });

  Scenario('No screen of the Quick test says Hold to hear', ({ Given, Then }) => {
    Given('Lampas is opened with a Greek voice and the Quick test is on its first question', openQuickTest);
    Then('no button is named {string}', (_, name: string) => {
      expect(screen.queryByRole('button', { name })).toBeNull();
      expect(document.body.textContent).not.toContain(name);
    });
  });

  Scenario('The glosses can still be tapped after hearing the word', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with a Greek voice and the Quick test is on its first question', openQuickTest);
    When('he taps {string}', tapBar);
    And('he taps the right gloss', async () => {
      const lemma = screen.getByTestId('prompt').getAttribute('data-lemma') ?? '';
      const word = await db.words.get(lemma);
      const target = [...document.querySelectorAll<HTMLElement>('[data-option]')].find((o) => o.textContent === word?.gloss);
      if (!target) throw new Error('no right option');
      await user.click(target);
    });
    Then('the tapped gloss is green and he can go on', async () => {
      expect(document.querySelectorAll('[data-option][data-result="right"]')).toHaveLength(1);
      expect(await screen.findByTestId('next')).toBeInTheDocument();
    });
  });

  Scenario('With no Greek voice a tap shows the help instead of speaking', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with only an English voice and the Quick test is on its first question', () => openWith([ENGLISH_VOICE]));
    When('he taps {string}', tapBar);
    Then('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
    And('the notice {string} is shown', async (_, text: string) => {
      expect(await screen.findByText(new RegExp(text), { selector: '[role="status"]' })).toBeInTheDocument();
    });
  });
});
