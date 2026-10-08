// features/steps/read-aloud.steps.tsx — runs features/read-aloud.feature: the play button on a verse, Read from the top,
// the reading bar, the highlight, Pause and Stop, the wake lock. speechSynthesis is a fake engine that records.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus, subscribe } from '../../src/events/bus';
import { getReading, stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, type FakeVoice, stubSpeech } from '../../tests/support/fake-speech';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const verseData = (n: number) => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};
const englishOf = (n: number) => squash(verseData(n).e.map((c) => c.t).join(' '));
const greekOf = (n: number) => squash(verseData(n).g.map((w) => w.t).join(' '));

let synth: FakeSynth;
let read: number[] = [];
let wakeLock: { request: ReturnType<typeof vi.fn>; released: number };

async function openWith(voices: FakeVoice[]): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  stubChapterFetch();
  synth = stubSpeech(voices);
  read = [];
  wakeLock = { request: vi.fn(), released: 0 };
  wakeLock.request.mockImplementation(async () => ({
    addEventListener: () => {},
    release: async () => {
      wakeLock.released++;
    },
  }));
  Object.defineProperty(navigator, 'wakeLock', { value: wakeLock, configurable: true });
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = '';
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  // after the app's own subscriptions, so only readings are counted
  subscribe('verse-reading', (e) => read.push(e.verse));
}

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  delete (navigator as unknown as { wakeLock?: unknown }).wakeLock;
  db.close();
});

const user = userEvent.setup();

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const tapPlay = (n: number) => user.click(within(verseEl(n)).getByRole('button', { name: 'Hear the verse' }));
const bar = () => document.querySelector<HTMLElement>('[data-reading-bar]');
const lastSpoken = () => synth.spoken[synth.spoken.length - 1];

async function switchToGreek(): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Greek' }));
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
}

async function setWeaveSolid(): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Settings' }));
  await screen.findByRole('heading', { name: 'Settings', level: 1 });
  await user.click(within(await screen.findByRole('group', { name: 'Weave' })).getByRole('button', { name: 'Solid words' }));
  await user.click(screen.getByRole('button', { name: '‹ Reader' }));
  await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-weave')).toBe('solid'));
  await waitFor(() => expect(verseEl(1).querySelectorAll('[data-woven]').length).toBeGreaterThan(0));
}

const expectBar = (text: string) => expect(bar()).toHaveTextContent(text);
const reading = (n: number) => verseEl(n).hasAttribute('data-reading');

const feature = await loadFeature('features/read-aloud.feature');

