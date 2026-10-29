// features/steps/tutor.steps.tsx — runs features/tutor.feature: the Ask box of the Verse view's Ask the tutor action, the bible-talk grist it
// sends through a fake Postern (tests/support/fake-postern.ts) and the Talk sheet that answers it: the answer, the wait and the failure states
// with Retry (mw-5r3p30.842: the Ask box has no cards of its own). fetch is stubbed: /data/ files from disk, https://postern.allmymind.org to the fake.
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
import { readerOf } from '../../src/nav/route';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { stubRecognizer } from '../../tests/support/fake-recognizer';
import { composerIn, holdBarIn, questionField, typeQuestion } from '../../tests/support/composer';
import { expectKeepsItShort, expectLearnerField, expectTeachesNewWord, instructionsOf } from '../../tests/support/learner';
import { stubClipboard } from '../../tests/support/exchange';
import { makeFakePostern, POSTERN_ORIGIN, SYNERGEI_ANSWER, type FakePostern } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';

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

async function open(configure: (f: FakePostern) => void = (f) => void (f.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER })): Promise<void> {
  cleanup();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  // the composer shows its Hold to ask bar only on a phone with a recogniser
  stubRecognizer();
  stubClipboard();
  fake = makeFakePostern();
  configure(fake);
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear()]);
  await seedHisWords();
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

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const sheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const sendButton = () => within(composerIn(viewEl())).getByRole('button', { name: 'Send' });
const turns = () => Array.from(sheet().querySelectorAll<HTMLElement>('[data-turn]'));

async function ask(question: string): Promise<void> {
  await typeQuestion(user, viewEl(), question);
}

const received = () => {
  expect(fake.received).toHaveLength(1);
  return fake.received[0];
};

