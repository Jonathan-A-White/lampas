// src/review/kinds.ts — what Review asks, as items of a kind. A kind knows how to turn its due reviews into questions,
// how to count itself in words ('3 words'), and where an answer goes. Grammar ideas (mw-hqd5bz.6) and words are the kinds today, in the
// order Review counts and asks them; paradigm tables (mw-svw421.6) are the third; the course epic adds the rest as more entries of KINDS, each with a renderer in src/review/ItemCard.tsx.
import type { Chapter } from '../data/chapter';
import type { ParseStep } from '../data/drill';
import { drillSteps, type DrillQuestion } from '../data/grammar/drillIt';
import { facetQuestions, PLAN_KIND, parseRowId, type PlanItem } from '../data/grammar/drillPlan';
import { gradedVerses, ideaMetBy } from '../data/grammar/gradedVerses';
import { pickerPasses } from '../data/grammar/formLevel';
import { ideaOf, IDEA_KIND, type GrammarIdea } from '../data/grammar/ladder';
import { buildIdeaQuestion, type GrammarQuestion } from '../data/grammar/questions';
import { paradigmById } from '../data/paradigms';
import { PARADIGM_KIND, drawCellQuestions, spokenForm } from '../data/paradigms/cells';
import { parseReviewId } from '../data/readingDrill';
import { modeFor, type Grade, type QuestionMode } from '../data/schedule';
import { drawWords, mulberry32, type Question, type Random } from '../data/quiz';
import { loadForms, questionsOf } from '../data/quizWords';
import { wordsInPlay } from '../data/studyLanguage';
import { readSourceSegment } from '../ui/sourceSegmentStore';
import { loadPassage, planFacetQuestions } from '../data/repositories/reviewPassage';
import { chosenPronunciation, speakWord } from '../speech/greek';
import { speakQuestion } from '../speech/speakQuestion';
import { confirmAnswer } from './confirm';
import { keepStocked } from './moreItems';
import {
  getDrillPlan,
  answerPlanItem,
  getLanguages,
  getPickerGrammar,
  listLearningLemmas,
  listLevels,
  listOpenedParadigms,
  listSolidLemmas,
  LESSON_KIND,
  listWords,
  missedBefore,
  pushGrammarAnswer,
  recordAnswer,
  noteAnswer,
  recordDrillStep,
  recordGrammarAnswer,
  recordReview,
  reviewsOf,
  SOLID_STEP,
  SOUND_KIND,
  takeFetchedItems,
  type Review,
} from '../data/repositories';

/** A word asked as a Quick test question. */
export interface WordItem {
  kind: 'word';
  /** the store's key for the word, the same as the review's id */
  id: string;
  question: Question;
  /** how it is asked: multiple choice, or a flashcard (data/schedule.ts modeFor, from the word's step) */
  mode: QuestionMode;
}

/** What he taps on a flashcard to grade himself; isRight reads them. */
export const KNEW_IT = 'I knew it';
export const NOT_YET = 'Not yet';

/**
 * What he taps to grade a word (mw-5r3p30.787): on a word's flashcard, and under 'Right.' after a right pick on a word's multiple choice. Each is one of learn-kit's grades, which
 * the schedule counts differently ('well' moves the word up a step at once, 'some' is a right, 'not' a wrong).
 */
export const WORD_GRADES: ReadonlyArray<{ label: string; grade: Grade }> = [
  { label: 'Know it well', grade: 'well' },
  { label: 'Kind of', grade: 'some' },
  { label: "Don't know", grade: 'not' },
];

/** The grade a word button's label means; undefined for any other text. */
export const gradeOfLabel = (label: string): Grade | undefined => WORD_GRADES.find((g) => g.label === label)?.grade;

/** Whether the item is a word asked as multiple choice: a right pick on one asks how well he knew it (the grade buttons under 'Right.'). */
export const isGradedChoice = (item: ReviewItem): boolean => item.kind === 'word' && item.mode === 'choice';

/** The grade a flashcard word's tap gave, or undefined for any other item (a choice question's grade comes from the buttons after the pick). */
export const flashGrade = (item: ReviewItem, picked: string): Grade | undefined => (item.kind === 'word' && item.mode === 'flashcard' ? gradeOfLabel(picked) : undefined);
/** What a full parsing (GrammarCard) hands over when a step was wrong; the right answer is the parsing in plain words. */
export const NOT_PARSED = 'A step was wrong';

