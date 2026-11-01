// features/steps/practise.steps.tsx — runs features/practise.feature: the Verse view's Practise door and Copywork (mw-5r3p30.899). Postern is the fake
// (tests/support/fake-postern.ts) whose mill answers the copywork grist; jsdom has no canvas, so the picture is cut by a stand-in for imageSeam.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterAll, beforeAll, expect } from 'vitest';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import type { Chapter } from '../../src/data/chapter';
import { imageSeam } from '../../src/images/shrink';
import { phrasesOf } from '../../src/practise/dictation';
import { copyTextOf } from '../../src/practise/copywork';
import { greekLang } from '../../src/speech/greek';
import { hebrewPointedForm } from '../../src/speech/hebrewPronunciation';
import { FakeRecognizer, result, stubRecognizer } from '../../tests/support/fake-recognizer';
import { ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE } from '../../tests/support/fake-speech';
import { endScenario, fake, open, received, synth, user } from './bible-talk/support';

const load = (rel: string) => JSON.parse(readFileSync(rel, 'utf8')) as Chapter;
const john = load('public/data/jhn/1.json');
const genesis = load('public/data/gen/1.json');
const CANTILLATION = /[֑-֯]/;
const realSeam = { ...imageSeam };

/** What the copywork mill answers: every word of the request right but the second (wrong) and the eleventh (missing). */
const judged = (input: Record<string, unknown>) => {
  const words = input.words as string[];
  return {
    readable: true,
    words: words.map((word, i) => ({ word, mark: i === 1 ? 'wrong' : i === 10 ? 'missing' : 'right', ...(i === 1 ? { problem: 'the iota under the eta is missing' } : {}) })),
    fix_first: 'Put the small iota back under the eta of the second word.',
  };
};

/** What the mill answers a dictated page: as `judged`, the second word wrong because it sounds like the verse's. */
const heard = (input: Record<string, unknown>) => {
  const answer = judged(input);
  answer.words = answer.words.map((w, i) => (i === 1 ? { ...w, problem: 'you wrote ἀρχή; it sounds like ἀρχῇ', sounds_alike: true } : w));
  return answer;
};
const PHONE = [ENGLISH_VOICE, GREEK_VOICE, HEBREW_VOICE];

beforeAll(() => {
  imageSeam.decode = async () => ({ width: 1200, height: 800, source: null });
  imageSeam.encode = async () => new Blob([new Uint8Array(60_000).fill(7)], { type: 'image/jpeg' });
});
afterAll(async () => {
  Object.assign(imageSeam, realSeam);
  await endScenario();
});

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const doorEl = () => within(viewEl()).getByRole('list', { name: 'Ways to practise' });
const resultEl = () => viewEl().querySelector<HTMLElement>('[data-copywork-result]') as HTMLElement;
const sent = (count = 1) => waitFor(() => expect(fake.received).toHaveLength(count));

const feature = await loadFeature('features/practise.feature');