const feature = await loadFeature('features/tutor.feature');

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  AfterEachScenario(async () => {
    // an answer still on its way ends as a failure, so it cannot reach the next scenario
    fake?.endAll({ status: 'failed', reason: 'the scenario ended' });
    vi.useRealTimers();
  });
  Scenario("Asking about 8:28 sends a bible-talk grist whose input carries the verse's Greek, English and the question", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the mill received one grist for the lampas app, kind bible-talk', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(received().grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
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
  });

  const answerShowsInSheet = async (): Promise<void> => {
    const dialog = await screen.findByRole('dialog', { name: 'Talk about Romans 8:28' });
    await waitFor(() => expect(turns()).toHaveLength(1));
    expect(dialog).toHaveTextContent(QUESTION);
    expect(turns()[0]).toHaveTextContent(SYNERGEI_ANSWER.answer);
  };

  Scenario('The answer arrives and shows in the Talk sheet the question opened', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the Talk sheet about Romans 8:28 opens and the answer shows in it under his question', answerShowsInSheet);
    And('the answer names the Greek word {string} with its lemma {string}', (_, greek: string, lemma: string) => {
      const list = turns()[0].querySelector('dl') as HTMLElement;
      expect(within(list).getByText(greek, { selector: '[lang="el"]' })).toBeInTheDocument();
      expect(within(list).getByText(lemma, { selector: '[lang="el"]' })).toBeInTheDocument();
      expect(turns()[0]).toHaveTextContent('third person singular');
    });
    And('the Ask box is ready for the next question', () =>
      waitFor(() => {
        expect(holdBarIn(viewEl())).toBeEnabled();
        expect(within(composerIn(viewEl())).queryByRole('textbox', { name: 'Your question' })).toBeNull();
      }),
    );
  });

  Scenario('While the tutor has not answered the Talk sheet says Waiting', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern that holds its answers', () => open((f) => void (f.autoReply = undefined)));
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the Talk sheet says Waiting and nothing can be sent until the answer comes', async () => {
      const dialog = await screen.findByRole('dialog', { name: 'Talk about Romans 8:28' });
      await waitFor(() => expect(within(dialog).getByText(/^Waiting for the tutor… \d+ s$/)).toBeInTheDocument());
      expect(within(dialog).getByRole('button', { name: 'Attach a picture' })).toBeDisabled();
      expect(within(dialog).getByText(QUESTION)).toBeInTheDocument();
    });
    When('the tutor answers', async () => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      fake.answer({ status: 'answered', answer: SYNERGEI_ANSWER });
    });
    Then('the Talk sheet about Romans 8:28 opens and the answer shows in it under his question', answerShowsInSheet);
  });

  Scenario('An unlicensed reply shows No licence in the Talk sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern that holds no licence for this phone', () => open((f) => void (f.licensed = false)));
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the Talk sheet says {string}', async (_, words: string) => {
      const dialog = await screen.findByRole('dialog', { name: 'Talk about Romans 8:28' });
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(words);
    });
    And('the Talk sheet shows no answer', () => {
      expect(turns()).toHaveLength(0);
    });
  });

  Scenario('A backend that cannot be reached shows Could not reach with Retry in the Talk sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern that cannot be reached', () => open((f) => {
      f.autoReply = { status: 'answered', answer: SYNERGEI_ANSWER };
      f.down = true;
    }));
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the Talk sheet says {string} with a Retry button', async (_, words: string) => {
      const dialog = await screen.findByRole('dialog', { name: 'Talk about Romans 8:28' });
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(words);
      expect(within(dialog).getByRole('button', { name: 'Retry' })).toBeEnabled();
    });
    When('the backend comes back and he taps Retry', async () => {
      fake.down = false;
      await user.click(within(sheet()).getByRole('button', { name: 'Retry' }));
    });
    Then('the Talk sheet about Romans 8:28 opens and the answer shows in it under his question', answerShowsInSheet);
  });

  Scenario('Send is not offered with nothing typed', ({ Given, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern', () => open());
    When('he selects verse 28 and taps Type a question', async () => {
      await selectVerse28();
      await questionField(user, viewEl());
    });
    Then('there is no Send button', () => {
      expect(within(composerIn(viewEl())).queryByRole('button', { name: 'Send' })).toBeNull();
    });
    When('he types {string}', async (_, text: string) => {
      await user.type(await questionField(user, viewEl()), text);
    });
    Then('there is still no Send button', () => {
      expect(within(composerIn(viewEl())).queryByRole('button', { name: 'Send' })).toBeNull();
    });
    When('he types {string} instead', async (_, text: string) => {
      const field = await questionField(user, viewEl());
      await user.clear(field);
      await user.type(field, text);
    });
    Then('the Send button is on', () => {
      expect(sendButton()).toBeEnabled();
    });
  });

  Scenario('An answer in the wrong shape is not kept', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern that answers in the wrong shape', () => open((f) => void (f.autoReply = { status: 'answered', answer: { answer: 42 } })));
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    Then('the Talk sheet says {string} with a Retry button', async (_, words: string) => {
      const dialog = await screen.findByRole('dialog', { name: 'Talk about Romans 8:28' });
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(words);
      expect(within(dialog).getByRole('button', { name: 'Retry' })).toBeEnabled();
    });
    And('the Talk sheet shows no answer', () => {
      expect(turns()).toHaveLength(0);
    });
  });

  Scenario("The tutor's instructions ask it to teach a new word in his terms", ({ Given, Then, And }) => {
    let text = '';
    Given("the bible-talk grind's instructions", () => {
      text = instructionsOf('bible-talk');
    });
    Then('they describe the learner field', () => void expectLearnerField(text));
    And('they ask for a new word to be taught with its gloss, a memorable hook and one easy example from the chapter', () => void expectTeachesNewWord(text));
    And('they say to leave out what he already knows and to keep the answer short for a phone', () => void expectKeepsItShort(text));
  });
  Scenario('A verse the tutor names in its answer is a link whose card opens that verse in its chapter', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with a tutor behind a fake Postern that answers with {string}', (_, text: string) =>
      open((f) => void (f.autoReply = { status: 'answered', answer: { answer: text, words: [] } })),
    );
    And('he selects verse 28', selectVerse28);
    When('he asks {string}', (_, question: string) => ask(question));
    And('he taps the link {string} in the answer', async (_, name: string) => {
      await waitFor(() => expect(turns().length).toBe(1));
      await user.click(within(turns()[0]).getByRole('link', { name }));
    });
    And('he taps Open on the reference card', async () => {
      await user.click(await within(await screen.findByRole('dialog', { name: 'Hebrews 7:2' })).findByRole('button', { name: 'Open' }));
    });
    Then('the Reader shows Hebrews 7 with verse 2 brought to the top and no Verse view', async () => {
      await waitFor(() => expect(document.querySelector('[data-brought-verse="2"]')).not.toBeNull());
      expect(screen.queryByRole('region', { name: 'Verse view' })).toBeNull();
      const at = readerOf(window.location.hash);
      expect(at).toMatchObject({ book: 'heb', chapter: 7 });
      expect(at.verse).toBeUndefined();
    });
  });
});
