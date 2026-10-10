// features/steps/tutor.steps.tsx — runs features/tutor.feature: the Ask box of the Verse view's Ask the tutor action, the grist it
// sends through a fake Postern (tests/support/fake-postern.ts), the answer card, the failure states and the
// kept answers. fetch is stubbed: /data/ files from disk, https://postern.allmymind.org to the fake.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { type Chapter, markSupplied } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { expectKeepsItShort, expectLearnerField, expectLearnerSummary, expectTeachesNewWord, instructionsOf, learnWordToday } from '../../tests/support/learner';
import { exchangeMarkdown, stubClipboard } from '../../tests/support/exchange';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;
const verse28 = chapter.verses.find((v) => v.n === 28);
if (!verse28) throw new Error('no verse 28');

afterAll(() => {
  cleanup();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const QUESTION = 'What does συνεργεῖ mean here?';
let fake: FakePostern;
let clipboard = stubClipboard();

async function open(configure: (f: FakePostern) => void = (f) => void (f.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER })): Promise<void> {
  cleanup();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  clipboard = stubClipboard();
  fake = makeFakePostern();
  configure(fake);
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.answers.clear()]);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
}

async function selectVerse28(): Promise<void> {
  const number = await screen.findByRole('button', { name: 'Verse 28' });
  if (number.getAttribute('aria-pressed') !== 'true') await user.click(number);
  const view = await screen.findByRole('region', { name: 'Verse view' });
  await user.click(within(view).getByRole('button', { name: 'Ask the tutor', exact: true }));
  await screen.findByRole('region', { name: 'Ask the tutor' });
}

const askBox = () => screen.getByRole('region', { name: 'Ask the tutor' });
const field = () => within(askBox()).getByRole('textbox', { name: 'Your question' });
const askButton = () => within(askBox()).getByRole('button', { name: 'Ask' });
const answersOn28 = () => document.querySelectorAll('[data-answers-for="28"] [data-answer]');

async function ask(question: string): Promise<void> {
  await user.type(field(), question);
  await user.click(askButton());
}

async function answerShows(): Promise<void> {
  await waitFor(() => expect(answersOn28().length).toBe(1));
}

const cards = () => Array.from(document.querySelectorAll<HTMLElement>('[data-answers-for="28"] [data-answer]'));
const ORDINALS = ['first', 'second'];

/** Asks and waits for the answer card that comes of it (the Ask box is busy until then). */
async function askAndWait(question: string): Promise<void> {
  const before = cards().length;
  await ask(question);
  await waitFor(() => expect(cards().length).toBe(before + 1));
  await waitFor(() => expect(field()).toBeEnabled());
}

const card = (ordinal: string): HTMLElement => cards()[ORDINALS.indexOf(ordinal)];
const copyButton = (ordinal: string) => within(card(ordinal)).getByRole('button', { name: 'Copy this exchange' });

const received = () => {
  expect(fake.received).toHaveLength(1);
  return fake.received[0];
};

