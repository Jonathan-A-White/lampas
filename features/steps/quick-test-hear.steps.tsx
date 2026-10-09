// features/steps/quick-test-hear.steps.tsx — runs features/quick-test-hear.feature: the "Hold to hear" bar on a Quick
// test question speaks the word while it is held and stops on release. speech synthesis is the recording fake of
// tests/support/fake-speech.ts; the press is user-event pointer input held for real time (the half second is the app's).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { mulberry32 } from '../../src/data/quiz';
import { stopSpeaking } from '../../src/speech/greek';
import { stubSpeech, GREEK_VOICE, ENGLISH_VOICE, type FakeSynth } from '../../tests/support/fake-speech';

const user = userEvent.setup();
const rom8 = readFileSync('public/data/rom/8.json', 'utf8');
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** past the app's 500 ms hold */
const HOLD_MS = 650;

let synth: FakeSynth;

afterAll(() => {
  stopSpeaking();
  cleanup();
  db.close();
  vi.unstubAllGlobals();
});

async function openQuickTest(): Promise<void> {
  cleanup();
  vi.unstubAllGlobals();
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(rom8)));
  synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  forgetChapters();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear()]);
  window.location.hash = '#/test';
  localStorage.removeItem('lampas.round');
  render(<App newRandom={() => mulberry32(7)} />);
  await screen.findByRole('heading', { name: 'Quick test' });
  await screen.findByTestId('prompt');
}

const bar = (name: string): HTMLElement => screen.getByRole('button', { name: new RegExp(name) });
const promptText = (): string => screen.getByTestId('prompt').textContent ?? '';

async function down(el: HTMLElement): Promise<void> {
  await user.pointer({ keys: '[MouseLeft>]', target: el, coords: { clientX: 100, clientY: 100 } });
}
async function up(el: HTMLElement, slide = 0): Promise<void> {
  await user.pointer({ keys: '[/MouseLeft]', target: el, coords: { clientX: 100 + slide, clientY: 100 } });
}

const feature = await loadFeature('features/quick-test-hear.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Holding the bar says the word and letting go stops it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with a Greek voice and the Quick test is on its first question', openQuickTest);
    When('he holds {string} for a moment', async (_, name: string) => {
      await down(bar(name));
      await sleep(HOLD_MS);
    });
    Then('the phone is told to speak the word of the question with lang {string}', (_, lang: string) => {
      expect(synth.spoken).toHaveLength(1);
      expect(synth.spoken[0].text).toBe(promptText());
      expect(synth.spoken[0].lang).toBe(lang);
    });
    And('the word is being spoken', () => expect(synth.speaking).toBe(true));
    When('he lets go of {string}', async (_, name: string) => up(bar(name)));
    Then('the speech is stopped', () => {
      expect(synth.speaking).toBe(false);
      expect(synth.calls[synth.calls.length - 1]).toBe('cancel');
    });
  });

  Scenario('A tap on the bar says nothing', ({ Given, When, Then }) => {
    Given('Lampas is opened with a Greek voice and the Quick test is on its first question', openQuickTest);
    When('he taps {string}', async (_, name: string) => user.click(bar(name)));
    Then('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
  });

  Scenario('Sliding away from the bar while holding drops the word', ({ Given, When, Then }) => {
    Given('Lampas is opened with a Greek voice and the Quick test is on its first question', openQuickTest);
    When('he holds {string} and slides {int} px away', async (_, name: string, px: number) => {
      const el = bar(name);
      await down(el);
      await sleep(HOLD_MS);
      expect(synth.speaking).toBe(true);
      await user.pointer({ target: el, coords: { clientX: 100 + px, clientY: 100 } });
      await up(el, px);
    });
    Then('the speech is stopped', () => expect(synth.speaking).toBe(false));
  });

  Scenario('The glosses can still be tapped after a hold', ({ Given, When, Then, And }) => {
    Given('Lampas is opened with a Greek voice and the Quick test is on its first question', openQuickTest);
    When('he holds {string} for a moment', async (_, name: string) => {
      await down(bar(name));
      await sleep(HOLD_MS);
    });
    And('he lets go of {string}', async (_, name: string) => up(bar(name)));
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
});