/** A grammar idea asked as a question about the passage of his goal (src/data/grammar/questions.ts). */
export interface GrammarItem {
  kind: 'grammar';
  /** the ladder idea's id, the same as the review's id */
  id: string;
  question: GrammarQuestion;
  /** multiple choice while the idea is weak, a flashcard once it is strong (data/schedule.ts modeFor, from the idea's step) */
  mode: QuestionMode;
}

/**
 * A sound (Greek) or a word (English) he drilled after missing it in his readings (src/ReadingDrill.tsx): the review id is 'el:diphthong-ou' or 'en:blessed'.
 * A Greek sound is asked as the quick round asks one (heard and picked, or seen and its sound picked); an English word is said aloud and graded by himself.
 */
export interface SoundItem {
  kind: 'sound';
  id: string;
  /** the Greek sound's question (the ladder idea's), null for an English word */
  question: GrammarQuestion | null;
  /** the English or Hebrew word to say, null for a Greek sound */
  word: string | null;
  /** the language of `word`: absent is English; a Hebrew word he missed reading aloud (mw-gdcyf98.14) is 'he' */
  lang?: 'he';
  mode: QuestionMode;
}

/**
 * A step of Your drill plan (src/data/grammar/drillPlan.ts, mw-i7xe0n.4): a short drill on one weak facet of an idea (4 to 6 questions of the facet) or, last, Prove it, a full Drill it
 * of the idea. The review id is '<idea id>|<item id>'. It is asked by its own card (src/review/DrillPlanCard.tsx), which runs the drill and grades the item KNEW_IT when it is passed.
 */
export interface PlanDrillItem {
  kind: 'drill-plan';
  id: string;
  ideaId: string;
  /** the plan's time: an answer to a plan made since is not put on it */
  planAt: number;
  item: PlanItem;
  /** the questions of a facet's short drill; none for Prove it */
  questions: DrillQuestion[];
  /** the chapters Prove it draws its questions from */
  passage: Chapter[];
}

/**
 * One cell of a paradigm table he is drilling (mw-svw421.6, src/data/paradigms/cells.ts): the cell's name as the prompt among four forms of the table. The review id is the
 * table's id, so a table asked three cells in a round appears as three items with the same id; the row takes one outcome a round (src/review/rowOutcome.ts), each cell's form is credited on its own.
 */
export interface ParadigmItem {
  kind: 'paradigm';
  /** the table's id, the same as the review's id */
  id: string;
  question: GrammarQuestion;
  /** multiple choice while the table is weak, a flashcard once it is strong (data/schedule.ts modeFor, from the table's step) */
  mode: QuestionMode;
}

/** One thing Review asks; a new kind of item is one more member here. */
export type ReviewItem = GrammarItem | ParadigmItem | PlanDrillItem | SoundItem | WordItem;

export interface ReviewKind {
  /** the kind of the item, or of the schedule rows alone: a passage lesson has rows and no item */
  kind: ReviewItem['kind'] | typeof LESSON_KIND;
  /** 'N words' */
  count: (n: number) => string;
  /** The items for the due reviews of this kind (an item that no longer exists is left out). */
  draw: (due: Review[], random: Random) => Promise<ReviewItem[]>;
  /** Whether the option he tapped is the right one. */
  isRight: (item: ReviewItem, picked: string) => boolean;
  /** Says the item aloud once it is answered, if it can be heard. */
  hear?: (item: ReviewItem) => void;
  /**
   * Puts one answer on the schedule. `row` is the answer to put on the item's schedule row: `right` as a rule, a different one when an earlier answer of the round on the same id
   * decided the row (src/review/rowOutcome.ts), or null to leave the row alone. Only a kind whose draw can give several items with one id is ever given anything but `right`
   * (a word, which is graded, is given its Grade).
   */
  record: (item: ReviewItem, right: boolean, row?: boolean | Grade | null) => Promise<void>;
}

