// src/diagram/layout.ts — a diagram tree (types.ts) to positioned lines and words, in the Reed-Kellogg conventions (mw-souyao.1). Pure: the tree, the words and a
// measure(text) -> width function in, a Layout out, so a jsdom test passes a fixed-width measure and the screen passes the browser's. Nothing is scaled: the width is
// what the labels and the gaps add up to, and the box that shows it scrolls sideways.
//
// Coordinates grow right and down. A label's `y` is the y of the line it sits on (its text stands on it, LABEL_H tall above); `x` is its left edge.
//   - A clause is a base line: subject, a full bar through the line, verb, then a half bar (direct object) or a bar slanted back (predicate) and the complement.
//   - What hangs beneath a word is stacked one below another, the first-listed nearest the word: word modifiers (a slanted line and a foot line carrying the word),
//     an indirect object (the same, with its slot), prepositional phrases (a slanted line, the preposition beside it, then the object on a level line from the slant's foot),
//     last the subordinate clauses (a base line a drop below, a dotted line from the word down to its verb, the connector beside it). Later ones attach further left, so
//     a long slant never crosses an earlier one; a clause that would reach left past a later one's line is moved right, and its dotted line slants to its verb.
//     A slot's hangings push the next slot of the clause right of them, as far as they share a row with it.
//   - Coordinate clauses are stacked, joined by a dotted step line in the left margin carrying the conjunction.
import type { Clause, ClauseEntry, Diagram, DiagramWords, Modifier, Slot, TokenRef } from './types';

export const MARGIN = 16;
/** A label stands on its line this tall (the 44 px tap height). */
export const LABEL_H = 44;
/** The distance from a line to the line of what hangs beneath it. */
export const ROW = 46;
export const WORD_GAP = 14;
/** The room between two slots of a clause, in which the bar stands. */
export const BAR_SPACE = 32;
export const SLANT_RUN = 22;
export const PAD = 8;
const BAR_UP = 40;
const BAR_DOWN = 12;
const SLASH_RUN = 12;
const STAGGER = { min: 6, max: 14 };
const CLAUSE_DROP = 2 * ROW;
const STACK_GAP = 2 * ROW;
const STEP_X = 20;

export type SegmentKind =
  | 'base'
  | 'bar-full'
  | 'bar-half'
  | 'bar-predicate'
  | 'modifier'
  | 'foot'
  | 'prep-slant'
  | 'object-line'
  | 'indirect-slant'
  | 'join'
  | 'step';

export interface LayoutSegment {
  kind: SegmentKind;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dotted?: boolean;
  /** the clause it belongs to (a base line, its bars, the join to it) */
  clause?: number;
  /** a base line: the clause it hangs from, or null for a clause of the verse itself */
  parent?: number | null;
  /** a slant or a join: the label of the word it hangs on */
  attachesTo?: number;
}

export type LabelRole = 'subject' | 'verb' | 'complement' | 'modifier' | 'preposition' | 'object' | 'indirect' | 'connector' | 'conjunction';

export interface LayoutLabel {
  id: number;
  text: string;
  x: number;
  y: number;
  width: number;
  /** the word's index in the request's words; none for an implied word */
  index?: number;
  implied?: true;
  role: LabelRole;
  clause: number;
}

export interface Layout {
  width: number;
  height: number;
  segments: LayoutSegment[];
  labels: LayoutLabel[];
}

interface Scene {
  segments: LayoutSegment[];
  labels: LayoutLabel[];
}
interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}
interface Ctx {
  words: DiagramWords;
  measure: (text: string) => number;
  labels: number;
  clauses: number;
}
type Hanger = Modifier | { kind: 'indirect'; slot: Slot };

const emptyScene = (): Scene => ({ segments: [], labels: [] });

function merge(into: Scene, from: Scene, dx: number, dy: number): void {
  for (const s of from.segments) into.segments.push({ ...s, x1: s.x1 + dx, x2: s.x2 + dx, y1: s.y1 + dy, y2: s.y2 + dy });
  for (const l of from.labels) into.labels.push({ ...l, x: l.x + dx, y: l.y + dy });
}

