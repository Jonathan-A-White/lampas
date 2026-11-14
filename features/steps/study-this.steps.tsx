// features/steps/study-this.steps.tsx — runs features/study-this.feature (mw-indx1x6.6): after a wrong answer in Review, Drill it and the short drill a 'Study this' row links to what teaches
// the question (the table at its cell, the idea's lesson), each opening its place; where nothing teaches it the row has Ask the tutor, and the tutor's first turn and the screen's facts name
// the question, his answer, the right answer and the idea (src/review/studyThis.ts, src/review/StudyThis.tsx). A right answer shows no row. At the end of a Review or a drill the 'Study list' (mw-indx1x6.8,
// src/review/studyList.ts, StudyList.tsx) gathers everything the session's misses linked to, one row each, most-missed first.
import '@testing-library/react/dont-cleanup-after-each';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { loadChapter, type Chapter } from '../../src/data/chapter';
import { db } from '../../src/data/db';
import { start, type DrillQuestion } from '../../src/data/grammar/drillIt';
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { ideaOfAny } from '../../src/data/grammar/ladders';
import type { Level } from '../../src/data/grammar/needs';
import { cellsOf, paradigmById, paradigmsOf, type Levels } from '../../src/data/paradigms';
import { cellPrompt, drawCellQuestions } from '../../src/data/paradigms/cells';
import { mulberry32 } from '../../src/data/quiz';
import { DAY } from '../../src/data/schedule';
import { DrillItScreen } from '../../src/DrillItScreen';
import { clearBus } from '../../src/events/bus';
import { LicenceContext, type LicenceDetail } from '../../src/gate/licenceContext';
import { learnLabel, lessonsForSheet } from '../../src/hardSounds/lessons';
import { IdeaSheetWithWord } from '../../src/IdeaSheetWithWord';
import { forgetTrail } from '../../src/nav/lastRoute';
import { paradigmHash } from '../../src/nav/route';
import { PlanDrillScreen } from '../../src/PlanDrillScreen';
import { releaseRound } from '../../src/review/heldRound';
import { grammarRandom } from '../../src/review/kinds';
import { tutorTimings } from '../../src/services/tutor';
import { accentOf, DEFAULT_ACCENT } from '../../src/speech/accents';
import { chosenPronunciation } from '../../src/speech/greek';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GRAMMAR_TERM_ANSWER, makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { closeDatabase } from './close-database';

afterAll(async () => {
  cleanup();
  clearBus();
  await closeDatabase();
  vi.unstubAllGlobals();
});

const user = userEvent.setup();
const PHONE_KEY = '00'.repeat(31) + '02';
const SEED = 20261112;
const TABLE = 'noun-endings';

/** Every idea a cell of the table needs, solid: every cell is his. */
const levelsOf = (): Levels => new Map([...new Set(cellsOf(paradigmById(TABLE)!).flatMap((c) => c.ideas)), ...paradigmById(TABLE)!.ideas].map((id) => [id, { level: 'solid' as const }]));

let seed = 1;
let fake: FakePostern | undefined;
/** the question the scenario is on: what was asked and the right answer */
let asked: { prompt: string; right: string; options: string[] } | undefined;

async function freshStore(): Promise<void> {
  cleanup();
  clearBus();
  forgetTrail();
  releaseRound();
  vi.unstubAllGlobals();
  fake = undefined;
  asked = undefined;
  licensed = true;
  localStorage.clear();
  sessionStorage.clear();
  // an empty store would start the welcome
  localStorage.setItem('lampas.welcome', 'done');
  window.history.replaceState(null, '', '/');
  stubChapterFetch();
  drillSeed.next = () => SEED;
  await db.open();
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear(), db.talks.clear(), db.drillRuns.clear()]);
  await db.meta.bulkPut([{ key: 'wordsSeeded', value: '1' }, { key: 'reviewsSeeded', value: '1' }, { key: 'grammarLevelsSeeded', value: '1' }]);
  await db.grammarLevels.bulkPut([...levelsOf().keys()].map((id) => ({ id, level: 'solid' as const, since: Date.now(), how: 'marked' as const })));
}