export const WORDS: ReviewKind = {
  kind: 'word',
  count: (n) => `${n} ${n === 1 ? 'word' : 'words'}`,
  async draw(due, random) {
    if (due.length === 0) return [];
    const greek = loadForms('grc');
    const words = await listWords();
    const byLemma = new Map(words.filter((w) => w.state !== 'dropped').map((w) => [w.lemma, w]));
    const rows = due.flatMap((r) => {
      const word = byLemma.get(r.id);
      return word ? [{ word, step: r.step }] : [];
    });
    const questions = await questionsOf(rows.map((r) => r.word), words, random, { grc: greek });
    return rows.map(({ word, step }, i): WordItem => ({ kind: 'word', id: word.lemma, question: questions[i], mode: modeFor(step) }));
  },
  // a flashcard is graded by its three buttons: every grade but 'Don't know' is a right
  isRight: (item, picked) => item.kind === 'word' && (item.mode === 'flashcard' ? (gradeOfLabel(picked) ?? 'not') !== 'not' : picked === item.question.gloss),
  hear: (item) => {
    if (item.kind === 'word') speakWord(item.question.prompt, item.question.lang === 'hbo' ? 'hebrew' : 'greek');
  },
  record: async (item, right, row = right) => {
    if (item.kind === 'word' && row !== null) await recordAnswer(item.id, row);
  },
};

/** The seed a round's grammar questions are drawn from: one number taken from the round's random, so the words drawn beside them cannot shift it. */
const grammarSeed = (random: Random): number => Math.floor(random() * 0x100000000);

/** The random the grammar questions of a round use, from the round's own (tests find the seed that gives the question they need through it). */
export const grammarRandom = (random: Random): Random => mulberry32(grammarSeed(random));

/** The ladder's idea with this id; undefined for one the ladder no longer has, which Review leaves out. */
function ideaIfAny(id: string): GrammarIdea | undefined {
  try {
    return ideaOf(id);
  } catch {
    return undefined;
  }
}

/**
 * The verses of the passage graded to him (src/data/grammar/gradedVerses.ts): his grammar levels at the picker's level and the words he has solid or is learning;
 * `passes` is the form test they were graded by (Try it on a verse asks whether the word's forms pass it).
 */
export async function gradingOf(passage: readonly Chapter[]) {
  const [levels, level, solid, learning] = await Promise.all([listLevels(), getPickerGrammar(), listSolidLemmas(), listLearningLemmas()]);
  const passes = pickerPasses(levels, level);
  return { passes, graded: gradedVerses(passage, passes, new Set([...solid, ...learning]), ideaMetBy(levels, level)) };
}

/** The verses of the passage graded to him: see gradingOf. */
export async function gradedVersesOf(passage: readonly Chapter[]) {
  return (await gradingOf(passage)).graded;
}

export const GRAMMAR: ReviewKind = {
  kind: IDEA_KIND,
  count: (n) => `${n} ${n === 1 ? 'idea' : 'ideas'}`,
  async draw(due, random) {
    if (due.length === 0) return [];
    const seed = grammarSeed(random);
    const own = mulberry32(seed);
    const passage = await loadPassage(mulberry32(seed ^ 0x5bd1e995));
    const scheme = chosenPronunciation();
    // an ending is asked only of a form whose table he has opened (mw-svw421.5)
    const opened = new Set(await listOpenedParadigms());
    const graded = await gradedVersesOf(passage);
    // the items the mill wrote after an earlier round (src/review/moreItems.ts) are served first on their idea; they are read from the phone, so nothing waits on the network (mw-hqd5bz.36)
    const fetched = await takeFetchedItems(due.map((r) => r.id)).catch(() => new Map<string, GrammarQuestion>());
    // the stock of questions he has not been asked is topped up, in the background, for the ideas of the round that need one (mw-indx1x6.2); a kept item served here is counted as gone
    void keepStocked(due.map((r) => r.id));
    return due.flatMap((r): GrammarItem[] => {
      const idea = ideaIfAny(r.id);
      if (!idea) return [];
      const kept = fetched.get(idea.id);
      if (kept) return [{ kind: 'grammar', id: idea.id, question: kept, mode: modeFor(r.step) }];
      // an idea at SOLID_STEP or more may also be asked to parse a whole word (mw-emk3xt.3, PROVISIONAL)
      const question = buildIdeaQuestion(idea, passage, own, scheme.respell, scheme, opened, graded, r.step >= SOLID_STEP);
      // a full parsing is asked step by step, for a strong idea too: it is never a flashcard
      return [{ kind: 'grammar', id: idea.id, question, mode: question.kind === 'parse' ? 'choice' : modeFor(r.step) }];
    });
  },
  isRight: (item, picked) => item.kind === 'grammar' && (item.mode === 'flashcard' ? picked === KNEW_IT : picked === item.question.right),
  hear: (item) => {
    if (item.kind === 'grammar') speakQuestion(item.question);
  },
  record: async (item, right) => {
    if (item.kind !== 'grammar') return;
    // read before the answer is written: whether he missed the idea before decides whether this right answer marks it to confirm (src/review/confirm.ts)
    const wasMissed = await missedBefore(item.id).catch(() => false);
    await recordGrammarAnswer(item.id, right);
    // the question is remembered as asked too (confirmAnswer notes it first), so the mill is not asked for it again and a kept copy is not served (mw-indx1x6.1); the ask the confirm may start carries the seen list
    await confirmAnswer(item.question, right, { rowWritten: true, wasMissed });
    // a form read right shows its letters, sounds and marks; a miss on a letter or sound counts against it (mw-hqd5bz.17)
    await noteAnswer(item.question, right);
    // the ring of the last 20 grammar answers that decides whether New words at moves (src/review/pickerMove.ts)
    await pushGrammarAnswer(right);
  },
};

