// src/data/grammar/placement.ts — the grammar placement (mw-hqd5bz.8), pure: an adaptive test that walks the ideas the goal needs in the
// order of the chosen approach (orderOf), two questions an idea. PROVISIONAL, the Mayor's rules, the Governor to confirm:
//   both right = solid, on to the next idea; one right = frontier, on; none = not yet, and BACK to the idea before it, down to the letters.
//   Two ideas missed in a row: nothing above is asked, the walk only goes down.
//   It stops when a step down lands on a solid idea (the ceiling is found), when no idea is left in that direction, or at QUESTION_LIMIT
//   questions in a sitting ('paused': the state is kept so he goes on another day).
// A walk that has reached the letters, sounds and marks ends in the quick round (quickRound.ts, mw-hqd5bz.18, PROVISIONAL): one tap on each letter, diphthong,
// consonant pair and breathing not yet solid, outside the 20 questions.
// 'Up' is later in the sequence, 'down' earlier; the letters, sounds and marks are always on the walk below what the goal needs, so a walk
// of misses can reach the letters. Nothing here touches the store or the screen; the question for an idea is built by questions.ts.
// What his right answers show (mw-hqd5bz.17, inference.ts, PROVISIONAL): a form read right credits its letters, sounds and marks, and one with enough
// right uses is solid (inferred) without being asked. A miss on a needed idea steps down to the letters, sounds and marks of the forms it was asked
// on (its `focus`), not to the whole alphabet; one of them already solid is passed over.
import { formOfQuestion, foundationOf, inferFromAnswer, isInferredSolid, type Evidence } from './inference';
import { TIERS, ideaOf, type Tier } from './ladder';
import type { Level, PassageNeeds } from './needs';
import type { QuickRound } from './quickRound';
import type { GrammarQuestion } from './questions';

/** Questions in one sitting. PROVISIONAL. */
export const QUESTION_LIMIT = 20;
/** Questions on one idea. */
export const ANSWERS_PER_IDEA = 2;

/** The tiers below the sentence: where the walk starts above, and always on the walk. */
const FOUNDATION: readonly Tier[] = ['letters', 'sounds', 'marks'];

export interface Asked {
  ideaId: string;
  right: boolean;
  /** the Greek form the question showed, when it showed one */
  form?: string;
}

/** What the placement needs to know of the question just answered. */
export type AnsweredQuestion = Pick<GrammarQuestion, 'kind' | 'ideaId' | 'form' | 'right'>;

export type PlacementDone = 'finished' | 'paused';

export interface PlacementState {
  /** the walk, in the approach's order: the ideas the goal needs, and the letters, sounds and marks */
  ideas: string[];
  /** the ids of the ideas the goal needs (all of the walk, with no goal) */
  needed: string[];
  /** the index in `ideas` of the idea being asked (the last one asked once the placement is done) */
  at: number;
  /** every answer of the placement, in order */
  asked: Asked[];
  /** where each idea stands: what he already had, and what this placement found */
  levels: Map<string, Level>;
  /** 'finished' when the walk is over, 'paused' at the question limit, null while it goes on */
  done: PlacementDone | null;
  questionsLeft: number;
  /** the walk is going down (the last move was a step down) */
  down: boolean;
  /** two ideas were missed in a row: nothing above is asked */
  onlyDown: boolean;
  /** how the last idea he finished came out */
  last: Level | null;
  /** the questions' seed; the n-th answer's question is questionSeed(state) */
  seed: number;
  /** what his right answers have shown of the letters, sounds and marks: the store's evidence at the start, and this sitting's answers */
  evidence: Map<string, Evidence>;
  /** the ideas this sitting made solid without asking them */
  inferred: string[];
  /** the letters, sounds and marks of the forms of the idea last missed: a walk down asks only these of the foundation; null asks them all */
  focus: string[] | null;
  /** the quick round over the letters, pairs and breathings not yet solid (quickRound.ts), once the walk has reached them; null before it starts */
  quick: QuickRound | null;
}

/** The seed of the question being asked: the same state gives the same question, and each question differs. */
export const questionSeed = (state: PlacementState): number => (state.seed + state.asked.length * 7919) >>> 0;

