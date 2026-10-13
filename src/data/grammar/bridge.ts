// src/data/grammar/bridge.ts — the bridge (mw-1vuvq6.5, PROVISIONAL, docs/ask-tutor.md 'The bridge'): when he asks about something that rests on grammar he has
// not learned, the tutor answers briefly, names up to three of the ideas it rests on and offers to take him to the one that is his next step. The device works
// out what he lacks (`missing_foundations`, from the grammar words of his question and the LADDER's needs) so the model picks from a list and never guesses; the
// app opens the lowest unmet need whatever the model says. Pure: no store and no screen.
import type { Bridge } from '../db';
import { groupOfItem, ideasBelow, LADDER, type GrammarIdea } from './ladder';
import type { Level } from './needs';

export type { Bridge };

/** The most ideas a bridge names. */
export const BRIDGE_MAX = 3;
/** The most ideas `missing_foundations` lists (the request shares a grist's record); `total` counts them all. */
export const MISSING_FOUNDATIONS_MAX = 8;
/** The most grammar words of a question that name a topic: the highest on the ladder win. */
const TOPICS_MAX = 3;

/** One idea he lacks that the asked topic rests on. */
export interface MissingFoundation {
  /** a LADDER id */
  id: string;
  title: string;
  /** set when the topic itself names it as a need (the most direct); left out otherwise */
  direct?: true;
}

/** What the device sends as the request's `missing_foundations`: the topic it understood, how many ideas under it he lacks and those ideas, the lowest on the ladder first. */
export interface MissingFoundations {
  topic: string;
  total: number;
  ideas: MissingFoundation[];
}

/** The bridge as the tutor's answer carries it (`bridge` in the answer schemas). */
export interface AnswerBridge {
  missing: string[];
  next: string;
  why: string;
}

const IDS: ReadonlySet<string> = new Set(LADDER.map((i) => i.id));
/** The "why" line's longest (the answer schemas'). */
export const BRIDGE_WHY_MAX = 200;

/** The app's own check of an answer's `bridge` (the schema's limits): one to BRIDGE_MAX ids of the ladder, the one to start with, a line why. */
export function isAnswerBridge(value: unknown): value is AnswerBridge {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).length !== 3) return false;
  const ids = v.missing;
  return (
    Array.isArray(ids) &&
    ids.length >= 1 &&
    ids.length <= BRIDGE_MAX &&
    ids.every((id) => typeof id === 'string' && IDS.has(id)) &&
    typeof v.next === 'string' &&
    IDS.has(v.next) &&
    typeof v.why === 'string' &&
    v.why.length > 0 &&
    v.why.length <= BRIDGE_WHY_MAX
  );
}

const fold = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** The words of the ladder's ideas that are no grammar when they stand alone in a question. */
const NOT_A_TOPIC = new Set(['second', 'letter']);
/** What a question calls the ideas that cover no parsing term. */
const ALIASES: Record<string, string[]> = {
  alphabet: ['alphabet'],
  diphthongs: ['diphthong', 'vowel pair', 'pairs of vowel'],
  'consonant-pairs': ['consonant pair', 'pairs of consonant'],
  syllables: ['syllable'],
  breathings: ['breathing'],
  accents: ['accent'],
  'iota-subscript': ['iota subscript'],
  punctuation: ['punctuation'],
  enclitics: ['enclitic'],
  pronoun: ['pronoun'],
  'compound-verbs': ['compound verb'],
  'movable-letters': ['movable'],
};

interface Topic {
  idea: GrammarIdea;
  pattern: RegExp;
}
const TOPICS: readonly Topic[] = LADDER.filter((idea) => !groupOfItem(idea)).flatMap((idea) => {
  const words = [...idea.terms.filter((t) => !NOT_A_TOPIC.has(t)), ...(ALIASES[idea.id] ?? [])].map(fold).filter(Boolean);
  return words.length === 0 ? [] : [{ idea, pattern: new RegExp(`(^| )(${words.join('|')})s?( |$)`) }];
});

/** The ideas of the ladder his question is about, by the grammar words in it (and the term of the help he asked for), the lowest first; at most TOPICS_MAX, the highest on the ladder. */
export function askedIdeas(question: string, term?: string): GrammarIdea[] {
  const text = fold(`${question} ${term ?? ''}`);
  const found = TOPICS.filter((t) => t.pattern.test(text)).map((t) => t.idea);
  return found.slice(-TOPICS_MAX);
}

const levelOf = (levels: ReadonlyMap<string, Level>, id: string): Level => levels.get(id) ?? 'notYet';

/**
 * The ideas the asked topic rests on, however far down, that are not yet his (a frontier idea is being learned, so it is met), the lowest on the ladder first: the
 * first is the next step in his progression. A letter, a pair or a breathing is named by its group idea. Undefined when the question names no topic, or he lacks
 * nothing under it.
 */
export function missingFoundations(question: string, levels: ReadonlyMap<string, Level>, term?: string): MissingFoundations | undefined {
  const topics = askedIdeas(question, term);
  if (topics.length === 0) return undefined;
  const below = new Map<string, GrammarIdea>();
  for (const topic of topics) for (const idea of ideasBelow(topic.id)) below.set(idea.id, idea);
  const direct = new Set(topics.flatMap((t) => t.needs));
  const missing = [...below.values()].filter((idea) => !groupOfItem(idea) && levelOf(levels, idea.id) === 'notYet').sort((a, b) => a.rung - b.rung);
  if (missing.length === 0) return undefined;
  return {
    topic: topics[topics.length - 1].title,
    total: missing.length,
    ideas: missing.slice(0, MISSING_FOUNDATIONS_MAX).map((idea) => ({ id: idea.id, title: idea.title, ...(direct.has(idea.id) ? { direct: true as const } : {}) })),
  };
}

/**
 * What the app keeps and offers of a tutor's bridge. The ideas shown are the tutor's, in its order, only those the device listed, at most BRIDGE_MAX (the first
 * of the device's list when it named none of them); the one 'Take me there' opens is the device's lowest unmet need, not the model's choice. Undefined when the
 * device sent no list: the model does not guess ids.
 */
export function resolveBridge(raw: AnswerBridge, hint: MissingFoundations | undefined): Bridge | undefined {
  if (!hint || hint.ideas.length === 0) return undefined;
  const listed = new Set(hint.ideas.map((i) => i.id));
  const picked = [...new Set(raw.missing)].filter((id) => listed.has(id)).slice(0, BRIDGE_MAX);
  return {
    ideas: picked.length > 0 ? picked : hint.ideas.slice(0, BRIDGE_MAX).map((i) => i.id),
    next: hint.ideas[0].id,
    why: raw.why,
    many: hint.total > BRIDGE_MAX,
  };
}

type Json = Record<string, unknown>;

/** `schema` (an answer schema with a `bridge`) with the ids the bridge may name set to exactly the LADDER's, so it cannot name an idea the ladder lacks. */
export function withBridgeIdeas<T extends object>(schema: T): T {
  const ids = LADDER.map((i) => i.id);
  const props = (((schema as Json).properties as Json).bridge as Json).properties as Record<string, Json>;
  (props.missing.items as Json).enum = ids;
  props.next.enum = ids;
  return schema;
}
