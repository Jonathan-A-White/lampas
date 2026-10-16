// src/data/grammar/drillIt.ts — Drill it, the engine (mw-i7xe0n.1, PROVISIONAL, the Governor's want: 'start easy in the concept and work your way step by step up ...
// if it's now too hard for the person scale back ... kind of like a binary search ... find where is that person what are their gaps'). Pure: no store, no screen.
//   drillSteps(idea): the idea's questions in STEPS of rising difficulty (1 = easiest), each question tagged with a facet (a short id and the label that names it:
//     a letter, a pair of look-alikes, an ending, a case): what a miss tells him he has not got.
//   start / answer: the walk. It starts at step 1, goes UP one step on a right answer, and on a miss goes back HALFWAY (rounded down) between the last step he
//     held and the one he missed; a hinted right is neither (the step stays, and it never counts toward proved). It ends
//       'proved'  after two unhinted rights in a row at the top step,
//       'edge'    when the step he holds has the step above it failed (the highest step right, with a miss above it), or he misses step 1 twice (the edge is 0),
//       'limit'   after MAX_QUESTIONS (14) questions.
//   The result: {ideaId, proved, edgeStep, topStep, strong, weak, answers}; a facet is weak when missed at least once and right fewer than twice.
//   An idea whose sound the scheme changes by the next letter (mw-i7xe0n.7: χ is kh before α, hy before ε) is proved only when a word of each side of its
//   rule was answered right, unhinted: the walk keeps asking the side still missing at the top step (DrillWalk.sides).
// A drill's facets are its own idea's. Its prerequisites (ladder.ts `needs`) are assumed SOLID, never tested and never scaffolded: start() takes the learner's
// levels and, when a prerequisite is not solid, returns {needs: <the lowest>} instead of a walk (the Governor: one solid at a time, then one frontier).
// The ideas of the letters, sounds and marks tiers are built from their items (drillItems.ts); a noun-like idea is asked by what it is, by spotting it in a verse
// of `passage`, and by its ending (questions.ts), a preposition by its meaning case by case; with no passage only what the idea says of itself can be asked.
import type { Chapter } from '../chapter';
import { chosenPronunciation } from '../../speech/greek';
import { soundRuleOf, type Pronunciation } from '../../speech/pronunciation';
import { mulberry32, shuffle } from '../quiz';
import { collect, itemSteps, perFacet, questionKey, rng, sideFacet, type DrillContext, type RawStep } from './drillItems';
import { groupOfItem, ideaOf, type Facet } from './ladder';
import type { Level } from './needs';
import { COMPOUND_VERBS, PREPOSITIONS } from './prepositions';
import { MEANING, buildCompound, buildConcept, buildEnding, buildPreposition, buildTapForm, type GrammarQuestion } from './questions';

/** Questions in one walk. PROVISIONAL. */
export const MAX_QUESTIONS = 14;
/** Unhinted rights in a row at the top step that prove the idea. PROVISIONAL. */
export const PROVED_STREAK = 2;
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

/** The lowest prerequisite of the idea that is not solid, or null: the idea an item belongs to is not a prerequisite of it, and a missing level is not solid. */
export function unmetNeed(ideaId: string, levels: ReadonlyMap<string, Level>): string | null {
  const idea = ideaOf(ideaId);
  const group = groupOfItem(idea);
  const unmet = idea.needs.filter((id) => id !== group && levels.get(id) !== 'solid').map(ideaOf);
  return unmet.length === 0 ? null : unmet.sort((a, b) => a.rung - b.rung)[0].id;
}

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
  /** facets missed at least once and right fewer than twice */
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

/** The questions asked so far at a facet: [rights, misses]; a hinted right is neither. */
function tally(asked: readonly DrillAnswer[]): Map<string, { facet: Facet; right: number; missed: number }> {
  const facets = new Map<string, { facet: Facet; right: number; missed: number }>();
  for (const a of asked) {
    const t = facets.get(a.facet.id) ?? { facet: a.facet, right: 0, missed: 0 };
    if (!a.right) t.missed += 1;
    else if (!a.hinted) t.right += 1;
    facets.set(a.facet.id, t);
  }
  return facets;
}

/** Where he stands on each step he was asked: 'held' when his latest sure answer there was right, 'failed' when it was a miss. */
function standing(asked: readonly DrillAnswer[]): Map<number, 'held' | 'failed'> {
  const out = new Map<number, 'held' | 'failed'>();
  for (const a of asked) {
    if (!a.right) out.set(a.step, 'failed');
    else if (!a.hinted) out.set(a.step, 'held');
  }
  return out;
}

const highestHeld = (stood: ReadonlyMap<number, 'held' | 'failed'>, below = Infinity): number =>
  Math.max(0, ...[...stood].filter(([step, s]) => s === 'held' && step < below).map(([step]) => step));

/**
 * The next question at `step`: one not asked yet; the facet he just missed first when the walk went back to an easier step (to see whether it is a gap), else a
 * facet not asked yet, else the one asked least. When the step has no question left, the one asked longest ago, but never the one just asked.
 */