const answersOn = (state: PlacementState, id: string): number => state.asked.filter((a) => a.ideaId === id).length;

/** The idea being asked, or null once the placement is over or paused. */
export function currentIdea(state: PlacementState): string | null {
  return state.done === null ? (state.ideas[state.at] ?? null) : null;
}

/**
 * Sets up a placement. `needs` is what the goal needs (null: the whole ladder), `known` the levels he already has, `order` the approach's
 * sequence. It starts at the first idea past the letters, marks and sounds that is not solid yet, and skips nothing below it.
 */
export function startPlacement(
  needs: Pick<PassageNeeds, 'ideas'> | null,
  known: ReadonlyMap<string, Level>,
  order: readonly string[],
  seed: number,
  evidence: ReadonlyMap<string, Evidence> = new Map(),
): PlacementState {
  const wanted = needs ? new Set(needs.ideas.map((i) => i.id)) : null;
  // a diphthong, a consonant pair or a breathing is an item of the quick round, not an idea of the walk
  const ideas = order.filter((id) => !ideaOf(id).parent && (wanted === null || wanted.has(id) || FOUNDATION.includes(ideaOf(id).tier)));
  const levels = new Map(ideas.flatMap((id): [string, Level][] => (known.has(id) ? [[id, known.get(id)!]] : [])));
  const past = ideas.findIndex((id) => !FOUNDATION.includes(ideaOf(id).tier));
  const first = past < 0 ? -1 : ideas.findIndex((id, i) => i >= past && levels.get(id) !== 'solid');
  return {
    ideas,
    needed: ideas.filter((id) => wanted === null || wanted.has(id)),
    at: Math.max(first, 0),
    asked: [],
    levels,
    done: first < 0 ? 'finished' : null,
    questionsLeft: QUESTION_LIMIT,
    down: false,
    onlyDown: false,
    last: null,
    seed: seed >>> 0,
    evidence: new Map(evidence),
    inferred: [],
    focus: null,
    quick: null,
  };
}

/**
 * True when the walk has reached the letters, sounds and marks: it asked one of them, or stepped down to the ones its missed forms use. A walk that
 * had nothing to ask (everything the goal needs was solid already, as when he places himself again) has not probed them either, so it counts.
 */
export const reachedFoundation = (state: PlacementState): boolean =>
  state.asked.length === 0 || state.focus !== null || state.asked.some((a) => FOUNDATION.includes(ideaOf(a.ideaId).tier));

export const levelOfAnswers = (rights: number): Level => (rights >= ANSWERS_PER_IDEA ? 'solid' : rights > 0 ? 'frontier' : 'notYet');

/** The next idea up that was not asked in this placement, or -1. */
function above(state: PlacementState, from: number): number {
  const asked = new Set(state.asked.map((a) => a.ideaId));
  return state.ideas.findIndex((id, i) => i > from && !asked.has(id));
}

/**
 * The next idea down to ask: -1 when none is left or a solid one is met (the ceiling is found). Ideas already asked here are passed over. With a
 * focus, the letters, sounds and marks the missed forms do not use are passed over too, and so are the ones that are solid already.
 */
function below(state: PlacementState, from: number): number {
  const asked = new Set(state.asked.map((a) => a.ideaId));
  for (let i = from - 1; i >= 0; i -= 1) {
    const id = state.ideas[i];
    if (state.focus !== null && FOUNDATION.includes(ideaOf(id).tier)) {
      if (state.focus.includes(id) && !asked.has(id) && state.levels.get(id) !== 'solid') return i;
      continue;
    }
    if (state.levels.get(id) === 'solid') return -1;
    if (!asked.has(id)) return i;
  }
  return -1;
}

/** What the answers show: an idea with enough right uses is lifted to solid, and a miss on one held only by inference drops it to the frontier. */
function infer(state: PlacementState, shown: ReturnType<typeof inferFromAnswer>): PlacementState {
  const levels = new Map(state.levels);
  let inferred = state.inferred;
  for (const id of shown.credited) {
    if (!state.ideas.includes(id) || levels.get(id) === 'solid' || !isInferredSolid(shown.evidence.get(id))) continue;
    levels.set(id, 'solid');
    inferred = [...inferred, id];
  }
  for (const id of shown.missed) {
    if (!inferred.includes(id)) continue;
    levels.set(id, 'frontier');
    inferred = inferred.filter((i) => i !== id);
  }
  return { ...state, evidence: shown.evidence, levels, inferred };
}

