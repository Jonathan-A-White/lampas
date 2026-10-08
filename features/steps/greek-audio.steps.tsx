// features/steps/greek-audio.steps.tsx — runs features/greek-audio.feature: the speaker on each word, the play
// button on each verse, the one-line help when the phone has no Greek voice. speechSynthesis is a fake engine.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verseGreek = (n: number): string => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v.g.map((w) => w.t).join(' ');
};

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36';

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

/** What the phone's engine was asked, in order: 'speak <text>' and 'cancel'. */
class FakeSynth {
  calls: string[] = [];
  spoken: FakeUtterance[] = [];
  speaking = false;
  pending = false;
  constructor(public voices: FakeVoice[]) {}
  getVoices = () => this.voices;
  addEventListener = () => {};
  removeEventListener = () => {};
  resume = () => {};
  speak = (u: FakeUtterance) => {
    this.calls.push(`speak ${u.text}`);
    this.spoken.push(u);
    this.speaking = true;
  };
  cancel = () => {
    this.calls.push('cancel');
    this.speaking = false;
  };
}

const GREEK_VOICE: FakeVoice = { lang: 'el-GR', name: 'Greek (Greece)' };
const ENGLISH_VOICE: FakeVoice = { lang: 'en-US', name: 'English (US)' };

let synth: FakeSynth;

async function openWith(voices: FakeVoice[], userAgent?: string): Promise<void> {
  cleanup();
  vi.unstubAllGlobals();
  stubChapterFetch();
  synth = new FakeSynth(voices);
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  if (userAgent) vi.stubGlobal('navigator', { ...navigator, userAgent });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = '';
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const playButton = (n: number) => within(verseEl(n)).getByRole('button', { name: 'Hear the verse' });
const tapPlay = async (n: number) => user.click(playButton(n));

async function openWords(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Words' }));
  await screen.findByRole('heading', { name: 'Words' });
  await waitFor(() => expect(document.querySelectorAll('[data-lemma]').length).toBeGreaterThan(0));
}

async function tapWordSpeaker(lemma: string): Promise<void> {
  const row = document.querySelector<HTMLElement>(`[data-lemma="${lemma}"]`);
  if (!row?.parentElement) throw new Error(`no row for ${lemma}`);
  await user.click(within(row.parentElement).getByRole('button', { name: 'Hear it' }));
}

const expectSpoken = (text: string, lang: string) => {
  const last = synth.spoken[synth.spoken.length - 1];
  expect(last?.text).toBe(text);
  expect(last?.lang).toBe(lang);
};
const helpLine = () => screen.getByRole('status');
const expectNothingSpoken = () => expect(synth.spoken).toHaveLength(0);

const feature = await loadFeature('features/greek-audio.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario("A word's speaker on the Words screen speaks the lemma in Greek", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([ENGLISH_VOICE, GREEK_VOICE]));
    When('he opens Words', openWords);
    And('he taps the speaker of the word {string}', (_, lemma: string) => tapWordSpeaker(lemma));
    Then('the phone is told to speak {string} in {string}', (_, text: string, lang: string) => expectSpoken(text, lang));
    And('the phone speaks it with its Greek voice', () => {
      expect(synth.spoken[synth.spoken.length - 1].voice).toBe(GREEK_VOICE);
    });
  });

  Scenario("The speaker on a tapped word's sheet speaks the word as it stands in the text", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([GREEK_VOICE]));
    When('he switches the reader to Greek', async () => {
      await user.click(screen.getByRole('button', { name: 'Greek' }));
      await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
    });
    And('he taps the word {string} in verse {int}', async (_, text: string, n: number) => {
      await user.click(within(verseEl(n)).getByRole('button', { name: text }));
    });
    And('he taps the speaker on the word sheet', async () => {
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Hear it' }));
    });
    Then('the phone is told to speak {string} in {string}', (_, text: string, lang: string) => expectSpoken(text, lang));
  });

  Scenario("A verse's play button speaks the verse's Greek", ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([GREEK_VOICE]));
    When('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    Then('the phone is told to speak the Greek of verse {int} in {string}', (_, n: number, lang: string) =>
      expectSpoken(verseGreek(n), lang),
    );
    And('the play button of verse {int} shows it is playing', (_, n: number) => {
      expect(playButton(n)).toHaveAttribute('aria-pressed', 'true');
    });
  });

  Scenario('A second tap on the same verse stops it', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([GREEK_VOICE]));
    And('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    When('he taps the play button of verse {int} again', (_, n: number) => tapPlay(n));
    Then('the phone is told to stop', () => {
      expect(synth.calls[synth.calls.length - 1]).toBe('cancel');
    });
    And('nothing more is spoken', () => {
      expect(synth.spoken).toHaveLength(1);
    });
    And('the play button of verse {int} shows it is not playing', (_, n: number) => {
      expect(playButton(n)).toHaveAttribute('aria-pressed', 'false');
    });
  });

  Scenario('Tapping another verse stops the first and speaks the second', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone with a Greek voice', () => openWith([GREEK_VOICE]));
    And('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    When('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    Then('the phone is told to stop before it speaks the Greek of verse {int}', (_, n: number) => {
      expect(synth.calls.slice(-2)).toEqual(['cancel', `speak ${verseGreek(n)}`]);
    });
    And('the play button of verse {int} shows it is not playing', (_, n: number) => {
      expect(playButton(n)).toHaveAttribute('aria-pressed', 'false');
    });
  });

  Scenario('Without a Greek voice a tap shows one line of help and nothing is spoken', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on an Android phone with no Greek voice', () => openWith([ENGLISH_VOICE], ANDROID));
    When('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    Then('the help line reads {string}', (_, line: string) => expect(helpLine()).toHaveTextContent(line));
    And('nothing is spoken', expectNothingSpoken);
    And('the play button of verse {int} still shows', (_, n: number) => {
      expect(playButton(n)).toBeVisible();
    });
  });

  Scenario("Without a Greek voice a word's speaker shows the help too", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on an Android phone with no Greek voice', () => openWith([ENGLISH_VOICE], ANDROID));
    When('he opens Words', openWords);
    And('he taps the speaker of the word {string}', (_, lemma: string) => tapWordSpeaker(lemma));
    Then('the help line reads {string}', (_, line: string) => expect(helpLine()).toHaveTextContent(line));
    And('nothing is spoken', expectNothingSpoken);
  });

  Scenario('A browser that is not Android gets the generic line', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a computer with no Greek voice', () => openWith([ENGLISH_VOICE]));
    When('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    Then('the help line reads {string}', (_, line: string) => expect(helpLine()).toHaveTextContent(line));
    And('nothing is spoken', expectNothingSpoken);
  });

  Scenario('A phone that lists no voices yet is still asked to speak', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on a phone that has not listed its voices', () => openWith([]));
    When('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    Then('the phone is told to speak the Greek of verse {int} in {string}', (_, n: number, lang: string) =>
      expectSpoken(verseGreek(n), lang),
    );
    And('no help line shows', () => {
      expect(screen.queryByRole('status')).toBeNull();
    });
  });
});
