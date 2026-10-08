// features/steps/grammar-terms.steps.tsx — runs features/grammar-terms.feature: the grammar words in the Parsing of the word sheet,
// the Grammar sheet a tap opens (explanation, examples from the chapter, I know this, Ask the tutor), the terms kept as known across
// a reload, and the bible-talk grist Ask the tutor sends to the fake Postern (tests/support/fake-postern.ts).
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { readFileSync } from 'node:fs';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { conceptOf } from '../../src/data/grammar-concepts';
import { clearBus, subscribe, type EventOf } from '../../src/events/bus';
import { stopReading } from '../../src/speech/readAloud';
import { tutorTimings } from '../../src/services/tutor';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GRAMMAR_TERM_ANSWER, makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';

const chapter = JSON.parse(readFileSync('public/data/rom/8.json', 'utf8')) as Chapter;

afterAll(() => {
  cleanup();
  stopReading();
  vi.unstubAllGlobals();
  db.close();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
let fake: FakePostern;
let opened: EventOf<'grammar-term-opened'>[] = [];
let known: EventOf<'grammar-term-known'>[] = [];

/** Opens the app on Romans 8; `fresh` empties the store first (a reopen keeps what the phone kept). */
async function open(fresh: boolean): Promise<void> {
  cleanup();
  stopReading();
  clearBus();
  vi.unstubAllGlobals();
  opened = [];
  known = [];
  window.localStorage.clear();
  window.localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  window.location.hash = '';
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_TERM_ANSWER };
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) =>
    String(input).startsWith(POSTERN_ORIGIN) ? fake.fetch(input, init) : chapterFetch(input, init),
  );
  await db.open();
  if (fresh) await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.talks.clear(), db.grammarKnown.clear()]);
  render(<App />);
  await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
  await waitFor(async () => expect(await db.words.count()).toBeGreaterThan(0));
  subscribe('grammar-term-opened', (event) => opened.push(event));
  subscribe('grammar-term-known', (event) => known.push(event));
}

const verseEl = (n: number): HTMLElement => {
  const el = document.querySelector<HTMLElement>(`[data-verse="${n}"]`);
  if (!el) throw new Error(`no verse ${n} on screen`);
  return el;
};
const wordSheet = () => screen.getByRole('dialog', { name: 'Word' });
const grammarSheet = () => screen.getByRole('dialog', { name: 'Grammar' });
const talkSheet = () => screen.getByRole('dialog', { name: /^Talk about / });
const termLink = (term: string) => within(wordSheet()).getByRole('button', { name: term, exact: true });
const examples = () => within(grammarSheet()).getAllByTestId('grammar-example');
const knowThis = () => within(grammarSheet()).getByRole('button', { name: 'I know this' });
const received = (i: number) => {
  const got = fake.received[i];
  if (!got) throw new Error(`the mill received no grist number ${i + 1}`);
  return got;
};

async function tapsWord(text: string, verse: number): Promise<void> {
  await user.click(within(verseEl(verse)).getByRole('button', { name: text }));
  await screen.findByRole('dialog', { name: 'Word' });
}
async function tapsTerm(term: string): Promise<void> {
  await user.click(termLink(term));
  await screen.findByRole('dialog', { name: 'Grammar' });
}
const marks = async (): Promise<void> => {
  await user.click(knowThis());
};
const shownPlain = (term: string): void => {
  const link = termLink(term);
  expect(link).toHaveAttribute('data-known', 'true');
  expect(link).not.toHaveClass('underline');
};
const shownUnderlined = (term: string): void => {
  const link = termLink(term);
  expect(link).toHaveAttribute('data-known', 'false');
  expect(link).toHaveClass('underline');
};

const feature = await loadFeature('features/grammar-terms.feature');