const feature = await loadFeature('features/tutor.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario("Asking about 8:28 sends a grist whose input carries the verse's Greek, English, the question and the solid words", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the mill received one grist for the lampas app, kind verse-ask', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      const { grist } = received();
      expect(grist).toMatchObject({ app: 'lampas', kind: 'verse-ask', v: '1' });
    });
    And('its input carries the Greek and the English of verse 28', () => {
      const { input } = received();
      expect(input.reference).toBe('Romans 8:28');
      expect(input.greek).toBe(verse28.g.map((w) => w.t).join(' '));
      expect(input.english).toBe(verse28.e.map(markSupplied).join(' '));
    });
    And('its input carries the question {string}', (_, question: string) => {
      expect(received().input.question).toBe(question);
    });
    And('its input carries his solid words, and not the words he is still learning', async () => {
      const solid = (await db.words.where('state').equals('solid').toArray()).map((w) => w.lemma);
      const learning = (await db.words.where('state').equals('learning').toArray()).map((w) => w.lemma);
      expect(solid.length).toBeGreaterThan(0);
      expect(learning.length).toBeGreaterThan(0);
      const sent = received().input.solid_words as string[];
      expect([...sent].sort()).toEqual([...solid].sort());
      for (const word of learning) expect(sent).not.toContain(word);
    });
  });

  Scenario('The answer arrives and shows under the verse', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the answer shows under verse 28', async () => {
      await answerShows();
      const card = answersOn28()[0] as HTMLElement;
      expect(card).toHaveTextContent(SYNERGEI_ANSWER.answer);
      expect(card).toHaveTextContent(QUESTION);
    });
    And('the answer names the Greek word {string} with its lemma {string}', (_, greek: string, lemma: string) => {
      const card = answersOn28()[0] as HTMLElement;
      const word = within(card).getByText(greek, { selector: '[lang="grc"]' });
      expect(word).toBeInTheDocument();
      expect(within(card).getByText(lemma, { selector: '[lang="grc"]' })).toBeInTheDocument();
      expect(card).toHaveTextContent('third person singular');
    });
    And('the Ask box is ready for the next question', () =>
      waitFor(() => {
        expect(field()).toHaveValue('');
        expect(field()).toBeEnabled();
      }),
    );
  });

  Scenario('What he asked is shown above the answer cleaned up, and the raw words stay kept', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern whose answers clean up his question', () =>
      open((f) => void (f.autoReply = { status: 'answered', answer: { ...SYNERGEI_ANSWER, question: 'Why are there italic words? What does it mean for the words to be italic?' } })),
    );
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the answer card shows the question {string}', async (_, shown: string) => {
      await answerShows();
      expect(answersOn28()[0].querySelector('[data-answer-question]')?.textContent).toBe(shown);
    });
    And('the answer kept on the phone has his raw words {string}', async (_, raw: string) => {
      const kept = await db.answers.toArray();
      expect(kept).toHaveLength(1);
      expect(kept[0].question).toBe(raw);
    });
  });

  Scenario('An answer with no cleaned question shows his raw words above it', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the answer card shows the question {string}', async (_, shown: string) => {
      await answerShows();
      expect(answersOn28()[0].querySelector('[data-answer-question]')?.textContent).toBe(shown);
    });
  });

  Scenario('Copy on an answer card puts the exchange on the clipboard as Markdown', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern whose answers clean up his question', () =>
      open((f) => void (f.autoReply = { status: 'answered', answer: { ...SYNERGEI_ANSWER, question: 'Why are there italic words? What does it mean for the words to be italic?' } })),
    );
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => askAndWait(question));
    And('he taps Copy on the {word} answer card', (_, ordinal: string) => user.click(copyButton(ordinal)));
    Then('the clipboard holds the Markdown of {string} asking {string} answered by the tutor', (_, reference: string, question: string) => {
      expect(clipboard.copied).toEqual([exchangeMarkdown(reference, question, SYNERGEI_ANSWER.answer)]);
    });
    And('the {word} answer card says {string}', async (_, ordinal: string, text: string) => {
      await waitFor(() => expect(within(card(ordinal)).getByRole('status')).toHaveTextContent(text));
    });
  });

  Scenario('With several answers on the screen each Copy copies only its own', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => askAndWait(question));
    And('the tutor will answer {string}', (_, answer: string) => {
      fake.autoReply = { status: 'answered', answer: { ...SYNERGEI_ANSWER, answer } };
    });
    And('he then asks {string}', (_, question: string) => askAndWait(question));
    And('he taps Copy on the {word} answer card', (_, ordinal: string) => user.click(copyButton(ordinal)));
    Then('the clipboard holds the Markdown of {string} asking {string} answered {string}', (_, reference: string, question: string, answer: string) => {
      expect(clipboard.copied).toEqual([exchangeMarkdown(reference, question, answer)]);
    });
    And('the {word} answer card does not say {string}', (_, ordinal: string, text: string) => {
      expect(card(ordinal)).not.toHaveTextContent(text);
    });
    When('he taps Copy on the {word} answer card again', (_, ordinal: string) => user.click(copyButton(ordinal)));
    Then('the clipboard then holds the Markdown of {string} asking {string} answered by the tutor', (_, reference: string, question: string) => {
      expect(clipboard.copied.slice(-1)).toEqual([exchangeMarkdown(reference, question, SYNERGEI_ANSWER.answer)]);
    });
    And('the {word} answer card says {string}', async (_, ordinal: string, text: string) => {
      await waitFor(() => expect(within(card(ordinal)).getByRole('status')).toHaveTextContent(text));
    });
  });

  Scenario('While the tutor has not answered the box says Sending and then Waiting', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern that holds its answers', () => open((f) => void (f.autoReply = undefined)));
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the box says Waiting and nothing can be asked until the answer comes', async () => {
      const status = await within(askBox()).findByRole('status');
      await waitFor(() => expect(status).toHaveTextContent(/^Waiting for the tutor… \d+ s$/));
      expect(field()).toBeDisabled();
      expect(askButton()).toBeDisabled();
    });
    When('the tutor answers', () => {
      fake.answer({ status: 'answered', answer: SYNERGEI_ANSWER });
    });
    Then('the answer shows under verse 28', answerShows);
  });

  Scenario('An unlicensed reply shows No licence', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern that holds no licence for this phone', () => open((f) => void (f.licensed = false)));
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the box says {string}', async (_, words: string) => {
      expect(await within(askBox()).findByRole('alert')).toHaveTextContent(words);
    });
    And('no answer shows under verse 28', () => {
      expect(answersOn28()).toHaveLength(0);
    });
  });

  Scenario('A backend that cannot be reached shows Could not reach with Retry', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern that cannot be reached', () => open((f) => {
      f.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
      f.down = true;
    }));
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the box says {string} with a Retry button', async (_, words: string) => {
      expect(await within(askBox()).findByRole('alert')).toHaveTextContent(words);
      expect(within(askBox()).getByRole('button', { name: 'Retry' })).toBeEnabled();
    });
    When('the backend comes back and he taps Retry', async () => {
      fake.down = false;
      await user.click(within(askBox()).getByRole('button', { name: 'Retry' }));
    });
    Then('the answer shows under verse 28', answerShows);
  });

  Scenario('An answer is still there after reload', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    And('he asks {string}', (_, question: string) => ask(question));
    And('the answer for verse 28 has arrived', answerShows);
    When('he reopens Lampas and selects verse 28', async () => {
      cleanup();
      fake.calls.length = 0;
      render(<App />);
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      await selectVerse28();
    });
    Then('the answer shows under verse 28', async () => {
      await answerShows();
      expect(answersOn28()[0]).toHaveTextContent(SYNERGEI_ANSWER.answer);
    });
    And('the fake Postern was not asked again', () => {
      expect(fake.calls.filter((call) => call.includes('/api/'))).toEqual([]);
    });
  });

  Scenario('Ask cannot be tapped with nothing typed', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    When('he selects verse 28', selectVerse28);
    Then('the Ask button is off', () => {
      expect(askButton()).toBeDisabled();
    });
    When('he types {string}', (_, text: string) => user.type(field(), text));
    Then('the Ask button is still off', () => {
      expect(askButton()).toBeDisabled();
    });
    When('he types {string} instead', (_, text: string) => user.clear(field()).then(() => user.type(field(), text)));
    Then('the Ask button is on', () => {
      expect(askButton()).toBeEnabled();
    });
  });

  Scenario('An answer in the wrong shape is not kept', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern that answers in the wrong shape', () => open((f) => void (f.autoReply = { status: 'answered', answer: { answer: 42 } })));
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the box says {string} with a Retry button', async (_, words: string) => {
      expect(await within(askBox()).findByRole('alert')).toHaveTextContent(words);
      expect(within(askBox()).getByRole('button', { name: 'Retry' })).toBeEnabled();
    });
    And('no answer shows under verse 28', () => {
      expect(answersOn28()).toHaveLength(0);
    });
  });

  Scenario('Asking about a new word sends the learner summary', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    And('he is learning the word {string} which he added today', (_, lemma: string) => learnWordToday(lemma));
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the mill received one grist for the lampas app, kind verse-ask', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(received().grist).toMatchObject({ app: 'lampas', kind: 'verse-ask' });
    });
    And('its input carries a learner summary that names his solid words as a count, {string} among the words he is learning and as new today, and what is due now', (_, lemma: string) =>
      expectLearnerSummary(received().input, lemma),
    );
  });

  Scenario("The tutor's instructions ask it to teach a new word in his terms", ({ Given, Then, And }) => {
    let text = '';
    Given("the verse-ask grind's instructions", () => {
      text = instructionsOf('verse-ask');
    });
    Then('they describe the learner field', () => void expectLearnerField(text));
    And('they ask for a new word to be taught with its gloss, a memorable hook and one easy example from the chapter', () => void expectTeachesNewWord(text));
    And('they say to leave out what he already knows and to keep the answer short for a phone', () => void expectKeepsItShort(text));
  });
  Scenario('Asking about a verse sends learner_grammar, and the instructions say to teach at his level', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the mill received one grist for the lampas app, kind verse-ask', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(received().grist).toMatchObject({ app: 'lampas', kind: 'verse-ask' });
    });
    And('its input carries learner_grammar with no goal and the BMA Tutor approach', () => {
      const field = received().input.learner_grammar as { goal: string | null; approach: { name: string; credit: string } };
      expect(field.goal).toBeNull();
      expect(field.approach).toMatchObject({ name: 'BMA Tutor', credit: 'Biblical Mastery Academy' });
    });
    And('the verse-ask instructions pitch frontier and not-yet ideas and do not offer the move', () => {
      const text = instructionsOf('verse-ask');
      expect(text).toContain('`learner_grammar`');
      expect(text).toContain('A `frontier` idea is explained');
      expect(text).toContain('A `not_yet` idea is named only with its plain meaning');
      expect(text).toContain('do not offer to move New words at here');
    });
  });
});