function boundsOf(scene: Scene): Bounds {
  const b: Bounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  for (const s of scene.segments) {
    b.minX = Math.min(b.minX, s.x1, s.x2);
    b.maxX = Math.max(b.maxX, s.x1, s.x2);
    b.minY = Math.min(b.minY, s.y1, s.y2);
    b.maxY = Math.max(b.maxY, s.y1, s.y2);
  }
  for (const l of scene.labels) {
    b.minX = Math.min(b.minX, l.x);
    b.maxX = Math.max(b.maxX, l.x + l.width);
    b.minY = Math.min(b.minY, l.y - LABEL_H);
    b.maxY = Math.max(b.maxY, l.y);
  }
  return b;
}

interface Rect {
  l: number;
  r: number;
  t: number;
  b: number;
}

function rectsOf(scene: Scene): Rect[] {
  return [
    ...scene.segments.map((s) => ({ l: Math.min(s.x1, s.x2), r: Math.max(s.x1, s.x2), t: Math.min(s.y1, s.y2), b: Math.max(s.y1, s.y2) })),
    ...scene.labels.map((l) => ({ l: l.x, r: l.x + l.width, t: l.y - LABEL_H, b: l.y })),
  ];
}

/** The x to put `next` at (not less than `least`) so that nothing of it meets anything of `placed` on a row they share, with WORD_GAP between. */
function fitRight(placed: Scene, next: Scene, least: number): number {
  const before = rectsOf(placed);
  let dx = least;
  for (const b of rectsOf(next)) {
    for (const a of before) if (a.t < b.b && b.t < a.b) dx = Math.max(dx, a.r + WORD_GAP - b.l);
  }
  return dx;
}

function labelFor(ctx: Ctx, ref: TokenRef, role: LabelRole, clause: number, x: number, y: number): LayoutLabel {
  const implied = 'implied' in ref;
  const text = implied ? `(${ref.implied})` : (ctx.words[ref.i]?.text ?? '');
  const label: LayoutLabel = { id: ctx.labels++, text, x, y, width: ctx.measure(text), role, clause };
  if (implied) label.implied = true;
  else label.index = ref.i;
  return label;
}

const ORDER: Record<Hanger['kind'], number> = { word: 0, indirect: 1, prepositional: 2, clause: 3 };

interface Hung {
  depth: number;
  /** the rightmost x a hanging line starts from on the line above */
  attachMax: number;
}

