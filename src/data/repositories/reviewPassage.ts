// src/data/repositories/reviewPassage.ts — the passage a round's grammar questions are about, and the questions of a drill plan's short drill (mw-svw421.42). Review's draw
// (src/review/kinds.ts DRILL_PLAN) and the due count (reviews.ts planRowAskable) both read them here, so a row counted as due is a row the draw can ask.
import { BOOK_INDEX } from '../bookIndex';
import { loadChapter, type Chapter } from '../chapter';
import { parseGoal } from '../goal';
import { drillSteps, type DrillQuestion } from '../grammar/drillIt';
import { facetQuestions, type PlanItem } from '../grammar/drillPlan';
import { goalChapterNumbers } from '../grammar/needs';
import { mulberry32, shuffle, type Random } from '../quiz';
import { getStudyChapter } from '../readerChapter';
import { getGoal } from './settings';

/** The most chapters of a whole-book goal that a round reads questions from (one request each). */
const MAX_CHAPTERS = 6;

/** The seed the count's own look at a short drill uses (a round draws its own). */
const COUNT_SEED = 1;

/**
 * The passage grammar questions are about: the chapters of his goal (up to MAX_CHAPTERS of a whole book's) or, with no goal, the chapter the Reader has
 * open. A chapter that cannot be loaded is left out, and a phone that cannot load any is asked questions that need no passage.
 */
export async function loadPassage(chooser: Random): Promise<Chapter[]> {
  const goal = parseGoal(await getGoal(), BOOK_INDEX);
  const open = getStudyChapter();
  const wanted = goal
    ? shuffle(goalChapterNumbers(goal, BOOK_INDEX), chooser).slice(0, MAX_CHAPTERS).sort((a, b) => a - b).map((n) => [goal.book, n] as const)
    : [[open.book, open.chapter] as const];
  const loaded = await Promise.all(wanted.map(([book, n]) => loadChapter(book, n).catch(() => null)));
  return loaded.filter((c): c is Chapter => c !== null);
}

/**
 * The passage a Hebrew idea's questions are about (mw-gdcyf98.21): the Hebrew chapters of loadPassage's (his goal's, or the chapter the Reader has open) or, when it has none (a Greek goal, a New Testament
 * chapter open), the Old Testament chapter the Reader last had open (getStudyChapter('hbo'): Genesis 1 until then). A phone that cannot load it is asked questions that need no passage.
 */
export async function loadHebrewPassage(chooser: Random): Promise<Chapter[]> {
  const hebrew = (await loadPassage(chooser)).filter((c) => c.lang === 'hbo');
  if (hebrew.length > 0) return hebrew;
  const study = getStudyChapter('hbo');
  const fallback = await loadChapter(study.book, study.chapter).catch(() => null);
  return fallback ? [fallback] : [];
}

/** The questions of a facet's short drill over a fixed passage and seed: none when the idea never asks about that facet. */
export async function planFacetQuestions(ideaId: string, item: PlanItem): Promise<DrillQuestion[]> {
  const passage = await loadPassage(mulberry32(COUNT_SEED));
  return facetQuestions(drillSteps(ideaId, { passage, seed: COUNT_SEED }), item);
}
