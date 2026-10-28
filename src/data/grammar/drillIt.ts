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
import { hebrewPronunciationOf, soundRuleOf, type Pronunciation } from '../../speech/pronunciation';
import { mulberry32, shuffle } from '../quiz';
import { isSolid } from './inference';
import { seenKey } from './fetchedItems';
import { collect, itemSteps, perFacet, questionKey, rng, sideFacet, type DrillContext, type RawStep } from './drillItems';
import { groupOfItem, type Facet } from './ladder';
import { hebrewLetterSteps } from './hebrew/drillSteps';
import { buildHebrewConcept, buildHebrewTapForm } from './hebrew/wordQuestions';
import { ideaOfAny as ideaOf, ladderFor, ladderLangOf } from './ladders';
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
  /** the questions he has been asked on the idea (seenKey of each): left out, so a seen question never counts toward proving it (mw-indx1x6.2); a question about no verse is never noted, so is never left out */
  seen?: ReadonlySet<string>;
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

/** The pronunciation an idea's sounds are read in: the chosen Greek one, or the Hebrew scheme for a Hebrew idea (mw-gdcyf98.11). */
const schemeOf = (ideaId: string): Pronunciation => (ladderLangOf(ideaId) === 'hbo' ? hebrewPronunciationOf() : chosenPronunciation());

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

/** A Hebrew idea that is not a letter: what it is, then finding a word that shows it in a verse of the passage's Hebrew chapters (mw-gdcyf98.21); a Hebrew idea has no ending to fill in. Null for a Greek idea. */
function hebrewWordSteps(ctx: DrillContext): RawStep[] | null {
  if (ladderLangOf(ctx.idea.id) !== 'hbo') return null;
  const { idea, passage } = ctx;
  return [
    { title: `What ${idea.title.toLowerCase()} is`, questions: collect(ctx, (random) => buildHebrewConcept(idea, random), 10, 0) },
    { title: 'Find it in a verse', questions: collect(ctx, (random) => buildHebrewTapForm(idea, passage, random), 60, 200).slice(0, STEP_SIZE) },
  ];
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
  const ctx: DrillContext = { idea, passage: options.passage ?? [], scheme: options.scheme ?? schemeOf(ideaId), seed: options.seed ?? 1 };
  const unseen = (questions: GrammarQuestion[]): GrammarQuestion[] =>
    options.seen ? questions.filter((q) => !q.ref || !options.seen?.has(seenKey({ prompt: q.prompt, ref: q.ref }))) : questions;
  const raw = (hebrewLetterSteps(ctx) ?? itemSteps(ctx) ?? prepositionSteps(ctx) ?? compoundSteps(ctx) ?? hebrewWordSteps(ctx) ?? passageSteps(ctx)).map((r) => ({ ...r, questions: unseen(r.questions) }));
  const own: Facet = { id: idea.id, label: idea.title };
  const kept = raw.filter((r) => r.questions.length > 0);
  // an idea nothing could be asked about is asked by what it says of itself
  const concept = (random: Parameters<typeof buildConcept>[1]): GrammarQuestion => (ladderLangOf(ideaId) === 'hbo' ? buildHebrewConcept(idea, random) : buildConcept(idea, random, ctx.scheme));
  const steps = kept.length > 0 ? kept : [{ title: 'What it is', questions: unseen(collect(ctx, concept, 10, 0)) }].filter((r) => r.questions.length > 0);
  return steps.map((r, i) => ({
    step: i + 1,
    title: r.title,
    ...('words' in r && r.words ? { words: true } : {}),
    questions: shuffle(r.questions, mulberry32((ctx.seed + i * 31) >>> 0)).map((q): DrillQuestion => ({ ...q, facet: q.facet ?? (q.kind === 'concept' ? MEANING : own), step: i + 1, key: questionKey(q) })),
  }));
}

/**
 * Whether these steps can prove the idea (mw-indx1x6.2): their top step is the idea's own top step (`whole`, the steps with nothing left out: a hard step he has seen every question of is gone, and the
 * easier one below it must not stand in for it) and holds the PROVED_STREAK questions whose unhinted rights in a row prove an idea. With fewer, an idea is not proved on questions he has not been asked.
 */