/** Hangs `hangers` under the word `head` (spanning `span`) on the line at `y0`, into `scene`; returns how far down they reach. `bound` is the x no clause among them may reach left of. */
function hang(ctx: Ctx, scene: Scene, list: Hanger[], head: LayoutLabel | null, span: { l: number; r: number }, y0: number, clause: number, bound: number): Hung {
  const hangers = [...list].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  const n = hangers.length;
  const stagger = n > 1 ? Math.round(Math.min(STAGGER.max, Math.max(STAGGER.min, (span.r - span.l) / n))) : 0;
  const attachesTo = head?.id;
  let cur = 0;
  let attachMax = -Infinity;
  hangers.forEach((h, k) => {
    const ax = span.l + 2 + (n - 1 - k) * stagger;
    attachMax = Math.max(attachMax, ax);
    // the later ones hang further left and lower: what hangs here keeps right of their slants
    const keep = k + 1 < n ? Math.max(bound, ax - stagger + SLANT_RUN) : bound;
    if (h.kind === 'word') {
      const yf = y0 + cur + ROW;
      scene.segments.push({ kind: 'modifier', x1: ax, y1: y0, x2: ax + SLANT_RUN, y2: yf, clause, attachesTo });
      const word = labelFor(ctx, h.word, 'modifier', clause, ax + SLANT_RUN + PAD, yf);
      scene.labels.push(word);
      scene.segments.push({ kind: 'foot', x1: ax + SLANT_RUN, y1: yf, x2: word.x + word.width + PAD, y2: yf, clause });
      const under = hang(ctx, scene, h.modifiers, word, { l: word.x, r: word.x + word.width }, yf, clause, keep);
      cur += ROW + under.depth;
    } else if (h.kind === 'indirect') {
      const yf = y0 + cur + ROW;
      scene.segments.push({ kind: 'indirect-slant', x1: ax, y1: y0, x2: ax + SLANT_RUN, y2: yf, clause, attachesTo });
      const slot = slotScene(ctx, h.slot, 'indirect', clause, [], keep - (ax + SLANT_RUN + PAD));
      merge(scene, slot.scene, ax + SLANT_RUN + PAD, yf);
      scene.segments.push({ kind: 'foot', x1: ax + SLANT_RUN, y1: yf, x2: ax + SLANT_RUN + PAD + slot.wordsRight + PAD, y2: yf, clause });
      cur += ROW + slot.depth;
    } else if (h.kind === 'prepositional') {
      const yp = y0 + cur + ROW;
      const yo = y0 + cur + 2 * ROW;
      scene.segments.push({ kind: 'prep-slant', x1: ax, y1: y0, x2: ax + SLANT_RUN, y2: yo, clause, attachesTo });
      scene.labels.push(labelFor(ctx, h.preposition, 'preposition', clause, ax + SLANT_RUN + 4, yp));
      const object = slotScene(ctx, h.object, 'object', clause, [], keep - (ax + SLANT_RUN + PAD));
      merge(scene, object.scene, ax + SLANT_RUN + PAD, yo);
      scene.segments.push({ kind: 'object-line', x1: ax + SLANT_RUN, y1: yo, x2: ax + SLANT_RUN + PAD + object.wordsRight + PAD, y2: yo, clause });
      cur += 2 * ROW + object.depth;
    } else {
      const sub = clauseScene(ctx, h.clause, clause);
      const yc = y0 + cur + CLAUSE_DROP;
      // verb under the word it hangs on, unless that would reach left past a later hanger's line: then the join slants to the verb
      const dx = Math.max(ax - sub.anchor, keep - boundsOf(sub.scene).minX);
      merge(scene, sub.scene, dx, yc);
      const x2 = dx + sub.anchor;
      const y2 = yc - LABEL_H;
      scene.segments.push({ kind: 'join', x1: ax, y1: y0, x2, y2, dotted: true, clause: sub.id, attachesTo });
      const row = y0 + cur + ROW;
      if (h.connector) scene.labels.push(labelFor(ctx, h.connector, 'connector', sub.id, ax + ((x2 - ax) * (row - y0)) / (y2 - y0) + 8, row));
      cur += CLAUSE_DROP + sub.depth;
    }
  });
  return { depth: cur, attachMax };
}

interface SlotScene {
  scene: Scene;
  /** the right edge of the slot's words (they start at x 0, on the line at y 0) */
  wordsRight: number;
  head: LayoutLabel | null;
  attachMax: number;
  depth: number;
}

/** A slot's words side by side from x 0 on the line y 0, and what hangs beneath; `bound` as for hang. */
function slotScene(ctx: Ctx, slot: Slot, role: LabelRole, clause: number, extra: Hanger[], bound: number): SlotScene {
  const scene = emptyScene();
  let x = 0;
  let head: LayoutLabel | null = null;
  for (const ref of slot.words) {
    head = labelFor(ctx, ref, role, clause, x, 0);
    scene.labels.push(head);
    x += head.width + WORD_GAP;
  }
  const wordsRight = head ? head.x + head.width : 0;
  const span = head ? { l: head.x, r: head.x + head.width } : { l: 0, r: 0 };
  const hung = hang(ctx, scene, [...slot.modifiers, ...extra], head, span, 0, clause, bound);
  return { scene, wordsRight, head, attachMax: hung.attachMax, depth: hung.depth };
}

interface ClauseScene {
  id: number;
  scene: Scene;
  /** x of the middle of the verb's last word: where a dotted line from above lands */
  anchor: number;
  /** how far below the base line the clause reaches */
  depth: number;
}

