// features/steps/hebrew-speech.steps.tsx — runs features/hebrew-speech.feature: a Hebrew word in the tutor's answer is a button that speaks in the
// phone's he-IL voice and opens the pronunciation guide. speech synthesis is the recording fake (tests/support/fake-speech.ts), the Postern the fake of
// tests/support/fake-postern.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { stopReading } from '../../src/speech/readAloud';
import { LONG_PRESS_MS } from '../../src/ui/longPress';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE, type FakeSynth, type FakeVoice, stubSpeech } from '../../tests/support/fake-speech';
import { openTutor } from './open-tutor';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;
let synth: FakeSynth;
/** how many utterances had been asked of the phone when the word was tapped (the answer itself is read aloud on arrival) */
let spokenBefore = 0;

const ANSWER = { answer: "Paul's word for righteousness echoes the Hebrew צֶדֶק (tsedeq), which is about being in the right before God.", words: [] };
const SOUND_ANSWER = {
  answer: 'Say it TSE-dek, with the stress on the first syllable.',
  words: [],
  syllables: ['צֶ', 'דֶק'],
  transliteration: ['TSE', 'dek'],
};

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });

/** A second Hebrew voice of the phone, which Settings > Listening > Hebrew voice can choose (voice-kit's picker offers the voices of the language by their voiceURI). */
const CARMIT: FakeVoice = { lang: 'he-IL', name: 'Carmit', voiceURI: 'carmit' };

async function open(voices: FakeVoice[], saved: Record<string, string> = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  synth = stubSpeech(voices);
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  await db.settings.bulkPut(Object.entries(saved).map(([key, value]) => ({ key, value })));
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await openTutor();
  await screen.findByRole('dialog', { name: /^Talk about / });
  await user.type(within(sheet()).getByRole('textbox', { name: 'Your message' }), 'Where does righteousness come from?');
  await user.click(within(sheet()).getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(sheet().querySelector('[data-turn] [lang="he"]')).not.toBeNull());
}

/** Opens Genesis 1 in its Hebrew (the Hebrew dial All in, the saved view Hebrew) on a phone with these voices and these settings saved, for a long press in the Reader. */
async function openReader(voices: FakeVoice[], saved: Record<string, string>): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetTrail();
  vi.unstubAllGlobals();
  synth = stubSpeech(voices);
  window.localStorage.clear();
  stubChapterFetch();
  window.history.replaceState(null, '', '/#/?b=gen&c=1');
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  await db.settings.bulkPut(Object.entries({ hebrewInterest: '5', readerView: 'greek', ...saved }).map(([key, value]) => ({ key, value })));
  render(<App />);
  await screen.findByRole('heading', { name: 'Genesis 1', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse] [data-word]').length).toBeGreaterThan(0));
}

async function longPress(target: HTMLElement): Promise<void> {
  await user.pointer({ keys: '[MouseLeft>]', target });
  await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 150));
  await user.pointer({ keys: '[/MouseLeft]', target });
}

const hebrewWord = (word: string): HTMLElement => {
  const span = Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn] [lang="he"]')).find((s) => s.textContent === word);
  const button = span?.closest('button');
  if (!button) throw new Error(`no Hebrew word button ${word}`);
  return button;
};
const guide = () => screen.getByRole('dialog', { name: 'How to say it' });
const spokenNow = () => synth.since.map((u) => ({ text: u.text, lang: u.lang }));

