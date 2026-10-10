// features/steps/bible-talk.steps.tsx — runs features/bible-talk.feature: the Talk button, the Talk sheet, the grist it
// sends through a fake Postern (tests/support/fake-postern.ts), the answers shown, read aloud and kept per chapter and
// per verse. fetch is stubbed: /data/ files from disk, https://postern.allmymind.org to the fake. speech synthesis is a
// fake engine (tests/support/fake-speech.ts) where a scenario listens.
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
import { addTurn, getGoal, getPickerGrammar, getSpeechRate, getStudyResources, getTheme, setLevel, talkRef } from '../../src/data/repositories';
import { setGoal } from '../../src/data/repositories/settings';
import { clearBus, latest } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { expectKeepsItShort, expectLearnerField, expectLearnerSummary, expectTeachesNewWord, instructionsOf, learnWordToday } from '../../tests/support/learner';
import { makeFakePostern, POSTERN_ORIGIN, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verseData = (n: number) => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};
const greekOf = (ns: number[]) => ns.map((n) => verseData(n).g.map((w) => w.t).join(' ')).join(' ');
const englishOf = (ns: number[]) => ns.map((n) => verseData(n).e.map(markSupplied).join(' ')).join(' ');

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const QUESTION = 'What does συνεργεῖ mean here?';
let fake: FakePostern;
let synth: FakeSynth | undefined;

async function open(configure: (f: FakePostern) => void = (f) => void (f.autoReply = { status: 'answered', answer: TALK_ANSWER }), speaks = false): Promise<void> {
  // The scenario before may have ended with its answer still on the way (a step that only checked the grist): let it land, kept and
  // spoken or not, before its screen goes, so it cannot write a turn or start a voice in this scenario.
  const asking = screen.queryByRole('textbox', { name: 'Your message' });
  if (asking) await waitFor(() => expect(asking).toBeEnabled());
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  synth = speaks ? stubSpeech([GREEK_VOICE, ENGLISH_VOICE]) : undefined;
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
}

async function selectVerse28(): Promise<void> {
  const number = await screen.findByRole('button', { name: 'Verse 28' });
  if (number.getAttribute('aria-pressed') !== 'true') await user.click(number);
  await screen.findByRole('region', { name: 'Verse view' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Verse 28' })).toHaveAttribute('aria-pressed', 'true'));
}

/** Opens the Talk sheet: from the Talk bar, or, with a verse's view open, from its Ask the tutor action ('Talk about verse N'). */
async function openTalk(): Promise<void> {
  const view = screen.queryByRole('region', { name: 'Verse view' });
  if (view) {
    await user.click(within(view).getByRole('button', { name: 'Ask the tutor', exact: true }));
    await user.click(await within(view).findByRole('button', { name: 'Talk about verse 28' }));
  } else {
    await user.click(await screen.findByRole('button', { name: 'Talk' }));
  }
  await screen.findByRole('dialog', { name: /^Talk about / });
}

const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const field = () => within(sheet()).getByRole('textbox', { name: 'Your message' });
const sendButton = () => within(sheet()).getByRole('button', { name: 'Send' });
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));

async function send(question: string): Promise<void> {
  await user.type(field(), question);
  await user.click(sendButton());
}

async function turnsKept(n: number): Promise<void> {
  await waitFor(() => expect(turns()).toHaveLength(n));
}

async function answerShowsUnderQuestion(): Promise<void> {
  await waitFor(() => {
    const [turn] = turns();
    expect(within(turn).getByText(QUESTION)).toBeInTheDocument();
    expect(turn).toHaveTextContent(TALK_ANSWER.answer);
  });
}

/** The utterance the engine was asked to say as number `n` (0 is the first): waits for it, as the voice starts a moment after the answer shows. */
async function spokenAt(engine: FakeSynth, n: number) {
  await waitFor(() => expect(engine.spoken.length).toBeGreaterThan(n));
  return engine.spoken[n];
}

/** Waits for turn number `index` of the sheet to show `text`: a turn is drawn, and its lines added, a moment after the step before it. */
const turnShows = (index: number, text: string) => waitFor(() => expect(turns()[index]).toHaveTextContent(text));

const received = (i: number) => {
  const got = fake.received[i];
  if (!got) throw new Error(`the mill received no grist number ${i + 1}`);
  return got;
};
const history = (i: number) => received(i).input.history as { q: string; a: string }[];

async function taps(name: string): Promise<void> {
  await user.click(within(sheet()).getByRole('button', { name }));
}

