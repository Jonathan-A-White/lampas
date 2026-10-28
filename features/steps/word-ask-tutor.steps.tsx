// features/steps/word-ask-tutor.steps.tsx — runs features/word-ask-tutor.feature: Ask the tutor on a word's sheet and on a Quick test
// question, the Talk sheet it opens on the word's verse with a first turn already sent, and the focus the bible-talk grist
// carries (a fake Postern, tests/support/fake-postern.ts, opens the grist and answers it).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { db } from '../../src/data/db';
import { forgetChapters } from '../../src/data/chapter';
import { forgetLexicon } from '../../src/data/lexicon';
import { mulberry32, type Question } from '../../src/data/quiz';
import { clearBus } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GRAMMAR_HELP_ANSWER, makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

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

async function open(hash: string, round?: unknown, settings: Record<string, string> = {}): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  forgetChapters();
  forgetLexicon();
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  if (round) window.localStorage.setItem('lampas.round', JSON.stringify(round));
  window.location.hash = hash;
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_HELP_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.results.clear()]);
  for (const [key, value] of Object.entries(settings)) await db.settings.put({ key, value });
  render(<App newRandom={() => mulberry32(7)} />);
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const wordSheet = () => screen.getByRole('dialog', { name: 'Word' });
const talkSheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const received = (i = 0) => {
  const got = fake.received[i];
  if (!got) throw new Error(`the mill received no grist number ${i + 1}`);
  return got;
};
const focus = () => received().input.focus as Record<string, unknown>;
const question = () => String(received().input.question);