/** The table is due, and the app's random is one whose round asks `wanted` first. */
async function tableDueAsking(_: unknown, id: string, wanted: string): Promise<void> {
  await freshStore();
  const now = Date.now();
  await db.reviews.put({ kind: 'paradigm', id, step: 0, rights: 0, due: now - 60_000, lastWhen: now - 3 * DAY, lapses: 0 });
  for (let s = 1; s < 2000; s += 1) {
    const first = drawCellQuestions(paradigmById(id)!, levelsOf(), grammarRandom(mulberry32(s)))[0];
    if (first?.prompt !== wanted) continue;
    seed = s;
    asked = first;
    return;
  }
  throw new Error(`no seed asks ${wanted} first`);
}

async function englishWordDue(_: unknown, word: string): Promise<void> {
  const now = Date.now();
  await db.reviews.put({ kind: 'sound', id: `en:${word}`, step: 0, rights: 0, due: now - 60_000, lastWhen: now - 3 * DAY, lapses: 0 });
}

async function licensedPhone(): Promise<void> {
  await freshStore();
  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, PHONE_KEY);
  tutorTimings.pollMs = 20;
  fake = makeFakePostern();
  fake.autoReply = { status: 'answered', answer: GRAMMAR_TERM_ANSWER };
  const postern = fake;
  const chapterFetch = globalThis.fetch;
  vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => (String(input).startsWith(POSTERN_ORIGIN) ? postern.fetch(input, init) : chapterFetch(input, init)));
}

/** With no provider the app is licensed (src/gate/licenceContext.ts); a scenario with no licence draws it under one that says so. */
let licensed = true;
const NO_LICENCE: LicenceDetail = { licence: 'not-licensed', locked: null, publicKeyHex: '', checkAgain: () => {}, siteIssued: false, removed: () => {} };

async function openReviewAndStart(): Promise<void> {
  window.history.replaceState(null, '', '/#/review');
  const app = <App newRandom={() => mulberry32(seed)} />;
  render(licensed ? app : <LicenceContext.Provider value={NO_LICENCE}>{app}</LicenceContext.Provider>);
  await screen.findByRole('heading', { name: 'Review', level: 1 });
  await user.click(await screen.findByRole('button', { name: 'Start' }));
  await screen.findByTestId('grammar-prompt');
}

const options = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[data-option]')];
const row = (): HTMLElement => screen.getByRole('group', { name: 'Study this' });
const noRow = (): void => expect(screen.queryByRole('group', { name: 'Study this' })).toBeNull();
const lessonLabel = (ideaId: string): string => `Lesson: ${ideaOfAny(ideaId).title}`;

async function answer(right: boolean): Promise<void> {
  if (!asked) throw new Error('the scenario has no question in hand');
  const want = right ? asked.right : asked.options.find((o) => o !== asked?.right);
  await waitFor(() => expect(options().some((o) => o.textContent === want)).toBe(true));
  await user.click(options().find((o) => o.textContent === want)!);
  await waitFor(() => expect(screen.getByTestId('feedback')).not.toBeEmptyDOMElement());
}

async function rowIsShown(_: unknown, name: string): Promise<void> {
  expect(await screen.findByRole('group', { name })).toBeInTheDocument();
}

async function litCell(_: unknown, place: string, form: string): Promise<void> {
  await waitFor(() => {
    const lit = document.querySelectorAll<HTMLElement>('[data-lit]');
    expect(lit).toHaveLength(1);
    expect(lit[0]).toHaveAttribute('data-cell', place);
    expect(lit[0]).toHaveTextContent(form);
  });
}

async function tapLink(_: unknown, label: string): Promise<void> {
  await user.click(within(row()).getByRole('button', { name: label }));
}

/** The 'Table: ...' links the idea sheet draws under its worked example, by what each says. */
const tableLinks = (sheet: HTMLElement): string[] => [...sheet.querySelectorAll<HTMLElement>('[data-table]')].map((b) => b.textContent ?? '');

async function lessonIsOpen(ideaId: string): Promise<void> {
  const sheet = await screen.findByRole('dialog', { name: 'Idea' });
  expect(within(sheet).getByRole('heading', { name: ideaOfAny(ideaId).title })).toBeInTheDocument();
}

let passage: Chapter[] = [];

async function openDrillIt(_: unknown, ideaId: string): Promise<void> {
  await freshStore();
  passage = [await loadChapter('1jn', 2)];
  const walk = start(ideaId, new Map<string, Level>(ideaOfAny(ideaId).needs.map((id) => [id, 'solid'])), { passage, seed: SEED });
  if ('needs' in walk || !walk.current) throw new Error(`Drill it does not start on ${ideaId}`);
  asked = walk.current;
  render(<DrillItScreen ideaId={ideaId} mode="practice" passage={passage} onResult={() => {}} onClose={() => {}} />);
  await waitFor(() => expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(asked?.prompt ?? ''));
}

