// src/data/grammar/drillIt.ts — Drill it, the engine (mw-i7xe0n.1, PROVISIONAL, the Governor's want: 'start easy in the concept and work your way step by step up ...
// if it's now too hard for the person scale back ... kind of like a binary search ... find where is that person what are their gaps'). Pure: no store, no screen.
//   drillSteps(idea): the idea's questions in STEPS of rising difficulty (1 = easiest), each question tagged with a facet (a short id and the label that names it:
//     a letter, a pair of look-alikes, an ending, a case): what a miss tells him he has not got.
//   start / answer: the walk. It starts at step 1, goes UP one step on a right answer, and on a miss goes back HALFWAY (rounded down) between the last step he
//     held and the one he missed; a hinted right is neither (the step stays, and it never counts toward proved). It ends
//       'proved'  after two unhinted rights in a row at the top step,
//       'edge'    when the step he holds has the step above it failed (the highest step right, with a miss above it), or he misses step 1 twice (the edge is 0),
//       'limit'   after MAX_QUESTIONS (14) questions.
//   A first miss on a step of words to read (DrillStep.words: a letter's or pair's 'Read a word', the breathing in a harder word; mw-i7xe0n.12) stays at that step and asks
//   the same target with another word, so a word he cannot say does not end the walk at the step below; a second miss on it goes back as any miss does.
//   The result: {ideaId, proved, edgeStep, topStep, strong, weak, answers}; a facet is weak when missed at least once and right fewer than twice, or when a word
//   was missed at a step of words to read (mw-i7xe0n.16: the letter's other rights do not hide a word he could not say).
//   An idea whose sound the scheme changes by the next letter (mw-i7xe0n.7: χ is kh before α, hy before ε) is proved only when a word of each side of its
//   rule was answered right, unhinted: the walk keeps asking the side still missing at the top step (DrillWalk.sides), and after a hinted right on a side, that side
//   again (mw-i7xe0n.23; the card says a hinted right does not count toward Proved, hint.ts HINTED_RIGHT).
// A drill's facets are its own idea's. Its prerequisites (ladder.ts `needs`) are assumed SOLID, never tested and never scaffolded: start() takes the learner's
// levels and, when a prerequisite is not solid, returns {needs: <the lowest>} instead of a walk (the Governor: one solid at a time, then one frontier).
// The ideas of the letters, sounds and marks tiers are built from their items (drillItems.ts); a noun-like idea is asked by what it is, by spotting it in a verse
// of `passage`, and by its ending (questions.ts), a preposition by its meaning case by case; with no passage only what the idea says of itself can be asked.
// The walk and the lowest unmet need are learn-kit's (mw-79en7t.5, `learn-kit/drill`): start and answer hand the walk to the kit's startWalk and answerWalk, and this file keeps
// Lampas's own: the steps of questions an idea is asked in (drillSteps), the group an item is held to by (isSolid), and the sides of a sound rule.
import { MAX_QUESTIONS, PROVED_STREAK, answerWalk, startWalk, unmetNeed as kitUnmetNeed, type DrillResult as KitResult, type Walk, type WalkStep } from 'learn-kit/drill';
import type { Chapter } from '../chapter';
import { chosenPronunciation } from '../../speech/greek';
import { soundRuleOf, type Pronunciation } from '../../speech/pronunciation';
import { mulberry32, shuffle } from '../quiz';
import { isSolid } from './inference';
import { collect, itemSteps, perFacet, questionKey, rng, sideFacet, type DrillContext, type RawStep } from './drillItems';
import { LADDER_PATH, groupOfItem, ideaOf, type Facet } from './ladder';
import type { Level } from './needs';
import { COMPOUND_VERBS, PREPOSITIONS } from './prepositions';
import { MEANING, buildCompound, buildConcept, buildEnding, buildPreposition, buildTapForm, type GrammarQuestion } from './questions';

/** Questions in one walk (14) and unhinted rights in a row at the top step that prove the idea (2). PROVISIONAL. */
export { MAX_QUESTIONS, PROVED_STREAK };
/** Questions kept for one step of a passage-based idea. */
const STEP_SIZE = 12;
/** A verse with more words than this is a harder place to spot a form. */
const LONG_VERSE = 9;

export interface DrillOptions {
  /** the chapters the questions about forms are drawn from (the goal's, or the open chapter); none asks only what the idea says of itself */
  passage?: readonly Chapter[];
  /** the Greek pronunciation the sounds are read in (the chosen one by default) */
  scheme?: Pronunciation;
  /** the questions' seed: the same seed gives the same steps */
  seed?: number;
}

/** A question of a step, with what it is about. */
export interface DrillQuestion extends GrammarQuestion {
  facet: Facet;
  /** the step it belongs to, from 1 */
  step: number;
  /** what makes it this question and no other */
  key: string;
}

