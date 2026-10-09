// features/steps/quick-test-after-answer.steps.tsx — runs features/quick-test-after-answer.feature: the word spoken by
// itself once he has answered, a wrong answer waiting for Next, and Ask the tutor beside Next. speechSynthesis is the
// recording fake of tests/support/fake-speech.ts; a round with a chosen question is put in localStorage and resumed.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { forgetChapters } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { mulberry32, type Question } from '../../src/data/quiz';
import { clearBus } from '../../src/events/bus';
import { stopSpeaking } from '../../src/speech/greek';
import { stubSpeech, GREEK_VOICE, ENGLISH_VOICE, type FakeSynth } from '../../tests/support/fake-speech';

const user = userEvent.setup();
const rom8 = readFileSync('public/data/rom/8.json', 'utf8');
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let synth: FakeSynth;
let promptAtStart = '';

afterAll(() => {
  stopSpeaking();
  cleanup();
  db.close();
  vi.unstubAllGlobals();
});

async function open(round?: { question: Question; picked: string | null }): Promise<void> {
  cleanup();
  vi.unstubAllGlobals();
  vi.stubGlobal('fetch', vi.fn<typeof fetch>(async () => new Response(rom8)));
  synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  clearBus();
  forgetChapters();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear()]);
  localStorage.clear();
  if (round) {
    localStorage.setItem(
      'lampas.round',
      JSON.stringify({ questions: [round.question, round.question], index: 0, picked: round.picked, missed: [] }),
    );
  }
  window.location.hash = '#/test';
  render(<App newRandom={() => mulberry32(7)} />);
  await screen.findByRole('heading', { name: 'Quick test' });
  if (!round) await screen.findByTestId('prompt');
  promptAtStart = screen.queryByTestId('prompt')?.textContent ?? '';
}

const AMEN: Question = { lemma: 'ἀμήν', prompt: 'ἀμήν', gloss: 'truly', options: ['truly', 'and', 'but', 'not'] };
const AGAPAO: Question = {
  lemma: 'ἀγαπάω',
  prompt: 'ἀγαπάω',
  form: 'ἀγαπῶσιν',
  reference: 'Romans 8:28',
  chapter: 8,
  verse: 28,
  gloss: 'to love',
  options: ['to love', 'to see', 'to hear', 'to write'],
};

const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-option]')];
const promptText = (): string => screen.getByTestId('prompt').textContent ?? '';

async function rightGloss(): Promise<string> {
  const lemma = screen.getByTestId('prompt').getAttribute('data-lemma') ?? '';
  const fromRound = [AMEN, AGAPAO].find((q) => q.lemma === lemma);
  if (fromRound) return fromRound.gloss;
  const word = await db.words.get(lemma);
  if (!word) throw new Error(`no word ${lemma}`);
  return word.gloss;
}

async function tapGloss(right: boolean): Promise<void> {
  const gloss = await rightGloss();
  const target = options().find((o) => (o.textContent === gloss) === right);
  if (!target) throw new Error('no such option');
  await user.click(target);
}

const expectSpokenOnce = () => {
  expect(synth.spoken).toHaveLength(1);
  expect(synth.spoken[0].text).toBe(promptText());
  expect(synth.spoken[0].lang).toBe('el-GR');
};

const resume = async () => user.click(await screen.findByRole('button', { name: 'Resume' }));

const feature = await loadFeature('features/quick-test-after-answer.feature');

