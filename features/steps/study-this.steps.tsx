// features/steps/study-this.steps.tsx — runs features/study-this.feature (mw-indx1x6.6): after a wrong answer in Review, Drill it and the short drill a 'Study this' row links to what teaches
// the question (the table at its cell, the idea's lesson), each opening its place; where nothing teaches it the row has Ask the tutor, and the tutor's first turn and the screen's facts name
// the question, his answer, the right answer and the idea (src/review/studyThis.ts, src/review/StudyThis.tsx). A right answer shows no row. At the end of a Review or a drill the 'Study list' (mw-indx1x6.8,
// src/review/studyList.ts, StudyList.tsx) gathers everything the session's misses linked to, one row each, most-missed first.
import '@testing-library/react/dont-cleanup-after-each';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, expect, vi } from 'vitest';
import { loadFeature, describeFeature } from '@amiceli/vitest-cucumber';
import { App } from '../../src/App';
import { DEVICE_KEY_STORAGE_KEY } from '../../src/config';
import { loadChapter, wordParse, type Chapter, type GreekWord } from '../../src/data/chapter';
import { loadSeptuagintChapter } from '../../src/data/lxxChapter';
import { db } from '../../src/data/db';
import { start, type DrillQuestion } from '../../src/data/grammar/drillIt';
import { drillSeed } from '../../src/data/grammar/drillSeed';
import { hasFormOf } from '../../src/data/grammar/ideaSheet';
import { buildEnding } from '../../src/data/grammar/questions';
import { ideaOfAny } from '../../src/data/grammar/ladders';
import type { Level } from '../../src/data/grammar/needs';
import { cellsOf, paradigmById, paradigmOfHebrewWord, paradigmsOf, type Levels } from '../../src/data/paradigms';
import { cellPrompt, drawCellQuestions } from '../../src/data/paradigms/cells';
import { mulberry32 } from '../../src/data/quiz';
import { getLevel, setKind, setLanguages, setState } from '../../src/data/repositories';
import { getStudyChapter } from '../../src/data/readerChapter';
import { DAY } from '../../src/data/schedule';
import { DrillItScreen } from '../../src/DrillItScreen';
import { clearBus } from '../../src/events/bus';
import { LicenceContext, type LicenceDetail } from '../../src/gate/licenceContext';
import { learnLabel, lessonsForSheet } from '../../src/hardSounds/lessons';
import { IdeaSheetWithWord } from '../../src/IdeaSheetWithWord';
import { forgetTrail } from '../../src/nav/lastRoute';
import { OverRun } from '../../src/overRun';
import { paradigmHash } from '../../src/nav/route';
import { PlanDrillScreen } from '../../src/PlanDrillScreen';
import { LEXICONS } from '../../src/resources/logos';
import { releaseRound } from '../../src/review/heldRound';
import { grammarRandom } from '../../src/review/kinds';
import { tutorTimings } from '../../src/services/tutor';
import { accentOf, DEFAULT_ACCENT } from '../../src/speech/accents';
import { chosenPronunciation } from '../../src/speech/greek';
import { openDoorTarget } from '../../src/tutor/door';
import { dropHeldIdea } from '../../src/ideaReturn';
import { WordSheet } from '../../src/WordSheet';
import { dropHeldWord } from '../../src/wordReturn';
import { stubChapterFetch } from '../../tests/support/chapter-fetch';
import { GRAMMAR_TERM_ANSWER, makeFakePostern, POSTERN_ORIGIN, type FakePostern } from '../../tests/support/fake-postern';
import { EVERY_BOOK_IDS, keepImport } from '../../tests/support/logos-import';
import { sheetDepth } from '../../tests/support/sheet-history';
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
  dropHeldWord();
  // a lesson left for its table is held to come back on Back (src/ideaReturn.ts): not into the next scenario
  dropHeldIdea();
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
  await Promise.all([db.words.clear(), db.meta.clear(), db.results.clear(), db.reviews.clear(), db.settings.clear(), db.grammarLevels.clear(), db.talks.clear(), db.drillRuns.clear(), db.library.clear(), db.exportRows.clear()]);
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

/**
 * The table is due with every idea of its cells solid, so each cell can be asked, and the round asks what the seed draws (answerHere reads the right form from the prompt).
 * The lesson of a miss is then the table's first idea (src/data/paradigms/cells.ts drawCellQuestions).
 */
