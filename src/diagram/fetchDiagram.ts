// src/diagram/fetchDiagram.ts — the sentence diagram of a verse or a passage, from what is kept or from the tutor (mw-souyao.2). A diagram is asked for once: the request is built from the verse in the current mode
// (request.ts), sent to the sentence-diagram grind (grinds/sentence-diagram.json) through askGrind, and the tree that comes back is not believed until validateDiagram has passed it (THE RULE, validate.ts: every
// word once). A tree that breaks the rule is asked for once more, with what was wrong; a second that breaks it is given back as its faults, never kept and never thrown. A good tree is kept (repositories/diagrams.ts)
// before it is returned, so the next opening draws it with no ask. A failure to ask at all (no licence, no answer) is the tutor's, askGrind's TutorError, and passes through.
import type { Chapter, Verse } from '../data/chapter';
import { DIAGRAM_VERSION, getDiagram, keepDiagram } from '../data/repositories';
import { getDeviceKeyBytes } from '../services/deviceKey';
import { askGrind, type AskOptions } from '../services/tutor';
import { buildDiagramRequest, type DiagramRequest } from './request';
import type { Clause, Diagram, DiagramMode, DiagramWords, Modifier, Slot, TokenRef } from './types';
import { validateDiagram, type Fault } from './validate';

/** The kind the mill runs the grind under (grinds/sentence-diagram.json). */
const DIAGRAM_KIND = 'sentence-diagram';
export { DIAGRAM_VERSION };

/** The most faults the second ask names, and the longest line of one (the input schema's `faults`). */
const MAX_FAULTS = 40;
const MAX_FAULT_CHARS = 240;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isToken = (value: unknown): value is TokenRef => isObject(value) && (typeof value.i === 'number' || (typeof value.implied === 'string' && value.implied !== ''));
const isList = <T,>(value: unknown, is: (item: unknown) => item is T): value is T[] => Array.isArray(value) && value.every(is);

function isSlot(value: unknown): value is Slot {
  return isObject(value) && isList(value.words, isToken) && isList(value.modifiers, isModifier);
}

function isModifier(value: unknown): value is Modifier {
  if (!isObject(value)) return false;
  if (value.kind === 'word') return isToken(value.word) && isList(value.modifiers, isModifier);
  if (value.kind === 'prepositional') return isToken(value.preposition) && isSlot(value.object);
  if (value.kind === 'clause') return (value.connector === undefined || isToken(value.connector)) && isClause(value.clause);
  return false;
}

const COMPLEMENTS = ['direct-object', 'indirect-object', 'predicate-nominative', 'predicate-adjective'];

function isClause(value: unknown): value is Clause {
  if (!isObject(value) || !isSlot(value.subject) || !isSlot(value.verb)) return false;
  const c = value.complement;
  return c === undefined || (isObject(c) && typeof c.kind === 'string' && COMPLEMENTS.includes(c.kind) && isSlot(c.slot));
}

/** The answer guard: a tree of the shape types.ts gives (whether it keeps THE RULE is validateDiagram's to say). */
export function isDiagramAnswer(value: unknown): value is Diagram {
  return (
    isObject(value) &&
    Array.isArray(value.clauses) &&
    value.clauses.length > 0 &&
    value.clauses.every((entry) => isObject(entry) && isClause(entry.clause) && (entry.joinedBy === undefined || isToken(entry.joinedBy)))
  );
}

/** askGrind with its kind and answer guard filled in; a test passes a fake of this. */
export type AskDiagram = (request: DiagramRequest, options: AskOptions) => Promise<Diagram>;

const askMill: AskDiagram = (request, options) => askGrind(DIAGRAM_KIND, request, isDiagramAnswer, options);

export interface FetchDiagramOptions {
  /** draw it again: ask the tutor past a kept diagram, and keep the new one in its place if it is good */
  redraw?: boolean;
  /** the device key's bytes; the phone's own by default */
  key?: Uint8Array;
  signal?: AbortSignal;
  /** the way to the tutor; askGrind by default */
  ask?: AskDiagram;
  now?: number;
}

export type DiagramResult =
  /** `kept`: it came from the store, nothing was asked */
  | { ok: true; diagram: Diagram; words: DiagramWords; kept: boolean }
  /** the tutor's two answers both broke the rule: nothing was kept */
  | { ok: false; faults: Fault[] };

/**
 * The diagram of `verses` (one verse, or a passage's in order) in `view`: the kept one unless `redraw`, else the tutor's, asked for up to twice. Throws only what askGrind throws.
 */
export async function fetchDiagram(chapter: Chapter, verses: readonly Verse[], view: DiagramMode, options: FetchDiagramOptions = {}): Promise<DiagramResult> {
  const { request, words } = buildDiagramRequest(chapter, verses, view);
  if (!options.redraw) {
    const kept = await getDiagram(request.ref, view);
    // a kept diagram the words no longer fit (the text changed under it) is drawn again, not shown wrong
    if (kept && validateDiagram(kept, words.length).ok) return { ok: true, diagram: kept, words, kept: true };
  }
  const ask = options.ask ?? askMill;
  const asking: AskOptions = { key: options.key ?? getDeviceKeyBytes(), untimed: true, ...(options.signal ? { signal: options.signal } : {}) };
  let faults: Fault[] = [];
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const asked = attempt === 0 ? request : { ...request, faults: faults.slice(0, MAX_FAULTS).map((f) => f.message.slice(0, MAX_FAULT_CHARS)) };
    const diagram = await ask(asked, asking);
    const checked = validateDiagram(diagram, words.length);
    if (checked.ok) {
      await keepDiagram(request.ref, view, diagram, options.now);
      return { ok: true, diagram, words, kept: false };
    }
    faults = checked.faults;
  }
  return { ok: false, faults };
}