describeFeature(feature, ({ Scenario }) => {
  const bothVoices = () => openWith([ENGLISH_VOICE, GREEK_VOICE]);
  const englishOnly = () => openWith([ENGLISH_VOICE]);
  const phoneBoth = 'Lampas is opened on a phone with an English and a Greek voice';
  const speaksEnglish = (_: unknown, n: number, lang: string) => {
    expect(lastSpoken().text).toBe(englishOf(n));
    expect(lastSpoken().lang).toBe(lang);
  };

  Scenario('A verse in the English view is read in English', ({ Given, When, Then }) => {
    Given(phoneBoth, bothVoices);
    When('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    Then('the phone speaks the English of verse {int} in {string}', speaksEnglish);
  });

  Scenario('A verse in the Greek view is read in Greek', ({ Given, And, When, Then }) => {
    Given(phoneBoth, bothVoices);
    And('he switches the reader to Greek', switchToGreek);
    When('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    Then('the phone speaks the Greek of verse {int} in {string}', (_, n: number, lang: string) => {
      expect(lastSpoken().text).toBe(greekOf(n));
      expect(lastSpoken().lang).toBe(lang);
    });
    And('the phone speaks it with its Greek voice', () => expect(lastSpoken().voice).toBe(GREEK_VOICE));
  });

  Scenario('A woven verse changes voice with the language', ({ Given, And, When, Then }) => {
    Given(phoneBoth, bothVoices);
    And('he sets Weave to Solid words', setWeaveSolid);
    When('he taps the play button of verse {int}', async (_, n: number) => {
      await tapPlay(n);
      synth.finishAll();
    });
    Then(
      'the phone speaks verse {int} in {string}, {string}, {string}, {string} and {string}, the voice changing only where the language does',
      (_, __: number, ...langs: string[]) => {
        expect(synth.spoken.map((u) => u.lang)).toEqual(langs);
        for (const u of synth.spoken) expect(u.voice).toBe(u.lang === 'el-GR' ? GREEK_VOICE : ENGLISH_VOICE);
      },
    );
    And('the Greek spoken is the Greek woven into verse {int}, in order', (_, n: number) => {
      const wovenText = squash([...verseEl(n).querySelectorAll('[data-woven]')].map((el) => el.textContent).join(' '));
      expect(squash(synth.spoken.filter((u) => u.lang === 'el-GR').map((u) => u.text).join(' '))).toBe(wovenText);
    });
  });

  Scenario('Read from the top reads every verse in order and highlights the one being read', ({ Given, When, Then, And }) => {
    Given(phoneBoth, bothVoices);
    When('he taps Read from the top', () => user.click(screen.getByRole('button', { name: 'Read from the top' })));
    Then('the phone speaks the English of verse {int} in {string}', speaksEnglish);
    And('verse {int} is highlighted as being read', (_, n: number) => expect(reading(n)).toBe(true));
    And('the reading bar says {string}', (_, text: string) => expectBar(text));
    When('the phone finishes speaking verse {int}', () => {
      synth.finish();
    });
    Then('the phone goes on to the English of verse {int} in {string}', speaksEnglish);
    And('verse {int} is now highlighted as being read', (_, n: number) => expect(reading(n)).toBe(true));
    And('verse {int} is not highlighted', (_, n: number) => expect(reading(n)).toBe(false));
    When('the phone finishes the chapter', () => {
      synth.finishAll();
    });
    Then('every verse of the chapter was read in order', () => {
      expect(read).toEqual(chapter.verses.map((v) => v.n));
      expect(squash(synth.spoken.map((u) => u.text).join(' '))).toBe(squash(chapter.verses.map((v) => englishOf(v.n)).join(' ')));
    });
    And('the reading bar is gone', () => expect(bar()).toBeNull());
  });

  Scenario('With a verse selected the header reads from there', ({ Given, When, And, Then }) => {
    Given(phoneBoth, bothVoices);
    When('he selects verse {int}', (_, n: number) => user.click(within(verseEl(n)).getByRole('button', { name: `Verse ${n}` })));
    And('he taps Read from here', () => user.click(screen.getByRole('button', { name: 'Read from here' })));
    Then('the phone speaks the English of verse {int} in {string}', speaksEnglish);
    And('verse {int} is highlighted as being read', (_, n: number) => expect(reading(n)).toBe(true));
  });

  Scenario('Pause keeps the verse and Play reads it again', ({ Given, And, When, Then }) => {
    Given(phoneBoth, bothVoices);
    And('he taps Read from the top', () => user.click(screen.getByRole('button', { name: 'Read from the top' })));
    And('the phone finishes speaking verse {int}', () => {
      synth.finish();
    });
    When('he taps Pause', () => user.click(screen.getByRole('button', { name: 'Pause' })));
    Then('the phone is told to stop', () => expect(synth.calls[synth.calls.length - 1]).toBe('cancel'));
    And('the reading bar says {string}', (_, text: string) => expectBar(text));
    When('he taps Play', () => user.click(screen.getByRole('button', { name: 'Play' })));
    Then('the phone speaks the English of verse {int} in {string}', speaksEnglish);
    And('the reading bar now says {string}', (_, text: string) => expectBar(text));
  });

  Scenario('The top button turns into Pause and Stop while reading and is Play again after Stop', ({ Given, And, When, Then }) => {
    const top = (name: string) => screen.queryByRole('button', { name });
    const topBar = (has: string[], lacks: string[]) => {
      for (const name of has) expect(top(name), name).not.toBeNull();
      for (const name of lacks) expect(top(name), name).toBeNull();
    };
    Given(phoneBoth, bothVoices);
    Then('the top bar has Read from the top and no Pause or Stop', () => topBar(['Read from the top'], ['Pause', 'Stop']));
    When('he taps Read from the top', () => user.click(screen.getByRole('button', { name: 'Read from the top' })));
    Then('the top bar has Pause and Stop and no Read from the top', () => topBar(['Pause', 'Stop'], ['Read from the top', 'Play']));
    When('he taps Pause', () => user.click(screen.getByRole('button', { name: 'Pause' })));
    Then('the top bar has Play and Stop and no Pause', () => topBar(['Play', 'Stop'], ['Pause', 'Read from the top']));
    And('the reading is paused', () => expect(getReading().status).toBe('paused'));
    When('he taps Play', () => user.click(screen.getByRole('button', { name: 'Play' })));
    Then('the top bar has Pause and Stop and no Play', () => topBar(['Pause', 'Stop'], ['Play']));
    And('the reading is going', () => expect(getReading().status).toBe('reading'));
    When('he taps Stop', () => user.click(screen.getByRole('button', { name: 'Stop' })));
    Then('the top bar is back to Read from the top with no Pause or Stop', () => topBar(['Read from the top'], ['Pause', 'Stop']));
    And('nothing is being read', () => expect(getReading().status).toBe('idle'));
  });

  Scenario('Stop speaks nothing more', ({ Given, And, When, Then }) => {
    Given(phoneBoth, bothVoices);
    And('he taps Read from the top', () => user.click(screen.getByRole('button', { name: 'Read from the top' })));
    And('the phone finishes speaking verse {int}', () => {
      synth.finish();
    });
    When('he taps Stop', () => user.click(screen.getByRole('button', { name: 'Stop' })));
    Then('the phone is told to stop', () => expect(synth.calls[synth.calls.length - 1]).toBe('cancel'));
    And('the reading bar is gone', () => expect(bar()).toBeNull());
    And('no verse is highlighted as being read', () => expect(document.querySelector('[data-reading]')).toBeNull());
    And('nothing more is spoken', () => {
      const count = synth.spoken.length;
      expect(() => synth.finish()).toThrow();
      expect(synth.spoken).toHaveLength(count);
    });
  });

  Scenario('Leaving the reader stops the reading', ({ Given, And, When, Then }) => {
    Given(phoneBoth, bothVoices);
    And('he taps Read from the top', () => user.click(screen.getByRole('button', { name: 'Read from the top' })));
    When('he opens Settings', () => user.click(screen.getByRole('button', { name: 'Settings' })));
    Then('the phone is told to stop', () => expect(synth.calls[synth.calls.length - 1]).toBe('cancel'));
    And('nothing more is spoken', () => {
      const count = synth.spoken.length;
      expect(() => synth.finish()).toThrow();
      expect(synth.spoken).toHaveLength(count);
    });
  });

  Scenario('The screen is kept awake while reading and let go when it stops', ({ Given, When, Then }) => {
    Given(phoneBoth, bothVoices);
    When('he taps Read from the top', () => user.click(screen.getByRole('button', { name: 'Read from the top' })));
    Then('the screen is kept awake', async () => {
      await waitFor(() => expect(wakeLock.request).toHaveBeenCalledWith('screen'));
    });
    When('he taps Stop', () => user.click(screen.getByRole('button', { name: 'Stop' })));
    Then('the screen is let go', async () => {
      await waitFor(() => expect(wakeLock.released).toBe(1));
    });
  });

  Scenario('Without a Greek voice Greek is still read, with one plain line', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on a phone with only an English voice', englishOnly);
    And('he switches the reader to Greek', switchToGreek);
    When('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    Then('the phone speaks the Greek of verse {int} in {string}', (_, n: number, lang: string) => {
      expect(lastSpoken().text).toBe(greekOf(n));
      expect(lastSpoken().lang).toBe(lang);
    });
    And('the reading bar shows the line {string}', (_, line: string) => expect(screen.getByRole('status')).toHaveTextContent(line));
  });

  Scenario('English alone shows no such line', ({ Given, When, Then }) => {
    Given('Lampas is opened on a phone with only an English voice', englishOnly);
    When('he taps the play button of verse {int}', (_, n: number) => tapPlay(n));
    Then('the reading bar shows no voice line', () => {
      expect(bar()).not.toBeNull();
      expect(screen.queryByRole('status')).toBeNull();
    });
  });
});