export interface DrillStep {
  step: number;
  /** what is asked in this step, in plain words */
  title: string;
  questions: DrillQuestion[];
  /** the step reads words: a first miss in it asks the same target with another word at the same step */
  words?: boolean;
}

// ---- The steps ----

/** A preposition by what it means: first against other prepositions' meanings, then against its own other cases too. */
function prepositionSteps(ctx: DrillContext): RawStep[] | null {
  const prep = PREPOSITIONS.find((p) => ctx.idea.id === `preposition-${p.key}`);
  if (!prep) return null;
  const ask = (near: boolean): GrammarQuestion[] =>
    prep.uses.flatMap((use, i) => collect(ctx, (random) => buildPreposition(ctx.idea, random, { case: use.case, near }), 6, 100 * i + (near ? 50 : 0)));
  const steps: RawStep[] = [{ title: `What ${prep.greek} means, among other prepositions`, questions: ask(false) }];
  if (prep.uses.length > 1) steps.push({ title: `What ${prep.greek} means with each case`, questions: ask(true) });
  return steps;
}

function compoundSteps(ctx: DrillContext): RawStep[] | null {
  if (ctx.idea.id !== 'compound-verbs') return null;
  return [{ title: 'What a verb with a preposition in front means', questions: COMPOUND_VERBS.map((verb, i) => ({ ...buildCompound(ctx.idea, rng(ctx, i), verb), ideaId: ctx.idea.id })) }];
}

/** Any other idea: what it is, spotting it in a short verse and a long one, then its ending. */
function passageSteps(ctx: DrillContext): RawStep[] {
  const { idea, passage } = ctx;
  const spots = collect(ctx, (random) => buildTapForm(idea, passage, random), 60, 200);
  const endings = perFacet(collect(ctx, (random) => buildEnding(idea, passage, random), 60, 400), STEP_SIZE);
  return [
    { title: `What ${idea.title.toLowerCase()} is`, questions: collect(ctx, (random) => buildConcept(idea, random, ctx.scheme), 10, 0) },
    { title: 'Find it in a short verse', questions: spots.filter((q) => q.options.length <= LONG_VERSE).slice(0, STEP_SIZE) },
    { title: 'Find it in a long verse', questions: spots.filter((q) => q.options.length > LONG_VERSE).slice(0, STEP_SIZE) },
    { title: 'Fill in its ending', questions: endings },
  ];
}

/**
 * The questions of an idea in steps of rising difficulty, step 1 the easiest, every question with its facet. An idea whose forms the passage lacks is asked by what it
 * says of itself; every idea of the ladder has at least one step.
 */
export function drillSteps(ideaId: string, options: DrillOptions = {}): DrillStep[] {
  const idea = ideaOf(ideaId);
  const ctx: DrillContext = { idea, passage: options.passage ?? [], scheme: options.scheme ?? chosenPronunciation(), seed: options.seed ?? 1 };
  const raw = itemSteps(ctx) ?? prepositionSteps(ctx) ?? compoundSteps(ctx) ?? passageSteps(ctx);
  const own: Facet = { id: idea.id, label: idea.title };
  const kept = raw.filter((r) => r.questions.length > 0);
  // an idea nothing could be asked about is asked by what it says of itself
  const steps = kept.length > 0 ? kept : [{ title: 'What it is', questions: collect(ctx, (random) => buildConcept(idea, random, ctx.scheme), 10, 0) }];
  return steps.map((r, i) => ({
    step: i + 1,
    title: r.title,
    ...(r.words ? { words: true } : {}),
    questions: shuffle(r.questions, mulberry32((ctx.seed + i * 31) >>> 0)).map((q): DrillQuestion => ({ ...q, facet: q.facet ?? (q.kind === 'concept' ? MEANING : own), step: i + 1, key: questionKey(q) })),
  }));
}

// ---- The foundation ----

/**
 * The levels of an idea's prerequisites as the kit reads them: solid when he has them solid, not yet otherwise; the idea an item belongs to is not a prerequisite of it, and an item of
 * a group he has made solid (the alphabet marked known on its sheet, whose letters are not each solid) counts as solid (mw-i7xe0n.19, isSolid).
 */
function needLevels(ideaId: string, levels: ReadonlyMap<string, Level>): Map<string, Level> {
  const idea = ideaOf(ideaId);
  const group = groupOfItem(idea);
  return new Map(idea.needs.map((id): [string, Level] => [id, id === group || isSolid(levels, id) ? 'solid' : 'notYet']));
}

/** The lowest prerequisite of the idea that is not solid, or null: lowest by rung (the kit reads it as the idea's level), and a missing level is not solid. */
export const unmetNeed = (ideaId: string, levels: ReadonlyMap<string, Level>): string | null => kitUnmetNeed(LADDER_PATH, ideaId, needLevels(ideaId, levels));

