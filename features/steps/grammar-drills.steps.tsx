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
import { foundationOf } from '../../src/data/grammar/inference';
import { ideaOf, LADDER } from '../../src/data/grammar/ladder';
import { storedId } from '../../src/data/grammar/soundScope';
import { buildIdeaQuestion, type GrammarKind, type GrammarQuestion } from '../../src/data/grammar/questions';
import { splitParse } from '../../src/data/parseCode';
import { mulberry32 } from '../../src/data/quiz';
import { getEvidence, SOLID_STEP } from '../../src/data/repositories';
import { setGoal } from '../../src/data/repositories/settings';
import { seedScheduleIfFirstOpen } from '../../src/data/repositories/reviews';
import { seedHisWords } from '../../tests/support/his-words';
import { DAY } from '../../src/data/schedule';
import { clearBus } from '../../src/events/bus';
import { forgetTrail } from '../../src/nav/lastRoute';
import { GRAMMAR, grammarRandom, gradedVersesOf } from '../../src/review/kinds';
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
  dueStep = 0;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear(), db.drills.clear()]);
  await seedHisWords();
  await seedScheduleIfFirstOpen();
  await db.reviews.clear();
}

/** The step the idea was made due on: from SOLID_STEP up Review may ask a full parsing (the draw is then `strong`). */
let dueStep = 0;

async function makeIdeaDue(id: string, step = 0, rights = 0): Promise<void> {
  dueStep = step;
  const now = Date.now();
  await db.reviews.put({ kind: 'grammar', id, step, rights, due: now - 60_000, lastWhen: now - 3 * DAY, lapses: 0 });
}

/** The ids of the tables the scenario has opened (what Review's draw is given), as the app will have them in the store. */
let opened = new Set<string>();

/** The question the scenario expects to be asked, so a step can tap its right answer. */
let expected: GrammarQuestion | undefined;

