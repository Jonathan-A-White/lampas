// src/data/grammar/placement.ts — the grammar placement (mw-hqd5bz.8), pure: an adaptive test that walks the ideas the goal needs in the
// order of the chosen approach (orderOf), two questions an idea. PROVISIONAL, the Mayor's rules, the Governor to confirm:
//   both right = solid, on to the next idea; one right = frontier, on; none = not yet, and BACK to the idea before it, down to the letters.
//   Two ideas missed in a row: nothing above is asked, the walk only goes down.
//   It stops when a step down lands on a solid idea (the ceiling is found), when no idea is left in that direction, or at QUESTION_LIMIT
//   questions in a sitting ('paused': the state is kept so he goes on another day).
// 'Up' is later in the sequence, 'down' earlier; the letters, sounds and marks are always on the walk below what the goal needs, so a walk
// of misses can reach the alphabet. Nothing here touches the store or the screen; the question for an idea is built by questions.ts.
import { TIERS, ideaOf, type Tier } from './ladder';
import type { Level, PassageNeeds } from './needs';

/** Questions in one sitting. PROVISIONAL. */
export const QUESTION_LIMIT = 20;
/** Questions on one idea. */
export const ANSWERS_PER_IDEA = 2;

/** The tiers below the sentence: where the walk starts above, and always on the walk. */
const FOUNDATION: readonly Tier[] = ['letters', 'sounds', 'marks'];

export interface Asked {
  ideaId: string;
  right: boolean;
}

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
export function startPlacement(needs: Pick<PassageNeeds, 'ideas'> | null, known: ReadonlyMap<string, Level>, order: readonly string[], seed: number): PlacementState {
  const wanted = needs ? new Set(needs.ideas.map((i) => i.id)) : null;
  const ideas = order.filter((id) => wanted === null || wanted.has(id) || FOUNDATION.includes(ideaOf(id).tier));
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
  };
}

const levelOfAnswers = (rights: number): Level => (rights >= ANSWERS_PER_IDEA ? 'solid' : rights > 0 ? 'frontier' : 'notYet');

/** The next idea up that was not asked in this placement, or -1. */
function above(state: PlacementState, from: number): number {
  const asked = new Set(state.asked.map((a) => a.ideaId));
  return state.ideas.findIndex((id, i) => i > from && !asked.has(id));
}

/** The next idea down to ask: -1 when none is left or a solid one is met (the ceiling is found). Ideas already asked here are passed over. */
function below(state: PlacementState, from: number): number {
  const asked = new Set(state.asked.map((a) => a.ideaId));
  for (let i = from - 1; i >= 0; i -= 1) {
    const id = state.ideas[i];
    if (state.levels.get(id) === 'solid') return -1;
    if (!asked.has(id)) return i;
  }
  return -1;
}

/** One answer to the question on the idea being asked. A placement that is over or paused does not change. */
export function answer(state: PlacementState, right: boolean): PlacementState {
  const id = currentIdea(state);
  if (id === null) return state;
  const asked = [...state.asked, { ideaId: id, right }];
  const questionsLeft = state.questionsLeft - 1;
  let next: PlacementState = { ...state, asked, questionsLeft };
  if (answersOn(next, id) < ANSWERS_PER_IDEA) return questionsLeft === 0 ? { ...next, done: 'paused' } : next;

  const level = levelOfAnswers(asked.filter((a) => a.ideaId === id && a.right).length);
  const levels = new Map(state.levels).set(id, level);
  const onlyDown = state.onlyDown || (level === 'notYet' && state.last === 'notYet');
  next = { ...next, levels, onlyDown, last: level };
  // down: a miss steps back, and so does every idea after the walk turned down; up: the next idea later in the sequence
  const goDown = level === 'notYet' || onlyDown;
  const ceiling = state.down && level === 'solid';
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
  ideas: { id: string; title: string; level: Level | null }[];
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
      const ideas = counted.map(ideaOf).filter((idea) => idea.tier === tier).map((idea) => ({ id: idea.id, title: idea.title, level: levelOf(idea.id) }));
      return ideas.length > 0 ? [{ tier, ideas }] : [];
    }),
  };
}
