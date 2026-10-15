// features/steps/one-letter-greek-voice.steps.tsx — runs features/one-letter-greek-voice.feature: a Greek word of one letter (Ὃ, ὁ, ἡ, ὦ) is said
// by a bundled clip of its sound, from a lesson's speaker, a hold in the reader, the word sheet, Tap to hear and a reading; the phone's voice is never
// handed it, and a letter drill still names its letter (mw-5r3p30.347; mw-5r3p30.262 handed the voice 'ό', and his phone said 'Omicron'). Speech is the
// honest fake of tests/support/fake-speech.ts, made honest here about one more thing his phone does: a Greek voice handed ONE letter says its name
// (heardOf). The audio element is tests/support/fake-audio.ts; the presses are user-event pointer input held for real time.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { GrammarCard } from '../../src/GrammarCard';
import { TapToHear } from '../../src/TapToHear';
import { titleOf } from '../../src/data/books';
import { db } from '../../src/data/db';
import { ideaOf } from '../../src/data/grammar/ladder';
import { quickQuestion } from '../../src/data/grammar/quickRound';
import { mulberry32 } from '../../src/data/quiz';
import { clearBus } from '../../src/events/bus';
import { stopSpeaking } from '../../src/speech/greek';
import { getReading, startReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubAudio, type FakeAudio } from '../../tests/support/fake-audio';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';
import { seedHisWords } from '../../tests/support/his-words';

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** past the app's 500 ms hold */
const HOLD_MS = 650;

/** What a Greek voice says for a letter handed to it alone: its name (his phone said 'Omicron' for 'ό'; espeak-ng's el says 'omikron tonos'). */
const LETTER_NAMES: Readonly<Record<string, string>> = {
  α: 'alpha', β: 'beta', γ: 'gamma', δ: 'delta', ε: 'epsilon', ζ: 'zeta', η: 'eta', θ: 'theta', ι: 'iota', κ: 'kappa', λ: 'lambda', μ: 'mu',
  ν: 'nu', ξ: 'xi', ο: 'omicron', π: 'pi', ρ: 'rho', σ: 'sigma', ς: 'sigma', τ: 'tau', υ: 'upsilon', φ: 'phi', χ: 'chi', ψ: 'psi', ω: 'omega',
};

const bareLetters = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}]/gu, '').toLowerCase();

/** One Greek letter, whatever marks it carries. */
const isOneGreekLetter = (text: string): boolean => [...bareLetters(text)].length === 1 && /\p{Script=Greek}/u.test(bareLetters(text));

let synth: FakeSynth;
let audio: FakeAudio;
/** the clips played, each with how many utterances the voice had been handed before it */
let clips: { at: number; path: string }[] = [];

/** What he hears, in order: each utterance as the phone's voice says it (a lone Greek letter by its name) and each clip by its sound (its file's name). */
function heardOf(): string[] {
  const said = synth.spoken.map((u) => (isOneGreekLetter(u.text) ? LETTER_NAMES[bareLetters(u.text)] : u.text));
  const out: string[] = [];
  said.forEach((text, i) => {
    clips.filter((c) => c.at === i).forEach((c) => out.push(c.path.replace(/^.*\/|\.mp3$/g, '')));
    out.push(text);
  });
  clips.filter((c) => c.at >= said.length).forEach((c) => out.push(c.path.replace(/^.*\/|\.mp3$/g, '')));
  return out;
}

afterAll(() => {
  stopSpeaking();
  stopReading();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  db.close();
});

/** Speech with both voices and an audio element, nothing heard yet. */
function fresh(): void {
  cleanup();
  stopSpeaking();
  stopReading();
  clearBus();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  audio = stubAudio();
  clips = [];
  audio.onPlay = (path) => clips.push({ at: synth.spoken.length, path });
}

/** Opens the app on Romans 8 with both voices, every store emptied, and `goal` saved as the goal when there is one. */
async function open(goal?: string): Promise<void> {
  fresh();
  stubChapterFetch();
  window.localStorage.clear();
  window.location.hash = '';
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.grammarLevels.clear(), db.reviews.clear()]);
  if (goal !== undefined) await db.settings.put({ key: 'goal', value: goal });
  await seedHisWords();
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

