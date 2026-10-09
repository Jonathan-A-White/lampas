// features/steps/quick-test-lemma.steps.tsx — runs features/quick-test-lemma.feature: the Quick test's prompt is the word's
// dictionary form (the NFC lemma) with or without the chapter, the chapter's form shows small only after the answer, and
// Hold to hear says the lemma. speech synthesis is the honest fake of tests/support/fake-speech.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { mulberry32, type Question } from '../../src/data/quiz';
import { stopSpeaking } from '../../src/speech/greek';
import { stubSpeech, GREEK_VOICE, ENGLISH_VOICE, type FakeSynth } from '../../tests/support/fake-speech';

const user = userEvent.setup();
const rom8 = readFileSync('public/data/rom/8.json', 'utf8');
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** past the app's 500 ms hold */
const HOLD_MS = 650;

let synth: FakeSynth;
let noted: string[] = [];

afterAll(() => {
  stopSpeaking();
  cleanup();
  db.close();
  vi.unstubAllGlobals();
});

const AGAPAO: Question = {
  lemma: 'ἀγαπάω',
  prompt: 'ἀγαπάω',
  form: 'ἀγαπῶσιν',
  reference: 'Romans 8:28',
  book: 'rom',
  chapter: 8,
  verse: 28,
  gloss: 'to love',
  options: ['to love', 'to see', 'to hear', 'to write'],
};

async function open(opts: { chapter: boolean; round?: Question }): Promise<void> {
  cleanup();
  vi.unstubAllGlobals();
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => (opts.chapter ? new Response(rom8) : Promise.reject(new TypeError('offline')))),
  );
  synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  clearBus();
  forgetChapters();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear()]);
  localStorage.clear();
  if (opts.round) {
    localStorage.setItem(
      'lampas.round',
      JSON.stringify({ questions: [opts.round, opts.round], index: 0, picked: null, missed: [] }),
    );
  }
  window.location.hash = '#/test';
  render(<App newRandom={() => mulberry32(7)} />);
  await screen.findByRole('heading', { name: 'Quick test' });
  if (opts.round) await user.click(await screen.findByRole('button', { name: 'Resume' }));
  await screen.findByTestId('prompt');
}

const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-option]')];
const promptEl = (): HTMLElement => screen.getByTestId('prompt');
const promptText = (): string => promptEl().textContent ?? '';
const formNote = (): HTMLElement | null => document.querySelector<HTMLElement>('[data-testid="chapter-form"]');

/** Plays the whole round, tapping the first option each time; returns the prompts and the form notes shown after each answer. */
async function playRound(): Promise<{ prompts: string[]; lemmas: string[]; notes: string[]; forms: string[] }> {
  const forms: string[] = [];
  const prompts: string[] = [];
  const lemmas: string[] = [];
  const notes: string[] = [];
  for (let i = 0; i < 10; i += 1) {
    prompts.push(promptText());
    lemmas.push(promptEl().getAttribute('data-lemma') ?? '');
    expect(formNote()).toBeNull();
    await user.click(options()[0]);
    notes.push(formNote()?.textContent ?? '');
    forms.push(formNote()?.getAttribute('data-form') ?? '');
    await user.click(await screen.findByTestId('next'));
    if (i < 9) await screen.findByTestId('prompt');
  }
  return { prompts, lemmas, notes, forms };
}

const bar = (name: string): HTMLElement => screen.getByRole('button', { name: new RegExp(name) });

const feature = await loadFeature('features/quick-test-lemma.feature');

describeFeature(feature, ({ Scenario }) => {
  const withChapter = 'Lampas is opened with Romans 8 and the Quick test is on its first question';
  const withDifferentForm = 'Lampas is opened with Romans 8 and a question whose chapter form differs from its lemma';

  Scenario('Every question asks the lemma, even for a word whose chapter form differs', ({ Given, Then, And }) => {
    let played: Awaited<ReturnType<typeof playRound>>;
    Given(withChapter, () => open({ chapter: true }));
    Then("the prompt of every question of the round is the word's lemma", async () => {
      played = await playRound();
      expect(played.prompts).toHaveLength(10);
      played.prompts.forEach((p, i) => expect(p).toBe(played.lemmas[i].normalize('NFC')));
    });
    And('at least one word of the round has a different form in Romans 8', () => {
      const different = played.forms.filter((f, i) => f !== '' && f.normalize('NFC') !== played.prompts[i]);
      expect(different.length).toBeGreaterThan(0);
    });
  });

  Scenario('The same lemmas are asked whether or not the chapter loads', ({ Given, When, And, Then }) => {
    Given(withChapter, () => open({ chapter: true }));
    When('the prompts of the round are noted', async () => {
      noted = (await playRound()).prompts;
    });
    And('Lampas is opened with no chapter and the Quick test is on its first question', () => open({ chapter: false }));
    Then('the prompts of the round are the same as before', async () => {
      const played = await playRound();
      expect(played.prompts).toEqual(noted);
      expect(played.notes.every((n) => n === '')).toBe(true);
    });
  });

  Scenario("The chapter's form shows small beneath only after the answer", ({ Given, When, Then, And }) => {
    Given(withDifferentForm, () => open({ chapter: true, round: AGAPAO }));
    Then('no chapter form is shown', () => expect(formNote()).toBeNull());
    When('he taps the right gloss', async () => {
      await user.click(options().find((o) => o.textContent === AGAPAO.gloss) as HTMLElement);
    });
    Then('the chapter form is shown small and grey as "in Romans 8" followed by the form', () => {
      const note = formNote();
      expect(note).not.toBeNull();
      expect(note?.textContent).toBe('in Romans 8:28 as ἀγαπῶσιν');
      expect(note?.className).toContain('text-sm');
      expect(note?.className).toContain('text-muted');
    });
    And('the prompt is still the lemma', () => expect(promptText()).toBe('ἀγαπάω'));
  });

  Scenario('Hold to hear says the lemma', ({ Given, When, Then }) => {
    Given(withDifferentForm, () => open({ chapter: true, round: AGAPAO }));
    When('he holds {string} for a moment', async (_, name: string) => {
      await user.pointer({ keys: '[MouseLeft>]', target: bar(name), coords: { clientX: 100, clientY: 100 } });
      await sleep(HOLD_MS);
    });
    Then('the phone is told to speak the lemma with lang {string}', (_, lang: string) => {
      expect(synth.spoken).toHaveLength(1);
      expect(synth.spoken[0].text).toBe('ἀγαπάω');
      expect(synth.spoken[0].text).not.toBe(AGAPAO.form);
      expect(synth.spoken[0].lang).toBe(lang);
    });
  });
});