/**
 * A step of a full parsing answered (mw-emk3xt.3): it goes to the Parsing drill's table as DrillScreen writes it, by the word's headword and the step's id. The answer to the question as a whole
 * (right only when every step was) goes through GRAMMAR.record to the idea that was due.
 */
export async function recordParseStep(item: ReviewItem, step: ParseStep, right: boolean): Promise<void> {
  if (item.kind === 'grammar' && item.question.kind === 'parse' && item.question.lemma) await recordDrillStep(item.question.lemma, step.id, right);
}

/** The tables he drills that are due (mw-svw421.6): up to CELLS_A_ROUND available cells of each, a table with none available asks nothing and stays due. */
export const PARADIGM: ReviewKind = {
  kind: PARADIGM_KIND,
  count: (n) => `${n} ${n === 1 ? 'table' : 'tables'}`,
  async draw(due, random) {
    if (due.length === 0) return [];
    const own = grammarRandom(random);
    const levels = await listLevels();
    return due.flatMap((r): ParadigmItem[] => {
      const table = paradigmById(r.id);
      return table ? drawCellQuestions(table, levels, own).map((question): ParadigmItem => ({ kind: 'paradigm', id: table.id, question, mode: modeFor(r.step) })) : [];
    });
  },
  isRight: (item, picked) => item.kind === 'paradigm' && (item.mode === 'flashcard' ? picked === KNEW_IT : picked === item.question.right),
  hear: (item) => {
    // said once answered: before, it would give the answer away
    const form = item.kind === 'paradigm' ? spokenForm(item.question.right) : undefined;
    if (form) speakWord(form, 'greek');
  },
  record: async (item, right, row = right) => {
    if (item.kind !== 'paradigm') return;
    // a table is asked several cells in a round: its row takes one outcome (src/review/rowOutcome.ts)
    if (row !== null) await recordReview(PARADIGM_KIND, item.id, row);
    // a cell read right shows its form's letters, sounds and marks (mw-hqd5bz.17)
    await noteAnswer(item.question, right);
  },
};

/** The steps of drill plans that are due (mw-i7xe0n.4): a step of a plan that was replaced or closed, or that has no questions left to ask, is left out. Prove it is asked only when every short drill is done. */
export const DRILL_PLAN: ReviewKind = {
  kind: PLAN_KIND,
  count: (n) => `${n} ${n === 1 ? 'drill' : 'drills'}`,
  async draw(due, random) {
    if (due.length === 0) return [];
    const seed = grammarSeed(random);
    const passage = await loadPassage(mulberry32(seed ^ 0x5bd1e995));
    const steps = new Map<string, ReturnType<typeof drillSteps>>();
    const items: PlanDrillItem[] = [];
    for (const r of due) {
      const at = parseRowId(r.id);
      const plan = at ? await getDrillPlan(at.ideaId) : undefined;
      const item = plan?.items.find((i) => i.id === at?.itemId);
      if (!at || !plan || !item || item.done || ideaIfAny(at.ideaId) === undefined) continue;
      if (item.kind === 'prove' && plan.items.some((i) => i.kind === 'facet' && !i.done)) continue;
      if (!steps.has(at.ideaId)) steps.set(at.ideaId, drillSteps(at.ideaId, { passage, seed }));
      let questions = item.kind === 'facet' ? facetQuestions(steps.get(at.ideaId) ?? [], item) : [];
      // a facet this round's passage gives no question about is still asked when the count's own (fixed) passage gives one: what is counted due is always drawn
      if (item.kind === 'facet' && questions.length === 0) questions = await planFacetQuestions(at.ideaId, item);
      if (item.kind === 'facet' && questions.length === 0) continue;
      items.push({ kind: 'drill-plan', id: r.id, ideaId: at.ideaId, planAt: plan.at, item, questions, passage });
    }
    return items;
  },
  isRight: (item, picked) => item.kind === 'drill-plan' && picked === KNEW_IT,
  record: async (item, right) => {
    if (item.kind === 'drill-plan') await answerPlanItem(item.ideaId, item.planAt, item.item.id, right);
  },
};