/** Makes the app's random the first seed whose draw of `id` over `passage` is a question of `kind`; Review draws from the verses graded to him (gradedVersesOf), so the step does. */
async function drawAs(id: string, passage: Chapter[], kind: GrammarKind, wanted: (q: GrammarQuestion) => boolean = () => true, tablesOpen: ReadonlySet<string> = opened): Promise<void> {
  const graded = await gradedVersesOf(passage);
  for (let s = 1; s < 500; s += 1) {
    const q = buildIdeaQuestion(ideaOf(id), passage, grammarRandom(mulberry32(s)), undefined, undefined, tablesOpen, graded, dueStep >= SOLID_STEP);
    if (q.kind !== kind || !wanted(q)) continue;
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

/** The right uses in a row the evidence holds for the letters, sounds and marks of a Greek form (words split on white space), added up. */
const runsOf = (evidence: Awaited<ReturnType<typeof getEvidence>>, form: string): number =>
  form.split(' ').reduce((all, word) => all + foundationOf(word).reduce((sum, id) => sum + (evidence.get(id)?.run ?? 0), 0), 0);

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

/** The chapter files of the goals the scenarios name. */
const CHAPTER_FILES: Record<string, string> = { '1 John 1': '1jn/1', 'John 1': 'jhn/1', 'Romans 8': 'rom/8' };

/** He knows every word of the chapter. */
async function knowWordsOf(name: string): Promise<void> {
  const file = CHAPTER_FILES[name];
  if (!file) throw new Error(`no chapter file for ${name}`);
  const now = Date.now();
  const lemmas = new Set(chapter(file).verses.flatMap((v) => v.g.map((w) => w.l.normalize('NFC'))));
  await db.words.bulkPut([...lemmas].map((lemma) => ({ lemma, lemmas: [], gloss: 'a word', lesson: 1, state: 'solid' as const, since: now })));
}

/** He knows every word of the chapter and every idea of the ladder, so every verse of it is at his level (gradedVerses). */
async function knowEverything(name: string): Promise<void> {
  await knowWordsOf(name);
  const now = Date.now();
  await db.grammarLevels.bulkPut(LADDER.map((idea) => ({ id: storedId(idea.id, 'modern'), level: 'solid' as const, since: now, how: 'marked' as const })));
}

/** Every idea of the ladder is solid except the verbs' (the tier of verbs), which are not yet: a verse with a verb is not at his level. */
async function knowAllButVerbs(): Promise<void> {
  const now = Date.now();
  await db.grammarLevels.bulkPut(LADDER.map((idea) => ({ id: storedId(idea.id, 'modern'), level: idea.tier === 'verbs' ? ('notYet' as const) : ('solid' as const), since: now, how: 'marked' as const })));
}

/** The answers written for a word to the Parsing drill's table, oldest first. */
const drillRows = async () => (await db.drills.where('lemma').equals(expected!.lemma!).toArray()).sort((a, b) => a.when - b.when || (a.id ?? 0) - (b.id ?? 0));

/** The option with this text on the card now. */
const optionWith = (text: string): HTMLElement => {
  const found = optionButtons().find((o) => o.textContent === text);
  if (!found) throw new Error(`no option "${text}" on screen`);
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
      await drawAs(id, [chapter('1jn/1')], 'ending');
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
      const graded = await gradedVersesOf([chapter('1jn/1')]);
      for (let s = 1; s < 500; s += 1) {
        const shut = buildIdeaQuestion(ideaOf(id), [chapter('1jn/1')], grammarRandom(mulberry32(s)), undefined, undefined, new Set(), graded, dueStep >= SOLID_STEP);
        const open = buildIdeaQuestion(ideaOf(id), [chapter('1jn/1')], grammarRandom(mulberry32(s)), undefined, undefined, new Set(['noun-endings']), graded, dueStep >= SOLID_STEP);
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
      await drawAs(id, [chapter('1jn/1')], 'tap-form');
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

  Scenario('Review asks what a chunk says', ({ Given, And, When, Then }) => {
    let before = 0;
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('the idea {string} is due', async (_, id: string) => makeIdeaDue(id));
    And('the draw asks {string} as what a chunk says', async (_, id: string) => {
      await drawAs(id, [chapter('1jn/1')], 'meaning');
      before = runsOf(await getEvidence(), expected!.form!);
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the card shows the Greek large with Tap to hear and four English chunks', () => {
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent('What does this say?');
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-kind')).toBe('meaning');
      const form = screen.getByTestId('grammar-form');
      expect(form.textContent).toBe(expected!.form);
      expect(form.className).toMatch(/text-[45]xl/);
      expect(form.getAttribute('lang')).toBe('el');
      expect(screen.getByTestId('tap-to-hear')).toBeTruthy();
      const english = optionButtons().map((b) => b.textContent);
      expect(english).toHaveLength(4);
      expect(new Set(english).size).toBe(4);
      const chunks = new Set(chapter('1jn/1').verses.flatMap((v) => v.e.map((c) => c.t.trim())));
      for (const text of english) expect(chunks.has(text ?? ''), text ?? '').toBe(true);
    });
    When('he taps the right English chunk', async () => user.click(rightOne()));
    Then('the right English chunk turns green', () => {
      expect(rightOne().getAttribute('data-result')).toBe('right');
    });
    And('{string} has one right review and no lapse', async (_, id: string) => {
      await waitFor(async () => expect((await review(id)).rights).toBe(1));
      expect((await review(id)).lapses).toBe(0);
    });
    And('the letters of the chunk are credited', async () => {
      await waitFor(async () => expect(runsOf(await getEvidence(), expected!.form!)).toBeGreaterThan(before));
    });
  });

  Scenario('A strong idea asked what a chunk says shows the Greek and Show reveals the English', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('the idea {string} is due on step {int}', async (_, id: string, step: number) => makeIdeaDue(id, step));
    And('the draw asks {string} as what a chunk says', async (_, id: string) => {
      await drawAs(id, [chapter('1jn/1')], 'meaning');
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the card shows the Greek of a chunk and no options', () => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-mode')).toBe('flashcard');
      expect(screen.getByTestId('grammar-form').textContent).toBe(expected!.form);
      expect(optionButtons()).toHaveLength(0);
      expect(screen.getByTestId('grammar-answer').textContent).toBe('');
    });
    When('he taps Show', async () => user.click(screen.getByRole('button', { name: 'Show' })));
    Then('the English of the chunk is shown', async () => {
      await waitFor(() => expect(screen.getByTestId('grammar-answer').textContent).toBe(expected!.right));
    });
  });

  Scenario('A full parsing in Review', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('he knows every word and every idea of {string}', async (_, name: string) => knowEverything(name));
    And('the idea {string} is due on step {int}', async (_, id: string, step: number) => makeIdeaDue(id, step));
    And('the draw asks {string} as a full parsing of five steps', async (_, id: string) => {
      await drawAs(id, [chapter('1jn/1')], 'parse', (q) => q.steps?.length === 5);
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the card says {string} and asks the part of speech', (_, count: string) => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-kind')).toBe('parse');
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(expected!.prompt);
      expect(screen.getByTestId('grammar-form').textContent).toBe(expected!.form);
      expect(screen.getByTestId('parse-step')).toHaveTextContent(`${count}: part of speech`);
      expect(optionButtons().map((o) => o.textContent).sort()).toEqual([...expected!.steps![0].options].sort());
    });
    When('he taps the right answer at every step', async () => {
      for (const [i, step] of expected!.steps!.entries()) {
        await waitFor(() => expect(screen.getByTestId('parse-step')).toHaveTextContent(`${i + 1} of 5`));
        await user.click(optionWith(step.right));
      }
    });
    Then('the last step turns green and the full parsing is shown', async () => {
      const last = expected!.steps![4];
      expect(optionWith(last.right).getAttribute('data-result')).toBe('right');
      expect(screen.getByTestId('feedback')).toHaveTextContent('Right.');
      expect(screen.getByTestId('parse-full')).toHaveTextContent(expected!.right);
    });
    And('{string} has one right review and no lapse', async (_, id: string) => {
      await waitFor(async () => expect((await review(id)).rights).toBe(1));
      expect((await review(id)).lapses).toBe(0);
    });
    And('five right answers are in the drills table for the word', async () => {
      await waitFor(async () => expect(await drillRows()).toHaveLength(5));
      const rows = await drillRows();
      expect(rows.map((r) => r.step)).toEqual(expected!.steps!.map((s) => s.id));
      expect(rows.every((r) => r.right)).toBe(true);
    });
  });

  Scenario('A wrong step ends a full parsing and shows it in plain words', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('he knows every word and every idea of {string}', async (_, name: string) => knowEverything(name));
    And('the idea {string} is due on step {int}', async (_, id: string, step: number) => makeIdeaDue(id, step));
    And('the draw asks {string} as a full parsing of five steps', async (_, id: string) => {
      await drawAs(id, [chapter('1jn/1')], 'parse', (q) => q.steps?.length === 5);
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    And('he taps the right answer at the first step', async () => user.click(optionWith(expected!.steps![0].right)));
    Then('the card says {string} and asks the tense', async (_, count: string) => {
      await waitFor(() => expect(screen.getByTestId('parse-step')).toHaveTextContent(`${count}: tense`));
    });
    When('he taps a wrong answer', async () => {
      const wrong = optionButtons().find((o) => o.textContent !== expected!.steps![1].right);
      await user.click(wrong!);
    });
    Then('the wrong answer turns red and the right one green', () => {
      expect(optionButtons().filter((o) => o.getAttribute('data-result') === 'wrong')).toHaveLength(1);
      expect(optionWith(expected!.steps![1].right).getAttribute('data-result')).toBe('right');
      expect(screen.getByTestId('parse-step')).toHaveTextContent('2 of 5: tense');
    });
    And('the full parsing is shown in plain words', () => {
      expect(screen.getByTestId('parse-full')).toHaveTextContent(expected!.right);
      expect(screen.getByTestId('parse-full').textContent).toContain('perfect active indicative');
    });
    And('{string} has one wrong review', async (_, id: string) => {
      await waitFor(async () => expect((await review(id)).lapses).toBe(1));
      expect((await review(id)).rights).toBe(0);
    });
    And('two answers are in the drills table for the word, one right and one wrong', async () => {
      await waitFor(async () => expect(await drillRows()).toHaveLength(2));
      expect((await drillRows()).map((r) => [r.step, r.right])).toEqual([['pos', true], ['tense', false]]);
    });
  });

  Scenario('Who does it', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('he knows every word and every idea of {string}', async (_, name: string) => knowEverything(name));
    And('the idea {string} is due', async (_, id: string) => makeIdeaDue(id));
    And('the draw asks {string} as {string}', async (_, id: string, prompt: string) => {
      await drawAs(id, [chapter('jhn/1')], 'roles', (q) => q.prompt === prompt);
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the card shows the words of one verse as buttons under {string}', (_, prompt: string) => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-kind')).toBe('roles');
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(prompt);
      const words = verseWords().map((b) => b.textContent);
      const verse = chapter('jhn/1').verses.find((v) => v.g.map((g) => g.t).join(' ') === words.join(' '));
      expect(verse, 'the buttons are the words of a verse of John 1').toBeTruthy();
      expect(screen.getByTestId('grammar-ref').textContent).toBe(expected!.ref);
    });
    When('he taps the subject', async () => user.click(rightOne()));
    Then('the subject turns green', () => {
      expect(rightOne().getAttribute('data-result')).toBe('right');
      expect(screen.getByTestId('feedback')).toHaveTextContent('Right.');
      // the one who does it is in the nominative
      expect(splitParse(expected!.code!).features.find((f) => f.id === 'case')?.value).toBe('nominative');
    });
    And('{string} has one right review and no lapse', async (_, id: string) => {
      await waitFor(async () => expect((await review(id)).rights).toBe(1));
      expect((await review(id)).lapses).toBe(0);
    });
  });

  Scenario('A clause idea is asked on its verse', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('he knows every word and every idea of {string}', async (_, name: string) => knowEverything(name));
    And('the idea {string} is due', async (_, id: string) => makeIdeaDue(id));
    And('the draw asks {string} as a use in {string}', async (_, id: string, ref: string) => {
      await drawAs(id, [chapter('1jn/1')], 'use', (q) => q.ref === ref);
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the card shows {string} with ἵνα marked and four uses to choose from', (_, ref: string) => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-kind')).toBe('use');
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent('What is ἵνα doing here?');
      expect(screen.getByTestId('grammar-ref').textContent).toBe(ref);
      const marked = [...document.querySelectorAll('[data-marked]')].map((e) => e.textContent!.trim());
      expect(marked).toHaveLength(2);
      expect(marked[0]).toBe('ἵνα');
      expect(screen.getByTestId('use-verse').textContent!.replace(/\s+/g, ' ').trim()).toBe(expected!.words!.join(' '));
      expect(optionButtons()).toHaveLength(4);
    });
    When('he taps the right use', async () => user.click(rightOne()));
    Then('the right use turns green', () => {
      expect(rightOne().getAttribute('data-result')).toBe('right');
      expect(rightOne().textContent).toBe('A clause with ἵνα');
      expect(screen.getByTestId('feedback')).toHaveTextContent('Right.');
    });
    And('{string} has one right review and no lapse', async (_, id: string) => {
      await waitFor(async () => expect((await review(id)).rights).toBe(1));
      expect((await review(id)).lapses).toBe(0);
    });
  });

  Scenario('A strong clause idea shows the verse and Show reveals its use', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('he knows every word and every idea of {string}', async (_, name: string) => knowEverything(name));
    And('the idea {string} is due on step {int}', async (_, id: string, step: number) => makeIdeaDue(id, step));
    And('the draw asks {string} as a use in {string}', async (_, id: string, ref: string) => {
      await drawAs(id, [chapter('1jn/1')], 'use', (q) => q.ref === ref);
    });
    When('Lampas is opened on the Reader', openReader);
    And('he opens Review from Settings', openReviewFromSettings);
    And('he starts the review', start);
    Then('the card shows the verse {string} and the question and no options', (_, ref: string) => {
      expect(screen.getByTestId('grammar-prompt').getAttribute('data-mode')).toBe('flashcard');
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent('What is ἵνα doing here?');
      expect(screen.getByTestId('grammar-ref').textContent).toBe(ref);
      expect(document.querySelectorAll('[data-marked]')).toHaveLength(2);
      expect(optionButtons()).toHaveLength(0);
      expect(screen.getByTestId('grammar-answer').textContent).toBe('');
    });
    When('he taps Show', async () => user.click(screen.getByRole('button', { name: 'Show' })));
    Then('the title of the use is shown', async () => {
      await waitFor(() => expect(screen.getByTestId('grammar-answer').textContent).toBe('A clause with ἵνα'));
    });
  });

  Scenario('A preposition is asked by the case of a real phrase', ({ Given, And, When, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And('the idea {string} is due', async (_, id: string) => makeIdeaDue(id));
    And('the draw asks {string} as a preposition\'s meaning', async (_, id: string) => {
      await drawAs(id, [chapter('1jn/1')], 'preposition');
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
      await drawAs(id, [chapter('1jn/1')], 'tap-form');
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

  Scenario('Review asks from verses at his level', ({ Given, And, Then }) => {
    Given('his goal is {string}', async (_, goal: string) => {
      await freshStore();
      await setGoal(goal);
    });
    And("he knows every word of {string} and every idea but the verbs'", async (_, name: string) => {
      await knowWordsOf(name);
      await knowAllButVerbs();
    });
    And('the idea {string} is due', async (_, id: string) => makeIdeaDue(id));
    Then('{int} draws of {string} are all about {string}, a verse with a genitive and no verb, though other verses have one', async (_, draws: number, id: string, ref: string) => {
      const number = Number(ref.split(':')[1]);
      const romans = chapter('rom/8');
      const hasGenitive = (n: number) => romans.verses.find((v) => v.n === n)!.g.some((w) => /-\d?G[SP]/.test(w.p));
      expect(romans.verses.find((v) => v.n === number)!.g.some((w) => w.p.startsWith('V-'))).toBe(false);
      expect(hasGenitive(number)).toBe(true);
      expect(romans.verses.filter((v) => v.n !== number && hasGenitive(v.n)).length).toBeGreaterThan(5);
      const due = [await review(id)];
      const asked = new Set<string>();
      for (let s = 1; s <= draws; s += 1) {
        const [item] = await GRAMMAR.draw(due, mulberry32(s));
        asked.add(item.kind === 'grammar' ? (item.question.ref ?? item.question.kind) : 'not a grammar item');
      }
      expect([...asked]).toEqual([ref]);
    });
  });
});