export const enoughToProve = (steps: readonly DrillStep[], whole: readonly DrillStep[] = steps): boolean => {
  const top = steps[steps.length - 1];
  return top !== undefined && top.title === whole[whole.length - 1]?.title && top.questions.length >= PROVED_STREAK;
};

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
export const unmetNeed = (ideaId: string, levels: ReadonlyMap<string, Level>): string | null => kitUnmetNeed(ladderFor(ladderLangOf(ideaId)).path, ideaId, needLevels(ideaId, levels));

// ---- Items the mill wrote ----

/**
 * A question the mill wrote (kept on the phone, see docs/grammar.md 'More items from the mill') as a question of this walk, in place of `place`: it takes the place's key and step, so the walk counts the place as asked,
 * and its own facet when the walk has one by that id (the walk's other questions are of it), else the place's. Graded as any is: by its right option, its facet, its `say`.
 */
export function asDrillQuestion(kept: GrammarQuestion, place: DrillQuestion, steps: readonly DrillStep[]): DrillQuestion {
  const known = new Set(steps.flatMap((s) => s.questions.map((q) => q.facet.id)));
  const facet = kept.facet && known.has(kept.facet.id) ? kept.facet : place.facet;
  return { ...kept, facet, step: place.step, key: place.key };
}

/** The walk with the question being asked swapped for a question the mill wrote (a walk that is over, or an item of another idea, does not change). Served once: the caller took it from the kept list. */
export function serveFetched(walk: DrillWalk, kept: GrammarQuestion): DrillWalk {
  if (walk.result || !walk.current || kept.ideaId !== walk.ideaId) return walk;
  return { ...walk, current: asDrillQuestion(kept, walk.current, walk.steps) };
}

/**
 * The walk with questions the mill wrote added to its top step (the idea's own, `whole`'s last; a walk without it gets it): used when the built questions he has not been asked are too few to prove an idea on (mw-indx1x6.2), so
 * the fresh ones are what he is proved on. An item of another idea is left out.
 */
export function addFetched(walk: DrillWalk, kept: readonly GrammarQuestion[], whole: readonly DrillStep[] = walk.steps): DrillWalk {
  const items = kept.filter((q) => q.ideaId === walk.ideaId);
  if (items.length === 0 || walk.result) return walk;
  const idea = ideaOf(walk.ideaId);
  const own: Facet = { id: idea.id, label: idea.title };
  const top = walk.steps[walk.steps.length - 1];
  const title = whole[whole.length - 1]?.title ?? 'Questions from the mill';
  // the idea's own top step may be gone (he has seen every question of it): the fresh questions make it again
  const step = top && top.title === title ? top.step : (top?.step ?? 0) + 1;
  const added = items.map((q): DrillQuestion => ({ ...q, facet: q.facet ?? own, step, key: questionKey(q) }));
  const steps = top && top.title === title ? walk.steps.map((s) => (s === top ? { ...s, questions: [...s.questions, ...added] } : s)) : [...walk.steps, { step, title, questions: added }];
  return { ...walk, steps, current: walk.current ?? added[0] };
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
  /** the questions he has been asked on the idea (the kit's ledger: seenKey of each), when the walk was told them: a right answer on one counts for nothing toward proving (learn-kit/drill WalkOptions.isFresh, mw-74h98vg.1) */
  seen?: ReadonlySet<string>;
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
  const rule = soundRuleOf(options.scheme ?? schemeOf(ideaId), ideaId);
  const required = rule ? rule.sides.map((side) => sideFacet(rule, side).id) : [];
  const walk = startWalk(ladderFor(ladderLangOf(ideaId)).path, ideaId, needLevels(ideaId, levels), kitSteps(steps), { required });
  if ('needs' in walk) return walk;
  return { ideaId, steps, step: 1, asked: [], current: walk.current?.payload ?? null, streak: 0, result: null, sides: walk.required, ...(options.seen ? { seen: options.seen } : {}) };
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
    // the question asked is fresh unless it is in the ledger (a question about no verse is never noted, so is always fresh)
    ...(walk.seen ? { isFresh: (key: string) => key !== walk.current?.key || !walk.current.ref || !walk.seen?.has(seenKey({ prompt: walk.current.prompt, ref: walk.current.ref })) } : {}),
  };
  const next = answerWalk(kit, right, hinted);
  return { ...walk, step: next.step, asked: next.asked, current: next.current?.payload ?? null, streak: next.streak, result: next.result && resultFromKit(next.result) };
}