const grists = async (count: number): Promise<void> => {
  await waitFor(() => expect(fake.received).toHaveLength(count));
  for (const got of fake.received) expect(got.grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
};
const titled = async (title: string): Promise<void> => {
  await waitFor(() => expect(talkSheet()).toHaveAccessibleName(title));
};

const AGAPAO: Question = {
  lemma: 'ἀγαπάω', prompt: 'ἀγαπάω', form: 'ἀγαπῶσιν', reference: 'Romans 8:28', chapter: 8, verse: 28,
  gloss: 'to love', options: ['to love', 'to see', 'to hear', 'to write'],
};
const AMEN: Question = { lemma: 'ἀμήν', prompt: 'ἀμήν', gloss: 'truly', options: ['truly', 'and', 'but', 'not'] };
const NOMOS: Question = {
  lemma: 'νόμος', prompt: 'νόμος', form: 'νόμος', reference: 'Romans 8:2', chapter: 8, verse: 2,
  gloss: 'law', options: ['law', 'sin', 'spirit', 'flesh'],
};

const tapWrongGloss = async (): Promise<void> => {
  const wrong = [...document.querySelectorAll<HTMLElement>('[data-option]')].find((o) => o.textContent !== (document.querySelector('[data-testid=prompt]')?.getAttribute('data-lemma') === 'νόμος' ? 'law' : 'truly'));
  if (!wrong) throw new Error('no wrong gloss');
  await user.click(wrong);
};
const tapsAskOnQuestion = async (): Promise<void> => {
  await user.click(await screen.findByRole('button', { name: 'Ask the tutor' }));
};
const resume = async (): Promise<void> => {
  await user.click(await screen.findByRole('button', { name: 'Resume' }));
  await screen.findByTestId('prompt');
};

const feature = await loadFeature('features/word-ask-tutor.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario("Ask the tutor on the word sheet opens the Talk sheet on the word's verse with the word, its lemma and its parsing", ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 behind a fake Postern', async () => {
      await open('');
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    And('he taps {string} in verse {int}', async (_, text: string, verse: number) => {
      await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
      await screen.findByRole('dialog', { name: 'Word' });
    });
    Then('the word sheet has an Ask the tutor button', () => {
      expect(within(wordSheet()).getAllByRole('button', { name: 'Ask the tutor' })).toHaveLength(1);
    });
    When('he taps Ask the tutor on the word sheet', async () => {
      await user.click(within(wordSheet()).getByRole('button', { name: 'Ask the tutor' }));
    });
    Then('the word sheet is gone and the sheet is titled {string}', async (_, title: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
      await titled(title);
    });
    And('the mill received {int} grist for the lampas app, kind bible-talk', (_, count: number) => grists(count));
    And('the grist carries the focus form {string}, lemma {string}, parse {string} and kind word', (_, form: string, lemma: string, parse: string) => {
      expect(focus()).toEqual({ form, lemma, parse, kind: 'word' });
    });
    And('the grist carries the reference {string}', (_, reference: string) => expect(received().input.reference).toBe(reference));
    And('the grist question names the word, its lemma, its parsing and the reference', () => {
      for (const part of [FORM, LEMMA, PARSE, 'Romans 8:28']) expect(question()).toContain(part);
    });
  });

  Scenario('Ask the tutor on a Quick test question sends the word, the question and his answers so far', ({ Given, When, And, Then }) => {
    Given('Lampas is opened on the Quick test behind a fake Postern, on the third question of a round where he got one right and one wrong', async () => {
      await open('#/test', {
        questions: [AGAPAO, AMEN, NOMOS],
        index: 2,
        picked: null,
        missed: [AMEN],
        answers: [
          { lemma: 'ἀγαπάω', picked: 'to love', right: true },
          { lemma: 'ἀμήν', picked: 'and', right: false },
        ],
      });
      await resume();
    });
    When('he taps a wrong gloss', tapWrongGloss);
    And('he taps Ask the tutor on the question', tapsAskOnQuestion);
    Then('the Reader is open with the sheet titled {string}', async (_, title: string) => {
      await screen.findByRole('dialog', { name: /^Talk about / });
      await titled(title);
    });
    And('the mill received {int} grist for the lampas app, kind bible-talk', (_, count: number) => grists(count));
    And('the grist carries the quiz focus for the word {string} as {string} in {string} with Strong\'s {string}', (_, lemma: string, form: string, parse: string, strongs: string) => {
      expect(focus()).toMatchObject({ kind: 'quiz', lemma, form, parse, strongs, pos: 'noun' });
    });
    And('the quiz focus holds the question {string}, the gloss he chose, the right gloss {string} and the two earlier answers', (_, asked: string, correct: string) => {
      expect(focus()).toMatchObject({
        question: asked,
        choices: NOMOS.options,
        picked: 'sin',
        correct,
        right: false,
        answers: [
          { lemma: 'ἀγαπάω', picked: 'to love', right: true },
          { lemma: 'ἀμήν', picked: 'and', right: false },
        ],
      });
    });
    And('the grist carries the reference {string}', (_, reference: string) => expect(received().input.reference).toBe(reference));
    And('the grist question names the word, the gloss he chose and the right one', () => {
      for (const part of ['νόμος', '“sin”', '“law”']) expect(question()).toContain(part);
    });
  });

  Scenario("A word with no verse of its own asks from the chapter's first verse and carries no parsing", ({ Given, When, And, Then }) => {
    Given('Lampas is opened on the Quick test behind a fake Postern, on a word with no verse of its own', async () => {
      await open('#/test', { questions: [AMEN, AMEN], index: 0, picked: null, missed: [] });
      await resume();
    });
    When('he taps a wrong gloss', tapWrongGloss);
    And('he taps Ask the tutor on the question', tapsAskOnQuestion);
    Then('the Reader is open with the sheet titled {string}', async (_, title: string) => {
      await screen.findByRole('dialog', { name: /^Talk about / });
      await titled(title);
    });
    And('the grist carries the quiz focus for the word {string} with no form, no parsing and no earlier answers', async (_, lemma: string) => {
      await grists(1);
      const sent = focus();
      expect(sent).toMatchObject({ kind: 'quiz', lemma, answers: [] });
      expect(sent).not.toHaveProperty('form');
      expect(sent).not.toHaveProperty('parse');
    });
  });

  // a Hebrew word of Jonah 1 (the copy of the built chapter in tests/fixtures/data), in the Hebrew view, with the Hebrew dial at All
  const openHebrew = async (): Promise<void> => {
    await open('#/?b=jon&c=1', undefined, { hebrewInterest: '5', readerView: 'greek' });
    await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  };
  const tapsHebrewWord = async (_: unknown, text: string, verse: number): Promise<void> => {
    await user.click(await within(verseEl(verse)).findByText((_c, el) => el?.hasAttribute('data-word') === true && (el.textContent ?? '').replace(/\s+/g, ' ').trim() === text));
    await screen.findByRole('dialog', { name: 'Word' });
  };
  const HE_FORM = 'נִינְוֵה';
  const HE_PARSE = 'Noun - proper - feminine singular';
  const sheetTitled = async (_: unknown, title: string): Promise<void> => {
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
    await titled(title);
  };

  Scenario('Ask the tutor on the sheet of a Hebrew word sends the word with its language', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Jonah 1 in the Hebrew view behind a fake Postern', openHebrew);
    And('he taps the Hebrew word {string} in verse {int}', tapsHebrewWord);
    When('he taps Ask the tutor on the word sheet', async () => {
      await user.click(within(wordSheet()).getByRole('button', { name: 'Ask the tutor' }));
    });
    Then('the word sheet is gone and the sheet is titled {string}', sheetTitled);
    And('the mill received {int} grist for the lampas app, kind bible-talk', (_, count: number) => grists(count));
    And('the grist carries the Hebrew focus form {string}, lemma {string}, parse {string} and kind word', (_, form: string, lemma: string, parse: string) => {
      expect(focus()).toEqual({ form, lemma, parse, kind: 'word', language: 'he' });
      expect([form, parse]).toEqual([HE_FORM, HE_PARSE]);
    });
    And('the grist question names the word, its lemma, its parsing and the reference {string}', (_, reference: string) => {
      for (const part of [HE_FORM, HE_PARSE, reference]) expect(question()).toContain(part);
    });
  });

  Scenario('Ask the tutor on the Grammar sheet of a term of a Hebrew word sends the term', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Jonah 1 in the Hebrew view behind a fake Postern', openHebrew);
    And('he taps the Hebrew word {string} in verse {int}', tapsHebrewWord);
    When('he taps the parsing term {string} on the word sheet', async (_, term: string) => {
      await user.click(within(within(wordSheet()).getByTestId('sheet-parse')).getByRole('button', { name: term }));
    });
    And('he taps Ask the tutor on the Grammar sheet', async () => {
      await user.click(within(await screen.findByRole('dialog', { name: 'Grammar' })).getByRole('button', { name: 'Ask the tutor' }));
    });
    Then('the word sheet is gone and the sheet is titled {string}', sheetTitled);
    And('the grist carries the term focus {string} of kind grammar-term', async (_, term: string) => {
      await grists(1);
      expect(focus()).toEqual({ term, kind: 'grammar-term' });
    });
    And('the grist question asks to explain {string} and names {string}', (_, term: string, reference: string) => {
      for (const part of [`“${term}”`, reference]) expect(question()).toContain(part);
    });
  });
});