// ---- The walk ----

export interface DrillAnswer {
  step: number;
  facet: Facet;
  key: string;
  right: boolean;
  /** he was helped: a hinted right is not counted as right */
  hinted: boolean;
}

export type DrillEnd = 'proved' | 'edge' | 'limit';

export interface DrillResult {
  ideaId: string;
  /** two unhinted rights in a row at the top step */
  proved: boolean;
  /** the highest step he holds: 0 when he does not hold the first, the top step when proved */
  edgeStep: number;
  topStep: number;
  /** facets right at least once and not weak */
  strong: Facet[];
  /** facets missed at least once and right fewer than twice, and facets missed on a word of a step of words to read */
  weak: Facet[];
  answers: DrillAnswer[];
  ended: DrillEnd;
}

export interface DrillWalk {
  ideaId: string;
  steps: DrillStep[];
  /** the step being asked */
  step: number;
  asked: DrillAnswer[];
  /** the question being asked; null once the walk is over */
  current: DrillQuestion | null;
  /** unhinted rights in a row at the top step */
  streak: number;
  result: DrillResult | null;
  /** the facets of the sides of the idea's sound rule that its steps ask (mw-i7xe0n.7): each must be answered right before the idea is proved */
  sides?: string[];
}

/** The question being asked, or null once the walk is over. */
export const currentQuestion = (walk: DrillWalk): DrillQuestion | null => walk.current;

/** How the walk ended, or null while it goes on. */
export const resultOf = (walk: DrillWalk): DrillResult | null => walk.result;

// ---- The kit's walk, in Lampas's shape ----

/** The form every question of the walk is in for the kit: the kit reads a question's key, step and facet, and carries the rest (`payload`) without looking. */
const FORM = 'grammar';

/** The steps as the kit walks them: a step of words to read is one that retries a first miss. */
const kitSteps = (steps: readonly DrillStep[]): WalkStep<DrillQuestion>[] =>
  steps.map((s) => ({
    step: s.step,
    title: s.title,
    ...(s.words ? { retryFirstMiss: true as const } : {}),
    questions: s.questions.map((q) => ({ key: q.key, form: FORM, payload: q, facet: q.facet, step: q.step })),
  }));

const resultFromKit = (r: KitResult): DrillResult => ({
  ideaId: r.nodeId,
  proved: r.proved,
  edgeStep: r.edgeStep,
  topStep: r.topStep,
  strong: r.strong,
  weak: r.weak,
  answers: r.answers,
  ended: r.ended,
});

/**
 * Begins the walk on an idea at step 1, or, when a prerequisite of the idea is not solid in `levels`, says which one is the lowest: {needs: id}. The questions assume the
 * prerequisites are solid and never test them.
 */
export function start(ideaId: string, levels: ReadonlyMap<string, Level>, options: DrillOptions = {}): DrillWalk | { needs: string } {
  const needs = unmetNeed(ideaId, levels);
  if (needs !== null) return { needs };
  const steps = drillSteps(ideaId, options);
  const rule = soundRuleOf(options.scheme ?? chosenPronunciation(), ideaId);
  const required = rule ? rule.sides.map((side) => sideFacet(rule, side).id) : [];
  const walk = startWalk(LADDER_PATH, ideaId, needLevels(ideaId, levels), kitSteps(steps), { required });
  if ('needs' in walk) return walk;
  return { ideaId, steps, step: 1, asked: [], current: walk.current?.payload ?? null, streak: 0, result: null, sides: walk.required };
}

/**
 * One answer to the question being asked. A right answer goes up one step (and two unhinted ones in a row at the top prove the idea); a miss goes back halfway between
 * the highest step he holds below it and the one missed; a hinted right stays put and breaks the run. A walk that is over does not change.
 */
export function answer(walk: DrillWalk, right: boolean, hinted: boolean): DrillWalk {
  if (walk.result || !walk.current) return walk;
  const kit: Walk<DrillQuestion> = {
    nodeId: walk.ideaId,
    steps: kitSteps(walk.steps),
    step: walk.step,
    asked: walk.asked,
    current: { key: walk.current.key, form: FORM, payload: walk.current, facet: walk.current.facet, step: walk.current.step },
    streak: walk.streak,
    result: null,
    maxQuestions: MAX_QUESTIONS,
    provedStreak: PROVED_STREAK,
    required: walk.sides ?? [],
  };
  const next = answerWalk(kit, right, hinted);
  return { ...walk, step: next.step, asked: next.asked, current: next.current?.payload ?? null, streak: next.streak, result: next.result && resultFromKit(next.result) };
}
