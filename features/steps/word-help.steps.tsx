// features/steps/word-help.steps.tsx — runs features/word-help.feature: the word sheet's Help with this word row (Grammar,
// Sound it out), the Talk sheet it opens on the word's verse with a first turn already sent, the focus the bible-talk grist
// carries, the word and its syllables said in Greek (a fake engine, tests/support/fake-speech.ts) and the fake Postern
// (tests/support/fake-postern.ts) that opens the grist and answers it.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { type Chapter, markSupplied } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { clearBus, subscribe, type EventOf } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GRAMMAR_HELP_ANSWER, makeFakePostern, POSTERN_ORIGIN, SOUND_HELP_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse28 = chapter.verses.find((v) => v.n === 28);
if (!verse28) throw new Error('no verse 28');
const greekOf28 = verse28.g.map((w) => w.t).join(' ');
const englishOf28 = verse28.e.map(markSupplied).join(' ');

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const FORM = 'συνεργεῖ';
const LEMMA = 'συνεργέω';
const PARSE = 'verb, present active indicative, 3rd person singular';
let fake: FakePostern;
let synth: FakeSynth | undefined;
let heard: EventOf<'word-help'>[] = [];

async function open(configure: (f: FakePostern) => void, speaks = false): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  synth = speaks ? stubSpeech([GREEK_VOICE, ENGLISH_VOICE]) : undefined;
  heard = [];
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  configure(fake);
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  subscribe('word-help', (event) => heard.push(event));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const wordSheet = () => screen.getByRole('dialog', { name: 'Word' });
const talkSheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const turns = () => Array.from(talkSheet().querySelectorAll<HTMLElement>('[data-turn]'));
const received = (i: number) => {
  const got = fake.received[i];
  if (!got) throw new Error(`the mill received no grist number ${i + 1}`);
  return got;
};
type Focus = { form: string; lemma: string; parse: string; kind: string };
const focusOf = (i: number) => received(i).input.focus as Focus | undefined;