const cellQuestion = (prompt: string, n: number): DrillQuestion => {
  const found = drawCellQuestions(paradigmById(TABLE)!, levelsOf(), mulberry32(1), 100).find((q) => q.prompt === prompt);
  if (!found) throw new Error(`no cell asks ${prompt}`);
  return { ...found, facet: { id: 'ending', label: 'Its ending' }, step: 1, key: `cell-${n}` };
};


/** The form the table's cell asked by this prompt holds: the right answer of a question the round or the drill asked. */
function rightFormOf(prompt: string): string {
  for (const id of [TABLE, 'article']) {
    const table = paradigmById(id)!;
    for (const row of table.rows) {
      const column = row.cells.findIndex((_, c) => cellPrompt(table, row, c) === prompt);
      if (column >= 0) return row.cells[column].form;
    }
  }
  throw new Error(`no cell is asked by ${prompt}`);
}

/** Answers the question on screen, right or with the first wrong option, and waits for the feedback. */
async function answerHere(right: boolean): Promise<string> {
  const prompt = (await screen.findByTestId('grammar-prompt')).textContent ?? '';
  const form = rightFormOf(prompt);
  await waitFor(() => expect(options().length).toBeGreaterThan(1));
  const want = right ? form : options().find((o) => o.textContent !== form)?.textContent;
  await user.click(options().find((o) => o.textContent === want)!);
  await waitFor(() => expect(screen.getByTestId('feedback')).not.toBeEmptyDOMElement());
  return prompt;
}

/** Answers every question of the Review round, then Finish, and waits for the end card. */
async function everyQuestionOfTheRound(right: boolean): Promise<void> {
  for (let guard = 0; guard < 12; guard += 1) {
    const prompt = await answerHere(right);
    const next = screen.getByTestId('next');
    const finishing = next.textContent === 'Finish';
    await user.click(next);
    if (finishing) {
      await screen.findByTestId('score');
      return;
    }
    await waitFor(() => expect(screen.getByTestId('grammar-prompt')).not.toHaveTextContent(prompt));
  }
  throw new Error('the round does not end');
}

const studyList = (): HTMLElement => screen.getByRole('group', { name: 'Study list' });
const noStudyList = (): void => expect(screen.queryByRole('group', { name: 'Study list' })).toBeNull();
const listRows = (): HTMLElement[] => within(studyList()).getAllByRole('button');
const rowNamed = (label: string): HTMLElement[] => listRows().filter((r) => r.textContent?.startsWith(label));

async function finishTheRound(): Promise<void> {
  const next = await screen.findByTestId('next');
  expect(next).toHaveTextContent('Finish');
  await user.click(next);
  await screen.findByTestId('score');
}

/** The short drill's questions: the table's cells, asked in this order. */
let shortQuestions: DrillQuestion[] = [];

async function openShortDrillOfThree(): Promise<void> {
  await freshStore();
  const noun = (prompt: string, n: number) => cellQuestion(prompt, n);
  const article = drawCellQuestions(paradigmById('article')!, new Map([...paradigmById('article')!.ideas, ...cellsOf(paradigmById('article')!).flatMap((c) => c.ideas)].map((id) => [id, { level: 'solid' as const }])), mulberry32(1), 100)[0];
  shortQuestions = [
    noun('Noun endings: first declension, feminine in η (φωνή), dative singular', 1),
    { ...article, facet: { id: 'ending', label: 'Its ending' }, step: 1, key: 'cell-2' },
    noun('Noun endings: second declension, masculine (λόγος), genitive singular', 3),
  ];
  render(<PlanDrillScreen ideaId="declension-1" facetLabel="Its ending" questions={shortQuestions} onFinish={() => {}} onClose={() => {}} />);
  await waitFor(() => expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(shortQuestions[0].prompt));
}

/** Answers every question of the short drill and waits for its result. */
async function everyQuestionOfTheDrill(right: boolean): Promise<void> {
  for (let n = 0; n < shortQuestions.length; n += 1) {
    const prompt = await answerHere(right);
    await user.click(screen.getByTestId('plan-drill-next'));
    if (n < shortQuestions.length - 1) await waitFor(() => expect(screen.getByTestId('grammar-prompt')).not.toHaveTextContent(prompt));
  }
  await screen.findByTestId('plan-drill-result');
}

