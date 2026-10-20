// features/steps/goal-progress.steps.tsx — runs features/goal-progress.feature: the strip under the Reader's header and the Goal screen (#/goal)
// with its two bars, Place me, Learn next, Next words, the lists behind the bars and Read it. The counts the screens show are checked against
// progressToward worked out in the step from the stores, never from the screen's own code path.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { BOOK_INDEX } from '../../src/data/bookIndex';
import type { Chapter } from '../../src/data/chapter';
import { db, type GrammarLevelName, type WordState } from '../../src/data/db';
import { ALWAYS_NEEDED, LADDER } from '../../src/data/grammar/ladder';
import { passageNeeds, progressToward, type Level } from '../../src/data/grammar/needs';
import { clearBus } from '../../src/events/bus';
import { forgetTrail, restoreLastRoute } from '../../src/nav/lastRoute';
import { readerOf } from '../../src/nav/route';
import { parseGoal } from '../../src/data/goal';
import { setGoal } from '../../src/data/repositories/settings';
import { markPassed } from '../../src/data/repositories/passageLessons';
import { parsePassageKey } from '../../src/approaches';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { seedHisWords } from '../../tests/support/his-words';

afterAll(() => {
  cleanup();
  clearBus();
  db.close();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const chapterFile = (book: string, n: number) => JSON.parse(readFileSync(`public/data/${book}/${n}.json`, 'utf8')) as Chapter;

/** Empties every store; `seed` leaves the first-open seeding to the app, otherwise it is marked done so only what a step puts is there. */
async function freshStore(goal: string | undefined, seed: boolean): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  localStorage.clear();
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.settings.clear(), db.reviews.clear(), db.grammarLevels.clear(), db.passageLessons.clear()]);
  if (!seed) await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  if (goal !== undefined) await setGoal(goal);
}

async function openAt(hash: string): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  window.history.replaceState(null, '', `/${hash}`);
  await seedHisWords();
  render(<App />);
}

// Change opens Settings at the Goal section, which scrolls to it; jsdom has no layout to scroll
Element.prototype.scrollIntoView = () => {};

const openGoal = () => openAt('#/goal');

async function putWord(lemma: string, state: WordState): Promise<void> {
  await db.words.put({ lemma, lemmas: [lemma], gloss: '', lesson: 0, state, since: Date.now() });
}
async function putLevel(id: string, level: GrammarLevelName): Promise<void> {
  await db.grammarLevels.put({ id, level, since: Date.now(), how: 'marked' });
}

/** The counts progressToward gives for 1 John 1:1 from what the stores hold now. */
async function expectedProgress() {
  const needs = await passageNeeds({ book: '1jn', chapter: 1, verse: 1 }, async (_, n) => chapterFile('1jn', n), BOOK_INDEX);
  const states = new Map((await db.words.toArray()).map((w): [string, WordState] => [w.lemma, w.state]));
  const levels = new Map((await db.grammarLevels.toArray()).map((row): [string, Level] => [row.id, row.level]));
  return progressToward(needs, states, levels);
}

const strip = () => screen.findByTestId('goal-strip');
const legend = (which: 'words' | 'ideas') => screen.findByTestId(`${which}-legend`);
const sheet = () => screen.findByRole('dialog', { name: 'Idea' });

async function barSays(which: 'words' | 'ideas', solid: number, frontier: number, notYet: number): Promise<void> {
  await waitFor(async () => expect(await legend(which)).toHaveTextContent(`Solid ${solid} · Frontier ${frontier} · Not yet ${notYet}`));
  const bar = screen.getByTestId(`${which}-bar`);
  for (const [name, count] of [['solid', solid], ['frontier', frontier], ['notYet', notYet]] as const) {
    const segment = bar.querySelector(`[data-segment="${name}"]`);
    if (count > 0) expect(segment).toHaveTextContent(String(count));
    else expect(segment).toBeNull();
  }
}

