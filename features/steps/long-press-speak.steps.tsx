// features/steps/long-press-speak.steps.tsx — runs features/long-press-speak.feature: a long press on a word of the
// reader speaks that word alone in its own language, a short tap still opens the sheet. speechSynthesis is a fake engine
// (as in greek-audio.steps.tsx); the press is user-event pointer input held for real time (the half second is the app's).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { type Chapter, type Verse, wordLemma } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus, latest } from '../../src/events/bus';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse1: Verse = chapter.verses[0];

class FakeUtterance {
  lang = '';
  rate = 1;
  voice: FakeVoice | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}
interface FakeVoice {
  lang: string;
  name: string;
}

class FakeSynth {
  spoken: FakeUtterance[] = [];
  speaking = false;
  pending = false;
  constructor(public voices: FakeVoice[]) {}
  getVoices = () => this.voices;
  addEventListener = () => {};
  removeEventListener = () => {};
  resume = () => {};
  speak = (u: FakeUtterance) => {
    this.spoken.push(u);
    this.speaking = true;
  };
  cancel = () => {
    this.speaking = false;
  };
}

const GREEK_VOICE: FakeVoice = { lang: 'el-GR', name: 'Greek (Greece)' };
const ENGLISH_VOICE: FakeVoice = { lang: 'en-US', name: 'English (US)' };

let synth: FakeSynth;
let vibrations: unknown[] = [];

async function openWith(voices: FakeVoice[]): Promise<void> {
  cleanup();
  vi.unstubAllGlobals();
  clearBus();
  stubChapterFetch();
  synth = new FakeSynth(voices);
  vibrations = [];
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  Object.defineProperty(navigator, 'vibrate', {
    configurable: true,
    value: (pattern: unknown) => (vibrations.push(pattern), true),
  });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = '';
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBe(63));
}

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'vibrate');
  db.close();
});

const user = userEvent.setup();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
/** past the app's 500 ms hold */
const HOLD_MS = 650;

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const wordEl = (text: string, n: number): HTMLElement => within(verseEl(n)).getByRole('button', { name: text });
const nfc = (s: string): string => s.normalize('NFC');

async function switchToGreek(): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Greek' }));
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
}

async function setWeaveSolid(): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await user.click(within(await screen.findByRole('group', { name: 'Weave' })).getByRole('button', { name: 'Solid' }));
  await user.click(screen.getByRole('button', { name: '‹ Reader' }));
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(verseEl(1).querySelectorAll('[data-woven]').length).toBeGreaterThan(0));
}

/** Finger down on `el`, held `ms`, optionally dragged `drag` px at the start, then lifted. */
async function press(el: HTMLElement, ms: number, drag = 0): Promise<void> {
  await user.pointer({ keys: '[MouseLeft>]', target: el, coords: { clientX: 100, clientY: 100 } });
  if (drag) await user.pointer({ target: el, coords: { clientX: 100 + drag, clientY: 100 } });
  await sleep(ms);
  await user.pointer({ keys: '[/MouseLeft]', target: el, coords: { clientX: 100 + drag, clientY: 100 } });
}

const lastSpoken = (): FakeUtterance | undefined => synth.spoken[synth.spoken.length - 1];
const spokenWordLang = (): string => lastSpoken()?.lang ?? '';