async function openChapterInGreek(chapter: string, verse: number): Promise<void> {
  const [book, n] = chapter.split('.');
  act(() => {
    window.location.hash = `#/?b=${book}&c=${n}&view=greek`;
  });
  await screen.findByRole('heading', { name: titleOf(book, Number(n)), level: 1 });
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
  await waitFor(() => expect(within(verseEl(verse)).getAllByRole('button').length).toBeGreaterThan(1));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-reader] [data-verse="${n}"]`) ?? document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
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

/** He heard `sound` alone, and never `name`. */
function hears(sound: string, name: string): void {
  expect(heardOf()).not.toContain(name);
  expect(heardOf()).toEqual([sound]);
}

/** The clip at `path` played, once, and the voice was handed nothing at all. */
function clipAndNoVoice(path: string): void {
  expect(audio.played).toEqual([path]);
  expect(synth.spoken).toEqual([]);
}

const feature = await loadFeature('features/one-letter-greek-voice.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
  Scenario('The speaker beside Ὃ on The Greek alphabet says o, not omicron', ({ Given, When, And, Then }) => {
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
    Then('he hears {string}, not {string}', (_, sound: string, name: string) => hears(sound, name));
    And("the clip {string} is played and the phone's voice is handed nothing", (_, path: string) => clipAndNoVoice(path));
  });

  ScenarioOutline('Holding a one-letter word in the reader plays its sound', ({ Given, And, When, Then }, row) => {
    Given('Lampas is opened on a phone with a Greek voice', () => open());
    And('he opens "<chapter>" in Greek', () => openChapterInGreek(String(row.chapter), Number(row.verse)));
    When('he long presses the word "<word>" in verse <verse>', async () => {
      await press(within(verseEl(Number(row.verse))).getByRole('button', { name: String(row.word) }), HOLD_MS);
    });
    Then('he hears "<sound>", not "<name>"', () => hears(String(row.sound), String(row.name)));
    And(`the clip "<clip>" is played and the phone's voice is handed nothing`, () => clipAndNoVoice(String(row.clip)));
  });

  Scenario("The word sheet's speaker on a one-letter word plays its sound", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => open());
    And('he opens {string} in Greek', (_, chapter: string) => openChapterInGreek(chapter, 1));
    When('he taps the word {string} in verse {number} and the word sheet opens', async (_, word: string, verse: number) => {
      await user.click(within(verseEl(verse)).getByRole('button', { name: word }));
      await screen.findByRole('dialog', { name: 'Word' });
    });
    And('he taps {string} on the word sheet', async (_, label: string) => {
      await user.click(await within(screen.getByRole('dialog', { name: 'Word' })).findByRole('button', { name: label }));
    });
    Then('he hears {string}, not {string}', (_, sound: string, name: string) => hears(sound, name));
    And("the clip {string} is played and the phone's voice is handed nothing", (_, path: string) => clipAndNoVoice(path));
  });

  Scenario('Tap to hear on a one-letter word plays its sound', ({ Given, When, Then, And }) => {
    Given('a Tap to hear bar for the word {string}', (_, word: string) => {
      fresh();
      render(<TapToHear text={word} />);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name }));
    });
    Then('he hears {string}, not {string}', (_, sound: string, name: string) => hears(sound, name));
    And("the clip {string} is played and the phone's voice is handed nothing", (_, path: string) => clipAndNoVoice(path));
  });

  Scenario('Listening to a verse plays the clip for a one-letter word and the voice reads the rest', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => fresh());
    When('a reading of {string} and then {string} starts', (_, greek: string, english: string) => {
      act(() =>
        startReading({
          chapter: 1,
          plan: [{ n: 1, runs: [{ text: greek, language: 'greek' }, { text: english, language: 'english' }] }],
          from: 1,
          continuous: false,
        }),
      );
    });
    Then('he hears {string}, then {string}', async (_, sound: string, rest: string) => {
      // the clip plays, ends by itself, and the voice goes on with the rest of the verse to its end
      await waitFor(() => expect(audio.playing()).not.toBeNull());
      act(() => audio.end());
      await waitFor(() => expect(synth.spoken.length).toBeGreaterThan(0));
      act(() => synth.finishAll());
      await waitFor(() => expect(getReading().status).toBe('idle'));
      expect(heardOf()).toEqual([sound, rest]);
    });
    And('no utterance handed to the phone\'s voice is one Greek letter', () => {
      expect(synth.spoken.filter((u) => isOneGreekLetter(u.text))).toEqual([]);
    });
  });

  Scenario('A letter drill still names the letter', ({ Given, When, Then }) => {
    Given('a letter drill asks him to hear the letter omicron and tap it', () => {
      fresh();
      const question = quickQuestion({ id: 'letter-omicron', mode: 'hear' }, mulberry32(1));
      expect(question.kind).toBe('sound');
      render(<GrammarCard question={question} mode="choice" picked={null} onPick={() => {}} />);
    });
    When('he taps {string}', async (_, name: string) => {
      await user.click(screen.getByRole('button', { name }));
    });
    Then('the phone is told to speak the letter itself, {string}, with lang {string} in its Greek voice', (_, letter: string, lang: string) => {
      expect(synth.spoken).toHaveLength(1);
      expect(audio.played).toEqual([]);
      toldGreek(letter, lang);
    });
  });
});
