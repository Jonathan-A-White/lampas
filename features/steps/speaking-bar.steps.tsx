// features/steps/speaking-bar.steps.tsx — runs features/speaking-bar.feature: the one Pause / Resume / Restart / Stop bar (bsv-kit/speech) over
// what Lampas reads aloud. speech synthesis is the honest fake of tests/support/fake-speech.ts.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const squash = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim();
const verseData = (n: number) => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};
const englishOf = (n: number) => squash(verseData(n).e.map((c) => c.t).join(' '));
const greekOf = (n: number) => squash(verseData(n).g.map((w) => w.t).join(' '));
/** the sentences the speech package cuts a verse's English into: after . ! ? or an ellipsis and a space */
const sentencesOf = (n: number) => englishOf(n).split(/(?<=[.!?…])\s+/);

let synth: FakeSynth;

async function open(): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  stubChapterFetch();
  synth = stubSpeech([ENGLISH_VOICE, GREEK_VOICE]);
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear()]);
  window.location.hash = '';
  render(<App />);
  await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
}

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const bar = () => screen.queryByRole('region', { name: 'Speaking' });
const barButtons = () => within(screen.getByRole('region', { name: 'Speaking' })).getAllByRole('button').map((b) => b.textContent);
const onBar = (name: string) => user.click(within(screen.getByRole('region', { name: 'Speaking' })).getByRole('button', { name }));
const lastSpoken = () => synth.spoken[synth.spoken.length - 1];
const firstOfSince = () => synth.since[0];

const feature = await loadFeature('features/speaking-bar.feature');

describeFeature(feature, ({ Scenario }) => {
  const phone = 'Lampas is opened on Romans 8 on a phone with an English and a Greek voice';
  const tapPlay = (_: unknown, n: number) => user.click(within(verseEl(n)).getByRole('button', { name: 'Hear the verse' }));
  const playing = 'the speaking bar shows Pause, Restart and Stop';
  const paused = 'the speaking bar shows Resume, Restart and Stop';
  const showsPlaying = () => expect(barButtons()).toEqual(['Pause', 'Restart', 'Stop']);
  const showsPaused = () => expect(barButtons()).toEqual(['Resume', 'Restart', 'Stop']);
  const first = (_: unknown, n: number, lang: string) => {
    expect(firstOfSince().text).toBe(sentencesOf(n)[0]);
    expect(firstOfSince().lang).toBe(lang);
  };
  const finishSentence = () => {
    synth.finish();
  };

  Scenario('Listen on a verse shows the bar', ({ Given, When, Then, And }) => {
    Given(phone, open);
    When('he taps the play button of verse {int}', tapPlay);
    Then(playing, showsPlaying);
    And('the phone speaks the first sentence of verse {int} in {string}', first);
  });

  Scenario('Pause keeps the sentence and Resume goes on from it', ({ Given, And, When, Then }) => {
    let before = 0;
    Given(phone, open);
    And('he taps the play button of verse {int}', tapPlay);
    And('the phone finishes the first sentence', finishSentence);
    When('he taps Pause on the speaking bar', () => onBar('Pause'));
    Then(paused, showsPaused);
    And('the phone is told to stop', () => expect(synth.calls[synth.calls.length - 1]).toBe('cancel'));
    When('he taps Resume on the speaking bar', async () => {
      before = synth.spoken.length;
      await onBar('Resume');
    });
    Then('the phone speaks the second sentence of verse {int}', (_, n: number) => {
      expect(synth.spoken.slice(before).map((u) => u.text)).toEqual([sentencesOf(n)[1]]);
    });
    And('the first sentence was not spoken again', () => {
      expect(synth.spoken.slice(before).map((u) => u.text)).not.toContain(sentencesOf(3)[0]);
    });
    And(playing, showsPlaying);
  });

  Scenario('Restart speaks the verse again from its first sentence', ({ Given, And, When, Then }) => {
    Given(phone, open);
    And('he taps the play button of verse {int}', tapPlay);
    And('the phone finishes the first sentence', finishSentence);
    When('he taps Restart on the speaking bar', () => onBar('Restart'));
    Then('the phone speaks the first sentence of verse {int} in {string}', (_, n: number, lang: string) => {
      expect(firstOfSince().text).toBe(sentencesOf(n)[0]);
      expect(firstOfSince().lang).toBe(lang);
    });
    And(playing, showsPlaying);
  });

  Scenario('Stop clears the bar and speaks nothing more', ({ Given, And, When, Then }) => {
    Given(phone, open);
    And('he taps the play button of verse {int}', tapPlay);
    When('he taps Stop on the speaking bar', () => onBar('Stop'));
    Then('there is no speaking bar', async () => {
      await waitFor(() => expect(bar()).toBeNull());
    });
    And('nothing is highlighted as being read', async () => {
      await waitFor(() => expect(document.querySelector('[data-reading]')).toBeNull());
    });
    And('nothing more is spoken', () => {
      const count = synth.spoken.length;
      expect(() => synth.finish()).toThrow();
      expect(synth.spoken).toHaveLength(count);
    });
  });

  Scenario('Listen stops at the end of the verse', ({ Given, And, When, Then }) => {
    Given(phone, open);
    And('he taps the play button of verse {int}', tapPlay);
    When('the phone finishes everything it was asked to say', () => {
      synth.finishAll();
    });
    Then('only verse {int} was spoken', (_, n: number) => {
      expect(squash(synth.spoken.map((u) => u.text).join(' '))).toBe(englishOf(n));
    });
    And('there is no speaking bar', async () => {
      await waitFor(() => expect(bar()).toBeNull());
    });
  });

  Scenario('Leaving the screen pauses the reading and coming back offers Resume', ({ Given, And, When, Then }) => {
    Given(phone, open);
    And('he taps the play button of verse {int}', tapPlay);
    When('he opens Settings', () => user.click(screen.getByRole('button', { name: 'Settings' })));
    Then('the phone is told to stop', () => expect(synth.calls[synth.calls.length - 1]).toBe('cancel'));
    And(paused, showsPaused);
    When('he goes back to the reader', async () => {
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await screen.findByRole('heading', { name: 'Romans 8', level: 1 });
    });
    Then('the speaking bar still shows Resume, Restart and Stop', showsPaused);
    When('he taps Resume on the speaking bar', () => onBar('Resume'));
    Then('the phone speaks the first sentence of verse {int} in {string}', first);
    And(playing, showsPlaying);
  });

  Scenario('A Greek verse is read in Greek and its bar is the same', ({ Given, And, When, Then }) => {
    Given(phone, open);
    And('he switches the reader to Greek', async () => {
      await user.click(screen.getByRole('button', { name: 'Greek' }));
      await waitFor(() => expect(document.querySelector('[data-reader]')?.getAttribute('data-view')).toBe('greek'));
    });
    When('he taps the play button of verse {int}', tapPlay);
    Then(playing, showsPlaying);
    And('the phone speaks the Greek of verse {int} in {string}', (_, n: number, lang: string) => {
      expect(lastSpoken().text).toBe(greekOf(n));
      expect(lastSpoken().lang).toBe(lang);
    });
  });
});