const explaining = (f: FakePostern): void => {
  f.autoReply = {
    status: 'answered',
    answer: {
      answer: 'The flesh, the spirit and God.',
      words: [
        { greek: 'σάρκα', lemma: 'σάρξ', note: 'noun, accusative singular feminine' },
        { greek: 'πνεῦμα', lemma: 'πνεῦμα', note: 'noun, nominative singular neuter' },
        { greek: 'θεοῦ', lemma: 'θεός', note: 'noun, genitive singular masculine' },
      ],
    },
  };
};
const adding = (...lemmas: string[]) => (f: FakePostern): void =>
  void (f.autoReply = { status: 'answered', answer: { answer: 'Adding.', words: [], words_to_add: lemmas } });
const wordRow = (lemma: string): HTMLElement => {
  const row = Array.from(sheet().querySelectorAll<HTMLElement>('[data-talk-words] > div')).find((r) => r.querySelector('dd [lang="grc"]')?.textContent === lemma);
  if (!row) throw new Error(`no answer word ${lemma}`);
  return row;
};
const MARKDOWN_ANSWER = [
  "The word you're after is **parsing**, a *grammar* habit with συνεργεῖ.",
  '',
  '- find the verb',
  '- name its tense',
  '',
  '1. read the Greek',
  '2. say the parsing',
  '',
  '## A heading',
].join('\n');
/** The mill's answer when it has put what he said into clean words: punctuation, capitals, no ums (grinds/bible-talk.answer.schema.json `question`). */
const cleaning = (f: FakePostern): void =>
  void (f.autoReply = { status: 'answered', answer: { answer: TALK_ANSWER.answer, words: [], question: 'Why are there italic words? What does it mean for the words to be italic?' } });
const markdownAnswer = (f: FakePostern): void => void (f.autoReply = { status: 'answered', answer: { answer: MARKDOWN_ANSWER, words: [] } });
const htmlAnswer = (f: FakePostern): void =>
  void (f.autoReply = { status: 'answered', answer: { answer: 'Here it is: <img src=x onerror=alert(1)>', words: [] } });
const answerBox = (): HTMLElement => {
  const box = sheet().querySelector<HTMLElement>('[data-talk-a]');
  if (!box) throw new Error('no answer yet');
  return box;
};
const listed = async (lemma: string) => (await db.words.toArray()).filter((w) => w.lemma === lemma);
const lines = () => turns().map((t) => t.textContent ?? '').join('\n');

