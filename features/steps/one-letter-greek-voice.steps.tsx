// features/steps/one-letter-greek-voice.steps.tsx — runs features/one-letter-greek-voice.feature: a Greek word of one letter (Ὃ, ὁ, ἡ, ὦ)
// goes to the Greek voice as its sound, from a lesson's speaker and from a hold in the reader; a letter drill still names its letter
// (mw-5r3p30.262). Speech is the honest fake of tests/support/fake-speech.ts; the presses are user-event pointer input held for real time.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { GrammarCard } from '../../src/GrammarCard';
import { titleOf } from '../../src/data/books';
import { db } from '../../src/data/db';
import { ideaOf } from '../../src/data/grammar/ladder';
import { quickQuestion } from '../../src/data/grammar/quickRound';
import { mulberry32 } from '../../src/data/quiz';
import { clearBus } from '../../src/events/bus';
import { chosenPronunciation, stopSpeaking } from '../../src/speech/greek';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** past the app's 500 ms hold */
const HOLD_MS = 650;

/** What a voice says for a letter by its name, in Greek and in English: none of these may be handed over for a word. */
const LETTER_NAMES = ['όμικρον', 'ὄμικρον', 'omicron', 'ήτα', 'ἦτα', 'eta', 'ωμέγα', 'ὦ μέγα', 'omega'];

let synth: FakeSynth;

afterAll(() => {
  stopSpeaking();
  stopReading();
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

/** Opens the app on Romans 8 with both voices, every store emptied, and `goal` saved as the goal when there is one. */
async function open(goal?: string): Promise<void> {
  cleanup();
  stopSpeaking();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  stubChapterFetch();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  window.localStorage.clear();
  window.location.hash = '';
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.grammarLevels.clear(), db.reviews.clear()]);
  if (goal !== undefined) await db.settings.put({ key: 'goal', value: goal });
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const ideaSheet = () => screen.getByRole('dialog', { name: 'Idea' });
const lastSpoken = () => synth.spoken[synth.spoken.length - 1];

/** Finger down on `el`, held `ms`, then lifted. */
async function press(el: HTMLElement, ms: number): Promise<void> {
  await user.pointer({ keys: '[MouseLeft>]', target: el, coords: { clientX: 100, clientY: 100 } });
  await sleep(ms);
  await user.pointer({ keys: '[/MouseLeft]', target: el, coords: { clientX: 100, clientY: 100 } });
}

/** The Greek voice was handed `text`, told el-GR. */
function toldGreek(text: string, lang: string): void {
  expect(synth.spoken.length).toBeGreaterThan(0);
  expect(lastSpoken().text.normalize('NFC')).toBe(text.normalize('NFC'));
  expect(lastSpoken().lang).toBe(lang);
  expect(lastSpoken().voice).toBe(GREEK_VOICE);
}

/** What was handed over for the one-letter `word` is not its bare letter (which a voice names), not a letter's name, and not the
 * English respelling the word sheet shows ('o'); nothing was given to the English voice. */
function neitherNameNorRespelling(word: string): void {
  const said = lastSpoken().text.normalize('NFC');
  const bare = word.normalize('NFD').replace(/\p{M}/gu, '');
  expect([bare.toLowerCase(), bare.toUpperCase()]).not.toContain(said);
  expect(LETTER_NAMES.map((n) => n.normalize('NFC'))).not.toContain(said);
  expect(said).not.toBe(chosenPronunciation().respell(word.toLowerCase()).toLowerCase());
  expect(/\p{Script=Greek}/u.test(said)).toBe(true);
  expect(synth.spoken.every((u) => u.voice !== ENGLISH_VOICE && !u.lang.startsWith('en'))).toBe(true);
}

const feature = await loadFeature('features/one-letter-greek-voice.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  Scenario('The speaker beside Ὃ in the breathings lesson hands it to the Greek voice as its sound', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice and the goal {string}', (_, goal: string) => open(goal));
    When('he opens the lesson {string} from the Goal screen', async (_, id: string) => {
      window.location.hash = '#/goal';
      await user.click(await screen.findByTestId('ideas-bar'));
      await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: ideaOf(id).title }));
      await screen.findByRole('dialog', { name: 'Idea' });
      await waitFor(() => expect(within(ideaSheet()).queryByTestId('idea-loading')).toBeNull());
    });
    And('he taps the speaker {string} beside its example', async (_, label: string) => {
      await user.click(await within(ideaSheet()).findByRole('button', { name: label }));
    });
    Then('the phone is told to speak {string} with lang {string} in its Greek voice', (_, text: string, lang: string) => toldGreek(text, lang));
    And("what it is told for {string} is neither the letter's name nor an English respelling", (_, word: string) => neitherNameNorRespelling(word));
  });

  ScenarioOutline('Holding a one-letter word in the reader hands it to the Greek voice as its sound', ({ Given, And, When, Then }, row) => {
    Given('Lampas is opened on a phone with a Greek voice', () => open());
    And('he opens "<chapter>" in Greek', async () => {
      const [book, chapter] = String(row.chapter).split('.');
      act(() => {
        window.location.hash = `#/?b=${book}&c=${chapter}&view=greek`;
      });
      await screen.findByRole('heading', { name: titleOf(book, Number(chapter)), level: 1 });
      await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
      await waitFor(() => expect(within(verseEl(Number(row.verse))).getAllByRole('button').length).toBeGreaterThan(1));
    });
    When('he long presses the word "<word>" in verse <verse>', async () => {
      await press(within(verseEl(Number(row.verse))).getByRole('button', { name: String(row.word) }), HOLD_MS);
    });
    Then('the phone is told to speak "<said>" with lang "el-GR" in its Greek voice', () => {
      expect(synth.spoken).toHaveLength(1);
      toldGreek(String(row.said), 'el-GR');
    });
    And(`what it is told for "<word>" is neither the letter's name nor an English respelling`, () => neitherNameNorRespelling(String(row.word)));
  });

  Scenario('A letter drill still names the letter', ({ Given, When, Then }) => {
    Given('a letter drill asks him to hear the letter omicron and tap it', () => {
      cleanup();
      stopSpeaking();
      vi.unstubAllGlobals();
      synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
      const question = quickQuestion({ id: 'letter-omicron', mode: 'hear' }, mulberry32(1));
      expect(question.kind).toBe('sound');
      render(<GrammarCard question={question} mode="choice" picked={null} onPick={() => {}} />);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name }));
    });
    Then('the phone is told to speak the letter itself, {string}, with lang {string} in its Greek voice', (_, letter: string, lang: string) => {
      expect(synth.spoken).toHaveLength(1);
      toldGreek(letter, lang);
    });
  });
});
