// features/steps/bible-talk.steps.tsx — runs features/bible-talk.feature: the Talk button, the Talk sheet, the grist it
// sends through a fake Postern (tests/support/fake-postern.ts), the answers shown, read aloud and kept per chapter and
// per verse. fetch is stubbed: /data/ files from disk, https://postern.allmymind.org to the fake. speechSynthesis is a
// fake engine (tests/support/fake-speech.ts) where a scenario listens.
import '@testing-library/react/dont-cleanup-after-each';
import { act, render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { addTurn, getSpeechRate, getTheme, talkRef } from '../../src/data/repositories';
import { clearBus, latest } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, TALK_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { ENGLISH_VOICE, GREEK_VOICE, type FakeSynth, stubSpeech } from '../../tests/support/fake-speech';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verseData = (n: number) => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};
const greekOf = (ns: number[]) => ns.map((n) => verseData(n).g.map((w) => w.t).join(' ')).join(' ');
const englishOf = (ns: number[]) => ns.map((n) => verseData(n).e.map((c) => c.t.trim()).join(' ')).join(' ');

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
  await waitFor(() => expect(screen.getByRole('button', { name: 'Verse 28' })).toHaveAttribute('aria-pressed', 'true'));
}

async function openTalk(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Talk' }));
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
  await turnsKept(1);
  const [turn] = turns();
  expect(within(turn).getByText(QUESTION)).toBeInTheDocument();
  expect(turn).toHaveTextContent(TALK_ANSWER.answer);
}

const received = (i: number) => {
  const got = fake.received[i];
  if (!got) throw new Error(`the mill received no grist number ${i + 1}`);
  return got;
};
const history = (i: number) => received(i).input.history as { q: string; a: string }[];

async function taps(name: string): Promise<void> {
  await user.click(within(sheet()).getByRole('button', { name }));
}

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
      await waitFor(() => expect(engine.spoken.length).toBeGreaterThan(0));
      expect(engine.spoken[0].lang).toBe('en-US');
      expect(engine.spoken[0].text).toBe('In this verse');
      act(() => engine.finish());
      expect(engine.spoken[1].lang).toBe('el-GR');
      expect(engine.spoken[1].text).toBe('συνεργεῖ');
      act(() => engine.finish());
      expect(engine.spoken[2].lang).toBe('en-US');
      expect(engine.spoken[2].text).toContain('means "works together"');
    });
    When('he taps Stop on the answer', () => taps('Stop'));
    Then('the reading stops and the answer can be heard again', () => {
      const engine = synth as FakeSynth;
      expect(engine.calls[engine.calls.length - 1]).toBe('cancel');
      expect(engine.speaking).toBe(false);
      expect(within(turns()[0]).getByRole('button', { name: 'Hear the answer' })).toBeInTheDocument();
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
    And('he selects verse 28 again, so that no verse is selected', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: /^Talk about / })).toBeNull());
      await user.click(screen.getByRole('button', { name: 'Verse 28' }));
      await waitFor(() => expect(screen.getByRole('button', { name: 'Verse 28' })).toHaveAttribute('aria-pressed', 'false'));
    });
    And('he opens Talk again', openTalk);
    Then('the sheet is titled {string}', (_, title: string) => {
      expect(sheet()).toHaveAccessibleName(title);
    });
    And('the sheet shows no turns yet', () => {
      expect(turns()).toHaveLength(0);
      expect(sheet().querySelector('[data-talk-empty]')).not.toBeNull();
    });
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

  Scenario('A change to a setting the app does not have changes nothing and the talk says so', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a talk behind a fake Postern that answers with the change fontColour red', () =>
      open(changing({ key: 'fontColour', value: 'red' })),
    );
    And('he opens Talk', openTalk);
    When('he sends {string}', (_, question: string) => send(question));
    Then('the answer shows in the sheet under his question', async () => {
      await turnsKept(1);
      expect(turns()[0]).toHaveTextContent('Done.');
    });
    And('nothing was changed and the sheet shows no Undo button', async () => {
      expect(await db.settings.count()).toBe(0);
      expect(within(sheet()).queryByRole('button', { name: /^Undo/ })).toBeNull();
      expect(changeRows()).toHaveLength(0);
    });
    And('the sheet says the app has no such setting {string}', (_, key: string) => {
      expect(turns()[0]).toHaveTextContent(`"${key}": the app has no such setting`);
    });
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
    And('the sheet says the Theme does not allow {string}', (_, value: string) => {
      expect(turns()[0]).toHaveTextContent(`Theme: "${value}" is not a value it allows`);
    });
    And('the saved Theme is still Phone', async () => {
      expect(await getTheme()).toBe('phone');
    });
  });
});
