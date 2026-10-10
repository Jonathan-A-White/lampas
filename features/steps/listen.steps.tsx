// features/steps/listen.steps.tsx — runs features/listen.feature: Listen in the Verse view is a player (mw-5r3p30.130): a tap on Play reads the
// passage on by itself, the one speaking bar has Pause / Resume, Restart and Stop, the verse being read is lit and kept in view, and an interruption
// from inside the app pauses it and gives it back. Speech, the recogniser, the recorder and Postern are fakes (tests/support).
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { setReaderView, setWeave } from '../../src/data/repositories';
import { clearBus } from '../../src/events/bus';
import { getReading, startAnswer, stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { holdBarsIn } from '../../tests/support/composer';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { FakeRecorder, stubRecorder } from '../../tests/support/fake-recorder';
import { makeFakePostern, POSTERN_ORIGIN, READING_ANSWER, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, stubSpeech, type FakeSynth } from '../../tests/support/fake-speech';

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const AT = { clientX: 100, clientY: 700 };
let fake: FakePostern;
let synth: FakeSynth;

interface RawVerse {
  n: number;
  e: { t: string }[];
}
const ROMANS_8 = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as { verses: RawVerse[] };
const englishOf = (n: number): string => ROMANS_8.verses.find((v) => v.n === n)?.e.map((c) => c.t.trim()).join(' ') ?? '';
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface Options {
  tutor?: boolean;
  recorder?: boolean;
}

async function open({ tutor = false, recorder = false }: Options = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.history.replaceState(null, '', '/');
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: recorder ? READING_ANSWER : SYNERGEI_ANSWER };
  synth = stubSpeech([GREEK_VOICE, ENGLISH_VOICE]);
  if (tutor) stubRecognizer();
  if (recorder) stubRecorder();
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear(), db.readings.clear()]);
  await setReaderView('english');
  await setWeave('off');
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
/** The hold bar at the view's foot: a HoldBar, or for Ask the tutor the Composer's Hold to ask bar. */
const holdBars = () => [...Array.from(document.querySelectorAll<HTMLElement>('[data-hold-bar]')), ...holdBarsIn(document.body)];
const speakingBar = () => screen.getByRole('region', { name: 'Speaking' });
const barButtons = () => within(speakingBar()).getAllByRole('button').map((b) => b.textContent);
const onBar = (name: string) => user.click(within(speakingBar()).getByRole('button', { name }));
const footEl = () => viewEl().querySelector<HTMLElement>('[data-verse-bar]') as HTMLElement;
const headingEl = (text: string): HTMLElement => {
  const found = Array.from(document.querySelectorAll<HTMLElement>('[data-reader] [data-heading]')).find((h) => squash(h.textContent) === text);
  if (!found) throw new Error(`no heading ${text}`);
  return found;
};
const passageVerse = (n: number): HTMLElement => {
  const el = viewEl().querySelector<HTMLElement>(`[data-passage-verse="${n}"]`);
  if (!el) throw new Error(`no passage verse ${n}`);
  return el;
};

const feature = await loadFeature('features/listen.feature');

