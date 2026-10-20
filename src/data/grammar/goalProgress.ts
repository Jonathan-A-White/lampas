// src/data/grammar/goalProgress.ts — what the strip and the Goal screen (mw-hqd5bz.10) work out from a goal's needs and his words and levels:
// the word states progressToward reads, Learn next, Next words, the lists behind the bars and when he was placed. Pure: no store, no screen.
import type { GrammarApproach, LessonPlace, Passage } from '../../approaches';
import { lessonOf, nextLessonOf, passageLabel, stepsOf } from '../../approaches';
import type { GrammarLevel, PassageLessonRow, WordState } from '../db';
import type { Goal } from '../goal';
import { unmetNeed } from './drillIt';
import { gapsOf, groupIsSolid, isSolid } from './inference';
import { groupOfItem, ideaOf, ITEM_GROUPS, LADDER, type GrammarIdea } from './ladder';
import type { Level, NeededIdea, NeededWord, PassageNeeds } from './needs';

/** How many words Next words offers. */
export const NEXT_WORDS = 3;


/** The levels, in the order the bars and lists show them. */
export const LEVELS: readonly Level[] = ['solid', 'frontier', 'notYet'];

const RANK: Record<WordState, number> = { solid: 3, learning: 2, dropped: 1 };

/** Each word's state by every lemma it goes by (its headword and its lexicon lemmas), as progressToward looks a needed lemma up; the best state wins. */
export function wordStatesOf(words: readonly { lemma: string; lemmas: string[]; state: WordState }[]): Map<string, WordState> {
  const states = new Map<string, WordState>();
  for (const word of words) {
    for (const key of [word.lemma, ...word.lemmas].map((l) => l.normalize('NFC'))) {
      const known = states.get(key);
      if (!known || RANK[word.state] > RANK[known]) states.set(key, word.state);
    }
  }
  return states;
}

/** The level of each idea that has one. */
export const levelsOf = (rows: ReadonlyMap<string, GrammarLevel>): Map<string, Level> => new Map(Array.from(rows, ([id, row]): [string, Level] => [id, row.level]));

/** An idea's level: the one he has, or not yet when he has none; solid for a letter, pair or breathing of a group he has made solid (isSolid, mw-5r3p30.641). */
export const levelOf = (levels: ReadonlyMap<string, Level>, id: string): Level => (isSolid(levels, id) ? 'solid' : (levels.get(id) ?? 'notYet'));

/** What a node of the ladder graph shows: solid; learning (the frontier he is working on); next (not yet, and everything it rests on is solid, so it is ready to learn); not yet. */
export type IdeaState = 'solid' | 'learning' | 'next' | 'notYet';

export const STATE_NAMES: Record<IdeaState, string> = { solid: 'Solid', learning: 'Learning', next: 'Next', notYet: 'Not yet' };

/** The state of the idea `id`, from the same levels Learn reads (Learn next, Learning now, the lists behind the Goal bars); `next` is the test the frontier moves on by (drillIt.ts unmetNeed). */
export function ideaState(id: string, levels: ReadonlyMap<string, Level>): IdeaState {
  const level = levelOf(levels, id);
  if (level === 'solid') return 'solid';
  if (level === 'frontier') return 'learning';
  return unmetNeed(id, levels) === null ? 'next' : 'notYet';
}

/** A word's level as progressToward counts it: a learning word is frontier; a dropped or unlisted one is not yet. */
export const wordLevel = (state: WordState | undefined): Level => (state === 'solid' ? 'solid' : state === 'learning' ? 'frontier' : 'notYet');

export interface LearnNext {
  /** the idea it opens: the first gap when `gaps` is set; for a passage, only its lesson's first idea (use `passage`) */
  idea: GrammarIdea;
  /** the lesson of the approach that teaches it; none when the approach has no lesson for it */
  lesson: LessonPlace | undefined;
  /** the exact gaps, when some letters, pairs or breathings are solid and others are not: Learn next names these ('ξ, ψ and ου'), not the whole idea (mw-hqd5bz.17, .18, PROVISIONAL) */
  gaps?: GrammarIdea[];
  /** a passage lesson to read, when the ideas of its lesson are at least frontier ('Read 1 John 1:1-4', mw-z370x5.1); its lesson is `lesson` */
  passage?: { key: string; passage: Passage; label: string };
}

/** What Learn next needs to offer a passage lesson: his goal (a passage is offered only in the goal's book, and in its chapter when the goal names one; no goal, none) and the passage lessons he has read or passed. */
export interface PassageContext {
  goal: Goal | undefined;
  states: ReadonlyMap<string, Pick<PassageLessonRow, 'state'>>;
}