const nextWords = (): string[] => screen.queryAllByTestId('next-word').map((el) => el.getAttribute('data-lemma') ?? '');

/** The marks ideas the words of 1 John 1:1 show beyond the foundation (ἀπ' moves a letter, Ὃ has a twin that a breathing tells apart): textIdeas.ts. */
const MARKS_OF_1JN_1_1 = ['movable-letters', 'marks-change-word'];

const feature = await loadFeature('features/goal-progress.feature');

describeFeature(feature, ({ Scenario }) => {
  const givenGoal = async (_: unknown, goal: string) => freshStore(goal, false);
  const GIVEN_GOAL = 'the goal is {string} and he knows no word and no idea';
  const opensGoal = async () => openGoal();
  const taps = (name: string) => async () => {
    await user.click(await screen.findByRole('button', { name }));
  };
  const ideaSheetOn = async (_: unknown, title: string) => {
    expect(await within(await sheet()).findByRole('heading', { name: title })).toBeInTheDocument();
  };

  Scenario('With the goal 1 John 1:1 and his seed the strip reads the counts of progressToward', ({ Given, Then }) => {
    Given('Lampas is opened on Romans 8 with the goal {string} and his seed words', async (_, goal: string) => {
      await freshStore(goal, true);
      await openAt('');
      await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
    });
    Then('the strip reads {string} with the counts progressToward gives for his words and ideas', async (_, title: string) => {
      const { words, grammar } = await expectedProgress();
      expect(words.solid).toBeGreaterThan(0);
      await waitFor(async () =>
        expect(await strip()).toHaveAccessibleName(`${title}, ${words.solid} of ${words.total} words, ${grammar.solid} of ${grammar.total} ideas`),
      );
    });
  });

  Scenario('No goal, no strip', ({ Given, Then, When }) => {
    Given('Lampas is opened on Romans 8 with no goal', async () => {
      await freshStore(undefined, true);
      await openAt('');
      await waitFor(async () => expect(await db.meta.get('grammarLevelsSeeded')).toBeDefined());
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
    });
    Then('there is no goal strip', () => {
      expect(screen.queryByTestId('goal-strip')).toBeNull();
    });
    When('he sets the goal {string}', async (_, goal: string) => {
      await setGoal(goal);
    });
    Then('the goal strip appears', async () => {
      expect(await strip()).toHaveAccessibleName(/^Goal: 1 John 1:1, /);
    });
    When('he clears the goal', async () => {
      await setGoal('');
    });
    Then('the goal strip is gone', async () => {
      await waitFor(() => expect(screen.queryByTestId('goal-strip')).toBeNull());
    });
  });

  Scenario("The Goal screen's bars count solid, frontier and not yet for words and ideas", ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    And('the words {string} and {string} are solid and {string} and {string} are learning and {string} is dropped', async (_, a: string, b: string, c: string, d: string, e: string) => {
      await Promise.all([putWord(a, 'solid'), putWord(b, 'solid'), putWord(c, 'learning'), putWord(d, 'learning'), putWord(e, 'dropped')]);
    });
    And('the foundation ideas are solid and {string} is frontier', async (_, d: string) => {
      await Promise.all([...ALWAYS_NEEDED.map((id) => putLevel(id, 'solid')), putLevel(d, 'frontier')]);
    });
    When('he opens the Goal screen', opensGoal);
    Then('the title says {string}', async (_, title: string) => {
      expect(await screen.findByTestId('goal-title')).toHaveTextContent(title);
    });
    And('the words bar says solid {int}, frontier {int} and not yet {int}', (_, a: number, b: number, c: number) => barSays('words', a, b, c));
    And('the ideas bar says solid {int}, frontier {int} and not yet {int}', (_, a: number, b: number, c: number) => barSays('ideas', a, b, c));
    And('the screen says {string}', async (_, text: string) => {
      expect(await screen.findByText(new RegExp(text))).toBeInTheDocument();
    });
  });

  Scenario("Learn next names the earliest not-yet idea of the ladder with its lesson and opens its sheet", ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    And('the foundation ideas and the marks it uses are solid and {string} is not yet', async (_, d: string) => {
      await Promise.all([...[...ALWAYS_NEEDED, ...MARKS_OF_1JN_1_1].map((id) => putLevel(id, 'solid')), putLevel(d, 'notYet')]);
    });
    When('he opens the Goal screen', opensGoal);
    Then('Learn next says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
    });
    When('he taps Learn next', async () => {
      await user.click(await screen.findByTestId('learn-next'));
    });
    Then('the idea sheet is open on {string}', ideaSheetOn);
  });

  Scenario('A passage lesson becomes Learn next', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    And('every idea 1 John needs is solid but {string}, which is frontier', async (_, frontier: string) => {
      const needs = await passageNeeds({ book: '1jn' }, async (_, n) => chapterFile('1jn', n), BOOK_INDEX);
      await Promise.all([...new Set([...ALWAYS_NEEDED, ...needs.ideas.map((i) => i.id)])].map((id) => putLevel(id, id === frontier ? 'frontier' : 'solid')));
    });
    When('he opens the Goal screen', opensGoal);
    Then('Learn next says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
    });
    When('he taps Learn next', async () => {
      await user.click(await screen.findByTestId('learn-next'));
    });
    Then('the Verse view is open on 1 John 1:1-4', async () => {
      await waitFor(() => expect(readerOf(window.location.hash)).toMatchObject({ book: '1jn', chapter: 1, passage: 1, passageTo: 4 }));
      expect(await screen.findByRole('heading', { name: '1 John 1', level: 1 })).toBeInTheDocument();
    });
    When('he goes back to the Goal screen', async () => {
      await openGoal();
    });
    And('he has passed the passage {string}', async (_, label: string) => {
      const [, chapter, from, to] = /^1 John (\d+):(\d+)-(\d+)$/.exec(label)!;
      const key = `passage:1jn.${chapter}.${from}-${to}`;
      expect(parsePassageKey(key)).toBeDefined();
      await markPassed(key, 1);
    });
    Then('Learn next now says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
    });
    When('the idea {string} is solid and the idea {string} is not yet', async (_, solid: string, notYet: string) => {
      // one idea at a time (mw-i7xe0n.6): Learn next gives way to an idea at the frontier, so the frontier idea is finished first
      await Promise.all([putLevel(solid, 'solid'), putLevel(notYet, 'notYet')]);
    });
    Then('Learn next then says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
    });
  });

  Scenario('Next words lists three dictionary forms and Add makes one learning, and the words bar moves', ({ Given, When, Then, And }) => {
    Given(GIVEN_GOAL, givenGoal);
    When('he opens the Goal screen', opensGoal);
    Then('Next words lists {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      await waitFor(() => expect(nextWords()).toEqual([a, b, c]));
    });
    And('the words bar says solid {int}, frontier {int} and not yet {int}', (_, a: number, b: number, c: number) => barSays('words', a, b, c));
    When('he adds {string} to his words', async (_, lemma: string) => {
      await user.click(await screen.findByRole('button', { name: `Add ${lemma} to my words` }));
    });
    Then('{string} is a word he is learning', async (_, lemma: string) => {
      await waitFor(async () => expect((await db.words.get(lemma))?.state).toBe('learning'));
    });
    And('the words bar now says solid {int}, frontier {int} and not yet {int}', (_, a: number, b: number, c: number) => barSays('words', a, b, c));
    And('Next words now lists {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      await waitFor(() => expect(nextWords()).toEqual([a, b, c]));
    });
  });

  Scenario('Sliding the idea sheet to Learning moves the ideas bar', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    And('the foundation ideas and the marks it uses are solid and {string} is not yet', async (_, d: string) => {
      await Promise.all([...[...ALWAYS_NEEDED, ...MARKS_OF_1JN_1_1].map((id) => putLevel(id, 'solid')), putLevel(d, 'notYet')]);
    });
    When('he opens the Goal screen', opensGoal);
    And('he taps Learn next', async () => {
      await user.click(await screen.findByTestId('learn-next'));
    });
    And('he slides the level on the idea sheet to Learning', async () => {
      fireEvent.change(await within(await sheet()).findByRole('slider', { name: 'Your level' }), { target: { value: '1' } });
    });
    Then('the ideas bar says solid {int}, frontier {int} and not yet {int}', (_, a: number, b: number, c: number) => barSays('ideas', a, b, c));
    When('he closes the idea sheet', async () => {
      await user.click(within(await sheet()).getByRole('button', { name: 'Done' }));
    });
    Then('the Goal screen says {string} and no Learn next', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learning-now')).toHaveTextContent(text));
      expect(screen.queryByTestId('learn-next')).toBeNull();
    });
  });

  Scenario('The lists behind the bars show the items by level, and an idea opens its sheet', ({ Given, And, When, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    And('the word {string} is solid', async (_, lemma: string) => putWord(lemma, 'solid'));
    And('the idea {string} is solid', async (_, id: string) => putLevel(id, 'solid'));
    When('he opens the Goal screen', opensGoal);
    And('he taps the words bar', async () => {
      await user.click(await screen.findByTestId('words-bar'));
    });
    Then('the words list has {string} under Solid with the meaning {string}', async (_, lemma: string, meaning: string) => {
      const list = await screen.findByTestId('words-list');
      const row = list.querySelector(`[data-level="solid"] [data-lemma="${lemma}"]`);
      expect(row).toHaveTextContent(meaning);
    });
    And('the words list has {string} under Not yet', async (_, lemma: string) => {
      const list = await screen.findByTestId('words-list');
      expect(list.querySelector(`[data-level="notYet"] [data-lemma="${lemma}"]`)).not.toBeNull();
    });
    When('he taps the ideas bar', async () => {
      await user.click(await screen.findByTestId('ideas-bar'));
    });
    Then('the ideas list has {string} under Solid', async (_, title: string) => {
      const list = await screen.findByTestId('ideas-list');
      expect(within(list.querySelector<HTMLElement>('[data-level="solid"]')!).getByText(title)).toBeInTheDocument();
    });
    When('he taps the idea {string} in the ideas list', async (_, title: string) => {
      await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: title }));
    });
    Then('the idea sheet is open on {string}', ideaSheetOn);
  });

  Scenario('A passage needs the sentence ideas its verses use', ({ Given, When, And, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    When('he opens the Goal screen', opensGoal);
    And('he taps the ideas bar', async () => {
      await user.click(await screen.findByTestId('ideas-bar'));
    });
    Then('the ideas list has {string}, {string} and {string}', async (_, a: string, b: string, c: string) => {
      const list = await screen.findByTestId('ideas-list');
      for (const title of [a, b, c]) expect(within(list).getByRole('button', { name: title })).toBeInTheDocument();
    });
    const needsOf = async (title: string, times: number, form: string, ref: string) => {
      const idea = LADDER.find((i) => i.title === title)!;
      const needs = await passageNeeds({ book: '1jn', chapter: 1 }, async (_, n) => chapterFile('1jn', n), BOOK_INDEX);
      const found = needs.ideas.find((i) => i.id === idea.id);
      expect(found?.count, title).toBe(times);
      expect(found?.example.form, title).toBe(form);
      expect(found?.example.ref, title).toBe(ref);
    };
    And('the passage needs {string} {int} times, the first shown by {string} in 1 John 1:{int}', (_, title: string, times: number, form: string, verse: number) =>
      needsOf(title, times, form, `1jn.1.${verse}`),
    );
    And('{string} is needed {int} times, the first shown by {string} in 1 John 1:{int}', (_, title: string, times: number, form: string, verse: number) =>
      needsOf(title, times, form, `1jn.1.${verse}`),
    );
    And('{string} counts {int} times, the first shown by {string} in 1 John 1:{int}', (_, title: string, times: number, form: string, verse: number) =>
      needsOf(title, times, form, `1jn.1.${verse}`),
    );
    When('he taps the idea {string} in the ideas list', async (_, title: string) => {
      await user.click(within(await screen.findByTestId('ideas-list')).getByRole('button', { name: title }));
    });
    Then('the idea sheet is open on {string}', ideaSheetOn);
    const marked = async (verse: number, a: string, b: string) => {
      const dialog = await sheet();
      await waitFor(() => expect(within(dialog).queryByTestId('idea-loading')).toBeNull());
      const row = within(dialog).getAllByTestId('idea-example').find((e) => e.querySelector('[data-testid="idea-verse"]')?.textContent === `1 John 1:${verse}`);
      expect(row, `1 John 1:${verse}`).toBeDefined();
      expect(Array.from(row!.querySelectorAll('[data-use]')).map((m) => m.textContent)).toEqual([a, b]);
    };
    And('the idea sheet shows 1 John 1:{int} with {string} and {string} marked', (_, verse: number, a: string, b: string) => marked(verse, a, b));
    And('1 John 1:{int} on the sheet has {string} and {string} marked too', (_, verse: number, a: string, b: string) => marked(verse, a, b));
  });

  Scenario('The Goal screen says when he was placed', ({ Given, When, And, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    When('he opens the Goal screen', opensGoal);
    Then('the screen offers Place me and does not say he was placed', async () => {
      expect(await screen.findByRole('button', { name: 'Place me' })).toBeInTheDocument();
      expect(document.body).not.toHaveTextContent('Placed on');
    });
    When('an idea was placed on 3 Oct 2026', async () => {
      await db.grammarLevels.put({ id: 'noun', level: 'frontier', since: Date.UTC(2026, 9, 3, 10), how: 'placement' });
    });
    And('he opens the Goal screen again', opensGoal);
    Then('the screen says {string} and offers Place again', async (_, text: string) => {
      await waitFor(() => expect(document.body).toHaveTextContent(text));
      expect(screen.getByRole('button', { name: 'Place again' })).toBeInTheDocument();
    });
  });

  Scenario('Place me opens the placement', ({ Given, When, And, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    When('he opens the Goal screen', opensGoal);
    And('he taps Place me', taps('Place me'));
    Then('the placement screen is open', async () => {
      expect(await screen.findByRole('heading', { name: 'Placement', level: 1 })).toBeInTheDocument();
    });
  });

  Scenario('Read it opens the Reader on 1 John 1 with verse 1 selected', ({ Given, When, And, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    When('he opens the Goal screen', opensGoal);
    And('he taps Read it', taps('Read it'));
    Then('the Reader is open on 1 John 1 with verse 1 selected', async () => {
      expect(await screen.findByRole('heading', { name: '1 John 1', level: 1 })).toBeInTheDocument();
      await waitFor(() => expect(document.querySelector('[data-verse="1"][data-selected="true"]')).not.toBeNull());
      expect(readerOf(window.location.hash)).toMatchObject({ book: '1jn', chapter: 1, verse: 1 });
    });
  });

  Scenario('Read it on a whole book opens its first chapter', ({ Given, When, And, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    When('he opens the Goal screen', opensGoal);
    And('he taps Read it', taps('Read it'));
    Then('the Reader is open on 1 John 1 with no verse selected', async () => {
      expect(await screen.findByRole('heading', { name: '1 John 1', level: 1 })).toBeInTheDocument();
      await waitFor(() => expect(document.querySelectorAll('[data-verse]').length).toBeGreaterThan(0));
      expect(document.querySelector('[data-verse][data-selected="true"]')).toBeNull();
      expect(readerOf(window.location.hash)).toMatchObject({ book: '1jn', chapter: 1 });
      expect(readerOf(window.location.hash).verse).toBeUndefined();
    });
  });

  Scenario('Change goes to the Goal in Settings and Back returns to the Reader', ({ Given, When, And, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    When('he opens the Goal screen', opensGoal);
    And('he taps Change', taps('Change'));
    Then('the Settings screen is open', async () => {
      expect(await screen.findByRole('heading', { name: 'Greek', level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Goal' })).toBeInTheDocument();
    });
    When('he returns to the Goal screen', opensGoal);
    And('he taps the back button', taps('‹ Reader'));
    Then('the Reader is open', async () => {
      expect(await screen.findByRole('heading', { name: 'Romans 8', level: 1 })).toBeInTheDocument();
    });
  });

  Scenario('Without a goal the Goal screen asks for one', ({ Given, When, Then, And }) => {
    Given('no goal is set and he knows no word and no idea', async () => freshStore(undefined, false));
    When('he opens the Goal screen', opensGoal);
    Then('the screen says {string}', async (_, text: string) => {
      expect(await screen.findByText(new RegExp(text))).toBeInTheDocument();
    });
    And('there is no Read it button', () => {
      expect(screen.queryByRole('button', { name: 'Read it' })).toBeNull();
    });
  });

  Scenario('The Goal screen is remembered across a reopen', ({ Given, When, And, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    When('he opens the Goal screen', opensGoal);
    And('he closes the app and opens it again', async () => {
      await screen.findByTestId('goal-title');
      cleanup();
      clearBus();
      window.history.replaceState(null, '', '/');
      restoreLastRoute();
      await seedHisWords();
      render(<App />);
    });
    Then('the Goal screen is open', async () => {
      expect(await screen.findByTestId('goal-title')).toHaveTextContent('Read 1 John 1:1');
      expect(window.location.hash).toBe('#/goal');
    });
  });
  Scenario('A goal lists the marks that change the word and the enclitics after the foundation (mw-86e9r1.40)', ({ Given, When, And, Then }) => {
    Given(GIVEN_GOAL, givenGoal);
    When('he opens the Goal screen', opensGoal);
    And('he taps the ideas bar', async () => {
      await user.click(await screen.findByTestId('ideas-bar'));
    });
    Then('the ideas list shows {string} and then {string} after {string}', async (_, a: string, b: string, after: string) => {
      const list = await screen.findByTestId('ideas-list');
      const titles = within(list).getAllByRole('button').map((el) => el.textContent ?? '');
      const at = (title: string) => titles.findIndex((t) => t.startsWith(title));
      expect(at(after), after).toBeGreaterThanOrEqual(0);
      expect(at(a), a).toBeGreaterThan(at(after));
      expect(at(b), b).toBeGreaterThan(at(a));
    });
  });

  Scenario('Learn next opens Compound verbs once the twelve prepositions are solid (mw-86e9r1.37)', ({ Given, When, Then }) => {
    Given('the goal is {string} and every idea it needs but {string} is solid', async (_, goal: string, left: string) => {
      await freshStore(goal, false);
      const parsed = parseGoal(goal, BOOK_INDEX)!;
      const needs = await passageNeeds(parsed, async (_, n) => chapterFile(parsed.book, n), BOOK_INDEX);
      expect(needs.ideas.map((i) => i.id)).toContain(left);
      await Promise.all(needs.ideas.filter((i) => i.id !== left).map((i) => putLevel(i.id, 'solid')));
      // the letters, pairs and breathings are items of the foundation: they are solid too, or Learn next names a gap in them first
      await Promise.all(ALWAYS_NEEDED.flatMap((id) => [id, ...LADDER.filter((i) => i.parent === id).map((i) => i.id)]).map((id) => putLevel(id, 'solid')));
    });
    When('he opens the Goal screen', opensGoal);
    Then('Learn next says {string}', async (_, text: string) => {
      await waitFor(async () => expect(await screen.findByTestId('learn-next')).toHaveTextContent(`Learn next: ${text}`));
    });
    When('he taps Learn next', async () => {
      await user.click(await screen.findByTestId('learn-next'));
    });
    Then('the idea sheet is open on {string}', ideaSheetOn);
  });
});