/**
 * One answer to the question on the idea being asked; `question` is what was asked, so a form read right can credit its letters, sounds and marks
 * and a miss on a needed idea can step down to the ones its forms use. A placement that is over or paused does not change.
 */
export function answer(state: PlacementState, right: boolean, question?: AnsweredQuestion): PlacementState {
  const id = currentIdea(state);
  if (id === null) return state;
  const form = question ? formOfQuestion(question) : undefined;
  const asked = [...state.asked, { ideaId: id, right, ...(form ? { form } : {}) }];
  const questionsLeft = state.questionsLeft - 1;
  const shown = question ? inferFromAnswer(state.evidence, question, right) : { evidence: state.evidence, credited: [], missed: [] };
  let next: PlacementState = { ...state, asked, questionsLeft };
  if (answersOn(next, id) < ANSWERS_PER_IDEA) {
    next = infer(next, shown);
    return questionsLeft === 0 ? { ...next, done: 'paused' } : next;
  }

  const level = levelOfAnswers(asked.filter((a) => a.ideaId === id && a.right).length);
  const levels = new Map(state.levels).set(id, level);
  const onlyDown = state.onlyDown || (level === 'notYet' && state.last === 'notYet');
  next = infer({ ...next, levels, onlyDown, last: level, inferred: next.inferred.filter((i) => i !== id) }, shown);
  // a miss on a needed idea: the walk steps down to the letters, sounds and marks its forms use, together with those of the idea missed before
  const forms = asked.filter((a) => a.ideaId === id).flatMap((a) => (a.form ? [a.form] : []));
  if (level === 'notYet' && !FOUNDATION.includes(ideaOf(id).tier) && forms.length > 0) {
    const used = forms.flatMap(foundationOf);
    next = { ...next, focus: [...new Set([...(state.down ? (state.focus ?? []) : []), ...used])] };
  }
  // down: a miss steps back, and so does every idea after the walk turned down; up: the next idea later in the sequence
  const goDown = level === 'notYet' || onlyDown;
  const inFocus = next.focus !== null && FOUNDATION.includes(ideaOf(id).tier);
  const ceiling = state.down && level === 'solid' && !inFocus;
  const to = ceiling ? -1 : goDown ? below(next, state.at) : above(next, state.at);
  if (to < 0) return { ...next, done: 'finished' };
  next = { ...next, at: to, down: goDown };
  return questionsLeft === 0 ? { ...next, done: 'paused' } : next;
}

/** A paused placement, ready for another sitting: the next question is the one he was about to be asked. */
export function resumePlacement(state: PlacementState): PlacementState {
  return state.done === 'paused' ? { ...state, done: null, questionsLeft: QUESTION_LIMIT } : state;
}

export interface TierSummary {
  tier: Tier;
  ideas: { id: string; title: string; level: Level | null; inferred: boolean }[];
}

export interface PlacementSummary {
  solid: number;
  frontier: number;
  notYet: number;
  untested: number;
  total: number;
  /** the counted ideas by tier, easy first; level null is untested */
  tiers: TierSummary[];
}

/** Where he is: the ideas the goal needs, and any other idea that has a level, counted by level, and listed by tier. */
export function summarize(state: PlacementState): PlacementSummary {
  const needed = new Set(state.needed);
  const counted = state.ideas.filter((id) => needed.has(id) || state.levels.has(id));
  const levelOf = (id: string): Level | null => state.levels.get(id) ?? null;
  const count = (level: Level | null) => counted.filter((id) => levelOf(id) === level).length;
  return {
    solid: count('solid'),
    frontier: count('frontier'),
    notYet: count('notYet'),
    untested: count(null),
    total: counted.length,
    tiers: TIERS.flatMap((tier) => {
      const ideas = counted.map(ideaOf).filter((idea) => idea.tier === tier).map((idea) => ({ id: idea.id, title: idea.title, level: levelOf(idea.id), inferred: state.inferred.includes(idea.id) }));
      return ideas.length > 0 ? [{ tier, ideas }] : [];
    }),
  };
}