describeFeature(feature, ({ Scenario }) => {
  const firstQuestion = 'Lampas is opened with a Greek voice and the Quick test is on its first question';

  Scenario('The word is spoken by itself, once, after a right answer', ({ Given, When, Then }) => {
    Given(firstQuestion, () => open());
    Then('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
    When('he taps the right gloss', () => tapGloss(true));
    Then('the word of the question is spoken once in Greek', expectSpokenOnce);
  });

  Scenario('The word is spoken by itself after a wrong answer, and the test waits for Next', ({ Given, When, Then, And }) => {
    const sameQuestion = async () => {
      expect(promptText()).toBe(promptAtStart);
      expect(await screen.findByTestId('next')).toHaveTextContent('Next');
    };
    Given(firstQuestion, () => open());
    When('he taps a wrong gloss', () => tapGloss(false));
    Then('the word of the question is spoken once in Greek', expectSpokenOnce);
    And('the same question is still on screen with Next', sameQuestion);
    When('he waits a moment', () => sleep(800));
    Then('the same question is still on screen with Next', sameQuestion);
    When('he taps Next', async () => user.click(await screen.findByTestId('next')));
    Then('the second question is on screen', async () => {
      await waitFor(() => expect(screen.getByRole('banner')).toHaveTextContent('2 of 10'));
      expect(screen.queryByTestId('next')).toBeNull();
    });
  });

  Scenario('Ask the tutor sits beside Next after an answer, not before', ({ Given, When, Then }) => {
    Given(firstQuestion, () => open());
    Then('there is no Ask the tutor button', () => expect(screen.queryByRole('button', { name: 'Ask the tutor' })).toBeNull());
    When('he taps a wrong gloss', () => tapGloss(false));
    Then('there is an Ask the tutor button beside Next', async () => {
      const next = await screen.findByTestId('next');
      const ask = screen.getByRole('button', { name: 'Ask the tutor' });
      expect(ask.parentElement).toBe(next.parentElement);
    });
  });

  Scenario('Ask the tutor opens the Ask box on the verse of the word', ({ Given, When, And, Then }) => {
    Given(
      'Lampas is opened with a Greek voice and a kept round whose question is the form ἀγαπῶσιν of Romans 8:28',
      () => open({ question: AGAPAO, picked: null }),
    );
    When('he resumes the round', resume);
    And('he taps a wrong gloss', () => tapGloss(false));
    And('he taps Ask the tutor', async () => user.click(await screen.findByRole('button', { name: 'Ask the tutor' })));
    Then('the Reader opens on verse 28 with the Ask box holding a question that names ἀγαπῶσιν and Romans 8:28', async () => {
      const box = await waitFor(() => {
        const found = document.querySelector<HTMLElement>('[data-ask="28"]');
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
      const text = (within(box).getByRole('textbox', { name: 'Your question' }) as HTMLTextAreaElement).value;
      expect(text).toContain('ἀγαπῶσιν');
      expect(text).toContain('Romans 8:28');
      expect(screen.getByRole('button', { name: 'Verse 28' })).toHaveAttribute('aria-pressed', 'true');
    });
  });

  Scenario('A word with no verse of its own asks the tutor about its meaning', ({ Given, When, And, Then }) => {
    Given('Lampas is opened with a Greek voice and a kept round whose question is the word ἀμήν with no verse', () =>
      open({ question: AMEN, picked: null }),
    );
    When('he resumes the round', resume);
    And('he taps a wrong gloss', () => tapGloss(false));
    And('he taps Ask the tutor', async () => user.click(await screen.findByRole('button', { name: 'Ask the tutor' })));
    Then('the Reader opens with the Ask box holding a question that names ἀμήν', async () => {
      const box = await waitFor(() => {
        const found = document.querySelector<HTMLElement>('[data-ask]');
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
      expect((within(box).getByRole('textbox', { name: 'Your question' }) as HTMLTextAreaElement).value).toContain('ἀμήν');
    });
  });

  Scenario('A round resumed after the answer does not speak the word again', ({ Given, When, Then, And }) => {
    Given(
      'Lampas is opened with a Greek voice and a kept round whose question is the word ἀμήν with no verse, already answered',
      () => open({ question: AMEN, picked: 'and' }),
    );
    When('he resumes the round', resume);
    Then('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
    And('there is an Ask the tutor button beside Next', async () => {
      const next = await screen.findByTestId('next');
      expect(screen.getByRole('button', { name: 'Ask the tutor' }).parentElement).toBe(next.parentElement);
    });
  });
});