const feature = await loadFeature('features/study-this.feature');

describeFeature(feature, ({ Scenario }) => {
  Scenario('A missed cell of a table in Review links to the table at that cell', ({ Given, When, And, Then }) => {
    Given('the table {string} is due in Review and the round asks {string} first', tableDueAsking);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he answers with a wrong ending', () => answer(false));
    Then('a {string} row is under the answer', rowIsShown);
    And('the row has the link {string}', (_, label: string) => {
      expect(within(row()).getByRole('button', { name: label })).toBeInTheDocument();
    });
    And('the row has the lesson of the idea {string}', (_, ideaId: string) => {
      expect(within(row()).getByRole('button', { name: lessonLabel(ideaId) })).toBeInTheDocument();
    });
    And('there is no {string} button beside it', (_, label: string) => {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    });
    When('he taps the link {string}', tapLink);
    Then('the Paradigms screen shows {string} in Learn', async (_, name: string) => {
      await screen.findByRole('heading', { name, level: 1 });
      expect(window.location.hash).toBe(paradigmHash({ table: TABLE, mode: 'learn', cell: 'First declension, feminine in η (φωνή) Dative Singular' }));
      expect(within(screen.getByRole('group', { name: 'Mode' })).getByRole('button', { name: 'Learn' })).toHaveAttribute('aria-pressed', 'true');
    });
    And('the cell {string} is lit and reads {string}', litCell);
    When('he goes Back', () => {
      window.history.back();
    });
    Then('Review is on the question {string} with its {string} row', async (_, prompt: string, name: string) => {
      await waitFor(() => expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(prompt));
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
      expect(screen.getByTestId('feedback')).toHaveTextContent('Not quite.');
    });
  });

  Scenario('A right answer shows no row', ({ Given, When, And, Then }) => {
    Given('the table {string} is due in Review and the round asks {string} first', tableDueAsking);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he answers with the right ending', () => answer(true));
    Then('there is no {string} row', () => {
      expect(screen.getByTestId('feedback')).toHaveTextContent('Right.');
      noRow();
    });
    And('Next is there to go on', () => {
      expect(screen.getByTestId('next')).toHaveTextContent('Next');
    });
  });

  Scenario("The lesson link opens the idea's lesson over Review", ({ Given, When, And, Then }) => {
    Given('the table {string} is due in Review and the round asks {string} first', tableDueAsking);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he answers with a wrong ending', () => answer(false));
    And('he taps the lesson of the idea {string}', (_, ideaId: string) => tapLink(_, lessonLabel(ideaId)));
    Then('the lesson of the idea {string} is open over Review', async (_, ideaId: string) => {
      await lessonIsOpen(ideaId);
      expect(window.location.hash).toBe('#/review');
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(asked?.prompt ?? '');
    });
  });

  Scenario('A miss that nothing teaches offers the tutor, who is told the miss', ({ Given, When, And, Then }) => {
    Given('a phone with a licence and a fake Postern', licensedPhone);
    And('the English word {string} he misread is due in Review', englishWordDue);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he says he did not know it', async () => {
      await user.click(await screen.findByRole('button', { name: 'Show' }));
      await user.click(await screen.findByRole('button', { name: 'Not yet' }));
    });
    Then('a {string} row is under the answer', rowIsShown);
    And('the row has only {string}', (_, label: string) => {
      expect(within(row()).getAllByRole('button').map((b) => b.textContent)).toEqual([label]);
    });
    When('he taps {string} in the row', tapLink);
    Then("the tutor's talk is open", async () => {
      expect(await screen.findByTestId('sheet-backdrop')).toBeInTheDocument();
    });
    And(
      "the tutor's first turn names the question {string}, his answer {string}, the right answer {string} and the idea {string}",
      async (_, question: string, his: string, right: string, idea: string) => {
        await waitFor(() => expect(fake?.received.length).toBeGreaterThan(0));
        const turn = String(fake?.received[0].input.question);
        for (const part of [question, his, right, idea]) expect(turn).toContain(part);
      },
    );
    And("the tutor is sent the miss as the screen's facts", () => {
      expect(fake?.received[0].input.screen).toEqual({
        name: 'Review',
        facts: [
          { label: 'Question he missed', value: 'Say this word aloud: blessed' },
          { label: 'He chose', value: 'Not yet' },
          { label: 'Right answer', value: 'blessed' },
          { label: 'Idea', value: 'Saying the word blessed' },
        ],
      });
    });
  });

  Scenario('A miss with no licence and nothing to link shows no row', ({ Given, When, And, Then }) => {
    Given('a phone with no licence', async () => {
      await freshStore();
      licensed = false;
    });
    And('the English word {string} he misread is due in Review', englishWordDue);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he says he did not know it', async () => {
      await user.click(await screen.findByRole('button', { name: 'Show' }));
      await user.click(await screen.findByRole('button', { name: 'Not yet' }));
    });
    Then('there is no {string} row', async () => {
      await waitFor(() => expect(screen.getByTestId('feedback')).toHaveTextContent('It comes back tomorrow.'));
      noRow();
    });
  });

  Scenario("A wrong answer in Drill it links to the idea's lesson, which opens over the drill", ({ Given, When, And, Then }) => {
    Given('Drill it is open on the idea {string}', openDrillIt);
    When("he answers the drill's question wrong", () => answer(false));
    Then('a {string} row is under the answer', rowIsShown);
    And('the row has the lesson of the idea {string}', (_, ideaId: string) => {
      expect(within(row()).getByRole('button', { name: lessonLabel(ideaId) })).toBeInTheDocument();
    });
    When('he taps the lesson of the idea {string}', (_, ideaId: string) => tapLink(_, lessonLabel(ideaId)));
    Then('the lesson of the idea {string} is open over the drill', async (_, ideaId: string) => {
      await lessonIsOpen(ideaId);
      // drawn inside the drill's own layer, so it stands over it
      expect(screen.getByRole('dialog', { name: 'Drill it' })).toContainElement(screen.getByRole('dialog', { name: 'Idea' }));
    });
    And('the drill is still on the question he missed', () => {
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(asked?.prompt ?? '');
      expect(screen.getByTestId('drill-next')).toBeInTheDocument();
    });
  });

  Scenario('The lesson opened over a drill has no Table link, which would leave the drill', ({ Given, When, And, Then }) => {
    Given('Drill it is open on the idea {string}', openDrillIt);
    When("he answers the drill's question wrong", () => answer(false));
    And('he taps the lesson of the idea {string}', async (_, ideaId: string) => {
      await screen.findByRole('group', { name: 'Study this' });
      await tapLink(_, lessonLabel(ideaId));
    });
    Then('the lesson of the idea {string} is open over the drill', async (_, ideaId: string) => {
      await lessonIsOpen(ideaId);
      expect(screen.getByRole('dialog', { name: 'Drill it' })).toContainElement(screen.getByRole('dialog', { name: 'Idea' }));
    });
    And('the lesson has no Table link, though {string} teaches the idea {string}', async (_, name: string, ideaId: string) => {
      // the idea has a table, so its sheet anywhere else has the link: without one the step would prove nothing
      expect(paradigmsOf(ideaId).map((table) => table.name)).toContain(name);
      const sheet = screen.getByRole('dialog', { name: 'Idea' });
      // the sheet's last part is drawn (the worked example stands just above where the tables' links go)
      await within(sheet).findByText('Worked example');
      expect(tableLinks(sheet)).toEqual([]);
    });
    And('the drill is still on the question he missed', () => {
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(asked?.prompt ?? '');
      expect(screen.getByTestId('drill-next')).toBeInTheDocument();
    });
  });

  Scenario('The lesson opened over Review keeps its Table link', ({ Given, When, And, Then }) => {
    Given('the table {string} is due in Review and the round asks {string} first', tableDueAsking);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he answers with a wrong ending', () => answer(false));
    And('he taps the lesson of the idea {string}', (_, ideaId: string) => tapLink(_, lessonLabel(ideaId)));
    Then('the lesson of the idea {string} is open over Review', async (_, ideaId: string) => {
      await lessonIsOpen(ideaId);
      expect(window.location.hash).toBe('#/review');
    });
    And('the lesson has the link {string}', async (_, label: string) => {
      await waitFor(() => expect(tableLinks(screen.getByRole('dialog', { name: 'Idea' }))).toContain(label));
    });
  });

  Scenario("A letter's lesson over a drill has no link to its Hard sounds lesson", ({ Given, When, Then }) => {
    Given('the lesson of the idea {string} is open as it is over a drill', async (_, ideaId: string) => {
      await freshStore();
      // what the row draws for a lesson where a table opens as a layer (src/review/useStudyPlaces.tsx)
      render(<IdeaSheetWithWord ideaId={ideaId} onClose={() => {}} overRun />);
      await lessonIsOpen(ideaId);
    });
    Then('the lesson has no {string} link, though the letter has that lesson', async (_, label: string) => {
      // the letter has the lesson for his accent, so its sheet anywhere else has the link: without one the step would prove nothing
      expect(lessonsForSheet(ideaOfAny('letter-rho'), chosenPronunciation().id, accentOf(DEFAULT_ACCENT)).map(learnLabel)).toContain(label);
      const sheet = screen.getByRole('dialog', { name: 'Idea' });
      await within(sheet).findByText('Worked example');
      expect(within(sheet).queryByRole('button', { name: label })).toBeNull();
      expect(sheet.querySelector('[data-sound-lesson]')).toBeNull();
    });
    When('the lesson of the idea {string} is open as it is over Review', async (_, ideaId: string) => {
      cleanup();
      render(<IdeaSheetWithWord ideaId={ideaId} onClose={() => {}} />);
      await lessonIsOpen(ideaId);
    });
    Then('the lesson has the {string} link', async (_, label: string) => {
      expect(await within(screen.getByRole('dialog', { name: 'Idea' })).findByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  Scenario('A right answer in Drill it shows no row', ({ Given, When, Then }) => {
    Given('Drill it is open on the idea {string}', openDrillIt);
    When("he answers the drill's question right", () => answer(true));
    Then('there is no {string} row', () => {
      expect(screen.getByTestId('drill-next')).toBeInTheDocument();
      noRow();
    });
  });

  Scenario('A wrong answer in a short drill opens the table over the drill, at the cell', ({ Given, When, Then, And }) => {
    Given('a short drill is open on the cell {string}', async (_, prompt: string) => {
      await freshStore();
      const first = cellQuestion(prompt, 1);
      asked = first;
      const second = cellQuestion('Noun endings: second declension, masculine (λόγος), genitive singular', 2);
      render(<PlanDrillScreen ideaId="declension-1" facetLabel="Its ending" questions={[first, second]} onFinish={() => {}} onClose={() => {}} />);
      await waitFor(() => expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(prompt));
    });
    When('he answers with a wrong ending', () => answer(false));
    Then('a {string} row is under the answer', rowIsShown);
    When('he taps the link {string}', tapLink);
    Then('the table {string} is open over the drill', async (_, name: string) => {
      const table = await screen.findByRole('dialog', { name });
      expect(screen.getByRole('dialog', { name: 'Short drill' })).toContainElement(table);
    });
    And('the cell {string} is lit and reads {string}', litCell);
    When('he taps {string}', async (_, label: string) => {
      await user.click(screen.getByRole('button', { name: label }));
    });
    Then('the short drill is still on {string}', async (_, text: string) => {
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Noun endings' })).toBeNull());
      expect(screen.getByTestId('plan-drill-step')).toHaveTextContent(text);
      expect(row()).toBeInTheDocument();
    });
  });
  Scenario('A Review with misses ends with a Study list that shows a table once, first', ({ Given, When, And, Then }) => {
    Given('the table {string} is due in Review and the round asks {string} first', tableDueAsking);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he misses every question of the round', () => everyQuestionOfTheRound(false));
    Then('the end card shows a {string}', (_, name: string) => {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    });
    And('the list\'s first row is {string} for {int} misses', (_, label: string, count: number) => {
      expect(listRows()[0].textContent).toContain(label);
      expect(listRows()[0]).toHaveAttribute('data-misses', String(count));
    });
    And('the list has the link {string} once', (_, label: string) => {
      expect(rowNamed(label)).toHaveLength(1);
    });
    And('the rows are ordered by how many misses pointed to them', () => {
      const counts = listRows().map((r) => Number(r.getAttribute('data-misses')));
      expect(counts).toEqual([...counts].sort((a, b) => b - a));
    });
    When('he taps the list\'s link {string}', async (_, label: string) => {
      await user.click(rowNamed(label)[0]);
    });
    Then('the table {string} is open over the end card', async (_, name: string) => {
      const table = await screen.findByRole('dialog', { name });
      expect(table).toBeInTheDocument();
      expect(window.location.hash).toBe('#/review');
      expect(screen.getByTestId('score')).toBeInTheDocument();
    });
    And('one cell is lit', async () => {
      await waitFor(() => expect(document.querySelectorAll('[data-lit]')).toHaveLength(1));
    });
  });

  Scenario('Three misses in a short drill, two on one table, show that table once, first', ({ Given, When, And, Then }) => {
    Given('a short drill of three questions is open: two cells of {string} and one of {string}', openShortDrillOfThree);
    When('he misses every question', () => everyQuestionOfTheDrill(false));
    Then("the drill's result shows a {string}", (_, name: string) => {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    });
    And('the list\'s first row is {string} for {int} misses', (_, label: string, count: number) => {
      expect(listRows()[0].textContent).toContain(label);
      expect(listRows()[0]).toHaveAttribute('data-misses', String(count));
    });
    And('the list has the link {string} once', (_, label: string) => {
      expect(rowNamed(label)).toHaveLength(1);
    });
    And('the list also has the link {string} once', (_, label: string) => {
      expect(rowNamed(label)).toHaveLength(1);
    });
    And('the {string} row comes after the {string} row', (_, later: string, earlier: string) => {
      const labels = listRows().map((r) => r.textContent ?? '');
      expect(labels.findIndex((t) => t.startsWith(later))).toBeGreaterThan(labels.findIndex((t) => t.startsWith(earlier)));
    });
  });

  Scenario('A drill with no misses shows no Study list', ({ Given, When, Then }) => {
    Given('a short drill of three questions is open: two cells of {string} and one of {string}', openShortDrillOfThree);
    When('he answers every question right', () => everyQuestionOfTheDrill(true));
    Then("the drill's result shows no {string}", () => {
      expect(screen.getByTestId('plan-drill-result')).toHaveTextContent('3 of 3 right');
      noStudyList();
    });
  });

  Scenario('A Review with no misses shows no Study list', ({ Given, When, And, Then }) => {
    Given('the table {string} is due in Review and the round asks {string} first', tableDueAsking);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he answers every question of the round right', () => everyQuestionOfTheRound(true));
    Then('the end card shows no {string}', () => {
      expect(screen.getByTestId('score')).toHaveTextContent('3 of 3');
      noStudyList();
    });
  });

  Scenario('A miss that nothing teaches ends in one row that asks the tutor about it', ({ Given, When, And, Then }) => {
    Given('a phone with a licence and a fake Postern', licensedPhone);
    And('the English word {string} he misread is due in Review', englishWordDue);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he says he did not know it', async () => {
      await user.click(await screen.findByRole('button', { name: 'Show' }));
      await user.click(await screen.findByRole('button', { name: 'Not yet' }));
    });
    And('he finishes the round', finishTheRound);
    Then('the end card shows a {string}', (_, name: string) => {
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
    });
    And('the list has only {string}', (_, label: string) => {
      expect(listRows().map((b) => b.textContent)).toEqual([label]);
    });
    When('he taps {string} in the list', async (_, label: string) => {
      await user.click(within(studyList()).getByRole('button', { name: label }));
    });
    Then("the tutor's talk is open", async () => {
      expect(await screen.findByTestId('sheet-backdrop')).toBeInTheDocument();
    });
    And(
      "the tutor's first turn names the question {string}, his answer {string}, the right answer {string} and the idea {string}",
      async (_, question: string, his: string, right: string, idea: string) => {
        await waitFor(() => expect(fake?.received.length).toBeGreaterThan(0));
        const turn = String(fake?.received[0].input.question);
        for (const part of [question, his, right, idea]) expect(turn).toContain(part);
      },
    );
    And("the tutor is sent the misses as the screen's facts", () => {
      expect(fake?.received[0].input.screen).toEqual({
        name: 'Review',
        facts: [{ label: 'Miss 1', value: 'Say this word aloud: blessed He chose: Not yet. Right answer: blessed. Idea: Saying the word blessed.' }],
      });
    });
  });

  Scenario('Without a licence a miss that nothing teaches leaves no Study list', ({ Given, When, And, Then }) => {
    Given('a phone with no licence', async () => {
      await freshStore();
      licensed = false;
    });
    And('the English word {string} he misread is due in Review', englishWordDue);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he says he did not know it', async () => {
      await user.click(await screen.findByRole('button', { name: 'Show' }));
      await user.click(await screen.findByRole('button', { name: 'Not yet' }));
    });
    And('he finishes the round', finishTheRound);
    Then('the end card shows no {string}', () => {
      noStudyList();
    });
  });
});