describeFeature(feature, ({ Scenario, AfterEachScenario }) => {
  AfterEachScenario(async () => {
    await endScenario();
  });

  const openOn = (place: string, reply: (input: Record<string, unknown>) => unknown, speaks = false) => () =>
    open((f) => {
      f.autoReply = { status: 'answered', answer: {} };
      f.replyFor = (input, kind) => (kind === 'copywork' ? { status: 'answered', answer: reply(input) } : undefined);
    }, speaks ? PHONE : false, place);
  const tapVerse = async (_: unknown, n: number) => {
    await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
    await screen.findByRole('region', { name: 'Verse view' });
  };
  const choose = async (_: unknown, name: string) => {
    await user.click(await within(viewEl()).findByRole('button', { name, exact: true }));
  };
  const attach = async () => {
    const picker = await waitFor(() => {
      const found = viewEl().querySelector<HTMLInputElement>('input[type="file"]:not([capture])');
      if (!found) throw new Error('no picture picker');
      return found;
    });
    await user.upload(picker, new File([new Uint8Array(2_000)], 'page.jpg', { type: 'image/jpeg' }));
  };
  const languages = (...names: string[]) => async () => {
    const group = await within(viewEl()).findByRole('group', { name: 'Copy in' });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(names);
  };
  const tryAgain = async () => {
    expect(await within(viewEl()).findByRole('button', { name: 'Try again' })).toBeEnabled();
  };
  const dictationGroup = () => within(viewEl()).findByRole('group', { name: 'Dictate in' });
  const lastSaid = () => {
    const spoken = synth?.spoken ?? [];
    expect(spoken.length).toBeGreaterThan(0);
    return spoken[spoken.length - 1];
  };
  const grist = async (_: unknown, language: string, reference: string) => {
    await sent();
    expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'copywork', v: '1' });
    expect(received(0).input).toMatchObject({ language, reference });
  };

  Scenario('The Practise door lists copywork, narration, dictation, summary and the quiz, and summary says soon', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a copywork tutor behind a fake Postern', openOn('#/?b=jhn&c=1', judged));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    Then('the Practise door lists {string}, {string}, {string}, {string} and {string} in that order', (_, a: string, b: string, c: string, d: string, e: string) => {
      const names = Array.from(doorEl().querySelectorAll('li')).map((li) => li.querySelector('button')?.getAttribute('aria-label'));
      expect(names).toEqual([a, b, c, d, e]);
    });
    And('{string} says soon and cannot be opened', (_, name: string) => {
      const button = within(doorEl()).getByRole('button', { name, exact: true });
      expect(button).toBeDisabled();
      expect(button.parentElement?.querySelector('[data-soon]')?.textContent).toBe('soon');
      for (const name of ['Copywork', 'Narration', 'Dictation', 'Quiz']) expect(within(doorEl()).getByRole('button', { name, exact: true })).toBeEnabled();
    });
  });

  Scenario('Copywork on John 1:1 in Greek: the page is photographed and each word is marked', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a copywork tutor behind a fake Postern', openOn('#/?b=jhn&c=1', judged));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    Then('copywork offers the languages {string} and {string}', (_, a: string, b: string) => languages(a, b)());
    When('he chooses the copywork language {string}', choose);
    Then('the verse to copy is shown in Greek', () => {
      const text = viewEl().querySelector<HTMLElement>('[data-copywork-text]') as HTMLElement;
      expect(text).toHaveAttribute('lang', 'el');
      expect(text).toHaveAttribute('data-lang', 'grc');
      expect(text.textContent).toBe(john.verses[0].g.map((w) => w.t).join(' '));
    });
    When('he attaches a picture of the page', attach);
    Then('the mill received one grist for the lampas app, kind copywork, in Greek about {string}', (_, reference: string) => grist(_, 'grc', reference));
    And("that grist carries the verse's Greek words and one picture", () => {
      expect(received(0).input.words).toEqual(john.verses[0].g.map((w) => w.t));
      expect(received(0).attachments).toHaveLength(1);
      expect(received(0).attachments[0].mime).toBe('image/jpeg');
    });
    And('the result marks the words: right, with the second wrong and the eleventh missing', async () => {
      await waitFor(() => expect(resultEl()).not.toBeNull());
      const marks = Array.from(resultEl().querySelectorAll('[data-copy-word]')).map((w) => w.getAttribute('data-mark'));
      expect(marks).toHaveLength(john.verses[0].g.length);
      expect(marks[1]).toBe('wrong');
      expect(marks[10]).toBe('missing');
      expect(marks.filter((m) => m === 'right')).toHaveLength(marks.length - 2);
      expect(resultEl()).toHaveTextContent('the iota under the eta is missing');
    });
    And('the result says what to fix first', () => {
      expect(resultEl().querySelector('[data-fix-first]')).toHaveTextContent('Put the small iota back under the eta of the second word.');
    });
    And('a {string} button is offered', tryAgain);
  });

  Scenario('A photo the tutor cannot read says so and offers Try again', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a copywork tutor that cannot read the page', openOn('#/?b=jhn&c=1', () => ({ readable: false, words: [], fix_first: 'The photo is too dark to read; take it again in better light.' })));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    And('he attaches a picture of the page', attach);
    Then('the result says the page could not be read, with no word marked', async () => {
      await waitFor(() => expect(resultEl()).not.toBeNull());
      expect(resultEl()).toHaveTextContent('could not read');
      expect(resultEl().querySelectorAll('[data-copy-word]')).toHaveLength(0);
      expect(resultEl()).toHaveTextContent('too dark to read');
    });
    And('a {string} button is offered', tryAgain);
  });

  Scenario('Copywork on Genesis 1:1 is offered in English and Hebrew, and the Hebrew is copied with its points', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Genesis 1 with a copywork tutor behind a fake Postern', openOn('#/?b=gen&c=1', judged));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    Then('copywork offers the languages {string} and {string}', (_, a: string, b: string) => languages(a, b)());
    When('he chooses the copywork language {string}', choose);
    Then('the verse to copy is shown in Hebrew, pointed, right to left', () => {
      const text = viewEl().querySelector<HTMLElement>('[data-copywork-text]') as HTMLElement;
      expect(text).toHaveAttribute('lang', 'he');
      expect(text).toHaveAttribute('dir', 'rtl');
      expect(text.textContent).toBe(genesis.verses[0].g.map((w) => hebrewPointedForm(w.t)).join(' '));
      expect(text.textContent).not.toMatch(CANTILLATION);
    });
    When('he attaches a picture of the page', attach);
    Then('the mill received one grist for the lampas app, kind copywork, in Hebrew about {string}', (_, reference: string) => grist(_, 'hbo', reference));
    And("that grist carries the verse's pointed Hebrew words and one picture", () => {
      expect(received(0).input.words).toEqual(genesis.verses[0].g.map((w) => hebrewPointedForm(w.t)));
      expect(received(0).attachments).toHaveLength(1);
    });
  });
  const dictationLanguages = async (_: unknown, a: string, b: string) => {
    const group = await dictationGroup();
    expect(within(group).getAllByRole('button').map((x) => x.textContent)).toEqual([a, b]);
  };
  const hidden = () => {
    expect(viewEl().querySelector('[data-dictation-hidden]')).not.toBeNull();
    expect(viewEl().querySelector('[data-dictation-text]')).toBeNull();
    expect(viewEl().querySelector('[data-sheet-verse]')).toBeNull();
  };
  const says = async (_: unknown, line: string) => {
    await waitFor(() => expect(viewEl()).toHaveTextContent(line));
  };
  const offered = (_: unknown, name: string, other: string) => {
    expect(within(viewEl()).getByRole('button', { name, exact: true })).toBeEnabled();
    expect(within(viewEl()).queryByRole('button', { name: other, exact: true })).toBeNull();
  };
  const listenThrough = async (_: unknown, count: number) => {
    for (let i = 1; i < count; i++) await choose(_, 'Next');
  };
  const sayEnglish = (_: unknown, phrase: string) => {
    expect(lastSaid()).toMatchObject({ text: phrase, lang: 'en-US' });
  };
  const phrasesAre = (language: 'en' | 'grc' | 'hbo', verses: Chapter['verses']) => async (_: unknown, ...phrases: string[]) => {
    expect(phrasesOf(copyTextOf(verses[0], language), language)).toEqual(phrases);
    await waitFor(() => expect(viewEl().querySelector('[data-phrase-total]')).toHaveAttribute('data-phrase-total', String(phrases.length)));
    for (const phrase of phrases) expect(phrase.split(' ').length).toBeLessThanOrEqual(6);
  };
  const firstSaidIn = (lang: () => string) => () => {
    const spoken = lastSaid();
    expect(spoken.text.length).toBeGreaterThan(0);
    expect(spoken.lang).toBe(lang());
  };

  Scenario('Dictation on John 1:1 in English: the verse is hidden and the app reads it a phrase at a time', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a dictation tutor behind a fake Postern and a phone that speaks', openOn('#/?b=jhn&c=1', heard, true));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    Then('dictation offers the languages {string} and {string}', dictationLanguages);
    And('the verse is hidden while he writes', hidden);
    And('nothing is said yet', () => expect(synth?.spoken ?? []).toHaveLength(0));
    When('he starts with {string}', choose);
    Then('the phone says {string} in English', sayEnglish);
    And('dictation says {string}', says);
    When('he asks for it again with {string}', choose);
    Then('the phone repeats {string} in English', sayEnglish);
    When('he goes on with {string}', choose);
    Then('the phone now says {string} in English', sayEnglish);
    And('dictation now says {string}', says);
    When('he goes on to the last phrase with {string}', choose);
    Then('the phone last says {string} in English', sayEnglish);
    And('dictation last says {string}', says);
    And('{string} is offered in place of {string}', offered);
    And('the verse is still hidden while he writes', hidden);
  });

  Scenario('Dictation on John 1:1 in Greek is cut into phrases of at most six words, read in the Greek voice', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a dictation tutor behind a fake Postern and a phone that speaks', openOn('#/?b=jhn&c=1', heard, true));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    And('he picks the language {string}', choose);
    Then('the verse is cut into the phrases {string}, {string}, {string} and {string}', phrasesAre('grc', john.verses));
    When('he starts with {string}', choose);
    Then('the phone says its first phrase in the Greek voice', firstSaidIn(greekLang));
    When('he goes on with {string}', choose);
    Then('dictation says {string}', says);
    And('the phone has spoken only in the Greek voice', () => {
      expect(synth?.spoken.length).toBeGreaterThan(1);
      for (const said of synth?.spoken ?? []) expect(said.lang).toBe(greekLang());
    });
  });

  Scenario('Dictation on Genesis 1:1 in Hebrew is cut into phrases of at most six words, read in the Hebrew voice', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on Genesis 1 with a dictation tutor behind a fake Postern and a phone that speaks Hebrew', openOn('#/?b=gen&c=1', heard, true));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    Then('dictation offers the languages {string} and {string}', dictationLanguages);
    When('he picks the language {string}', choose);
    Then('the verse is cut into the phrases {string} and {string}', phrasesAre('hbo', genesis.verses));
    When('he starts with {string}', choose);
    Then('the phone says its first phrase in the Hebrew voice', firstSaidIn(() => 'he-IL'));
  });

  Scenario('A dictated page in Greek is judged, the verse is shown beside the marks, and Try again restarts', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a dictation tutor behind a fake Postern and a phone that speaks', openOn('#/?b=jhn&c=1', heard, true));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    And('he picks the language {string}', choose);
    And('he starts with {string}', choose);
    And('he listens through all {int} phrases', listenThrough);
    Then('{string} is offered in place of {string}', offered);
    When('he attaches a picture of the page', attach);
    Then('the mill received one grist for the lampas app, kind copywork, dictation in Greek about {string}', async (_, reference: string) => {
      await grist(_, 'grc', reference);
      expect(received(0).input).toMatchObject({ mode: 'dictation' });
    });
    And("that grist carries the verse's Greek words and one picture", () => {
      expect(received(0).input.words).toEqual(john.verses[0].g.map((w) => w.t));
      expect(received(0).attachments).toHaveLength(1);
    });
    And('the result marks the words: right, with the second wrong and the eleventh missing', async () => {
      await waitFor(() => expect(resultEl()).not.toBeNull());
      const marks = Array.from(resultEl().querySelectorAll('[data-copy-word]')).map((w) => w.getAttribute('data-mark'));
      expect(marks).toHaveLength(john.verses[0].g.length);
      expect(marks[1]).toBe('wrong');
      expect(marks[10]).toBe('missing');
      expect(marks.filter((m) => m === 'right')).toHaveLength(marks.length - 2);
    });
    And('the result says what to fix first', () => {
      expect(resultEl().querySelector('[data-fix-first]')).toHaveTextContent('Put the small iota back under the eta of the second word.');
    });
    And('the result says the second word sounds alike', () => {
      expect(resultEl()).toHaveTextContent('you wrote ἀρχή; it sounds like ἀρχῇ');
      expect(resultEl().querySelector('[data-sounds-alike]')).not.toBeNull();
    });
    And('the verse is shown beside the marks, in Greek', () => {
      const text = viewEl().querySelector<HTMLElement>('[data-dictation-text]') as HTMLElement;
      expect(text).toHaveAttribute('lang', 'el');
      expect(text).toHaveAttribute('data-lang', 'grc');
      expect(text.textContent).toBe(john.verses[0].g.map((w) => w.t).join(' '));
      expect(viewEl().querySelector('[data-dictation-hidden]')).toBeNull();
    });
    And('a {string} button is offered', tryAgain);
    When('he taps {string}', choose);
    Then('the verse is hidden while he writes', hidden);
    And('{string} is offered', async (_, name: string) => {
      expect(await within(viewEl()).findByRole('button', { name, exact: true })).toBeEnabled();
    });
  });

  Scenario('A dictated page the tutor cannot read says so, keeps the verse hidden and offers another photo', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a dictation tutor that cannot read the page', openOn('#/?b=jhn&c=1', () => ({ readable: false, words: [], fix_first: 'The photo is too dark to read; take it again in better light.' }), true));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    And('he starts with {string}', choose);
    And('he listens through all {int} phrases', listenThrough);
    And('he attaches a picture of the page', attach);
    Then('the result says the page could not be read, with no word marked', async () => {
      await waitFor(() => expect(resultEl()).not.toBeNull());
      expect(resultEl()).toHaveTextContent('could not read');
      expect(resultEl().querySelectorAll('[data-copy-word]')).toHaveLength(0);
    });
    And('the verse is still hidden while he writes', hidden);
    And('a {string} button is offered', async (_, name: string) => {
      expect(await within(viewEl()).findByRole('button', { name, exact: true })).toBeEnabled();
    });
  });

  // ---- Narration (mw-5r3p30.901) ----
  const ENGLISH_JOHN = john.verses[0].e.map((c) => c.t.trim()).filter(Boolean).join(' ');
  const WRITTEN = 'In the beginning was the word and the word was with god.';
  const narrated = {
    caught: ['In the beginning was the Word', 'The Word was with God'],
    missed: ['The Word was God'],
    in_order: true,
    question: 'What do you think the last part says about who the Word is?',
  };
  const narrationEl = () => viewEl().querySelector<HTMLElement>('[data-narration]') as HTMLElement;
  const listens = (reply: () => { status: 'answered' | 'failed'; answer?: unknown; reason?: string }) => async () => {
    await open((f) => {
      f.autoReply = { status: 'answered', answer: {} };
      f.replyFor = (_input, kind) => (kind === 'narration' ? reply() : undefined);
    }, PHONE, '#/?b=jhn&c=1');
    stubRecognizer();
  };
  const listensOn = (place: string) => async () => {
    await open((f) => {
      f.autoReply = { status: 'answered', answer: {} };
      f.replyFor = (_input, kind) => (kind === 'narration' ? { status: 'answered', answer: narrated } : undefined);
    }, PHONE, place);
    stubRecognizer();
  };
  const holdAndSay = async (_: unknown, words: string) => {
    fireEvent.pointerDown(await within(viewEl()).findByRole('button', { name: /Hold and tell it back|Hold to tell it again/ }), { pointerId: 1, clientX: 10, clientY: 10 });
    await waitFor(() => expect(FakeRecognizer.instances.length).toBeGreaterThan(0));
    const recogniser = FakeRecognizer.last();
    recogniser.open();
    recogniser.say([result(words, false)]);
    fireEvent.pointerUp(await within(viewEl()).findByRole('button', { name: /Release|Let go|Hold and tell it back|Hold to tell it again|talk/i }), { pointerId: 1, clientX: 10, clientY: 10 });
  };
  const englishOnly = () => {
    expect(narrationEl().querySelector('[data-narration-scope]')).toHaveTextContent('Narration is in English. Telling it back in Greek or Hebrew is not offered yet.');
    expect(viewEl().querySelector('[role="group"][aria-label]:is([aria-label="Copy in"],[aria-label="Dictate in"])')).toBeNull();
  };
  const writtenDown = async (_: unknown, text: string) => {
    await waitFor(() => expect(narrationEl().querySelector('[data-narration-written]')).toHaveTextContent(text));
  };
  const narrationGrist = async (_: unknown, reference: string) => {
    await sent();
    expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'narration', v: '1' });
    expect(received(0).input).toMatchObject({ reference });
  };
  const carries = () => {
    expect(received(0).input.passage).toBe(window.location.hash.includes('gen') ? genesisEnglish : ENGLISH_JOHN);
    expect(received(0).input.narration).toMatch(/^[A-Z].*[.!?]$/);
    expect(received(0).attachments).toHaveLength(0);
  };
  const genesisEnglish = genesis.verses[0].e.map((c) => c.t.trim()).filter(Boolean).join(' ');
  const waitForResult = async () => {
    await waitFor(() => expect(narrationEl().querySelector('[data-narration-question]')).not.toBeNull());
  };
  const items = (selector: string) => Array.from(narrationEl().querySelectorAll(`${selector} li`)).map((li) => li.textContent);

  Scenario('Narration on John 1:1 is in English: the verse is shown and Greek or Hebrew narration is said to be out of reach', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a narration tutor behind a fake Postern and a phone that hears', listens(() => ({ status: 'answered', answer: narrated })));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    Then('narration says it is in English and that Greek or Hebrew narration is not offered yet', englishOnly);
    And('the verse is shown in English for him to read first', () => {
      const text = viewEl().querySelector<HTMLElement>('[data-narration-text]') as HTMLElement;
      expect(text).toHaveAttribute('lang', 'en');
      expect(text.textContent).toBe(ENGLISH_JOHN);
    });
    And('the bar {string} is offered', async (_, name: string) => {
      expect(await within(viewEl()).findByRole('button', { name: new RegExp(name) })).toBeEnabled();
    });
    And('nothing has been sent to the tutor', () => {
      expect(fake.received).toHaveLength(0);
    });
  });

  Scenario('He holds and tells John 1:1 back; it is written down and the tutor says what he caught and missed, in order', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a narration tutor behind a fake Postern and a phone that hears', listens(() => ({ status: 'answered', answer: narrated })));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    And('he holds the bar and says {string}', holdAndSay);
    Then('his narration is written down as {string}', writtenDown);
    And('the mill received one grist for the lampas app, kind narration, about {string}', narrationGrist);
    And("that grist carries the verse in English and his written-down narration, and no picture", () => {
      carries();
      expect(received(0).input.narration).toBe(WRITTEN);
    });
    And('the result lists what he caught, in order: {string} and {string}', async (_, a: string, b: string) => {
      await waitForResult();
      expect(items('[data-narration-caught]')).toEqual([a, b]);
    });
    And('the result lists what he missed: {string}', (_, a: string) => {
      expect(items('[data-narration-missed]')).toEqual([a]);
    });
    And('the result asks one gentle question', () => {
      expect(narrationEl().querySelector('[data-narration-question]')).toHaveTextContent(narrated.question);
    });
    And('{string} and {string} are offered', (_, a: string, b: string) => {
      for (const name of [a, b]) expect(within(narrationEl()).getByRole('button', { name, exact: true })).toBeEnabled();
    });
  });

  Scenario('Narration on Genesis 1:1 is in English too, with the English text sent', ({ Given, When, Then, And }) => {
    Given('Lampas is opened on Genesis 1 with a narration tutor behind a fake Postern and a phone that hears', listensOn('#/?b=gen&c=1'));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    Then('narration says it is in English and that Greek or Hebrew narration is not offered yet', englishOnly);
    When('he holds the bar and says {string}', holdAndSay);
    Then('the mill received one grist for the lampas app, kind narration, about {string}', narrationGrist);
    And("that grist carries the verse in English and his written-down narration, and no picture", carries);
  });

  Scenario('A narration can be taken to copywork and back, the tutor\'s answer kept', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a narration tutor behind a fake Postern and a phone that hears', listens(() => ({ status: 'answered', answer: narrated })));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    And('he holds the bar and says {string}', holdAndSay);
    And('he waits for the result', waitForResult);
    And('he taps {string}', choose);
    Then('copywork is open on his narration only in English', async () => {
      const group = await within(viewEl()).findByRole('group', { name: 'Copy in' });
      expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['English']);
    });
    And('the text to copy is {string}', (_, text: string) => {
      const shown = viewEl().querySelector<HTMLElement>('[data-copywork-text]') as HTMLElement;
      expect(shown).toHaveAttribute('lang', 'en');
      expect(shown.textContent).toBe(text);
    });
    When('he attaches a picture of the page', async () => {
      fake.received.length = 0;
      await attach();
    });
    Then('the mill received a copywork grist in English about {string} with his narration\'s words', async (_, reference: string) => {
      await sent();
      expect(received(0).grist).toMatchObject({ kind: 'copywork' });
      expect(received(0).input).toMatchObject({ language: 'en', reference, words: WRITTEN.split(' ') });
    });
    When('he goes back with {string}', async (_, name: string) => {
      await user.click(await within(viewEl()).findByRole('button', { name }));
    });
    Then('narration is open again with his narration and the tutor\'s answer', async () => {
      await waitFor(() => expect(narrationEl().querySelector('[data-narration-written]')).toHaveTextContent(WRITTEN));
      expect(items('[data-narration-caught]')).toEqual(narrated.caught);
      expect(narrationEl().querySelector('[data-narration-question]')).toHaveTextContent(narrated.question);
    });
  });

  Scenario('A narration can be taken to dictation', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a narration tutor behind a fake Postern and a phone that hears', listens(() => ({ status: 'answered', answer: narrated })));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    And('he holds the bar and says {string}', holdAndSay);
    And('he waits for the result', waitForResult);
    And('he taps {string}', choose);
    Then('dictation is open on his narration only in English', async () => {
      const group = await dictationGroup();
      expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['English']);
      await waitFor(() => expect(viewEl().querySelector('[data-phrase-total]')).not.toBeNull());
      expect(viewEl()).toHaveTextContent('My narration of John 1:1');
    });
    And('the verse is hidden while he writes', hidden);
  });

  Scenario('When the tutor cannot answer, his narration is still written down and he can ask again', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on John 1 with a narration tutor that cannot answer, behind a fake Postern and a phone that hears', listens(() => ({ status: 'failed', reason: 'the mill is out' })));
    When('he taps the number of verse {int}', tapVerse);
    And('he chooses {string}', choose);
    And('he opens {string}', choose);
    And('he holds the bar and says {string}', holdAndSay);
    Then('his narration is written down as {string}', writtenDown);
    And('the result says the tutor could not be asked, and a {string} button is offered', async (_, name: string) => {
      await waitFor(() => expect(narrationEl().querySelector('[role="alert"]')).not.toBeNull());
      expect(narrationEl().querySelector('[data-narration-question]')).toBeNull();
      expect(await within(narrationEl()).findByRole('button', { name, exact: true })).toBeEnabled();
    });
  });
});