function nextAt(steps: readonly DrillStep[], step: number, asked: readonly DrillAnswer[], retry: string | null): DrillQuestion | null {
  const pool = steps[step - 1]?.questions ?? [];
  const last = asked[asked.length - 1]?.key;
  const seen = new Set(asked.map((a) => a.key));
  let candidates = pool.filter((q) => !seen.has(q.key));
  if (candidates.length === 0) {
    const lastAsked = (q: DrillQuestion): number => asked.reduce((at, a, i) => (a.key === q.key ? i : at), -1);
    candidates = pool.filter((q) => q.key !== last).sort((a, b) => lastAsked(a) - lastAsked(b));
  }
  if (candidates.length === 0) return pool[0] ?? null;
  const times = (q: DrillQuestion): number => asked.filter((a) => a.facet.id === q.facet.id).length;
  const again = retry === null ? undefined : candidates.find((q) => q.facet.id === retry);
  return again ?? candidates.reduce((best, q) => (times(q) < times(best) ? q : best));
}

/**
 * Begins the walk on an idea at step 1, or, when a prerequisite of the idea is not solid in `levels`, says which one is the lowest: {needs: id}. The questions assume the
 * prerequisites are solid and never test them.
 */
export function start(ideaId: string, levels: ReadonlyMap<string, Level>, options: DrillOptions = {}): DrillWalk | { needs: string } {
  const needs = unmetNeed(ideaId, levels);
  if (needs !== null) return { needs };
  const steps = drillSteps(ideaId, options);
  const rule = soundRuleOf(options.scheme ?? chosenPronunciation(), ideaId);
  const asked = new Set(steps.flatMap((s) => s.questions.map((q) => q.facet.id)));
  const sides = rule ? rule.sides.map((side) => sideFacet(rule, side).id).filter((id) => asked.has(id)) : [];
  return { ideaId, steps, step: 1, asked: [], current: nextAt(steps, 1, [], null), streak: 0, result: null, sides };
}

/** The sides of the idea's sound rule not yet answered right, unhinted. */
const sidesMissing = (walk: DrillWalk, asked: readonly DrillAnswer[]): string[] =>
  (walk.sides ?? []).filter((id) => !asked.some((a) => a.facet.id === id && a.right && !a.hinted));

function finish(walk: DrillWalk, asked: DrillAnswer[], ended: DrillEnd, streak: number): DrillWalk {
  const topStep = walk.steps.length;
  const facets = [...tally(asked).values()];
  const weak = facets.filter((t) => t.missed >= 1 && t.right < 2).map((t) => t.facet);
  const strong = facets.filter((t) => t.right >= 1 && !(t.missed >= 1 && t.right < 2)).map((t) => t.facet);
  const edgeStep = ended === 'proved' ? topStep : highestHeld(standing(asked));
  return { ...walk, asked, current: null, streak, result: { ideaId: walk.ideaId, proved: ended === 'proved', edgeStep, topStep, strong, weak, answers: asked, ended } };
}

/**
 * One answer to the question being asked. A right answer goes up one step (and two unhinted ones in a row at the top prove the idea); a miss goes back halfway between
 * the highest step he holds below it and the one missed; a hinted right stays put and breaks the run. A walk that is over does not change.
 */
export function answer(walk: DrillWalk, right: boolean, hinted: boolean): DrillWalk {
  const q = walk.current;
  if (walk.result || !q) return walk;
  const asked = [...walk.asked, { step: q.step, facet: q.facet, key: q.key, right, hinted }];
  const top = walk.steps.length;
  const sure = right && !hinted;
  const streak = sure && q.step === top ? walk.streak + 1 : 0;
  const missing = sidesMissing(walk, asked);
  if (streak >= PROVED_STREAK && missing.length === 0) return finish(walk, asked, 'proved', streak);
  if (asked.length >= MAX_QUESTIONS) return finish(walk, asked, 'limit', streak);

  const stood = standing(asked);
  let step = q.step;
  let retry: string | null = null;
  if (sure) {
    // the step he holds has the one above it failed: that is the edge
    if (stood.get(q.step + 1) === 'failed') return finish(walk, asked, 'edge', streak);
    step = Math.min(q.step + 1, top);
  } else if (!right) {
    const base = highestHeld(stood, q.step);
    if (base === 0 && q.step === 1 && asked.filter((a) => a.step === 1 && !a.right).length >= 2) return finish(walk, asked, 'edge', streak);
    step = Math.max(1, Math.floor((base + q.step) / 2));
    // a first miss on a word asks the same target with another word, at the same step (mw-i7xe0n.12); a second one goes back as any miss does
    const second = walk.asked.some((a) => a.step === q.step && a.facet.id === q.facet.id && !a.right);
    if (walk.steps[q.step - 1]?.words && !second) step = q.step;
    // an easier step asks the facet just missed again; step 1 asks another
    retry = step < q.step || walk.steps[q.step - 1]?.words ? q.facet.id : null;
  }
  // at the top, a side of the sound rule not yet answered right is asked first
  if (retry === null && step === top) retry = missing[0] ?? null;
  return { ...walk, step, asked, current: nextAt(walk.steps, step, asked, retry), streak };
}