async function tapsWord(text: string, verse: number): Promise<void> {
  await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
  await screen.findByRole('dialog', { name: 'Word' });
}
const tapsHelp = (name: 'Grammar' | 'Sound it out') => async (): Promise<void> => {
  await user.click(within(wordSheet()).getByRole('button', { name }));
};
const grists = (count: number) => async (): Promise<void> => {
  await waitFor(() => expect(fake.received).toHaveLength(count));
  for (const got of fake.received) expect(got.grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
};
const hasFocus = (kind: 'grammar' | 'sound') => async (_: unknown, form: string, lemma: string, parse: string): Promise<void> => {
  await waitFor(() => expect(fake.received.length).toBeGreaterThan(0));
  expect(focusOf(0)).toEqual({ form, lemma, parse, kind });
};
const answerShows = async (): Promise<void> => {
  await waitFor(() => expect(turns()).toHaveLength(1));
  expect(turns()[0].querySelector('[data-talk-q]')).toHaveTextContent(String(received(0).input.question));
  expect(turns()[0]).toHaveTextContent(GRAMMAR_HELP_ANSWER.answer);
};
const grammarAnswer = (f: FakePostern): void => void (f.autoReply = { status: 'answered', answer: GRAMMAR_HELP_ANSWER });

const feature = await loadFeature('features/word-help.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Grammar on the word sheet of a verb in 8:28 opens the Talk sheet and sends a bible-talk grist whose input carries a grammar focus and the verse', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with word help behind a fake Postern', () => open(grammarAnswer));
    And('he taps {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    Then('the word sheet shows a Help with this word row with Grammar and Sound it out', () => {
      const row = within(wordSheet()).getByRole('group', { name: 'Help with this word' });
      expect(within(row).getByRole('button', { name: 'Grammar' })).toBeInTheDocument();
      expect(within(row).getByRole('button', { name: 'Sound it out' })).toBeInTheDocument();
    });
    When('he taps Grammar on the word sheet', tapsHelp('Grammar'));
    Then('the word sheet is gone and the sheet is titled {string}', async (_, title: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
      expect(talkSheet()).toHaveAccessibleName(title);
    });
    And('the mill received {int} grist for the lampas app, kind bible-talk', (_, count: number) => grists(count)());
    And('the grist carries the focus form {string}, lemma {string}, parse {string} and kind grammar', hasFocus('grammar'));
    And('the grist carries the reference {string} and the Greek and the English of verse 28', (_, reference: string) => {
      const { input } = received(0);
      expect(input.reference).toBe(reference);
      expect(input.greek).toBe(greekOf28);
      expect(input.english).toBe(englishOf28);
    });
    And('the grist question names the word, its lemma, its parsing and the reference and asks to explain the grammar', () => {
      const question = String(received(0).input.question);
      for (const part of [FORM, LEMMA, PARSE, 'Romans 8:28', 'Explain the grammar of this form and what I need to know to read it']) expect(question).toContain(part);
    });
    And('a word-help event for grammar on {string} in verse {int} was published', (_, form: string, verse: number) => {
      expect(heard).toEqual([{ kind: 'word-help', help: 'grammar', form, lemma: LEMMA, parse: PARSE, chapter: 8, verse }]);
    });
  });

  Scenario('Sound it out sends kind sound, and the word is spoken in Greek before the answer and once per syllable after it', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with word help behind a fake Postern that holds its answers and a phone that speaks Greek', () => open((f) => void (f.autoReply = undefined), true));
    And('he taps {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    When('he taps Sound it out on the word sheet', tapsHelp('Sound it out'));
    Then('the mill received {int} grist for the lampas app, kind bible-talk', (_, count: number) => grists(count)());
    And('the grist carries the focus form {string}, lemma {string}, parse {string} and kind sound', hasFocus('sound'));
    And('the grist question asks to pronounce the word, its syllables and how each sounds', () => {
      const question = String(received(0).input.question);
      for (const part of [FORM, LEMMA, PARSE, 'Romans 8:28', 'Help me pronounce this word: its syllables and how each sounds']) expect(question).toContain(part);
    });
    And('the word {string} was spoken in Greek, slowly, before any answer', (_, word: string) => {
      const engine = synth as FakeSynth;
      expect(engine.spoken).toHaveLength(1);
      expect(engine.spoken[0].text).toBe(word);
      expect(engine.spoken[0].lang).toBe('el-GR');
      expect(engine.spoken[0].rate).toBeLessThan(1);
    });
    When('the tutor answers', () => {
      fake.answer({ status: 'answered', answer: SOUND_HELP_ANSWER });
    });
    Then('the Greek syllables {string}, {string} and {string} are spoken one after another in Greek, slowly', async (_, a: string, b: string, c: string) => {
      const engine = synth as FakeSynth;
      await waitFor(() => expect(engine.spoken).toHaveLength(2));
      for (const [i, syllable] of [a, b, c].entries()) {
        await waitFor(() => expect(engine.spoken).toHaveLength(i + 2));
        const spoken = engine.spoken[i + 1];
        expect(spoken.text).toBe(syllable);
        expect(spoken.lang).toBe('el-GR');
        expect(spoken.rate).toBeLessThan(1);
        act(() => engine.finish());
      }
      expect(engine.spoken).toHaveLength(4);
    });
  });

  Scenario('The answer shows in the Talk sheet and the conversation continues by text', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with word help behind a fake Postern', () => open(grammarAnswer));
    And('he taps {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    And('he taps Grammar on the word sheet', tapsHelp('Grammar'));
    Then('the answer shows in the Talk sheet under the question about the word', answerShows);
    When('he sends {string}', async (_, question: string) => {
      await user.type(within(talkSheet()).getByRole('textbox', { name: 'Your message' }), question);
      await user.click(within(talkSheet()).getByRole('button', { name: 'Send' }));
    });
    Then('the mill received {int} grists for the lampas app, kind bible-talk', (_, count: number) => grists(count)());
    And('the second grist carries no focus and the first turn as the earlier turn', () => {
      expect(focusOf(1)).toBeUndefined();
      expect(received(1).input.question).toBe('What does the subject do?');
      expect(received(1).input.history).toEqual([{ q: received(0).input.question, a: GRAMMAR_HELP_ANSWER.answer }]);
    });
  });

  Scenario('An unreachable backend shows Could not reach with Retry', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with word help behind a fake Postern that cannot be reached', () =>
      open((f) => {
        grammarAnswer(f);
        f.down = true;
      }),
    );
    And('he taps {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    When('he taps Grammar on the word sheet', tapsHelp('Grammar'));
    Then('the sheet says {string} with a Retry button', async (_, title: string) => {
      const alert = await within(talkSheet()).findByRole('alert');
      expect(alert).toHaveTextContent(title);
      expect(within(alert).getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
    When('the backend comes back and he taps Retry', async () => {
      fake.down = false;
      await user.click(within(talkSheet()).getByRole('button', { name: 'Retry' }));
    });
    Then('the answer shows in the Talk sheet under the question about the word', answerShows);
    And('the retried grist carries the same grammar focus', () => {
      expect(focusOf(0)).toEqual({ form: FORM, lemma: LEMMA, parse: PARSE, kind: 'grammar' });
    });
  });
});
