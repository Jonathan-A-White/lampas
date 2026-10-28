// features/steps/hebrew-quiz.steps.tsx — runs features/hebrew-quiz.feature: Quiz me on an Old Testament verse (the Verse view's action, the Talk sheet's quiz mode, the bible-talk grist with the verse's `hebrew`), a
// question the mill wrote on a Hebrew idea drawn right to left and graded, and a known Hebrew idea due in Review (mw-gdcyf98.21). Postern is the fake (tests/support/fake-postern.ts); fetch serves the chapters from disk.
import '@testing-library/react/dont-cleanup-after-each';
import { readFileSync } from 'node:fs';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, beforeAll, expect, vi } from 'vitest';
import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { markSupplied, type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { buildDrillItemsRequest, checkedItems, type DrillItemsRequest } from '../../src/data/grammar/fetchedItems';
import { hebrewFormOf, hebrewIdeasOfWord } from '../../src/data/grammar/hebrew/wordQuestions';
import { ideaOfAny } from '../../src/data/grammar/ladders';
import { mulberry32 } from '../../src/data/quiz';
import { saveFetchedItems } from '../../src/data/repositories';
import { teachIdea } from '../../src/data/repositories/grammarLevels';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { whenIdle } from '../../src/review/moreItems';
import { setCurrentLicence } from '../../src/services/licenceNow';
import { tutorTimings } from '../../src/services/tutor';
import { usageWritesSettled } from '../../src/tips/usageLog';
import { hebrewPointedForm } from '../../src/speech/hebrewPronunciation';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { makeFakePostern, POSTERN_ORIGIN, QUIZ_ANSWER } from '../../tests/support/fake-postern';
import { seedHisWords } from '../../tests/support/his-words';
import { endScenario, fake, open, received, user } from './bible-talk/support';

const load = (rel: string) => JSON.parse(readFileSync(rel, 'utf8')) as Chapter;
const jonah = load('tests/fixtures/data/jon/1.json');
const genesis = load('public/data/gen/1.json');
const rom8 = load('public/data/rom/8.json');
const verseOf = (chapter: Chapter, n: number) => {
  const v = chapter.verses.find((x) => x.n === n);
  if (!v) throw new Error(`no verse ${n}`);
  return v;
};
const CANTILLATION = /[֑-֯]/;
const PHONE_KEY = '00'.repeat(31) + '0e';
const LEVELS: Record<string, string> = { Curious: '1', 'Just English': '0' };
const MILL_PROMPT = 'Tap a word with the article';

beforeAll(() => {
  // an ask-ahead that ends with a refusal is warned about, as it is in the app
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterAll(async () => {
  cleanup();
  clearBus();
  await whenIdle();
  await usageWritesSettled();
});

const viewEl = () => screen.getByRole('region', { name: 'Verse view' });
const actionNames = (): string[] =>
  within(within(viewEl()).getByRole('group', { name: 'Actions' }))
    .getAllByRole('button')
    .map((b) => b.textContent ?? '')
    .filter((name) => !['Copy', 'Copy link', 'Share', 'Copy text'].includes(name) && !/^Copy|^Share/.test(name));

async function openQuiz(place: string, level: string): Promise<void> {
  await open((f) => void (f.autoReply = { status: 'answered', answer: QUIZ_ANSWER }), false, place);
  // the dial is set before the verse is opened: the Verse view reads it
  await db.settings.put({ key: 'hebrewInterest', value: LEVELS[level] ?? '0' });
  await waitFor(async () => expect((await db.settings.get('hebrewInterest'))?.value).toBe(LEVELS[level] ?? '0'));
}

// ---- Review ----

async function freshReviewPhone(): Promise<void> {
  setCurrentLicence('licensed');
  fake?.endAll({ status: 'failed', reason: 'the scenario is over' });
  await whenIdle();
  cleanup();
  clearBus();
  await usageWritesSettled();
  forgetTrail();
  localStorage.clear();
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  tutorTimings.pollMs = 20;
  stubChapterFetch();
  const chapterFetch = globalThis.fetch;
  const postern = makeFakePostern();
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? postern.fetch(input, init) : chapterFetch(input, init)));
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await seedHisWords();
  await seedScheduleIfFirstOpen();
  await db.reviews.clear();
}

async function startRound(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.history.replaceState(null, '', '/#/review');
  render(<App newRandom={() => mulberry32(7)} />);
  await screen.findByRole('heading', { name: 'Review', level: 1 });
  await user.click(await screen.findByRole('button', { name: 'Start' }));
  await waitFor(() => expect(document.querySelector('[data-testid="grammar-prompt"]')).not.toBeNull());
}

const optionButtons = () => [...document.querySelectorAll<HTMLElement>('[data-option]')];
/** Every word on the card is Hebrew: language he, right to left, in the Hebrew face. */
function expectHebrewWords(): void {
  const options = optionButtons();
  expect(options.length).toBe(4);
  for (const option of options) {
    expect(option.getAttribute('lang')).toBe('he');
    expect(option.getAttribute('dir')).toBe('rtl');
    expect(option.classList.contains('script-he')).toBe(true);
  }
}

const feature = await loadFeature('features/hebrew-quiz.feature');

describeFeature(
  feature,
  ({ Scenario, AfterEachScenario }) => {
    AfterEachScenario(async () => {
      await endScenario();
      vi.unstubAllGlobals();
    });

    const tapVerse = async (_: unknown, n: number): Promise<void> => {
      await user.click(await screen.findByRole('button', { name: `Verse ${n}`, exact: true }));
      await screen.findByRole('region', { name: 'Verse view' });
    };
    // the Verse view reads the Hebrew dial when it opens (useHebrewOn: unread counts as 0, so Quiz me is left out) and draws it a moment later: a read taken at once on a loaded host races that read
    const offers = (...names: string[]) => () => waitFor(() => expect(actionNames()).toEqual(names));
    const quizOn = async (): Promise<void> => {
      await user.click(within(viewEl()).getByRole('button', { name: 'Quiz me', exact: true }));
      await user.click(within(viewEl()).getByRole('button', { name: 'Start the quiz', exact: true }));
    };
    const titled = async (_: unknown, title: string) => expect(await screen.findByRole('dialog', { name: title })).toBeInTheDocument();
    const inQuizMode = async (_: unknown, reference: string) => {
      await waitFor(() => expect(fake.received).toHaveLength(1));
      expect(received(0).grist).toMatchObject({ app: 'lampas', kind: 'bible-talk', v: '1' });
      expect(received(0).input.mode).toBe('quiz');
      expect(received(0).input.reference).toBe(reference);
    };

    Scenario("Jonah 1:1's Verse view offers Quiz me and the quiz talk carries the Hebrew", ({ Given, When, Then, And }) => {
      Given('Lampas is opened on Jonah 1 with the Hebrew dial at Curious and a quiz behind a fake Postern', () => openQuiz('#/?b=jon&c=1', 'Curious'));
      When('he taps the number of verse {int}', tapVerse);
      Then('the Verse view offers the actions {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string) => offers(a, b, c, d)());
      When('he chooses {string} and taps {string}', quizOn);
      Then('the sheet is titled {string}', titled);
      And('the mill received one grist for the lampas app, kind bible-talk, in quiz mode about {string}', inQuizMode);
      And('that grist carries the Hebrew of verse 1 pointed, its Hebrew words and the English, and no Greek', () => {
        const input = received(0).input;
        const verse = verseOf(jonah, 1);
        expect(input.hebrew).toBe(verse.g.map((w) => hebrewPointedForm(w.t)).join(' '));
        expect(String(input.hebrew)).not.toMatch(CANTILLATION);
        expect((input.hebrew_words as unknown[]).length).toBeGreaterThan(0);
        expect(input.english).toBe(verse.e.map(markSupplied).join(' '));
        expect('greek' in input).toBe(false);
        expect('greek_words' in input).toBe(false);
      });
    });

    Scenario('At Hebrew 0 an Old Testament verse offers no Quiz me', ({ Given, When, Then }) => {
      Given('Lampas is opened on Jonah 1 with the Hebrew dial at Just English and a quiz behind a fake Postern', () => openQuiz('#/?b=jon&c=1', 'Just English'));
      When('he taps the number of verse {int}', tapVerse);
      Then('the Verse view offers the actions {string}, {string} and {string}', (_, a: string, b: string, c: string) => offers(a, b, c)());
    });

    Scenario("A Greek verse's quiz is as it was", ({ Given, When, Then, And }) => {
      Given('Lampas is opened on Romans 8 with a quiz behind a fake Postern', () => openQuiz('', 'Curious'));
      When('he taps the number of verse {int}', tapVerse);
      Then('the Verse view offers the actions {string}, {string}, {string}, {string} and {string}', (_, a: string, b: string, c: string, d: string, e: string) => offers(a, b, c, d, e)());
      When('he chooses {string} and taps {string}', quizOn);
      Then('the mill received one grist for the lampas app, kind bible-talk, in quiz mode about {string}', inQuizMode);
      And('that grist carries the Greek of verse 11 and the English, and no Hebrew', () => {
        const input = received(0).input;
        const verse = verseOf(rom8, 11);
        expect(input.greek).toBe(verse.g.map((w) => w.t).join(' '));
        expect(input.english).toBe(verse.e.map(markSupplied).join(' '));
        expect('hebrew' in input).toBe(false);
        expect('hebrew_words' in input).toBe(false);
      });
    });

    Scenario('A Hebrew question the mill wrote is drawn right to left and graded', ({ Given, When, Then }) => {
      Given('the Hebrew article is due in Review and the mill wrote a Hebrew item for it', async () => {
        await freshReviewPhone();
        const request = buildDrillItemsRequest([ideaOfAny('he-article')], new Map([['he-article', 2]]), [genesis]) as DrillItemsRequest;
        const sent = request.verses[0];
        const verse = verseOf(genesis, Number(sent.ref.split(':')[1]));
        const right = sent.uses[0].form;
        const others = [...new Set(verse.g.filter((w) => !hebrewIdeasOfWord(genesis, w).includes('he-article')).map(hebrewFormOf))].slice(0, 3);
        const kept = checkedItems({ items: [{ idea: 'he-article', kind: 'tap-form', ref: sent.ref, prompt: MILL_PROMPT, options: [right, ...others], right }] }, request, [genesis]);
        expect(kept, 'the item the mill wrote passes the check').toHaveLength(1);
        await saveFetchedItems(kept);
        const now = Date.now();
        await db.reviews.put({ kind: 'grammar', id: 'he-article', step: 0, rights: 0, due: now - 60_000, lastWhen: now - 3 * DAY, lapses: 0 });
      });
      When('he starts a Review round', startRound);
      Then('the question {string} is drawn with Hebrew words, right to left, in the Hebrew face', (_, prompt: string) => {
        expect(document.querySelector('[data-testid="grammar-prompt"]')).toHaveTextContent(prompt);
        expect(document.querySelector('[data-testid="grammar-prompt"]')?.getAttribute('data-idea')).toBe('he-article');
        expectHebrewWords();
      });
      When('he taps the word with the article', async () => {
        const right = optionButtons().find((o) => hebrewIdeasOfWord(genesis, genesis.verses.flatMap((v) => v.g).find((w) => hebrewFormOf(w) === o.textContent) ?? genesis.verses[0].g[0]).includes('he-article'));
        await user.click(right as HTMLElement);
      });
      Then('the card says {string}', async (_, said: string) => {
        expect(await screen.findByTestId('feedback')).toHaveTextContent(said);
      });
    });

    Scenario('A Hebrew idea he knows comes due in Review and is asked in Hebrew', ({ Given, When, Then }) => {
      Given('he marked the Hebrew article known a month ago', async () => {
        await freshReviewPhone();
        await teachIdea('he-article', 'known', Date.now() - 31 * DAY);
      });
      When('he starts a Review round', startRound);
      Then('Review asks the Hebrew article with Hebrew words, right to left, in the Hebrew face', async () => {
        const prompt = document.querySelector('[data-testid="grammar-prompt"]');
        expect(prompt?.getAttribute('data-idea')).toBe('he-article');
        // a flashcard of a known idea is answered with Show; its words are the same Hebrew words
        const show = screen.queryByRole('button', { name: 'Show' });
        if (show) {
          const words = document.querySelector('[data-testid="verse-words"]');
          expect(words?.getAttribute('lang')).toBe('he');
          expect(words?.getAttribute('dir')).toBe('rtl');
          expect(words?.classList.contains('script-he')).toBe(true);
        } else {
          expectHebrewWords();
        }
      });
    });
  },
);