const feature = await loadFeature('features/long-press-speak.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A long press on a Greek word speaks that word with lang el-GR and does not open the sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH_VOICE, GREEK_VOICE]));
    And('he switches the reader to Greek', switchToGreek);
    When('he long presses the word {string} in verse {int}', (_, text: string, n: number) => press(wordEl(text, n), HOLD_MS));
    Then('the phone is told to speak {string} with lang {string}', (_, text: string, lang: string) => {
      expect(synth.spoken).toHaveLength(1);
      expect(lastSpoken()?.text).toBe(text);
      expect(spokenWordLang()).toBe(lang);
    });
    And('the phone speaks it with its Greek voice', () => expect(lastSpoken()?.voice).toBe(GREEK_VOICE));
    And('no word sheet is open', () => expect(screen.queryByRole('dialog')).toBeNull());
  });

  Scenario('A long press on an English word speaks it with lang en', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([GREEK_VOICE, ENGLISH_VOICE]));
    When('he long presses the word {string} in verse {int}', (_, text: string, n: number) => press(wordEl(text, n), HOLD_MS));
    Then('the phone is told to speak {string} with lang en', (_, text: string) => {
      expect(synth.spoken).toHaveLength(1);
      expect(lastSpoken()?.text).toBe(text);
      // a full tag, en-US: its language is en
      expect(spokenWordLang().split('-')[0]).toBe('en');
      expect(lastSpoken()?.voice).toBe(ENGLISH_VOICE);
    });
    And('no word sheet is open', () => expect(screen.queryByRole('dialog')).toBeNull());
  });

  Scenario('A long press on a woven Greek word in the English view speaks it in Greek', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH_VOICE, GREEK_VOICE]));
    And('he sets Weave to Solid words', setWeaveSolid);
    When('he long presses the woven word for the lemma {string} in verse {int}', async (_, lemma: string, n: number) => {
      const word = verse1.g.find((w) => nfc(wordLemma(w)) === nfc(lemma));
      const chunk = verse1.e.findIndex((c) => word !== undefined && c.g.some((i) => verse1.g[i] === word));
      const el = verseEl(n).querySelector<HTMLElement>(`[data-chunk="${chunk}"]`);
      if (!el) throw new Error(`no chunk for ${lemma}`);
      expect(el).toHaveAttribute('data-woven');
      await press(el, HOLD_MS);
    });
    Then('the phone is told to speak the Greek of the lemma {string} in verse {int} with lang {string}', (_, lemma: string, __: number, lang: string) => {
      const word = verse1.g.find((w) => nfc(wordLemma(w)) === nfc(lemma));
      expect(synth.spoken).toHaveLength(1);
      expect(lastSpoken()?.text).toBe(word?.t);
      expect(spokenWordLang()).toBe(lang);
      expect(lastSpoken()?.voice).toBe(GREEK_VOICE);
    });
    And('no word sheet is open', () => expect(screen.queryByRole('dialog')).toBeNull());
  });

  Scenario('A short tap still opens the word sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH_VOICE, GREEK_VOICE]));
    And('he switches the reader to Greek', switchToGreek);
    When('he taps the word {string} in verse {int}', async (_, text: string, n: number) => {
      await user.click(wordEl(text, n));
    });
    Then('the word sheet is open', () => expect(screen.getByRole('dialog')).toBeInTheDocument());
    And('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
  });

  Scenario('A press that moves more than 10 px speaks nothing', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH_VOICE, GREEK_VOICE]));
    And('he switches the reader to Greek', switchToGreek);
    When('he presses the word {string} in verse {int} and drags {int} px before the half second is up', (_, text: string, n: number, px: number) =>
      press(wordEl(text, n), HOLD_MS, px),
    );
    Then('nothing is spoken', () => expect(synth.spoken).toHaveLength(0));
    And('no word sheet is open', () => expect(screen.queryByRole('dialog')).toBeNull());
  });

  Scenario('A long press gives a light buzz and tells the bus which word was spoken', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH_VOICE, GREEK_VOICE]));
    And('he switches the reader to Greek', switchToGreek);
    When('he long presses the word {string} in verse {int}', (_, text: string, n: number) => press(wordEl(text, n), HOLD_MS));
    Then('the phone gives one light buzz of {int} ms', (_, ms: number) => expect(vibrations).toEqual([ms]));
    And('the bus has heard word-spoken for {string} in {string} in verse {int}', (_, text: string, language: string, n: number) => {
      expect(latest('word-spoken')).toEqual({ kind: 'word-spoken', text, language, verse: n });
    });
  });

  Scenario('The word on the screen is not selectable and has no callout menu', ({ Given, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH_VOICE, GREEK_VOICE]));
    Then("every word of verse {int} is set not to select text and not to raise the phone's callout menu", (_, n: number) => {
      const words = verseEl(n).querySelectorAll<HTMLElement>('[role="button"][data-chunk], [role="button"][data-word]');
      expect(words.length).toBeGreaterThan(3);
      for (const w of words) {
        expect(w.className).toContain('select-none');
        expect(w.className).toContain('[-webkit-touch-callout:none]');
      }
    });
  });
});