/**
 * The exact gaps first (mw-hqd5bz.31), the same ones in the same order as the placement's end card and the head of a Review round: the letters, pairs
 * and breathings not solid in every group that is partly known, whatever else the approach's sequence says is earlier (a group none of whose items is
 * solid has no exact gap, it is the whole idea that is missing). With no gaps, the earliest step in the approach's sequence (stepsOf) that is either an idea the
 * goal needs that is not yet or untested, or (given `passages`) a passage not yet passed whose lesson's ideas are all frontier or solid and that is in the goal's
 * book and chapter; undefined when none is left. A group of the foundation is solid when every one of its items is.
 */
export function learnNext(needs: Pick<PassageNeeds, 'ideas'>, approach: GrammarApproach, levels: ReadonlyMap<string, Level>, passages?: PassageContext): LearnNext | undefined {
  const gaps = gapsOf(levels);
  if (gaps.length > 0) return { idea: gaps[0], lesson: lessonOf(approach, gaps[0].id), gaps };
  const needed = new Set(needs.ideas.map((i) => i.id));
  const grouped = new Set(ITEM_GROUPS);
  for (const step of stepsOf(approach)) {
    if (step.kind === 'idea') {
      if (needed.has(step.id) && levelOf(levels, step.id) === 'notYet' && !(grouped.has(step.id) && groupIsSolid(levels, step.id))) return { idea: ideaOf(step.id), lesson: lessonOf(approach, step.id) };
      continue;
    }
    const goal = passages?.goal;
    if (!goal || step.passage.book !== goal.book || (goal.chapter !== undefined && step.passage.chapter !== goal.chapter)) continue;
    if (passages.states.get(step.key)?.state === 'passed') continue;
    if (!step.lesson.lesson.ideas.every((id) => levelOf(levels, id) !== 'notYet')) continue;
    return { idea: ideaOf(step.lesson.lesson.ideas[0]), lesson: step.lesson, passage: { key: step.key, passage: step.passage, label: passageLabel(step.passage) } };
  }
  return undefined;
}

/** The lesson Settings > Grammar approach marks Next and the tutor's learner_grammar names (mw-86e9r1.24): with a goal, the lesson Learn next opens, so the
 *  two screens agree (undefined when Learn next names none); with no goal (or its needs not known), the lesson of the earliest idea with no level or not yet. */
export function nextLesson(needs: Pick<PassageNeeds, 'ideas'> | undefined, approach: GrammarApproach, levels: ReadonlyMap<string, Level>, passages?: PassageContext): LessonPlace | undefined {
  return needs ? learnNext(needs, approach, levels, passages)?.lesson : nextLessonOf(approach, (id) => levels.get(id));
}

/** The words the tutor is told for `nextLesson` (learner_grammar next_lesson): the lesson's title, or 'Read 1 John 1:1-4' when the next step is a passage; null when none. */
export function nextLessonTitle(needs: Pick<PassageNeeds, 'ideas'> | undefined, approach: GrammarApproach, levels: ReadonlyMap<string, Level>, passages?: PassageContext): string | null {
  if (!needs) return nextLessonOf(approach, (id) => levels.get(id))?.lesson.title ?? null;
  const next = learnNext(needs, approach, levels, passages);
  return next?.passage ? `Read ${next.passage.label}` : (next?.lesson?.lesson.title ?? null);
}

/** The one idea he is learning now (mw-i7xe0n.6): the lowest idea at the frontier, the letters, pairs and breathings (items of a group) left out; undefined when none. */
export const learningNow = (levels: ReadonlyMap<string, Level>): GrammarIdea | undefined => LADDER.find((idea) => !groupOfItem(idea) && levels.get(idea.id) === 'frontier');

/** The most frequent needed words he has no state for (not on his list and not dropped), in dictionary form. */
export function nextWords(needs: Pick<PassageNeeds, 'words'>, states: ReadonlyMap<string, WordState>, count = NEXT_WORDS): NeededWord[] {
  return needs.words.filter((w) => !states.has(w.lemma)).slice(0, count);
}

/** The needed items cut by level, in the order the needs list them. */
export function groupWords(needs: Pick<PassageNeeds, 'words'>, states: ReadonlyMap<string, WordState>): Record<Level, NeededWord[]> {
  const groups: Record<Level, NeededWord[]> = { solid: [], frontier: [], notYet: [] };
  for (const word of needs.words) groups[wordLevel(states.get(word.lemma))].push(word);
  return groups;
}

export function groupIdeas(needs: Pick<PassageNeeds, 'ideas'>, levels: ReadonlyMap<string, Level>): Record<Level, NeededIdea[]> {
  const groups: Record<Level, NeededIdea[]> = { solid: [], frontier: [], notYet: [] };
  for (const idea of needs.ideas) groups[levelOf(levels, idea.id)].push(idea);
  return groups;
}

/** When the placement last set a level (ms since the epoch), or undefined when he has not been placed. */
export function placedAt(rows: ReadonlyMap<string, GrammarLevel>): number | undefined {
  let latest: number | undefined;
  for (const row of rows.values()) if (row.how === 'placement' && (latest === undefined || row.since > latest)) latest = row.since;
  return latest;
}
