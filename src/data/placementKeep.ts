// src/data/placementKeep.ts — a placement survives a close (mw-hqd5bz.8): the state is kept in localStorage (lampas.placement), whole, with
// the goal and the approach it was started for, so he can go on tomorrow where a paused one stopped. It is cleared when the placement
// ends or he starts it again. A kept placement of another goal or approach is not offered. The end card it reached is kept apart
// (lampas.placementCard, mw-86e9r1.23), so a reload or Back shows the card again.
import { ideaOf } from './grammar/ladder';
import type { Level } from './grammar/needs';
import type { Evidence } from './grammar/inference';
import type { QuickItem, QuickRound } from './grammar/quickRound';
import { ANSWERS_PER_IDEA, type Asked, type PlacementDone, type PlacementState } from './grammar/placement';

const KEY = 'lampas.placement';
const CARD_KEY = 'lampas.placementCard';

export interface SavedPlacement {
  /** the saved goal text the placement was started for ('Read 1 John 1:1', '' for none) */
  goal: string;
  /** the approach it walks */
  approach: string;
  state: PlacementState;
}

const LEVELS: readonly string[] = ['solid', 'frontier', 'notYet'];
const isLevel = (v: unknown): v is Level => typeof v === 'string' && LEVELS.includes(v);
const isIdea = (v: unknown): v is string => {
  if (typeof v !== 'string') return false;
  try {
    ideaOf(v);
    return true;
  } catch {
    return false;
  }
};
const isQuick = (v: unknown): v is QuickRound => {
  const q = v as Partial<QuickRound> | null;
  return (
    !!q &&
    Array.isArray(q.items) &&
    q.items.every((i: Partial<QuickItem>) => isIdea(i?.id) && (i.mode === 'hear' || i.mode === 'see')) &&
    count(q.at) &&
    q.at <= q.items.length &&
    Array.isArray(q.answers) &&
    q.answers.every((a) => isIdea(a?.id) && typeof a.right === 'boolean') &&
    typeof q.stopped === 'boolean' &&
    count(q.seed)
  );
};
const count = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;

function store(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function savePlacement(saved: SavedPlacement): void {
  const { state } = saved;
  try {
    store()?.setItem(KEY, JSON.stringify({ ...saved, state: { ...state, levels: [...state.levels], evidence: [...state.evidence] } }));
  } catch {
    // Storage full or refused: the placement is not kept, and the next open starts again.
  }
}

export function clearPlacement(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    // As above.
  }
}

/** The unfinished placement, or null when there is none (or what is stored is not a placement of ideas the ladder has). */
export function readPlacement(): SavedPlacement | null {
  try {
    const saved = JSON.parse(store()?.getItem(KEY) ?? 'null') as { goal?: unknown; approach?: unknown; state?: unknown } | null;
    if (!saved || typeof saved.goal !== 'string' || typeof saved.approach !== 'string') return null;
    const state = stateOf(saved.state);
    return state ? { goal: saved.goal, approach: saved.approach, state } : null;
  } catch {
    return null;
  }
}

/** The end card a placement reached ('Where you are'), kept so a reload, or Back to the entry that showed it, shows it again (mw-86e9r1.23).
 * Only the last is kept: the entry's address names it by its stamp (src/nav/route.ts placementCardOf). */
export interface SavedCard extends SavedPlacement {
  stamp: string;
  /** the ids of the gaps it named */
  gaps: string[];
  /** what the card of Start from the letters says besides the counts */
  fromLetters?: { solid: string[]; next: string | null };
}

export function saveCard(card: SavedCard): void {
  const { state } = card;
  try {
    store()?.setItem(CARD_KEY, JSON.stringify({ ...card, state: { ...state, levels: [...state.levels], evidence: [...state.evidence] } }));
  } catch {
    // As above: a reload shows the intro, as before.
  }
}

/** The kept end card, or null when there is none (or what is stored is not one). */
export function readCard(): SavedCard | null {
  try {
    const saved = JSON.parse(store()?.getItem(CARD_KEY) ?? 'null') as { stamp?: unknown; goal?: unknown; approach?: unknown; state?: unknown; gaps?: unknown; fromLetters?: unknown } | null;
    if (!saved || typeof saved.stamp !== 'string' || typeof saved.goal !== 'string' || typeof saved.approach !== 'string') return null;
    const { gaps } = saved;
    if (!Array.isArray(gaps) || !gaps.every(isIdea)) return null;
    const from = saved.fromLetters as { solid?: unknown; next?: unknown } | undefined;
    if (from !== undefined && !(Array.isArray(from?.solid) && from.solid.every((t) => typeof t === 'string') && (typeof from.next === 'string' || from.next === null))) return null;
    const state = stateOf(saved.state);
    if (!state) return null;
    const card: SavedCard = { stamp: saved.stamp, goal: saved.goal, approach: saved.approach, state, gaps };
    return from ? { ...card, fromLetters: { solid: from.solid as string[], next: from.next as string | null } } : card;
  } catch {
    return null;
  }
}

/** A kept placement's state, or null when it is not a placement of ideas the ladder has. */
function stateOf(kept: unknown): PlacementState | null {
  const s = kept as Record<string, unknown> | null | undefined;
  if (!s || typeof s !== 'object') return null;
  const { ideas, needed, at, asked, levels, done, questionsLeft, down, onlyDown, last, seed, evidence, inferred, focus, quick } = s;
  if (!Array.isArray(ideas) || !ideas.every(isIdea) || !Array.isArray(needed) || !needed.every(isIdea)) return null;
  if (!count(at) || at >= Math.max(ideas.length, 1) || !count(questionsLeft) || !count(seed)) return null;
  if (!Array.isArray(asked) || !asked.every((a: Partial<Asked>) => typeof a?.ideaId === 'string' && ideas.includes(a.ideaId) && typeof a.right === 'boolean' && (a.form === undefined || typeof a.form === 'string'))) return null;
  if (!Array.isArray(levels) || !levels.every((l) => Array.isArray(l) && ideas.includes(l[0]) && isLevel(l[1]))) return null;
  if (done !== null && done !== 'finished' && done !== 'paused') return null;
  if (typeof down !== 'boolean' || typeof onlyDown !== 'boolean' || (last !== null && !isLevel(last))) return null;
  // a placement kept before the evidence existed has none, and asks the foundation as it did
  if (evidence !== undefined && !(Array.isArray(evidence) && evidence.every((e) => Array.isArray(e) && typeof e[0] === 'string' && count(e[1]?.run) && count(e[1]?.misses)))) return null;
  if (inferred !== undefined && !(Array.isArray(inferred) && inferred.every((i) => typeof i === 'string'))) return null;
  if (focus !== undefined && focus !== null && !(Array.isArray(focus) && focus.every((i) => typeof i === 'string'))) return null;
  // a placement kept before the quick round existed has none
  if (quick !== undefined && quick !== null && !isQuick(quick)) return null;
  const idea = ideas[at];
  if (done === null && idea !== undefined && (asked as Asked[]).filter((a) => a.ideaId === idea).length >= ANSWERS_PER_IDEA) return null;
  return {
    ideas,
    needed,
    at,
    asked: asked as Asked[],
    levels: new Map(levels as [string, Level][]),
    done: done as PlacementDone | null,
    questionsLeft,
    down,
    onlyDown,
    last: last as Level | null,
    seed,
    evidence: new Map((evidence as [string, Evidence][] | undefined) ?? []),
    inferred: (inferred as string[] | undefined) ?? [],
    focus: (focus as string[] | null | undefined) ?? null,
    quick: (quick as QuickRound | null | undefined) ?? null,
  };
}
