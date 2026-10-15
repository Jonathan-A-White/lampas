// features/steps/grammar-drills.steps.tsx — runs features/grammar-drills.feature: Review asks the grammar ideas that are due (src/review/kinds.ts GRAMMAR),
// before the words, from the goal's passage, and each answer goes on the schedule through recordGrammarAnswer.
import '@testing-library/react/dont-cleanup-after-each';
import { render, screen, cleanup, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import type { Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { ideaOf } from '../../src/data/grammar/ladder';
import { buildIdeaQuestion, type GrammarKind, type GrammarQuestion } from '../../src/data/grammar/questions';
import { mulberry32 } from '../../src/data/quiz';
import { setGoal } from '../../src/data/repositories/settings';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { seedHisWords } from '../../tests/support/his-words';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { grammarRandom } from '../../src/review/kinds';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const chapter = (file: string) => JSON.parse(readFileSync(`public/data/${file}.json`, 'utf8')) as Chapter;

/** The seed the app's random starts from; a scenario that needs one kind of question looks for it. */
let seed = 7;

/** A fresh store: words seeded, nothing scheduled, no goal; the scenario adds what it needs. */
async function freshStore(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  stubChapterFetch();
  seed = 7;
  opened = new Set();
  expected = undefined;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear()]);
  await seedHisWords();
  await seedScheduleIfFirstOpen();
  await db.reviews.clear();
}

async function makeIdeaDue(id: string, step = 0, rights = 0): Promise<void> {
  const now = Date.now();
  await db.reviews.put({ kind: 'grammar', id, step, rights, due: now - 60_000, lastWhen: now - 3 * DAY, lapses: 0 });
}

/** The ids of the tables the scenario has opened (what Review's draw is given), as the app will have them in the store. */
let opened = new Set<string>();

/** The question the scenario expects to be asked, so a step can tap its right answer. */
let expected: GrammarQuestion | undefined;

/** Makes the app's random the first seed whose draw of `id` over `passage` is a question of `kind`. */
function drawAs(id: string, passage: Chapter[], kind: GrammarKind, tablesOpen: ReadonlySet<string> = opened): void {
  for (let s = 1; s < 500; s += 1) {
    const q = buildIdeaQuestion(ideaOf(id), passage, grammarRandom(mulberry32(s)), undefined, undefined, tablesOpen);
    if (q.kind !== kind) continue;
    seed = s;
    expected = q;
    return;
  }
  throw new Error(`no seed asks ${id} as ${kind}`);
}

async function openReader(): Promise<void> {
  window.history.replaceState(null, '', '/');
  render(<App newRandom={() => mulberry32(seed)} />);
  await screen.findByRole('button', { name: 'Settings' });
}

async function openReviewFromSettings(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Settings' }));
  await user.click(await screen.findByRole('button', { name: 'Review' }));
  await screen.findByRole('heading', { name: 'Review', level: 1 });
}

async function start(): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Start' }));
  await screen.findByTestId('grammar-prompt');
}

const optionButtons = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-option]')];
const verseWords = (): HTMLElement[] => within(screen.getByTestId('verse-words')).getAllByRole('button');
const review = async (id: string) => {
  const r = await db.reviews.get(['grammar', id]);
  if (!r) throw new Error(`no review for ${id}`);
  return r;
};
const rightOne = (): HTMLElement => {
  const found = optionButtons().find((o) => o.textContent === expected?.right);
  if (!found) throw new Error('the right option is not on screen');
  return found;
};