/** A clause on a base line at y 0 from x 0. */
function clauseScene(ctx: Ctx, clause: Clause, parent: number | null): ClauseScene {
  const id = ctx.clauses++;
  const scene = emptyScene();
  const complement = clause.complement;
  const indirect = complement?.kind === 'indirect-object' ? complement : undefined;
  const parts: { slot: Slot; role: LabelRole; extra: Hanger[] }[] = [
    { slot: clause.subject, role: 'subject', extra: [] },
    { slot: clause.verb, role: 'verb', extra: indirect ? [{ kind: 'indirect', slot: indirect.slot }] : [] },
  ];
  if (complement && !indirect) parts.push({ slot: complement.slot, role: 'complement', extra: [] });

  const bars: LayoutSegment[] = [];
  let wordsRight = 0;
  let attachMax = -Infinity;
  let anchor = 0;
  parts.forEach((part, k) => {
    const slot = slotScene(ctx, part.slot, part.role, id, part.extra, -Infinity);
    // right of the words before (and of what hangs under them, which would else read as hanging under these), and clear of what reaches left from under them
    const x = k === 0 ? 0 : fitRight(scene, slot.scene, Math.max(wordsRight + BAR_SPACE, boundsOf(scene).maxX + WORD_GAP));
    if (k > 0) {
      const bar = x - BAR_SPACE / 2;
      if (k === 1) bars.push({ kind: 'bar-full', x1: bar, y1: -BAR_UP, x2: bar, y2: BAR_DOWN, clause: id });
      else if (complement?.kind === 'direct-object') bars.push({ kind: 'bar-half', x1: bar, y1: -BAR_UP, x2: bar, y2: 0, clause: id });
      else bars.push({ kind: 'bar-predicate', x1: bar - SLASH_RUN, y1: -BAR_UP, x2: bar, y2: 0, clause: id });
    }
    merge(scene, slot.scene, x, 0);
    wordsRight = x + slot.wordsRight;
    attachMax = Math.max(attachMax, x + slot.attachMax);
    if (part.role === 'verb') anchor = slot.head ? x + slot.head.x + slot.head.width / 2 : x;
  });
  scene.segments.unshift({ kind: 'base', x1: 0, y1: 0, x2: Math.max(wordsRight, attachMax), y2: 0, clause: id, parent }, ...bars);
  return { id, scene, anchor, depth: Math.max(0, boundsOf(scene).maxY) };
}

/** The picture of `tree`: lines and labels, from `words` (what {i} indexes) and `measure` (a label's width). */
export function layoutDiagram(tree: Diagram, words: DiagramWords, measure: (text: string) => number): Layout {
  const ctx: Ctx = { words, measure, labels: 0, clauses: 0 };
  const scene = emptyScene();
  let previous: { y: number; bottom: number; minX: number } | null = null;
  tree.clauses.forEach((entry: ClauseEntry) => {
    const sub = clauseScene(ctx, entry.clause, null);
    const bounds = boundsOf(sub.scene);
    const y: number = previous ? previous.bottom + STACK_GAP : 0;
    merge(scene, sub.scene, 0, y);
    if (previous && entry.joinedBy) {
      const xs = Math.min(previous.minX, bounds.minX) - STEP_X;
      scene.segments.push(
        { kind: 'step', x1: 0, y1: previous.y, x2: xs, y2: previous.y, dotted: true, clause: sub.id },
        { kind: 'step', x1: xs, y1: previous.y, x2: xs, y2: y, dotted: true, clause: sub.id },
        { kind: 'step', x1: xs, y1: y, x2: 0, y2: y, dotted: true, clause: sub.id },
      );
      const conjunction = labelFor(ctx, entry.joinedBy, 'conjunction', sub.id, 0, (previous.y + y + LABEL_H) / 2);
      conjunction.x = xs - 8 - conjunction.width;
      scene.labels.push(conjunction);
    }
    previous = { y, bottom: y + sub.depth, minX: bounds.minX };
  });
  const b = boundsOf(scene);
  const out = emptyScene();
  merge(out, scene, MARGIN - b.minX, MARGIN - b.minY);
  return { width: b.maxX - b.minX + 2 * MARGIN, height: b.maxY - b.minY + 2 * MARGIN, segments: out.segments, labels: out.labels };
}