const feature = await loadFeature('features/bible-talk.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario("A question about 8:28 sends a bible-talk grist with the verse's Greek and English, the question, the solid words and the earlier turns", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    And('he opens Talk', openTalk);
    Then('the sheet is titled {string}', (_, title: string) => {
      expect(sheet()).toHaveAccessibleName(title);
      expect(within(sheet()).getByRole('heading', { name: title })).toBeInTheDocument();
    });
    When('he sends {string}', (_, question: string) => send(question));
    And('the answer number {int} has arrived', (_, n: number) => turnsKept(n));
    And('he sends {string}', (_, question: string) => send(question));
    Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
      for (const got of fake.received) expect(got.grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
    });
    And('the first grist carries no earlier turns', () => {
      expect(history(0)).toEqual([]);
    });
    And('the second grist carries the reference {string} and the Greek and the English of verse 28', (_, reference: string) => {
      const { input } = received(1);
      expect(input.reference).toBe(reference);
      expect(input.greek).toBe(greekOf([28]));
      expect(input.english).toBe(englishOf([28]));
    });
    And('the second grist carries the question {string}', (_, question: string) => {
      expect(received(1).input.question).toBe(question);
    });
    And('the second grist carries his solid words, and not the words he is still learning', async () => {
      const solid = (await db.words.where('state').equals('solid').toArray()).map((w) => w.lemma);
      const learning = (await db.words.where('state').equals('learning').toArray()).map((w) => w.lemma);
      expect(solid.length).toBeGreaterThan(0);
      expect(learning.length).toBeGreaterThan(0);
      const sent = received(1).input.solid_words as string[];
      expect([...sent].sort()).toEqual([...solid].sort());
      for (const word of learning) expect(sent).not.toContain(word);
    });
    And('the second grist carries the first question and its answer as the earlier turn', () => {
      expect(history(1)).toEqual([{ q: 'Why does Paul say all things?', a: TALK_ANSWER.answer }]);
    });
  });

  Scenario('With no verse selected the talk is about the chapter, with its first three verses', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    When('he opens Talk', openTalk);
    Then('the sheet is titled {string}', (_, title: string) => {
      expect(sheet()).toHaveAccessibleName(title);
    });
    When('he sends {string}', (_, question: string) => send(question));
    Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
      expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk' });
    });
    And('the first grist carries the reference {string} and the Greek and the English of verses 1 to 3', (_, reference: string) => {
      const { input } = received(0);
      expect(input.reference).toBe(reference);
      expect(input.greek).toBe(greekOf([1, 2, 3]));
      expect(input.english).toBe(englishOf([1, 2, 3]));
    });
    And('the first grist carries the question {string}', (_, question: string) => {
      expect(received(0).input.question).toBe(question);
    });
  });

  Scenario('The answer shows in the sheet and is read aloud', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern and a phone that speaks English and Greek', () => open(undefined, true));
    And('he selects verse 28', selectVerse28);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows in the sheet under his question', answerShowsUnderQuestion);
    And('the answer is read aloud, its Greek word in Greek and the rest in English', async () => {
      const engine = synth as FakeSynth;
      const first = await spokenAt(engine, 0);
      expect(first.lang).toBe('en-US');
      expect(first.text).toBe('In this verse');
      act(() => engine.finish());
      const second = await spokenAt(engine, 1);
      expect(second.lang).toBe('el-GR');
      expect(second.text).toBe('συνεργεῖ');
      act(() => engine.finish());
      const third = await spokenAt(engine, 2);
      expect(third.lang).toBe('en-US');
      expect(third.text).toContain('means "works together"');
    });
    When('he taps Stop on the answer', () => taps('Stop'));
    Then('the reading stops and the answer can be heard again', async () => {
      const engine = synth as FakeSynth;
      expect(engine.calls[engine.calls.length - 1]).toBe('cancel');
      expect(engine.speaking).toBe(false);
      await waitFor(() => expect(within(turns()[0]).getByRole('button', { name: 'Hear the answer' })).toBeInTheDocument());
    });
  });

  Scenario('The Greek words of an answer open the word sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    And('he opens Talk', openTalk);
    And('he sends {string}', (_, question: string) => send(question));
    When('he taps the Greek word {string} in the answer', async (_, word: string) => {
      await turnsKept(1);
      await user.click(within(turns()[0]).getByRole('button', { name: word }));
    });
    Then('the word sheet shows {string} with its lemma {string}', async (_, word: string, lemma: string) => {
      const word_sheet = await screen.findByRole('dialog', { name: 'Word' });
      expect(within(word_sheet).getByTestId('sheet-word')).toHaveTextContent(word);
      expect(within(word_sheet).getByTestId('sheet-lemma')).toHaveTextContent(lemma);
    });
    When('he taps Done on the word sheet', async () => {
      await user.click(within(screen.getByRole('dialog', { name: 'Word' })).getByRole('button', { name: 'Done' }));
    });
    Then('the word sheet is gone and the Talk sheet is still open', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
      expect(sheet()).toBeInTheDocument();
    });
  });

  Scenario('The eleventh turn sends only the last 10 as history', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    And('ten turns were already kept for verse 28', async () => {
      for (let i = 1; i <= 10; i++) await addTurn(talkRef('rom', 8, 28), `Question ${i}`, `Answer ${i}`, [], 1_000 + i);
    });
    And('he selects verse 28', selectVerse28);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    And('the answer number {int} has arrived', (_, n: number) => turnsKept(n));
    And('he sends {string}', (_, question: string) => send(question));
    Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
    });
    And('the first grist carries {int} earlier turns, from {string} to {string}', (_, count: number, first: string, last: string) => {
      const sent = history(0);
      expect(sent).toHaveLength(count);
      expect(sent[0]).toEqual({ q: first, a: 'Answer 1' });
      expect(sent[count - 1].q).toBe(last);
    });
    And('the second grist carries {int} earlier turns, from {string} to {string}', (_, count: number, first: string, last: string) => {
      const sent = history(1);
      expect(sent).toHaveLength(count);
      expect(sent[0]).toEqual({ q: first, a: 'Answer 2' });
      expect(sent[count - 1].q).toBe(last);
      expect(sent.map((t) => t.q)).not.toContain('Question 1');
    });
  });

  Scenario('A conversation is still there after reload', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    And('he opens Talk', openTalk);
    And('he sends {string}', (_, question: string) => send(question));
    And('the answer number {int} has arrived', (_, n: number) => turnsKept(n));
    When('he reopens Lampas, selects verse 28 and opens Talk', async () => {
      cleanup();
      stopReading();
      fake.calls.length = 0;
      render(<App />);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      await selectVerse28();
      await openTalk();
    });
    Then('the answer shows in the sheet under his question', answerShowsUnderQuestion);
    And('the fake Postern was not asked again', () => {
      expect(fake.calls.filter((call) => call.includes('/api/'))).toEqual([]);
    });
  });

  Scenario("A verse's talk and the chapter's talk are kept apart", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    And('he opens Talk', openTalk);
    And('he sends {string}', (_, question: string) => send(question));
    And('the answer number {int} has arrived', (_, n: number) => turnsKept(n));
    When('he taps Done on the Talk sheet', () => taps('Done'));
    And('he closes the Verse view of verse 28, so that no verse is selected', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
      await user.click(screen.getByRole('button', { name: '‹ Reader' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Verse 28' })).toHaveAttribute('aria-pressed', 'false'));
    });
    And('he opens Talk again', openTalk);
    Then('the sheet is titled {string}', (_, title: string) => {
      expect(sheet()).toHaveAccessibleName(title);
    });
    // The turns come from a live Dexie query: on a busy store (the first open is still seeding the schedule) they arrive a moment late.
    And('the sheet shows no turns yet', () =>
      waitFor(() => {
        expect(turns()).toHaveLength(0);
        expect(sheet().querySelector('[data-talk-empty]')).not.toBeNull();
      }),
    );
  });

  Scenario('An unreachable backend shows Could not reach with Retry', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that cannot be reached', () =>
      open((f) => {
        f.autoReply = { status: 'answered', answer: TALK_ANSWER };
        f.down = true;
      }),
    );
    And('he selects verse 28', selectVerse28);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet says {string} with a Retry button', async (_, words: string) => {
      expect(await within(sheet()).findByRole('alert')).toHaveTextContent(words);
      expect(within(sheet()).getByRole('button', { name: 'Retry' })).toBeEnabled();
    });
    And('the sheet shows no answer', () => {
      expect(turns()).toHaveLength(0);
    });
    When('the backend comes back and he taps Retry', async () => {
      fake.down = false;
      await taps('Retry');
    });
    Then('the answer shows in the sheet under his question', answerShowsUnderQuestion);
  });

  Scenario('While the tutor has not answered the sheet says Sending and then Waiting', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that holds its answers', () => open((f) => void (f.autoReply = undefined)));
    And('he selects verse 28', selectVerse28);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet says Waiting and nothing can be sent until the answer comes', async () => {
      const status = await within(sheet()).findByRole('status');
      await waitFor(() => expect(status).toHaveTextContent(/^Waiting for the tutor… \d+ s$/));
      expect(field()).toBeDisabled();
      expect(sendButton()).toBeDisabled();
      expect(within(sheet()).getByText(QUESTION)).toBeInTheDocument();
    });
    When('the tutor answers', () => {
      fake.answer({ status: 'answered', answer: TALK_ANSWER });
    });
    Then('the answer shows in the sheet under his question', answerShowsUnderQuestion);
  });

  Scenario('An unlicensed reply shows No licence', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that holds no licence for this phone', () => open((f) => void (f.licensed = false)));
    And('he selects verse 28', selectVerse28);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet says {string} with a Retry button', async (_, words: string) => {
      expect(await within(sheet()).findByRole('alert')).toHaveTextContent(words);
      expect(within(sheet()).getByRole('button', { name: 'Retry' })).toBeEnabled();
    });
  });

  Scenario('Send cannot be tapped with nothing typed', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    When('he opens Talk', openTalk);
    Then('the Send button is off', () => {
      expect(sendButton()).toBeDisabled();
    });
    When('he types {string}', (_, text: string) => user.type(field(), text));
    Then('the Send button is still off', () => {
      expect(sendButton()).toBeDisabled();
    });
    When('he types {string} instead', (_, text: string) => user.clear(field()).then(() => user.type(field(), text)));
    Then('the Send button is on', () => {
      expect(sendButton()).toBeEnabled();
    });
  });

  Scenario('Done closes the sheet and Escape closes it too', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    When('he opens Talk', openTalk);
    And('he taps Done on the Talk sheet', () => taps('Done'));
    Then('the Talk sheet is gone', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
    });
    When('he opens Talk again', openTalk);
    And('he presses Escape', () => user.keyboard('{Escape}'));
    Then('the Talk sheet is gone again', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
    });
  });

  const changing = (...changes: { key: string; value: unknown }[]) => (f: FakePostern) =>
    void (f.autoReply = { status: 'answered', answer: { answer: 'Done.', words: [], settings_changes: changes } });
  const changeRows = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-talk-change]'));

  Scenario('Asking for a setting changes it at once and the talk says what changed, with an Undo', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change greekRate 0.8', () =>
      open(changing({ key: 'greekRate', value: 0.8 })),
    );
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
      await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
      const row = changeRows().find((r) => r.textContent?.includes(text)) as HTMLElement;
      expect(within(row).getByRole('button', { name: 'Undo Greek speed' })).toHaveTextContent('Undo');
    });
    And('the Greek speed is saved as 0.8 and the English speed is still 1', async () => {
      expect(await getSpeechRate('greek')).toBe(0.8);
      expect(await getSpeechRate('english')).toBe(1);
      expect(latest('rates-changed')?.rates).toEqual({ english: 1, greek: 0.8 });
    });
    And('the grist carried the settings as they stood, the Greek speed at 1', () => {
      expect(received(0).input.settings).toMatchObject({ greekRate: 1, theme: 'phone', textSize: 'normal' });
    });
    When('he taps Undo', () => taps('Undo Greek speed'));
    Then('the sheet shows {string} and no Undo button', async (_, text: string) => {
      await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
      expect(within(sheet()).queryByRole('button', { name: /^Undo/ })).toBeNull();
    });
    And('the Greek speed is saved as 1', async () => {
      expect(await getSpeechRate('greek')).toBe(1);
      expect(latest('rates-changed')?.rates.greek).toBe(1);
    });
  });

  Scenario('The tutor sets the goal when asked', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change goal 1 John 1', () =>
      open(changing({ key: 'goal', value: '1 John 1' })),
    );
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
      await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
      const row = changeRows().find((r) => r.textContent?.includes(text)) as HTMLElement;
      expect(within(row).getByRole('button', { name: 'Undo Goal' })).toHaveTextContent('Undo');
    });
    And('the saved goal is {string}', async (_, text: string) => expect(await getGoal()).toBe(text));
    When('he taps Undo', () => taps('Undo Goal'));
    Then('the saved goal is {string}', async (_, text: string) => {
      await waitFor(async () => expect(await getGoal()).toBe(text));
    });
  });

  Scenario('A change to a setting the app does not have changes nothing and the talk says so', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change fontColour red', () =>
      open(changing({ key: 'fontColour', value: 'red' })),
    );
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows in the sheet under his question', async () => {
      await turnShows(0, 'Done.');
    });
    And('nothing was changed and the sheet shows no Undo button', async () => {
      expect(await db.settings.count()).toBe(0);
      expect(within(sheet()).queryByRole('button', { name: /^Undo/ })).toBeNull();
      expect(changeRows()).toHaveLength(0);
    });
    And('the sheet says the app has no such setting {string}', (_, key: string) => turnShows(0, `"${key}": the app has no such setting`));
  });

  Scenario('A change with a value the setting does not allow is left out, the allowed change beside it is made', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the changes theme purple and greekRate 0.7', () =>
      open(changing({ key: 'theme', value: 'purple' }, { key: 'greekRate', value: 0.7 })),
    );
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
      await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
      expect(within(sheet()).getByRole('button', { name: 'Undo Greek speed' })).toBeInTheDocument();
    });
    And('the sheet says the Theme does not allow {string}', (_, value: string) => turnShows(0, `Theme: "${value}" is not a value it allows`));
    And('the saved Theme is still Phone', async () => {
      expect(await getTheme()).toBe('phone');
    });
  });

  Scenario('Add to my words puts an answer word\'s lemma on his list once, and a word already there says so from the start', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that explains the words σάρκα, πνεῦμα and θεοῦ', () => open(explaining));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer word {string} offers {string}', async (_, lemma: string, label: string) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      expect(await within(wordRow(lemma)).findByRole('button', { name: label })).toBeEnabled();
    });
    And('the answer word {string} already shows {string}, because it is a seeded word', async (_, lemma: string, label: string) => {
      expect(await within(wordRow(lemma)).findByText(label)).toBeInTheDocument();
      expect(within(wordRow(lemma)).queryByRole('button', { name: 'Add to my words' })).toBeNull();
    });
    When('he taps {string} on the answer word {string}', async (_, label: string, lemma: string) => {
      await user.click(await within(wordRow(lemma)).findByRole('button', { name: label }));
    });
    Then('the answer word {string} shows {string}', async (_, lemma: string, label: string) => {
      await waitFor(() => expect(within(wordRow(lemma)).getByText(label)).toBeInTheDocument());
      expect(within(wordRow(lemma)).queryByRole('button', { name: 'Add to my words' })).toBeNull();
    });
    And('the word {string} is on the list once, as a word he is learning, with the gloss {string}', async (_, lemma: string, gloss: string) => {
      expect(await listed(lemma)).toMatchObject([{ lemma, state: 'learning', lesson: 0, gloss }]);
    });
    And('the answer word {string} still offers {string}', async (_, lemma: string, label: string) => {
      expect(await within(wordRow(lemma)).findByRole('button', { name: label })).toBeEnabled();
    });
  });

  Scenario('A word added from an answer is on the Words screen', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that explains the words σάρκα, πνεῦμα and θεοῦ', () => open(explaining));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    And('he taps {string} on the answer word {string}', async (_, label: string, lemma: string) => {
      await waitFor(() => expect(turns()).toHaveLength(1));
      await user.click(await within(wordRow(lemma)).findByRole('button', { name: label }));
      await waitFor(() => expect(within(wordRow(lemma)).queryByRole('button', { name: label })).toBeNull());
    });
    And('he taps Done on the Talk sheet', async () => {
      await user.click(within(sheet()).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
    });
    And('he opens the Words screen', async () => {
      await user.click(await screen.findByRole('button', { name: 'Settings' }));
      await user.click(await screen.findByRole('button', { name: 'Words' }));
      await screen.findByRole('heading', { name: 'Words' });
    });
    Then('the Words screen lists {string} as learning', async (_, lemma: string) => {
      await waitFor(() => expect(document.querySelector(`[data-lemma="${lemma}"]`)?.getAttribute('data-state')).toBe('learning'));
    });
    And('the Words screen does not list {string}', (_, lemma: string) => {
      expect(document.querySelector(`[data-lemma="${lemma}"]`)).toBeNull();
    });
  });

  Scenario('Saying add σάρξ to my words adds it and the answer says so', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add σάρξ', () => open(adding('σάρξ')));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows the line {string}', async (_, line: string) => {
      await waitFor(() => expect(lines()).toContain(line));
    });
    And('the word {string} is on the list once, as a word he is learning, with the gloss {string}', async (_, lemma: string, gloss: string) => {
      expect(await listed(lemma)).toMatchObject([{ lemma, state: 'learning', lesson: 0, gloss }]);
    });
    When('he asks again {string}', (_, question: string) => send(question));
    Then('the second answer shows the line {string}', async (_, line: string) => {
      await turnShows(1, line);
    });
    And('the word {string} is still on the list once with the gloss {string}', async (_, lemma: string, gloss: string) => {
      expect(await listed(lemma)).toMatchObject([{ lemma, state: 'learning', lesson: 0, gloss }]);
    });
  });

  Scenario('An answer that asks to add a word already on the list says it was already there', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add θεός and σάρξ', () => open(adding('θεός', 'σάρξ')));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows the line {string}', async (_, line: string) => {
      await waitFor(() => expect(lines()).toContain(line));
    });
    And('the answer also shows the line {string}', async (_, line: string) => {
      await waitFor(() => expect(lines()).toContain(line));
    });
    And('the word {string} is on the list once', async (_, lemma: string) => {
      expect(await listed(lemma)).toHaveLength(1);
    });
  });

  Scenario("Saying add for a word outside the chapter adds it with the lexicon's gloss", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add προσκυνέω', () => open(adding('προσκυνέω')));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows the line {string}', async (_, line: string) => {
      await waitFor(() => expect(lines()).toContain(line));
    });
    And('the word {string} is on the list once, as a word he is learning, with the gloss {string}', async (_, lemma: string, gloss: string) => {
      expect(await listed(lemma)).toMatchObject([{ lemma, state: 'learning', lesson: 0, gloss }]);
    });
  });

  Scenario('Saying add for a word the lexicon does not know says so and adds nothing', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the words to add ζζζ', () => open(adding('ζζζ')));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows the line {string}', async (_, line: string) => {
      await waitFor(() => expect(lines()).toContain(line));
    });
    And('the word {string} is not on the list', async (_, lemma: string) => {
      expect(await listed(lemma)).toHaveLength(0);
    });
  });
  Scenario("The tutor's Markdown shows as bold, italics and lists, with no marks left", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers in Markdown', () => open(markdownAnswer));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows {string} in bold and {string} in italics', async (_, bold: string, italic: string) => {
      await waitFor(() => {
        expect(answerBox().querySelector('strong')?.textContent).toBe(bold);
        expect(answerBox().querySelector('em')?.textContent).toBe(italic);
      });
    });
    And('the answer shows a bulleted list of {int} items and a numbered list of {int} items', (_, bullets: number, numbers: number) =>
      waitFor(() => {
        expect(answerBox().querySelectorAll('ul > li')).toHaveLength(bullets);
        expect(answerBox().querySelectorAll('ol > li')).toHaveLength(numbers);
      }),
    );
    And('the answer shows no stars and no hashes', () => {
      expect(answerBox().textContent).not.toMatch(/[*#]/);
    });
  });

  Scenario('Raw HTML in an answer is shown as text and never rendered', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with raw HTML', () => open(htmlAnswer));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows the text {string}', async (_, text: string) => {
      await waitFor(() => expect(answerBox()).toHaveTextContent(text));
    });
    And('the answer holds no image', () => {
      expect(answerBox().querySelector('img')).toBeNull();
    });
  });

  Scenario("Greek in a rendered answer keeps the sheet's type", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers in Markdown', () => open(markdownAnswer));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the Greek word {string} in the answer is as large as the rest of the answer', async (_, word: string) => {
      await waitFor(() => expect(answerBox()).toHaveTextContent(word));
      // The Greek sits in the answer's own text: no wrapper that changes its size, so it has the answer's text-lg.
      const holder = Array.from(answerBox().querySelectorAll('p')).find((p) => p.textContent?.includes(word));
      expect(holder?.closest('[data-answer-text]')?.className).toContain('text-lg');
      expect(holder?.querySelector('[class*="text-"]')).toBeNull();
    });
  });

  Scenario('An answer in Markdown is read aloud without its marks', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers in Markdown and a phone that speaks English and Greek', () =>
      open(markdownAnswer, true),
    );
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer is read aloud with no stars, hashes or list marks', async () => {
      const engine = synth as FakeSynth;
      const spoken: string[] = [];
      // One part ends and the next starts in the same tick (readAloud.ts readRun): when nothing is speaking after an end, the answer is over.
      for (let i = 0; i < 6; i++) {
        spoken.push((await spokenAt(engine, i)).text);
        act(() => engine.finish());
        if (!engine.speaking) break;
      }
      const all = spoken.join(' ');
      expect(all).toContain('parsing');
      expect(all).not.toMatch(/[*#]|^- /m);
    });
  });

  Scenario('His own turn stays plain text', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('his question shows as {string} with its stars', async (_, question: string) => {
      await turnsKept(1);
      const q = sheet().querySelector('[data-talk-q]');
      expect(q?.textContent).toBe(question);
      expect(q?.querySelector('strong')).toBeNull();
    });
  });

  Scenario('What he said is shown back cleaned up, and the raw words stay kept', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern whose answers clean up his question', () => open(cleaning));
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('his turn shows {string}', async (_, shown: string) => {
      await turnsKept(1);
      expect(sheet().querySelector('[data-talk-q]')?.textContent).toBe(shown);
    });
    And('the turn kept on the phone has his raw words {string}', async (_, raw: string) => {
      const kept = await db.talks.toArray();
      expect(kept).toHaveLength(1);
      expect(kept[0].q).toBe(raw);
    });
  });

  Scenario('An answer with no cleaned question shows his raw words', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('his turn shows {string}', async (_, shown: string) => {
      await turnsKept(1);
      expect(sheet().querySelector('[data-talk-q]')?.textContent).toBe(shown);
    });
  });

  Scenario('A question in the talk sends the learner summary', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    And('he is learning the word {string} which he added today', (_, lemma: string) => learnWordToday(lemma));
    And('he selects verse 28', selectVerse28);
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
      expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk' });
    });
    And('its input carries a learner summary that names his solid words as a count, {string} among the words he is learning and as new today, and what is due now', (_, lemma: string) =>
      expectLearnerSummary(received(0).input, lemma),
    );
  });

  Scenario("The Bible talk's instructions ask it to teach a new word in his terms", ({ Given, Then, And }) => {
    let text = '';
    Given("the bible-talk grind's instructions", () => {
      text = instructionsOf('bible-talk');
    });
    Then('they describe the learner field', () => void expectLearnerField(text));
    And('they ask for a new word to be taught with its gloss, a memorable hook and one easy example from the chapter', () => void expectTeachesNewWord(text));
    And('they say to leave out what he already knows and to keep the answer short for a phone', () => void expectKeepsItShort(text));
  });
  Scenario("Asking about ἀρχῆς sends learner_grammar with the goal Read 1 John 1:1", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern', () => open());
    And('his goal is {string} and he has the genitive case on the frontier', async (_, goal: string) => {
      await setGoal(goal);
      await setLevel('case-genitive', 'frontier', 'sheet');
    });
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the mill received {int} grists for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
      expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk' });
    });
    And(
      'its input carries learner_grammar with the goal {string}, {string} among the frontier ideas and no more than 12 titles a list',
      (_, goal: string, title: string) => {
        const field = received(0).input.learner_grammar as { goal: string; ideas: Record<string, string[]>; suggested_move: string; approach: { name: string } };
        expect(field.goal).toBe(goal);
        expect(field.ideas.frontier).toContain(title);
        for (const titles of Object.values(field.ideas)) expect(titles.length).toBeLessThanOrEqual(12);
        expect(field.suggested_move).toBe('none');
        expect(field.approach.name).toBe('BMA Tutor');
        expect(new TextEncoder().encode(JSON.stringify(field)).length).toBeLessThanOrEqual(900);
      },
    );
  });

  Scenario("The tutor's instructions tell it to teach at his level and to offer the move", ({ Given, Then, And }) => {
    let text = '';
    Given("the bible-talk grind's instructions", () => {
      text = instructionsOf('bible-talk');
    });
    Then('they describe the learner_grammar field', () => {
      expect(text).toContain('`learner_grammar`');
      for (const part of ['`goal`', '`words`', '`ideas`', '`placed`', '`suggested_move`', '`picker_level`', '`approach`']) expect(text).toContain(part);
    });
    And('they pitch frontier ideas with a form from the goal and name a not-yet idea only with its plain meaning', () => {
      expect(text).toMatch(/`frontier` idea is one he is learning now: explain it, and show it with a form from the goal passage/);
      expect(text).toMatch(/`not_yet` idea is one he has not met: name it only with its plain meaning in the same sentence/);
      expect(text).toContain('A `solid` idea needs no explaining');
      expect(text).toContain('never quiz him unasked');
    });
    And('they offer the move with one question when suggested_move is up or down and Move it is Ask, and put pickerGrammar in settings_changes on a yes', () => {
      expect(text).toContain('When `suggested_move` is `up` or `down` and `settings.grammarMove` is "ask", end your answer with ONE question');
      expect(text).toContain('`{"key": "pickerGrammar", "value": "frontier"}`');
      expect(text).toContain('`{"key": "pickerGrammar", "value": "solid"}`');
      expect(text).toContain('`settings_changes`');
    });
    And('they name the approach and its next lesson when he asks what to learn next', () => {
      expect(text).toContain('`approach.next_lesson`');
      expect(text).toContain('asks what to learn next');
    });
  });

  Scenario('Yes to the offer changes New words at and the sheet shows Changed with Undo', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change pickerGrammar solid', () =>
      open(changing({ key: 'pickerGrammar', value: 'solid' })),
    );
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
      await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
      const row = changeRows().find((r) => r.textContent?.includes(text)) as HTMLElement;
      expect(within(row).getByRole('button', { name: 'Undo New words at' })).toHaveTextContent('Undo');
    });
    And('New words at is saved as Solid grammar', async () => expect(await getPickerGrammar()).toBe('solid'));
    When('he taps Undo', () => taps('Undo New words at'));
    Then('New words at is saved as Frontier grammar', async () => {
      await waitFor(async () => expect(await getPickerGrammar()).toBe('frontier'));
    });
  });
  Scenario("The tutor turns a study resource off or on when asked, as the Settings screen's own switch, and Undo puts it back", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change resource.strongs on', () =>
      open(changing({ key: 'resource.strongs', value: 'on' })),
    );
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the sheet shows {string} with an Undo button', async (_, text: string) => {
      await waitFor(() => expect(changeRows().some((row) => row.textContent?.includes(text))).toBe(true));
      const row = changeRows().find((r) => r.textContent?.includes(text)) as HTMLElement;
      expect(within(row).getByRole('button', { name: "Undo Strong's" })).toHaveTextContent('Undo');
    });
    And("the Strong's resource is switched on", async () => expect((await getStudyResources()).on).toEqual(['strongs']));
    When('he taps Undo', () => taps("Undo Strong's"));
    Then("the Strong's resource is switched off", async () => {
      await waitFor(async () => expect((await getStudyResources()).on).toEqual([]));
    });
  });
});