const feature = await loadFeature('features/grammar-drills.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('Review counts ideas before words', ({ Given, And, When, Then }) => {
    Given('the idea {string} is due', async (_, id: string) => {
      await freshStore();
      await makeIdeaDue(id);
    });
    And('{int} of his words are due', async (_, n: number) => {
      const now = Date.now();
      await db.reviews.bulkPut(['λέγω', 'εἰμί', 'ἀγαπάω'].slice(0, n).map((id, i) => ({ kind: 'word', id, step: 0, rights: 0, due: now - (n - i) * 60_000, lastWhen: now - 3 * DAY, lapses: 0 })));
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    Then('the Review screen says {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.getByTestId('due-today')).toHaveTextContent(text));
    });
  });

  Scenario('A paradigm ending asked and answered right moves the idea on the schedule', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('the idea {string} is due and was right once before', async (_, id: string) => makeIdeaDue(id, 0, 1));
    And('he has opened the table {string}', async (_, id: string) => {
      opened.add(id);
      await db.settings.put({ key: 'paradigmsOpened', value: JSON.stringify([...opened]) });
    });
    And('the draw asks {string} as a paradigm ending', async (_, id: string) => {
      drawAs(id, [chapter('1jn/1')], 'ending');
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the question blanks the end of a form and offers four endings', () => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-kind')).toBe('ending');
      expect(screen.getByTestId('grammar-form').textContent).toMatch(/_$/);
      expect(optionButtons()).toHaveLength(4);
    });
    When('he taps the right ending', async () => user.click(rightOne()));
    Then('the right ending turns green', () => {
      expect(rightOne().getAttribute('data-result')).toBe('right');
      expect(screen.getByTestId('feedback')).toHaveTextContent('Right.');
    });
    And('{string} is on step {int} and due in {int} days', async (_, id: string, step: number, days: number) => {
      await waitFor(async () => expect((await review(id)).step).toBe(step));
      expect(Math.abs((await review(id)).due - (Date.now() + days * DAY))).toBeLessThan(60_000);
    });
    And('{string} is at the frontier', async (_, id: string) => {
      expect((await db.grammarLevels.get(id))?.level).toBe('frontier');
    });
  });

  Scenario('An ending is asked only once its table is open', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('the idea {string} is due', async (_, id: string) => makeIdeaDue(id));
    And('the draw would ask {string} as a paradigm ending if its table were open', async (_, id: string) => {
      // the seed that gives an ending once the table is open also gives the tap the form while it is shut
      for (let s = 1; s < 500; s += 1) {
        const shut = buildIdeaQuestion(ideaOf(id), [chapter('1jn/1')], grammarRandom(mulberry32(s)), undefined, undefined, new Set());
        const open = buildIdeaQuestion(ideaOf(id), [chapter('1jn/1')], grammarRandom(mulberry32(s)), undefined, undefined, new Set(['noun-endings']));
        if (shut.kind !== 'tap-form' || open.kind !== 'ending') continue;
        seed = s;
        expected = open;
        return;
      }
      throw new Error('no seed asks the ending once its table is open');
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the question is to tap the form', () => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-kind')).toBe('tap-form');
    });
    When('he opens the table {string} on the Paradigms screen', async (_, name: string) => {
      window.location.hash = '#/paradigms';
      await user.click(await screen.findByRole('button', { name: new RegExp(`^${name}`) }));
      await screen.findByRole('heading', { name, level: 1 });
      await waitFor(async () => expect((await db.settings.get('paradigmsOpened'))?.value).toContain('noun-endings'));
    });
    And('he opens Review from Settings again', async () => {
      window.location.hash = '#/review';
      await screen.findByRole('heading', { name: 'Review', level: 1 });
    });
    And('he starts the review again', start);
    Then('the question blanks the end of a form and offers four endings', () => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-kind')).toBe('ending');
      expect(screen.getByTestId('grammar-form').textContent).toMatch(/_$/);
      expect(optionButtons()).toHaveLength(4);
    });
    And('there is no {string} button', (_, name: string) => {
      expect(screen.queryByRole('button', { name })).toBeNull();
    });
    When('he taps the right ending', async () => user.click(rightOne()));
    Then('{string} is shown', async (_, name: string) => {
      expect(await screen.findByRole('button', { name })).toBeVisible();
    });
    When('he taps {string}', async (_, name: string) => user.click(screen.getByRole('button', { name })));
    Then('the Paradigms screen shows the table {string} in Study mode', async (_, name: string) => {
      expect(await screen.findByRole('heading', { name, level: 1 })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/paradigms?t=noun-endings');
      expect(screen.getByTestId('mode-help')).toHaveTextContent('Study mode');
    });
    When('he goes Back', async () => {
      window.history.back();
    });
    Then('the Review question is still on screen, answered', async () => {
      expect(await screen.findByTestId('grammar-prompt')).toBeInTheDocument();
      expect(window.location.hash).toBe('#/review');
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-kind')).toBe('ending');
      expect(rightOne().getAttribute('data-result')).toBe('right');
      expect(screen.getByTestId('feedback')).toHaveTextContent('Right.');
    });
  });

  Scenario("Tap the form shows the verse's words and the right one turns green", ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('the idea {string} is due', async (_, id: string) => makeIdeaDue(id));
    And('the draw asks {string} as tap the form', async (_, id: string) => {
      drawAs(id, [chapter('1jn/1')], 'tap-form');
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the question shows the words of one verse as buttons', () => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-kind')).toBe('tap-form');
      const words = verseWords().map((b) => b.textContent);
      expect(words.length).toBeGreaterThan(3);
      const verse = chapter('1jn/1').verses.find((v) => v.g.map((g) => g.t).join(' ') === words.join(' '));
      expect(verse, 'the buttons are the words of a verse of 1 John 1').toBeTruthy();
    });
    When('he taps the right word', async () => user.click(rightOne()));
    Then('the right word turns green', () => {
      expect(rightOne().getAttribute('data-result')).toBe('right');
    });
    And('{string} has one right review and no lapse', async (_, id: string) => {
      await waitFor(async () => expect((await review(id)).rights).toBe(1));
      expect((await review(id)).lapses).toBe(0);
    });
  });

  Scenario('A preposition is asked by the case of a real phrase', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('the idea {string} is due', async (_, id: string) => makeIdeaDue(id));
    And('the draw asks {string} as a preposition\'s meaning', async (_, id: string) => {
      drawAs(id, [chapter('1jn/1')], 'preposition');
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the question shows a New Testament phrase with διά and four meanings', () => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-kind')).toBe('preposition');
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent('διά');
      expect(screen.getByTestId('grammar-form')).toHaveTextContent(String(expected?.form));
      expect(screen.getByTestId('grammar-form').textContent).toMatch(/^δι/);
      expect(screen.getByTestId('grammar-ref').textContent).toMatch(/^\w+ \d+:\d+$/);
      expect(optionButtons()).toHaveLength(4);
    });
    When("he taps the meaning that goes with the phrase's case", async () => user.click(rightOne()));
    Then('the right meaning turns green', () => {
      expect(rightOne().getAttribute('data-result')).toBe('right');
      expect(screen.getByTestId('feedback')).toHaveTextContent('Right.');
    });
    And('{string} has one right review and no lapse', async (_, id: string) => {
      await waitFor(async () => expect((await review(id)).rights).toBe(1));
      expect((await review(id)).lapses).toBe(0);
    });
  });

  Scenario('A strong idea is asked with Show and I knew it', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('the idea {string} is due on step {int}', async (_, id: string, step: number) => makeIdeaDue(id, step));
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the idea is a flashcard with a Show control and no options', () => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-mode')).toBe('flashcard');
      expect(screen.getByRole('button', { name: 'Show' })).toBeVisible();
      expect(optionButtons()).toHaveLength(0);
      expect(screen.getByTestId('grammar-answer').textContent).toBe('');
    });
    When('he taps Show', async () => user.click(screen.getByRole('button', { name: 'Show' })));
    Then('the answer is shown with {string} and {string}', async (_, knew: string, notYet: string) => {
      expect((await screen.findByTestId('grammar-answer')).textContent).not.toBe('');
      expect(screen.getByRole('button', { name: knew })).toBeVisible();
      expect(screen.getByRole('button', { name: notYet })).toBeVisible();
    });
    When('he taps {string}', async (_, name: string) => user.click(screen.getByRole('button', { name })));
    Then('{string} has one right review and no lapse', async (_, id: string) => {
      await waitFor(async () => expect((await review(id)).rights).toBe(1));
      expect((await review(id)).lapses).toBe(0);
    });
  });

  Scenario('A wrong answer brings the idea back tomorrow', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('the idea {string} is due', async (_, id: string) => makeIdeaDue(id));
    And('the draw asks {string} as tap the form', async (_, id: string) => {
      drawAs(id, [chapter('1jn/1')], 'tap-form');
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    And('he taps a wrong word', async () => {
      const wrong = optionButtons().find((o) => o.textContent !== expected?.right);
      if (!wrong) throw new Error('no wrong word');
      await user.click(wrong);
    });
    Then('the wrong word turns red and the right one green', () => {
      expect(optionButtons().filter((o) => o.getAttribute('data-result') === 'wrong')).toHaveLength(1);
      expect(rightOne().getAttribute('data-result')).toBe('right');
    });
    And('{string} is on step {int} and due in {int} day with one lapse', async (_, id: string, step: number, days: number) => {
      await waitFor(async () => expect((await review(id)).lapses).toBe(1));
      const r = await review(id);
      expect(r.step).toBe(step);
      expect(Math.abs(r.due - (Date.now() + days * DAY))).toBeLessThan(60_000);
    });
  });

  Scenario('With no goal the question comes from the chapter he has open', ({ Given, And, When, Then }) => {
    Given('he has 1 John 2 open and no goal', async () => {
      await freshStore();
      localStorage.setItem('lampas.chapter', JSON.stringify({ book: '1jn', chapter: 2 }));
    });
    And('the idea {string} is due', async (_, id: string) => makeIdeaDue(id));
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the question is about a verse of 1 John 2', () => {
      expect(screen.getByTestId('grammar-ref').textContent).toMatch(/^1 John 2:\d+$/);
    });
  });
});