describeFeature(feature, ({ Scenario }) => {
  const opensRomans8 = () => open(true);

  Scenario('Tapping conjunction on the sheet of γάρ in Romans 8 opens a Grammar sheet with its explanation and up to three examples from the chapter', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with grammar terms behind a fake Postern and no term known', opensRomans8);
    And('he taps {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    Then('the Parsing on the word sheet shows {string} as a link', (_, term: string) => {
      const parse = within(wordSheet()).getByTestId('sheet-parse');
      expect(parse).toHaveTextContent('conjunction');
      expect(within(parse).getByRole('button', { name: term, exact: true })).toHaveClass('underline');
    });
    When('he taps the term {string} on the word sheet', (_, term: string) => tapsTerm(term));
    Then('a Grammar sheet opens over the word sheet titled {string}', (_, term: string) => {
      expect(within(grammarSheet()).getByRole('heading', { name: term })).toBeInTheDocument();
      expect(wordSheet()).toBeInTheDocument();
    });
    And('the Grammar sheet explains it in plain words and says how it shows in Greek', () => {
      const entry = conceptOf('conjunction');
      if (!entry) throw new Error('no entry for conjunction');
      expect(within(grammarSheet()).getByTestId('grammar-explanation')).toHaveTextContent(entry.explanation);
      expect(within(grammarSheet()).getByTestId('grammar-greek')).toHaveTextContent(entry.greek);
    });
    And('the Grammar sheet shows {int} examples from Romans 8, each a conjunction other than {string}', (_, count: number, lemma: string) => {
      const found = examples();
      expect(found).toHaveLength(count);
      for (const example of found) {
        const word = chapter.verses.flatMap((v) => v.g).find((w) => w.t === example.getAttribute('data-form'));
        expect(word, example.textContent ?? '').toBeDefined();
        expect(chapter.parse[word?.p ?? '']).toContain('conjunction');
        expect(word?.l).not.toBe(lemma);
      }
    });
    And('a grammar-term-opened event for {string} was published', (_, term: string) => {
      expect(opened).toEqual([{ kind: 'grammar-term-opened', term }]);
    });
  });

  Scenario('An example opens its own word sheet', ({ Given, And, When, Then }) => {
    let form = '';
    Given('Lampas is opened on Romans 8 with grammar terms behind a fake Postern and no term known', opensRomans8);
    And('he taps {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    And('he taps the term {string} on the word sheet', (_, term: string) => tapsTerm(term));
    When('he taps the first example on the Grammar sheet', async () => {
      const first = examples()[0];
      form = first.getAttribute('data-form') ?? '';
      expect(form).not.toBe('');
      await user.click(first);
    });
    Then('the Grammar sheet is gone and the word sheet is of that example', async () => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Grammar' })).toBeNull());
      expect(within(wordSheet()).getByTestId('sheet-word')).toHaveTextContent(form);
    });
    And('its Parsing names a conjunction', () => {
      expect(within(wordSheet()).getByTestId('sheet-parse')).toHaveTextContent('conjunction');
    });
  });

  Scenario('I know this survives a reload and shows the term plain on every sheet', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with grammar terms behind a fake Postern and no term known', opensRomans8);
    And('he taps {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    And('he taps the term {string} on the word sheet', (_, term: string) => tapsTerm(term));
    When('he marks I know this on the Grammar sheet', marks);
    Then('I know this is pressed and a grammar-term-known event for {string} was published', async (_, term: string) => {
      await waitFor(() => expect(knowThis()).toHaveAttribute('aria-pressed', 'true'));
      expect(known).toEqual([{ kind: 'grammar-term-known', term, known: true }]);
      expect(await db.grammarKnown.get(term)).toBeDefined();
    });
    And('the term {string} is shown plain on the word sheet behind it', (_, term: string) => shownPlain(term));
    When('Lampas is opened again on Romans 8', () => open(false));
    And('he opens the word sheet of {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    Then('the term {string} is shown plain, with no underline, and is still a link', async (_, term: string) => {
      await waitFor(() => shownPlain(term));
    });
    When('he taps {string} again on the word sheet', (_, term: string) => tapsTerm(term));
    Then('I know this is pressed', () => {
      expect(knowThis()).toHaveAttribute('aria-pressed', 'true');
    });
    When('he closes the Grammar sheet and the word sheet', async () => {
      await user.click(within(grammarSheet()).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Grammar' })).toBeNull());
      await user.click(within(wordSheet()).getByRole('button', { name: 'Done' }));
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
    });
    And('he then opens the word sheet of {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    Then('the term {string} is shown underlined', (_, term: string) => shownUnderlined(term));
  });

  Scenario('Marking it again takes the mark off', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with grammar terms behind a fake Postern and no term known', opensRomans8);
    And('he taps {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    And('he taps the term {string} on the word sheet', (_, term: string) => tapsTerm(term));
    And('he marks I know this on the Grammar sheet', marks);
    When('he marks I know this on the Grammar sheet again', async () => {
      await waitFor(() => expect(knowThis()).toHaveAttribute('aria-pressed', 'true'));
      await marks();
    });
    Then('I know this is not pressed and a grammar-term-known event for {string} saying he does not know it was published', async (_, term: string) => {
      await waitFor(() => expect(knowThis()).toHaveAttribute('aria-pressed', 'false'));
      expect(known.at(-1)).toEqual({ kind: 'grammar-term-known', term, known: false });
      expect(await db.grammarKnown.get(term)).toBeUndefined();
    });
    And('the term {string} is shown underlined on the word sheet behind it', (_, term: string) => shownUnderlined(term));
  });

  Scenario('Ask the tutor opens the Talk sheet and sends a bible-talk grist whose focus is the term', ({ Given, And, When, Then }) => {
    Given('Lampas is opened on Romans 8 with grammar terms behind a fake Postern and no term known', opensRomans8);
    And('he taps {string} in verse {int}', (_, text: string, verse: number) => tapsWord(text, verse));
    And('he taps the term {string} on the word sheet', (_, term: string) => tapsTerm(term));
    When('he taps Ask the tutor on the Grammar sheet', async () => {
      await user.click(within(grammarSheet()).getByRole('button', { name: 'Ask the tutor' }));
    });
    Then('the Grammar sheet and the word sheet are gone and the sheet is titled {string}', async (_, title: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Word' })).toBeNull());
      expect(screen.queryByRole('dialog', { name: 'Grammar' })).toBeNull();
      expect(talkSheet()).toHaveAccessibleName(title);
    });
    And('the mill received {int} grist for the lampas app, kind bible-talk', async (_, count: number) => {
      await waitFor(() => expect(fake.received).toHaveLength(count));
      expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
    });
    And('the grist carries the focus term {string} and kind grammar-term', (_, term: string) => {
      expect(received(0).input.focus).toEqual({ term, kind: 'grammar-term' });
    });
    And('the grist question names the term and the reference and asks to explain the grammar term', () => {
      const question = String(received(0).input.question);
      for (const part of ['conjunction', 'Romans 8:2', 'Explain the grammar term']) expect(question).toContain(part);
      expect(received(0).input.reference).toBe('Romans 8:2');
    });
    And('the answer shows in the Talk sheet under the question about the term', async () => {
      const turns = () => Array.from(talkSheet().querySelectorAll<HTMLElement>('[data-turn]'));
      await waitFor(() => expect(turns()).toHaveLength(1));
      expect(turns()[0].querySelector('[data-talk-q]')).toHaveTextContent(String(received(0).input.question));
      expect(turns()[0]).toHaveTextContent(GRAMMAR_TERM_ANSWER.answer);
    });
  });
});