export const SOUNDS: ReviewKind = {
  kind: SOUND_KIND,
  count: (n) => `${n} ${n === 1 ? 'sound' : 'sounds'}`,
  async draw(due, random) {
    if (due.length === 0) return [];
    const own = mulberry32(grammarSeed(random));
    const { respell } = chosenPronunciation();
    return due.flatMap((r): SoundItem[] => {
      const at = parseReviewId(r.id);
      if (!at) return [];
      if (at.lang === 'en') return [{ kind: 'sound', id: r.id, question: null, word: at.unit, mode: 'flashcard' }];
      if (at.lang === 'he') return [{ kind: 'sound', id: r.id, question: null, word: at.unit, lang: 'he', mode: 'flashcard' }];
      const idea = ideaIfAny(at.unit);
      return idea?.parent ? [{ kind: 'sound', id: r.id, question: buildIdeaQuestion(idea, [], own, respell), word: null, mode: modeFor(r.step) }] : [];
    });
  },
  isRight: (item, picked) => item.kind === 'sound' && (item.question === null || item.mode === 'flashcard' ? picked === KNEW_IT : picked === item.question.right),
  hear: (item) => {
    if (item.kind !== 'sound') return;
    if (item.question) speakQuestion(item.question);
    else if (item.word) speakWord(item.word, item.lang === 'he' ? 'hebrew' : 'english');
  },
  record: async (item, right) => {
    if (item.kind === 'sound') await recordReview(SOUND_KIND, item.id, right);
  },
};

/**
 * A passage lesson he did not pass by reading it, due again (mw-z370x5.2, src/data/repositories/passageLessons.ts tryAgainTomorrow). Review counts it ('Due today: 1 lesson') and its start
 * screen opens the Verse view on the lesson, where Check asks the questions: a lesson is never an item of a round, so nothing is drawn, answered or recorded here.
 */
export const LESSON: ReviewKind = {
  kind: LESSON_KIND,
  count: (n) => `${n} ${n === 1 ? 'lesson' : 'lessons'}`,
  draw: async () => [],
  isRight: () => false,
  record: async () => {},
};

/** Every kind Review knows, in the order its counts are written and its due items asked. */
export { loadPassage };

export const KINDS: readonly ReviewKind[] = [DRILL_PLAN, GRAMMAR, PARADIGM, SOUNDS, WORDS, LESSON];

export const kindOf = (kind: ReviewItem['kind']): ReviewKind => KINDS.find((k) => k.kind === kind) ?? WORDS;

/** Where a kind stands in the order due items are asked: the steps of a drill plan, then grammar ideas, then words (PROVISIONAL). */
export const kindRank = (kind: string): number => KINDS.findIndex((k) => k.kind === kind);

/** Words that are not due, to fill a round up, drawn as the Quick test draws (the learning ones favoured). */
export async function fillWords(exclude: ReadonlySet<string>, size: number, random: Random): Promise<WordItem[]> {
  if (size <= 0) return [];
  const greek = loadForms('grc');
  const [words, languages] = await Promise.all([listWords(), getLanguages()]);
  // the words in play are of the languages he chose; with both chosen the Greek | Hebrew segment of Review's start screen decides
  const inPlay = wordsInPlay(words, languages, readSourceSegment()).filter((w) => !exclude.has(w.lemma));
  const drawn = drawWords(inPlay, random, size);
  const questions = await questionsOf(drawn, words, random, { grc: greek });
  // a word that is on the schedule but not due is asked in the mode its step gives; one not scheduled yet is at step 0
  const steps = new Map((await reviewsOf(drawn.map((w) => ({ kind: 'word', id: w.lemma })))).map((r) => [r.id, r.step]));
  return drawn.map((w, i): WordItem => ({ kind: 'word', id: w.lemma, question: questions[i], mode: modeFor(steps.get(w.lemma) ?? 0) }));
}