describeFeature(feature, ({ Scenario }) => {
  const phone = 'Lampas is opened on Romans 8 in the English view and a phone that speaks';
  const tapHeading = async (_: unknown, text: string) => {
    await user.click(within(headingEl(text)).getByRole('button'));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const tapNumber = async (_: unknown, n: number) => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const tapPlay = async (_: unknown, name: string) => {
    await user.click(within(footEl()).getByRole('button', { name, exact: true }));
  };
  const footSays = (_: unknown, label: string) => {
    expect(within(footEl()).getByRole('button', { name: label, exact: true })).toHaveTextContent(label);
    expect(holdBars()).toHaveLength(0);
  };
  const readingVerse = async (_: unknown, n: number) => {
    await waitFor(() => expect(getReading().status).toBe('reading'));
    expect(getReading().verse).toBe(n);
  };
  const untilVerse = (_: unknown, n: number) => {
    for (let i = 0; i < 60 && getReading().verse !== n; i++) act(() => synth.finish());
    expect(getReading().verse).toBe(n);
  };
  const pausedAt = async (_: unknown, n: number) => {
    await waitFor(() => expect(getReading().status).toBe('paused'));
    expect(getReading().verse).toBe(n);
  };
  const showsPlaying = () => expect(barButtons()).toEqual(['Pause', 'Restart', 'Stop']);
  const showsPaused = () => expect(barButtons()).toEqual(['Resume', 'Restart', 'Stop']);
  const stopped = async () => {
    await waitFor(() => expect(getReading().status).toBe('idle'));
  };
  const lit = async (_: unknown, n: number) => {
    await waitFor(() => expect(passageVerse(n)).toHaveAttribute('data-reading'));
    expect(viewEl().querySelectorAll('[data-reading]')).toHaveLength(1);
  };
  const chooseAction = async (_: unknown, action: string) => {
    await user.click(within(viewEl()).getByRole('button', { name: action, exact: true }));
  };
  const holdBar = async () => {
    expect(holdBars()).toHaveLength(1);
    await user.pointer({ keys: '[MouseLeft>]', target: holdBars()[0], coords: AT });
  };

  Scenario('A tap on Play reads the passage with no hold bar, and the speaking bar offers Pause, Restart and Stop', ({ Given, When, Then, And }) => {
    Given(phone, () => open());
    When('he taps the heading {string}', tapHeading);
    Then('the Listen foot says {string} and there is no hold bar', footSays);
    And('the hint says {string}', (_, hint: string) => {
      expect(viewEl().querySelector('[data-action-help]')).toHaveTextContent(hint);
    });
    When('he taps {string}', tapPlay);
    Then('the phone is reading verse {int} aloud', readingVerse);
    And('the speaking bar shows Pause, Restart and Stop', showsPlaying);
    And('the Listen foot is gone', () => {
      expect(footEl().children).toHaveLength(0);
      expect(holdBars()).toHaveLength(0);
    });
    And('nothing says {string}', (_, text: string) => {
      expect(document.body.textContent).not.toContain(text);
      expect(document.querySelector(`[aria-label*="${text}"]`)).toBeNull();
    });
  });

  Scenario('Pause stops the voice and Resume goes on from the same verse', ({ Given, When, Then, And }) => {
    Given(phone, () => open());
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapPlay);
    And('the phone finishes speaking until verse {int} is being read', untilVerse);
    And('he taps Pause on the speaking bar', () => onBar('Pause'));
    Then('the speaking bar shows Resume, Restart and Stop', showsPaused);
    And('the passage is paused at verse {int}', pausedAt);
    When('he taps Resume on the speaking bar', () => onBar('Resume'));
    Then('the phone is reading verse {int} aloud', readingVerse);
    And('the speaking bar shows Pause, Restart and Stop', showsPlaying);
  });

  Scenario('It reads on to the end of the passage by itself, lighting each verse, and then offers Play again', ({ Given, When, Then, And }) => {
    Given(phone, () => open());
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapPlay);
    Then('verse {int} is the one lit in the passage', lit);
    When('the phone finishes speaking until verse {int} is being read', untilVerse);
    Then('verse {int} is now the one lit in the passage', lit);
    When('the phone finishes speaking', () => {
      act(() => synth.finishAll());
    });
    Then('the phone has stopped reading', stopped);
    And('the Listen foot says {string} and there is no hold bar', footSays);
    And('the phone never spoke verse {int}', (_, n: number) => {
      expect(squash(synth.spoken.map((u) => u.text).join(' '))).not.toContain(squash(englishOf(n)).slice(0, 30));
    });
  });

  Scenario('Restart reads again from verse 1 and Stop returns to Play', ({ Given, When, Then, And }) => {
    Given(phone, () => open());
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapPlay);
    And('the phone finishes speaking until verse {int} is being read', untilVerse);
    And('he taps Restart on the speaking bar', () => onBar('Restart'));
    Then('the phone is reading verse {int} aloud', readingVerse);
    And('the speaking bar shows Pause, Restart and Stop', showsPlaying);
    When('he taps Stop on the speaking bar', () => onBar('Stop'));
    Then('the phone has stopped reading', stopped);
    And('the Listen foot says {string} and there is no hold bar', footSays);
  });

  Scenario('Listen on a single verse is the same player', ({ Given, When, Then }) => {
    Given(phone, () => open());
    When('he taps the number of verse {int}', tapNumber);
    Then('the Listen foot says {string} and there is no hold bar', footSays);
    When('he taps {string}', tapPlay);
    Then('the phone is reading verse {int} aloud', readingVerse);
    When('the phone finishes speaking', () => {
      act(() => synth.finishAll());
    });
    Then('the Listen foot now says {string} and there is no hold bar', footSays);
  });

  Scenario('A long press on a word during Listen pauses it and it goes on from the same verse when the word is said', ({ Given, When, Then, And }) => {
    Given(phone, () => open());
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapPlay);
    And('the phone finishes speaking until verse {int} is being read', untilVerse);
    And('he long presses the first word of verse {int} in the passage', async (_, n: number) => {
      const word = within(passageVerse(n)).getAllByRole('button')[0];
      await user.pointer({ keys: '[MouseLeft>]', target: word, coords: { clientX: 100, clientY: 100 } });
      await sleep(650);
      await user.pointer({ keys: '[/MouseLeft]', target: word, coords: { clientX: 100, clientY: 100 } });
    });
    Then('the passage is paused at verse {int}', pausedAt);
    And('the phone is saying the word alone', () => {
      expect(synth.speaking).toBe(true);
      expect(squash(synth.spoken[synth.spoken.length - 1]?.text).split(' ')).toHaveLength(1);
    });
    When('the phone finishes the word', () => {
      act(() => synth.finish());
    });
    Then('the phone is reading verse {int} aloud', readingVerse);
    And('the speaking bar shows Pause, Restart and Stop', showsPlaying);
  });

  Scenario('Hold to ask pauses Listen and it goes on after the question is sent', ({ Given, When, Then, And }) => {
    Given(`${phone} and a tutor and a recogniser behind a fake Postern`, () => open({ tutor: true }));
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapPlay);
    And('the phone finishes speaking until verse {int} is being read', untilVerse);
    And('he chooses {string}', chooseAction);
    And('he holds the hold bar', holdBar);
    Then('the passage is paused at verse {int}', pausedAt);
    When('he says {string} and lets go', async (_, words: string) => {
      await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
      act(() => {
        FakeRecognizer.last().open();
        FakeRecognizer.last().say([result(words, false)]);
      });
      await user.pointer({ keys: '[/MouseLeft]', target: holdBars()[0], coords: AT });
    });
    Then('the phone is reading verse {int} aloud', readingVerse);
  });

  Scenario("The reading check's recording pauses Listen and it goes on when he lets go", ({ Given, When, Then, And }) => {
    Given(`${phone} and a reading check behind a fake Postern`, () => open({ recorder: true }));
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapPlay);
    And('the phone finishes speaking until verse {int} is being read', untilVerse);
    And('he chooses {string}', chooseAction);
    And('he holds the hold bar', holdBar);
    Then('the passage is paused at verse {int}', pausedAt);
    When('he lets go of the hold bar after {int} seconds', async (_, seconds: number) => {
      FakeRecorder.durationMs = seconds * 1000;
      await user.pointer({ keys: '[/MouseLeft]', target: holdBars()[0], coords: AT });
    });
    Then('the phone is reading verse {int} aloud', readingVerse);
  });

  Scenario('Leaving the passage pauses Listen and the speaking bar offers Resume at the same verse', ({ Given, When, Then, And }) => {
    Given(phone, () => open());
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapPlay);
    And('the phone finishes speaking until verse {int} is being read', untilVerse);
    And("he presses the phone's Back", async () => {
      act(() => window.history.back());
      await waitFor(() => expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull());
    });
    Then('the passage is paused at verse {int}', pausedAt);
    And('the speaking bar shows Resume, Restart and Stop', showsPaused);
  });

  Scenario('Going to another screen pauses Listen and coming back offers Resume at the same verse', ({ Given, When, Then, And }) => {
    Given(phone, () => open());
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapPlay);
    And('the phone finishes speaking until verse {int} is being read', untilVerse);
    And('he opens Settings', () => user.click(screen.getByRole('button', { name: 'Settings' })));
    Then('the passage is paused at verse {int}', pausedAt);
    When('he goes back to the reader', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
    });
    Then('the passage is still paused at verse {int}', pausedAt);
    And('the speaking bar shows Resume, Restart and Stop', showsPaused);
    When('he taps Resume on the speaking bar', () => onBar('Resume'));
    Then('the phone is reading verse {int} aloud', readingVerse);
  });

  Scenario('The page going hidden pauses Listen', ({ Given, When, Then, And }) => {
    Given(phone, () => open());
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapPlay);
    And('the phone finishes speaking until verse {int} is being read', untilVerse);
    And('the page goes hidden', () => {
      act(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
      });
    });
    Then('the passage is paused at verse {int}', pausedAt);
    And('the speaking bar shows Resume, Restart and Stop', showsPaused);
  });

  Scenario('The tutor speaking pauses Listen and Listen goes on from its verse when the tutor is done', ({ Given, When, Then, And }) => {
    Given(phone, () => open());
    When('he taps the heading {string}', tapHeading);
    And('he taps {string}', tapPlay);
    And('the phone finishes speaking until verse {int} is being read', untilVerse);
    And('the tutor starts reading an answer aloud', () => {
      act(() => startAnswer(-7, [{ text: 'The Spirit gives life.', language: 'english' }]));
    });
    Then('the answer is being read aloud', () => {
      expect(getReading().answer).toBe(-7);
      expect(synth.spoken[synth.spoken.length - 1]?.text).toBe('The Spirit gives life.');
    });
    When('the phone finishes speaking the answer', () => {
      act(() => synth.finish());
    });
    Then('the phone is reading verse {int} aloud', readingVerse);
  });
});