async function tableDueSolid(_: unknown, id: string): Promise<void> {
  await freshStore();
  const table = paradigmById(id)!;
  const now = Date.now();
  await db.grammarLevels.bulkPut([...new Set([...table.ideas, ...cellsOf(table).flatMap((c) => c.ideas)])].map((ideaId) => ({ id: ideaId, level: 'solid' as const, since: now, how: 'marked' as const })));
  await db.reviews.put({ kind: 'paradigm', id, step: 0, rights: 0, due: now - 60_000, lastWhen: now - 3 * DAY, lapses: 0 });
  seed = 1;
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

/** What each button of the idea sheet says (a query by text: a role query would name every example word of the sheet). */
const buttonsOf = (sheet: HTMLElement): string[] => [...sheet.querySelectorAll<HTMLElement>('button')].map((b) => b.textContent?.trim() ?? '');

async function lessonIsOpen(ideaId: string): Promise<void> {
  const sheet = await screen.findByRole('dialog', { name: 'Idea' });
  expect(within(sheet).getByRole('heading', { name: ideaOfAny(ideaId).title })).toBeInTheDocument();
}

/**
 * The lesson over a run starts no run of its own and changes no level (mw-indx1x6.57 item 5): no Drill it, no Try it on a verse, no Mark known without a drill and no level
 * slider. The sheet's examples are drawn first (they wait for the passage, as Try it on a verse and the slider's enabling do), so what the controls wait for is there and
 * their absence is the sheet's choice. Of Mark known it says nothing where the idea is solid, as in its two scenarios (the sheet draws that button for no solid idea): noMarkKnown
 * holds it, over a drill and over the end card, for an idea that is not (mw-indx1x6.102).
 */
async function lessonStartsNothing(_: unknown, drillIt: string, tryIt: string, markKnown: string): Promise<void> {
  const sheet = screen.getByRole('dialog', { name: 'Idea' });
  await waitFor(() => expect(sheet.querySelectorAll('[data-testid="idea-example"]').length).toBeGreaterThan(0));
  await within(sheet).findByText('Worked example');
  for (const label of [drillIt, tryIt, markKnown]) expect(buttonsOf(sheet)).not.toContain(label);
  expect(within(sheet).queryByRole('slider', { name: 'Your level' })).toBeNull();
  expect(sheet.querySelector('[data-testid="level-slider"]')).toBeNull();
}

/** He is still learning the idea: Learning on the lesson's slider is the level 'frontier' (src/IdeaSheet.tsx STOPS), which the lesson's chip names 'Frontier'. */
async function stillLearning(ideaId: string): Promise<void> {
  await db.grammarLevels.put({ id: ideaId, level: 'frontier', since: Date.now(), how: 'marked' });
}

/**
 * The open lesson, once it is known to be of an idea that is not solid: the sheet draws 'Mark known without a drill' only for such an idea (src/IdeaSheet.tsx), so a step about
 * that button says nothing for a solid one (mw-indx1x6.102: lessonStartsNothing's two scenarios are of solid ideas). The level is read first, from the store and from the sheet's
 * own chip (the sheet has read it, and an unread level draws no chip), and the sheet's last part is waited for: what is or is not in its foot is then the sheet's choice.
 */
async function lessonOfUnsolidIdea(ideaId: string, levelName: string): Promise<HTMLElement> {
  const level = (await getLevel(ideaId))?.level;
  expect(level).toBeDefined();
  expect(level).not.toBe('solid');
  const sheet = screen.getByRole('dialog', { name: 'Idea' });
  expect(within(sheet).getByRole('heading', { name: ideaOfAny(ideaId).title })).toBeInTheDocument();
  await waitFor(() => expect(within(sheet).getByTestId('idea-level')).toHaveTextContent(`${levelName} since`));
  await within(sheet).findByText('Worked example');
  return sheet;
}

/** Over a run the lesson of an idea that is not solid has no Mark known without a drill: without the guard of what is over a run (src/overRun.ts) the button is here. */
async function noMarkKnown(_: unknown, markKnown: string, levelName: string, ideaId: string): Promise<void> {
  expect(buttonsOf(await lessonOfUnsolidIdea(ideaId, levelName))).not.toContain(markKnown);
}

/** The stops of the lesson's level slider, as src/IdeaSheet.tsx draws them. */
const LEVEL_STOPS = ['Not yet', 'Learning', 'I know it'];

/**
 * Over a run the alphabet's lesson has no level slider, so Learning, which starts the letter drill at once, cannot be chosen there (mw-indx1x6.79). A slider that is drawn is slid
 * to the stop first and the letter drill it starts is waited for: the step then fails on the second run of questions over the drill, the fault itself, and not only on the slider.
 */
async function noSliderNoLetterDrill(_: unknown, slider: string, stop: string): Promise<void> {
  const sheet = screen.getByRole('dialog', { name: 'Idea' });
  await within(sheet).findByText('Worked example');
  const drawn = within(sheet).queryByRole('slider', { name: slider });
  if (drawn) {
    fireEvent.change(drawn, { target: { value: String(LEVEL_STOPS.indexOf(stop)) } });
    // the letter drill follows the level's write
    await screen.findByRole('dialog', { name: 'Letter drill' }).catch(() => undefined);
  }
  expect(screen.queryByRole('dialog', { name: 'Letter drill' })).toBeNull();
  expect(drawn).toBeNull();
  expect(sheet.querySelector('[data-testid="level-slider"]')).toBeNull();
}

/** Learning is the level 'frontier' (src/IdeaSheet.tsx STOPS): the lesson over a run wrote none. */
async function notPutToLearning(_: unknown, ideaId: string): Promise<void> {
  expect((await getLevel(ideaId))?.level).not.toBe('frontier');
}

/** What a Study row draws for a lesson where a table opens as a layer (src/review/useStudyPlaces.tsx): the sheet inside the run's guard. */
async function lessonOverADrill(_: unknown, ideaId: string): Promise<void> {
  await freshStore();
  render(
    <OverRun.Provider value={true}>
      <IdeaSheetWithWord ideaId={ideaId} onClose={() => {}} />
    </OverRun.Provider>,
  );
  await lessonIsOpen(ideaId);
}

async function tapFirstExample(): Promise<void> {
  const sheet = screen.getByRole('dialog', { name: 'Idea' });
  const example = await waitFor(() => {
    const found = sheet.querySelector<HTMLElement>('[data-testid="idea-example"]');
    if (!found) throw new Error('the lesson has no example yet');
    return found;
  });
  await user.click(example);
  await within(await screen.findByRole('dialog', { name: 'Word' })).findByTestId('sheet-paradigm');
}

async function lessonFromAList(_: unknown, ideaId: string): Promise<void> {
  // what a list of ideas draws for the idea tapped (Settings > Grammar approach, src/settings/controls/approach.tsx): the sheet over no drill
  render(<IdeaSheetWithWord ideaId={ideaId} onClose={() => {}} />);
  await lessonIsOpen(ideaId);
}

let passage: Chapter[] = [];

async function openDrillIt(_: unknown, ideaId: string): Promise<void> {
  await freshStore();
  await drawDrillIt(ideaId);
}

/** Draws Drill it on the idea in the store as it is (a scenario that set up a licence and a fake Postern first keeps them). */
async function drawDrillIt(ideaId: string): Promise<void> {
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

// --- mw-indx1x6.57: what is drawn over a run offers nothing that leaves it --------------------------------------------------------------------------------------------------

/** The headword of the ending the short drill asks. */
let askedLemma = '';

/** A short drill of one real ending question (buildEnding: a word of 1 John 2 in the accusative), on a phone with Logos on and 21 lexicons On, so the word's sheet has its All lexicons door. */
async function openShortDrillOnAnEnding(): Promise<void> {
  await freshStore();
  await keepImport(EVERY_BOOK_IDS);
  await db.settings.put({ key: 'resource.logos', value: 'on' });
  await setKind('lexicon', 'off');
  for (const lexicon of LEXICONS.slice(0, 21)) await setState(lexicon.resource, 'on');
  passage = [await loadChapter('1jn', 2)];
  const ending = buildEnding(ideaOfAny('case-accusative'), passage, mulberry32(1));
  if (!ending?.lemma) throw new Error('1 John 2 gives no ending question of the accusative');
  asked = ending;
  askedLemma = ending.lemma;
  render(<PlanDrillScreen ideaId="case-accusative" facetLabel="Its ending" questions={[{ ...ending, facet: { id: 'ending', label: 'Its ending' }, step: 1, key: 'ending-1' }]} onFinish={() => {}} onClose={() => {}} />);
  await waitFor(() => expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(ending.prompt));
}

const wordSheet = (): HTMLElement => screen.getByRole('dialog', { name: 'Word' });

/** The word's sheet is drawn inside the drill's own dialog, so it stands over the drill. */
async function wordSheetIsOverTheDrill(): Promise<void> {
  const sheet = await screen.findByRole('dialog', { name: 'Word' });
  expect(sheet.parentElement?.closest('[role="dialog"]')?.getAttribute('aria-label')).toMatch(/^(Short drill|Drill it|Idea)$/);
  await within(sheet).findByTestId('sheet-word');
}

/** What a control says, for a failure to name it. */
const controlName = (control: HTMLElement): string => control.getAttribute('aria-label') ?? control.textContent?.trim() ?? '';

/** The buttons that close the sheet they are on, or speak (Hear it, a lesson's Hear of a form): a tap on one is no way out of the page, and the walk leaves them be (a closed sheet has no controls left to tap). */
const NOT_TAPPED = /^(Close|Done|Back|Hear|Listen|Read aloud|Stop)\b/;

const SHEETS = '[role="dialog"], [role="alertdialog"]';
/** What a sheet is known by when it is drawn again: its name and what it is of (the words of the word's sheet; the first heading of another: the term of the Grammar
 *  sheet, the idea of a lesson. Not its later headings, which a lesson draws when its examples have loaded). */
const sheetMark = (sheet: HTMLElement): string => {
  const words = [...sheet.querySelectorAll('[data-testid="sheet-word"]')].map((word) => word.textContent?.trim());
  return `${sheet.getAttribute('aria-label') ?? ''}: ${words.length ? words.join(' | ') : (sheet.querySelector('h1, h2, h3')?.textContent?.trim() ?? '')}`;
};
/** No link to a page of this app (an `a` whose href is a `#/...` address) is drawn on the sheet. */
const noLinkToAPage = (sheet: HTMLElement): void => expect([...sheet.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].map(controlName), `links to a page on the sheet ${sheetMark(sheet)}`).toEqual([]);
/** The most taps the walk gives one sheet: a control whose name changes with every tap would otherwise be tapped for ever. */
const MOST_TAPS = 200;

/**
 * Taps every control of the word's sheet, and after each tap the page's address is as it was: no link to a page of this app is drawn, and no button changes
 * window.location. A sheet a tap opens over it is walked the same way the first time a sheet of its name opens (the Grammar sheet of the first parsing term, the lesson
 * its Learn this idea opens, All lexicons), `deep` sheets up (0: the word's sheet alone); the next sheet of that name is checked for links and closed, since a walk of
 * every term's sheet and lesson is some hundred taps a word, and a step of that length outruns its time on a loaded host. Gives the names of the controls it tapped.
 *
 * A tap may draw the sheet again with other things on it: an example of the Grammar sheet a parsing term opens puts its own word on the word's sheet, and the buttons that
 * were listed after the term are gone (mw-indx1x6.101: the walk listed the buttons once, never reached those and passed). So after each tap that changes what the sheets
 * show, the walk steps Back, as the phone's Back does (one step closes the sheet a tap opened, or undoes a move inside a sheet: src/ui/sheetBack.ts; Escape and Done on a
 * Grammar sheet would close the word's sheet with it), until the sheets are as they were, and finds each next control again by its name. What a move put on a sheet (the
 * example's word, a related term) is checked for links and not walked. The walk fails, naming the control, when a control the word's sheet had at the start is never
 * tapped, when Back does not bring the sheets back, and when a tap closes the word's sheet.
 */
async function noControlLeaves(deep = 2): Promise<string[]> {
  const before = window.location.href;
  const tapped: string[] = [];
  const word = (): HTMLElement => {
    const sheet = document.querySelector<HTMLElement>('[role="dialog"][aria-label="Word"]');
    if (!sheet) throw new Error(`the word's sheet is closed${tapped.length ? `, after a tap on "${tapped[tapped.length - 1]}"` : ''}`);
    return sheet;
  };
  // what was open when the walk began (the drill, the lesson the word was opened from, the word's sheet) is under the sheets the walk opens
  const under = [...document.querySelectorAll<HTMLElement>(SHEETS)];
  /** The sheets the walk's taps opened over the word's sheet, in the order they came. */
  let over: HTMLElement[] = [];
  const sheets = (): HTMLElement[] => {
    over = over.filter((sheet) => sheet.isConnected);
    for (const sheet of document.querySelectorAll<HTMLElement>(SHEETS)) if (!under.includes(sheet) && !over.includes(sheet)) over.push(sheet);
    return [word(), ...over];
  };
  const shown = (): string => sheets().map(sheetMark).join(' > ');
  const top = (): HTMLElement => sheets()[sheets().length - 1];
  /** The buttons of a sheet, each with its name and its place among the buttons of that name: what it is found by again after the sheet is drawn anew. */
  const controls = (sheet: HTMLElement): { button: HTMLButtonElement; name: string; key: string }[] => {
    const count = new Map<string, number>();
    return [...sheet.querySelectorAll<HTMLButtonElement>('button')]
      // a button of a sheet drawn inside this one is walked with that sheet
      .filter((button) => button.closest(SHEETS) === sheet)
      .map((button) => {
        const name = controlName(button);
        const nth = count.get(name) ?? 0;
        count.set(name, nth + 1);
        return { button, name, key: `${name} #${nth + 1}` };
      });
  };
  const tappable = ({ button, name }: { button: HTMLButtonElement; name: string }): boolean => !button.disabled && !NOT_TAPPED.test(name);
  /** The names of the sheets walked over the word's sheet: the next of a name is checked for links and not walked. */
  const walkedUp = new Set<string>();
  const firstOfItsName = (sheet: HTMLElement): boolean => {
    const name = sheet.getAttribute('aria-label') ?? '';
    if (walkedUp.has(name)) return false;
    walkedUp.add(name);
    return true;
  };
  /** Steps Back until the sheets show `here` again; `floor` is the history depth they stood at. */
  const backTo = async (here: string, floor: number, name: string): Promise<void> => {
    for (let was = shown(); was !== here; was = shown()) {
      if (sheetDepth() <= floor) throw new Error(`Back does not undo the tap on "${name}": the sheets showed ${here} and now show ${was}`);
      act(() => window.history.back());
      await waitFor(() => expect(shown(), `Back after a tap on "${name}" changes what the sheets show`).not.toBe(was));
    }
  };
  const walk = async (level: number): Promise<void> => {
    const here = shown();
    const floor = sheetDepth();
    noLinkToAPage(top());
    const listed = controls(top()).filter(tappable).map(({ key }) => key);
    const done = new Set<string>();
    for (let taps = 0; ; taps += 1) {
      // the controls as they are now: one a tap drew is tapped too
      const next = controls(top()).find((control) => tappable(control) && !done.has(control.key));
      if (!next) break;
      if (taps === MOST_TAPS) throw new Error(`the walk tapped ${MOST_TAPS} controls of ${here} and "${next.name}" is still not tapped`);
      done.add(next.key);
      await user.click(next.button);
      tapped.push(next.name);
      expect(window.location.href, `after a tap on "${next.name}"`).toBe(before);
      const now = shown();
      if (now === here) continue;
      if (now.startsWith(`${here} > `) && level < deep && firstOfItsName(top())) await walk(level + 1);
      else sheets().forEach(noLinkToAPage);
      await backTo(here, floor, next.name);
    }
    // what the sheet drew since it was reached (a lesson's examples load after it opens) has no link either
    noLinkToAPage(top());
    // the word's sheet was drawn before the walk began, so each control it listed then is one the walk tapped (a sheet opened over it may still be loading when it is listed)
    if (level === 0) expect(listed.filter((key) => !done.has(key)), `controls of ${here} the walk never tapped`).toEqual([]);
  };
  await walk(0);
  return tapped;
}

/** The Paradigm row of the word's sheet over a run: the table's name, and nothing to tap. */
function paradigmRowIsNoLink(): void {
  const paradigm = within(wordSheet()).getByTestId('sheet-paradigm');
  expect(paradigm.textContent?.trim()).not.toBe('');
  expect(paradigm.querySelector('button, a')).toBeNull();
}

/** The word of the scenario, with its chapter: what a sheet over it is drawn from. */
let sheetWord: { chapter: Chapter; word: GreekWord } | undefined;

/** The word's sheet as it is drawn over a run (true) or over none, as the sheets that open one draw it (src/IdeaSheetWithWord.tsx, src/Talk.tsx). */
async function drawWordSheet(overRun: boolean): Promise<void> {
  if (!sheetWord) throw new Error('the scenario looked up no word');
  cleanup();
  render(
    <OverRun.Provider value={overRun}>
      <WordSheet chapter={sheetWord.chapter} lookup={{ words: [sheetWord.word], fromEnglish: false }} onClose={() => {}} />
    </OverRun.Provider>,
  );
  await within(await screen.findByRole('dialog', { name: 'Word' })).findByTestId('sheet-word');
}

/** The fake tutor's answer of the scenario: a table and a verse linked under it, each a page of its own, and a copy of a verse, which is a button that leaves nothing. */
async function licensedPhoneLinking(_: unknown, table: string, verse: string, copied: string): Promise<void> {
  await licensedPhone();
  if (!fake) throw new Error('no fake Postern');
  fake.autoReply = { status: 'answered', answer: { answer: 'The article agrees with its noun.', words: [], links: [{ kind: 'paradigm', table }, { kind: 'verse', reference: verse }, { kind: 'copy', reference: copied }] } };
}

/** A fake tutor whose answer writes a reference in its text: the link the Markdown makes of it opens the reference card. */
async function licensedPhoneSaying(_: unknown, said: string): Promise<void> {
  await licensedPhone();
  if (!fake) throw new Error('no fake Postern');
  fake.autoReply = { status: 'answered', answer: { answer: `The article agrees with its noun. ${said}.`, words: [], links: [] } };
}

async function tapReferenceInAnswer(_: unknown, reference: string): Promise<void> {
  const answer = document.querySelector<HTMLElement>('[data-talk-a]');
  if (!answer) throw new Error('the talk has no answer');
  await user.click(await within(answer).findByRole('link', { name: reference }));
}

const referenceCard = (): HTMLElement => {
  const card = document.querySelector<HTMLElement>('[data-reference-card]');
  if (!card) throw new Error('no reference card is open');
  return card;
};

/** Opens the talk the floating ? opens here (the newest door target: the drill's, or the lesson's) and asks its first suggested question. */
async function askTheTutor(): Promise<void> {
  expect(openDoorTarget()).toBe(true);
  const suggestion = await waitFor(() => {
    const found = document.querySelector<HTMLElement>('[data-suggestion]');
    if (!found) throw new Error('the talk has no suggested question yet');
    return found;
  });
  await user.click(suggestion);
  await waitFor(() => expect(document.querySelector('[data-talk-a]')).toHaveTextContent('The article agrees with its noun.'));
}

/** The chips under the tutor's answer are drawn: the group of the copied verse has its Copy button, so the links have been read and laid out and a chip that is missing was left out. */
async function answerHasCopyChip(_: unknown, reference: string): Promise<void> {
  await waitFor(() => {
    const group = document.querySelector<HTMLElement>(`[data-tutor-link][aria-label="${reference}"]`);
    expect([...(group?.querySelectorAll('button') ?? [])].map((b) => b.textContent?.trim())).toContain('Copy');
  });
}

const chipNames = (): string[] => [...document.querySelectorAll<HTMLElement>('[data-tutor-link] a, [data-tutor-link] button')].map(controlName);

const feature = await loadFeature('features/study-this.feature');

describeFeature(feature, ({ Scenario, ScenarioOutline }) => {
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

  Scenario('The lesson opened over a drill has no Drill it button, which would start a second drill over the first', ({ Given, When, And, Then }) => {
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
    And('the lesson has no {string} button, no {string} button, no {string} and no level slider', lessonStartsNothing);
    And('the drill is still on the question he missed', () => {
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(asked?.prompt ?? '');
      expect(screen.getByTestId('drill-next')).toBeInTheDocument();
      // one drill, the one he is in
      expect(screen.getAllByRole('dialog', { name: 'Drill it' })).toHaveLength(1);
    });
  });

  Scenario('The same lesson opened from a list of ideas keeps its Drill it button', ({ Given, Then }) => {
    Given('the lesson of the idea {string} is open as it is from a list of ideas', async (_, ideaId: string) => {
      await freshStore();
      await lessonFromAList(_, ideaId);
    });
    Then('the lesson has the buttons {string} and {string}', async (_, drillIt: string, tryIt: string) => {
      const sheet = screen.getByRole('dialog', { name: 'Idea' });
      // Try it on a verse is drawn once the passage is read and a verse of it has a form of the idea
      await waitFor(() => expect(buttonsOf(sheet)).toEqual(expect.arrayContaining([drillIt, tryIt])));
    });
  });

  Scenario('The lesson of an idea he is still learning, opened over a drill, has no Mark known without a drill', ({ Given, When, And, Then }) => {
    Given('Drill it is open on the idea {string}, which he is still learning', async (_, ideaId: string) => {
      await freshStore();
      await stillLearning(ideaId);
      await drawDrillIt(ideaId);
    });
    When("he answers the drill's question wrong", () => answer(false));
    And('he taps the lesson of the idea {string}', async (_, ideaId: string) => {
      await screen.findByRole('group', { name: 'Study this' });
      await tapLink(_, lessonLabel(ideaId));
    });
    Then('the lesson of the idea {string} is open over the drill', async (_, ideaId: string) => {
      await lessonIsOpen(ideaId);
      expect(screen.getByRole('dialog', { name: 'Drill it' })).toContainElement(screen.getByRole('dialog', { name: 'Idea' }));
    });
    And('the lesson has no {string}, though its level reads {string} and the idea {string} is not solid', noMarkKnown);
    And('the drill is still on the question he missed', () => {
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(asked?.prompt ?? '');
      expect(screen.getByTestId('drill-next')).toBeInTheDocument();
    });
  });

  Scenario('The same lesson of an idea he is still learning, opened from a list of ideas, keeps Mark known without a drill', ({ Given, Then }) => {
    Given('the lesson of the idea {string}, which he is still learning, is open as it is from a list of ideas', async (_, ideaId: string) => {
      await freshStore();
      await stillLearning(ideaId);
      await lessonFromAList(_, ideaId);
    });
    Then('the lesson has {string}, its level reading {string} and the idea {string} not solid', async (_, markKnown: string, levelName: string, ideaId: string) => {
      const sheet = await lessonOfUnsolidIdea(ideaId, levelName);
      await waitFor(() => expect(buttonsOf(sheet)).toContain(markKnown));
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
    And('the lesson also has its {string} button', (_, label: string) => {
      expect(buttonsOf(screen.getByRole('dialog', { name: 'Idea' }))).toContain(label);
    });
    // one step, there and back: tests/setup.ts clears session storage after every step, and the round kept there is what Back would fall to if the screen did not hold its own
    When("he taps the lesson's link {string}, sees the table {string} and goes Back", async (_, label: string, table: string) => {
      await user.click(within(screen.getByRole('dialog', { name: 'Idea' })).getByRole('button', { name: label }));
      await screen.findByRole('heading', { name: table, level: 1 });
      expect(screen.queryByTestId('grammar-prompt')).toBeNull();
      act(() => window.history.back());
      await screen.findByRole('heading', { name: 'Review', level: 1 });
    });
    Then('Review is on the question {string} with its {string} row', async (_, prompt: string, name: string) => {
      await waitFor(() => expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(prompt));
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
      expect(screen.getByTestId('feedback')).toHaveTextContent('Not quite.');
    });
    And('the round is on its first question of more than one', () => {
      const [, at, of] = /^(\d+) of (\d+)$/.exec(screen.getByText(/^\d+ of \d+$/).textContent ?? '') ?? [];
      expect(Number(at)).toBe(1);
      expect(Number(of)).toBeGreaterThan(1);
    });
  });

  Scenario("A letter's lesson over a drill has no link to its Hard sounds lesson", ({ Given, When, Then }) => {
    Given('the lesson of the idea {string} is open as it is over a drill', lessonOverADrill);
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

  ScenarioOutline("The alphabet's lesson over a drill has no level slider, so no letter drill opens over the drill", ({ Given, And, Then }, row) => {
    Given('the lesson of the idea <alphabet> is open as it is over a drill', () => lessonOverADrill(null, row.alphabet));
    Then('the lesson has no {string} slider to slide to {string}, and no letter drill opens', noSliderNoLetterDrill);
    And('the idea <alphabet> is not put to Learning', () => notPutToLearning(null, row.alphabet));
  });

  Scenario("The word's sheet opened over a drill has no link that leaves the drill", ({ Given, When, And, Then }) => {
    Given('a short drill is open on an ending of a word of 1 John 2', openShortDrillOnAnEnding);
    When('he answers the ending wrong', () => answer(false));
    And("he taps the row's Word link", async () => {
      await user.click(within(await screen.findByRole('group', { name: 'Study this' })).getByRole('button', { name: `Word: ${askedLemma}` }));
    });
    Then("the word's sheet is open over the drill", async () => {
      await wordSheetIsOverTheDrill();
      expect(within(wordSheet()).getByTestId('sheet-word')).toHaveTextContent(askedLemma);
    });
    And('All lexicons of the word has no {string} button, which opens the Library', async (_, label: string) => {
      await user.click(await within(wordSheet()).findByRole('button', { name: /^All \d+ lexicons/ }));
      const all = await screen.findByRole('dialog', { name: 'All lexicons' });
      // its rows are drawn (each opens Logos, another app), so the foot is too
      await waitFor(() => expect(within(all).getAllByRole('link').length).toBeGreaterThan(0));
      expect(within(all).queryByRole('button', { name: label })).toBeNull();
      await user.keyboard('{Escape}');
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'All lexicons' })).toBeNull());
    });
    And("no control of the word's sheet changes the page's address", async () => {
      const tapped = await noControlLeaves();
      // the walk tapped the door to All lexicons, so that sheet's own controls were walked too
      expect(tapped.some((name) => /^All \d+ lexicons/.test(name))).toBe(true);
    });
    And('the short drill is still on {string}', (_, text: string) => {
      expect(screen.getByTestId('plan-drill-step')).toHaveTextContent(text);
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(asked?.prompt ?? '');
      expect(row()).toBeInTheDocument();
    });
  });

  Scenario("A word of the lesson's examples opened over a drill names its table without a link to it", ({ Given, When, And, Then }) => {
    Given('Drill it is open on the idea {string}', openDrillIt);
    When("he answers the drill's question wrong", () => answer(false));
    And('he taps the lesson of the idea {string}', async (_, ideaId: string) => {
      await screen.findByRole('group', { name: 'Study this' });
      await tapLink(_, lessonLabel(ideaId));
      await lessonIsOpen(ideaId);
    });
    And('he taps the first example of the lesson', tapFirstExample);
    Then("the word's sheet is open over the drill", wordSheetIsOverTheDrill);
    And('its Paradigm row names a table and is no link', () => {
      const paradigm = within(wordSheet()).getByTestId('sheet-paradigm');
      expect(paradigm.textContent?.trim()).not.toBe('');
      expect(paradigm.querySelector('button, a')).toBeNull();
    });
    And("no control of the word's sheet changes the page's address", async () => {
      await noControlLeaves();
    });
    And('the drill is still on the question he missed', () => {
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(asked?.prompt ?? '');
      expect(screen.getByTestId('drill-next')).toBeInTheDocument();
      expect(screen.getAllByRole('dialog', { name: 'Drill it' })).toHaveLength(1);
    });
  });

  Scenario("A word of the lesson's examples opened from a list of ideas keeps the link to its table", ({ Given, When, Then }) => {
    Given('the lesson of the idea {string} is open as it is from a list of ideas', async (_, ideaId: string) => {
      await freshStore();
      await lessonFromAList(_, ideaId);
    });
    When('he taps the first example of the lesson', tapFirstExample);
    Then('its Paradigm row is a link to a table', () => {
      expect(within(wordSheet()).getByTestId('sheet-paradigm').querySelector('button[data-table]')).not.toBeNull();
    });
  });

  Scenario("A Hebrew word's sheet over a drill names its table without a link to it", ({ Given, When, And, Then }) => {
    Given('the sheet of the second word of Genesis 1:1, a Hebrew verb, is open as it is over a drill for a reader of Hebrew', async () => {
      await freshStore();
      // a Hebrew word has a sheet only for a reader of Hebrew (the dial of the chapter's language, src/WordSheet.tsx)
      await setLanguages('both');
      const chapter = await loadChapter('gen', 1);
      const word = chapter.verses[0].g[1];
      // the word has a table of its own (the qal verb), so over no run its Paradigm row is a link
      if (!paradigmOfHebrewWord(word, wordParse(chapter, word))) throw new Error('the second word of Genesis 1:1 has no table');
      sheetWord = { chapter, word };
      await drawWordSheet(true);
    });
    Then("the word's sheet is of a Hebrew word", () => {
      expect(within(wordSheet()).getByTestId('sheet-word')).toHaveAttribute('data-lang', 'hbo');
    });
    And('its Paradigm row names a table and is no link', paradigmRowIsNoLink);
    And("no control of the word's sheet changes the page's address", async () => {
      // the walk reaches the Paradigm row's place (mw-indx1x6.101): were the row a link here, its tap would change the address, as the scenario's last step shows over no run
      await noControlLeaves();
    });
    When('the sheet of the same word is open as it is over no run', () => drawWordSheet(false));
    Then('its Paradigm row is a link to a table', () => {
      expect(within(wordSheet()).getByTestId('sheet-paradigm').querySelector('button[data-table]')).not.toBeNull();
    });
    And("the walk of that sheet's controls stops at its Paradigm row, whose tap changes the page's address", async () => {
      const table = within(wordSheet()).getByTestId('sheet-paradigm').querySelector<HTMLElement>('button[data-table]')!;
      // the word's sheet alone: over no run the lesson a parsing term leads to has links of its own, which are not this step's
      await expect(noControlLeaves(0)).rejects.toThrow(`after a tap on "${controlName(table)}"`);
      expect(window.location.hash).toMatch(/^#\/paradigms/);
    });
  });

  Scenario("A Septuagint word's sheet over a drill has no About this reading link, which opens a Help page", ({ Given, When, And, Then }) => {
    Given("the sheet of the word {string} of the Septuagint's Genesis 1 is open as it is over a drill", async (_, form: string) => {
      await freshStore();
      const chapter = await loadSeptuagintChapter('gen', 1);
      const word = chapter?.verses[0].g.find((w) => w.t === form);
      if (!chapter || !word) throw new Error(`the Septuagint's Genesis 1:1 has no ${form}`);
      sheetWord = { chapter, word };
      await drawWordSheet(true);
    });
    Then("the word's sheet says how Lampas read the word and has no {string} button", (_, label: string) => {
      // the line the button stands under is drawn, so the button's absence is the sheet's choice over a run
      expect(within(wordSheet()).getByRole('group', { name: 'How Lampas read this word' })).toBeInTheDocument();
      expect(within(wordSheet()).queryByRole('button', { name: label })).toBeNull();
    });
    And("no control of the word's sheet changes the page's address", async () => {
      await noControlLeaves();
    });
    When('the sheet of the same word is open as it is over no run', () => drawWordSheet(false));
    Then("the word's sheet has the {string} button", (_, label: string) => {
      expect(within(wordSheet()).getByRole('button', { name: label })).toBeInTheDocument();
    });
  });

  Scenario("The lesson opened from a Review's Study list has no Try it on a verse, whose Read it would leave the end card", ({ Given, When, And, Then }) => {
    Given('the table {string} is due in Review and the round asks {string} first', tableDueAsking);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he misses every question of the round', () => everyQuestionOfTheRound(false));
    And("he taps the list's lesson of the idea {string}", async (_, ideaId: string) => {
      await user.click(rowNamed(lessonLabel(ideaId))[0]);
    });
    Then('the lesson of the idea {string} is open over the end card', async (_, ideaId: string) => {
      await lessonIsOpen(ideaId);
      expect(window.location.hash).toBe('#/review');
    });
    And('the lesson has no {string} button, no {string} button, no {string} and no level slider', lessonStartsNothing);
    And('the end card still shows its {string}', (_, name: string) => {
      expect(screen.getByTestId('score')).toBeInTheDocument();
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/review');
    });
  });

  Scenario("The article's lesson opened from a Review's Study list has no Try it on a verse, though the open chapter has the article", ({ Given, When, And, Then }) => {
    Given('the table {string} is due in Review, every idea of its cells solid', tableDueSolid);
    When('he opens Review and starts the round', openReviewAndStart);
    And('he misses every question of the round', () => everyQuestionOfTheRound(false));
    And("he taps the list's lesson of the idea {string}", async (_, ideaId: string) => {
      await user.click(rowNamed(lessonLabel(ideaId))[0]);
    });
    Then('the lesson of the idea {string} is open over the end card', async (_, ideaId: string) => {
      await lessonIsOpen(ideaId);
      expect(window.location.hash).toBe('#/review');
    });
    And('the lesson has no {string} button, though a verse of the open chapter has a form of the idea {string}', async (_, tryIt: string, ideaId: string) => {
      // the sheet's passage with no goal saved is the open chapter (src/IdeaSheet.tsx usePassage), and a verse of it has a form of the idea, which is what the sheet asks
      // (hasFormOf) before it draws the button on a plain screen: without the guard of what is over a run (src/review/useStudyPlaces.tsx) the button is here and the step fails
      const open = getStudyChapter();
      expect(hasFormOf(ideaId, [await loadChapter(open.book, open.chapter)])).toBe(true);
      const sheet = screen.getByRole('dialog', { name: 'Idea' });
      // the examples wait for the passage, as the button does: once they are drawn the button's absence is the sheet's choice
      await waitFor(() => expect(sheet.querySelectorAll('[data-testid="idea-example"]').length).toBeGreaterThan(0));
      await within(sheet).findByText('Worked example');
      expect(buttonsOf(sheet)).not.toContain(tryIt);
      expect(screen.queryByRole('dialog', { name: 'Try it' })).toBeNull();
    });
    And('the end card still shows its {string}', (_, name: string) => {
      expect(screen.getByTestId('score')).toBeInTheDocument();
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/review');
    });
  });

  Scenario("The lesson of an idea he is still learning, opened from a Review's Study list, has no Mark known without a drill", ({ Given, When, And, Then }) => {
    Given('the table {string} is due in Review and the round asks {string} first', tableDueAsking);
    And('he is still learning the idea {string}', (_, ideaId: string) => stillLearning(ideaId));
    When('he opens Review and starts the round', openReviewAndStart);
    And('he misses every question of the round', () => everyQuestionOfTheRound(false));
    And("he taps the list's lesson of the idea {string}", async (_, ideaId: string) => {
      await user.click(rowNamed(lessonLabel(ideaId))[0]);
    });
    Then('the lesson of the idea {string} is open over the end card', async (_, ideaId: string) => {
      await lessonIsOpen(ideaId);
      expect(window.location.hash).toBe('#/review');
    });
    And('the lesson has no {string}, though its level reads {string} and the idea {string} is not solid', noMarkKnown);
    And('the end card still shows its {string}', (_, name: string) => {
      expect(screen.getByTestId('score')).toBeInTheDocument();
      expect(screen.getByRole('group', { name })).toBeInTheDocument();
      expect(window.location.hash).toBe('#/review');
    });
  });

  Scenario('A table the tutor links in a talk over a drill is no chip, which would leave the drill', ({ Given, When, And, Then }) => {
    Given('a phone with a licence and a fake Postern whose answer links the table {string}, the verse {string} and a copy of {string}', licensedPhoneLinking);
    And('Drill it is open there on the idea {string}', (_, ideaId: string) => drawDrillIt(ideaId));
    When('he asks the tutor about the drill', askTheTutor);
    Then("the tutor's answer has the Copy chip of {string}", answerHasCopyChip);
    And('the answer has no {string} chip and no chip that opens the Reader', (_, table: string) => {
      expect(chipNames()).not.toContain(table);
      expect(chipNames().filter((name) => /in Lampas$/.test(name))).toEqual([]);
    });
    And("the page's address is as it was", () => {
      expect(window.location.hash).toBe('');
    });
    And('the drill is still on its first question', () => {
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(asked?.prompt ?? '');
      expect(screen.getAllByRole('dialog', { name: 'Drill it' })).toHaveLength(1);
    });
  });

  Scenario("The same answer in the lesson's talk from a list of ideas keeps the Table chip", ({ Given, When, And, Then }) => {
    Given('a phone with a licence and a fake Postern whose answer links the table {string}, the verse {string} and a copy of {string}', licensedPhoneLinking);
    And('the lesson of the idea {string} is open there as it is from a list of ideas', lessonFromAList);
    When('he asks the tutor about the lesson', askTheTutor);
    Then("the tutor's answer has the Copy chip of {string}", answerHasCopyChip);
    And('the answer has the {string} chip', (_, table: string) => {
      expect(chipNames()).toContain(table);
    });
  });

  Scenario('A reference the tutor writes in a talk over a drill opens a card that does not leave the drill', ({ Given, When, And, Then }) => {
    Given('a phone with a licence and a fake Postern whose answer says {string}', licensedPhoneSaying);
    And('Drill it is open there on the idea {string}', (_, ideaId: string) => drawDrillIt(ideaId));
    When('he asks the tutor about the drill', askTheTutor);
    And('he taps the reference {string} in the answer', tapReferenceInAnswer);
    Then('the reference card of {string} is open', async (_, reference: string) => {
      await screen.findByRole('dialog', { name: reference });
    });
    And("the card draws no control that changes the page's address", async () => {
      const card = referenceCard();
      expect(within(card).queryByRole('button', { name: /^Open/ })).toBeNull();
      expect(card.querySelector('a[href^="#"]')).toBeNull();
      expect(window.location.hash).toBe('');
    });
    And("the page's address is as it was", () => {
      expect(window.location.hash).toBe('');
    });
    And('the drill is still on its first question', () => {
      expect(screen.getByTestId('grammar-prompt')).toHaveTextContent(asked?.prompt ?? '');
      expect(screen.getAllByRole('dialog', { name: 'Drill it' })).toHaveLength(1);
    });
  });

  Scenario("The same reference in the lesson's talk from a list of ideas keeps the card's Open", ({ Given, When, And, Then }) => {
    Given('a phone with a licence and a fake Postern whose answer says {string}', licensedPhoneSaying);
    And('the lesson of the idea {string} is open there as it is from a list of ideas', lessonFromAList);
    When('he asks the tutor about the lesson', askTheTutor);
    And('he taps the reference {string} in the answer', tapReferenceInAnswer);
    Then('the reference card of {string} is open', async (_, reference: string) => {
      await screen.findByRole('dialog', { name: reference });
    });
    And('the card has the {string} button', (_, label: string) => {
      expect(within(referenceCard()).getByRole('button', { name: label })).toBeInTheDocument();
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