const feature = await loadFeature('features/hebrew-speech.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Tapping a Hebrew word says it in the Hebrew voice and opens the guide', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with a Hebrew voice, and the tutor\'s answer has the Hebrew word {string} in it', () => open([GREEK_VOICE, ENGLISH_VOICE, HEBREW_VOICE]));
    When('he taps the Hebrew word {string}', async (_, word: string) => {
      await user.click(hebrewWord(word));
    });
    Then('the phone is told to speak {string} in {string}', (_, text: string, lang: string) => {
      expect(spokenNow()).toEqual([{ text, lang }]);
    });
    And('the phone speaks it with its Hebrew voice', () => {
      expect(synth.spoken.at(-1)?.voice).toEqual(HEBREW_VOICE);
    });
    And('the pronunciation guide is open on {string}', (_, word: string) => {
      expect(within(guide()).getByText(word)).toBeInTheDocument();
      expect(within(guide()).getByRole('button', { name: 'Hear it' })).toBeInTheDocument();
    });
  });

  Scenario('With no Hebrew voice nothing is spoken and the phone says so', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with no Hebrew voice, and the tutor\'s answer has the Hebrew word {string} in it', () => open([GREEK_VOICE, ENGLISH_VOICE]));
    When('he taps the Hebrew word {string}', async (_, word: string) => {
      spokenBefore = synth.spoken.length;
      await user.click(hebrewWord(word));
    });
    Then('the line {string} is shown', async (_, line: string) => {
      expect(await screen.findByText(line)).toBeInTheDocument();
    });
    And('nothing is spoken', () => {
      expect(synth.spoken).toHaveLength(spokenBefore);
    });
  });

  Scenario('The guide shows the syllables and their transliteration', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with a Hebrew voice, and the tutor\'s answer has the Hebrew word {string} in it', () => open([GREEK_VOICE, ENGLISH_VOICE, HEBREW_VOICE]));
    When('he taps the Hebrew word {string}', async (_, word: string) => {
      await user.click(hebrewWord(word));
    });
    And('he asks the guide for the syllables and sounds', async () => {
      fake.autoReply = { status: 'answered', answer: SOUND_ANSWER };
      await user.click(within(guide()).getByRole('button', { name: 'Syllables and sounds' }));
    });
    Then('the mill received a sound question about {string} in Hebrew', async (_, word: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(2));
      expect(fake.received[1].input.focus).toMatchObject({ form: word, kind: 'sound', language: 'he' });
    });
    And('the answer carries a guide with the syllables {string} and {string} over {string} and {string}', async (_, a: string, b: string, soundA: string, soundB: string) => {
      const card = await waitFor(() => {
        const found = sheet().querySelector<HTMLElement>('[data-hebrew-guide]');
        if (!found) throw new Error('no guide yet');
        return found;
      });
      const cells = Array.from(card.querySelectorAll<HTMLElement>('[data-syllable]'));
      expect(cells.map((c) => c.querySelector('[lang="he"]')?.textContent)).toEqual([a, b]);
      expect(cells.map((c) => c.querySelector('[data-sound]')?.textContent)).toEqual([soundA, soundB]);
    });
    And('tapping the syllable {string} speaks it in {string}', async (_, syllable: string, lang: string) => {
      const card = sheet().querySelector<HTMLElement>('[data-hebrew-guide]') as HTMLElement;
      await user.click(within(card).getByRole('button', { name: `Hear ${syllable}` }));
      expect(synth.spoken.at(-1)).toMatchObject({ text: syllable, lang });
    });
  });

  /** The utterance asked of the phone last: said at his Hebrew speed, in his Hebrew voice */
  const spokeAs = (_: unknown, text: string, lang: string, speed: string, voice: string): void => {
    const last = synth.spoken.at(-1);
    expect(last).toMatchObject({ text, lang, rate: Number(speed) });
    expect(last?.voice?.name).toBe(voice);
  };

  Scenario("A Hebrew word in the tutor's answer is said at the Hebrew speed in the Hebrew voice he chose", ({ Given, When, Then }) => {
    Given(
      'Lampas is opened on a phone with two Hebrew voices, {string} chosen as the Hebrew voice and {string} as the Hebrew speed, and the tutor\'s answer has the Hebrew word {string} in it',
      (_, voice: string, speed: string) => open([GREEK_VOICE, ENGLISH_VOICE, HEBREW_VOICE, CARMIT], { 'voice.hebrew': CARMIT.voiceURI ?? voice, 'rate.hebrew': speed }),
    );
    When('he taps the Hebrew word {string}', async (_, word: string) => {
      await user.click(hebrewWord(word));
    });
    Then('the phone speaks {string} in {string} at the speed {string} with the voice {string}', spokeAs);
  });

  Scenario('A long press on a Hebrew word in the Reader is said at the Hebrew speed in the Hebrew voice he chose', ({ Given, When, Then }) => {
    Given('Genesis 1 is opened in its Hebrew on a phone with two Hebrew voices, {string} chosen as the Hebrew voice and {string} as the Hebrew speed', (_, voice: string, speed: string) =>
      openReader([GREEK_VOICE, ENGLISH_VOICE, HEBREW_VOICE, CARMIT], { 'voice.hebrew': CARMIT.voiceURI ?? voice, 'rate.hebrew': speed }),
    );
    When('he long presses the Hebrew word {string} of verse {int}', async (_, word: string, n: number) => {
      const verse = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
      const target = [...(verse?.querySelectorAll<HTMLElement>('[data-word]') ?? [])].find((el) => (el.textContent ?? '').replace(/\s+/g, ' ').trim() === word);
      if (!target) throw new Error(`no Hebrew word ${word} in verse ${n}`);
      await longPress(target);
    });
    Then('the phone speaks {string} in {string} at the speed {string} with the voice {string}', spokeAs);
  });
});
