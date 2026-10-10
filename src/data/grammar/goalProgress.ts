// src/data/grammar/goalProgress.ts — what the strip and the Goal screen (mw-hqd5bz.10) work out from a goal's needs and his words and levels:
// the word states progressToward reads, Learn next, Next words, the lists behind the bars and when he was placed. Pure: no store, no screen.
import type { GrammarApproach, LessonPlace } from '../../approaches';
import { lessonOf, orderOf } from '../../approaches';
import type { GrammarLevel, WordState } from '../db';
import { gapsOf, groupIsSolid } from './inference';
import { ideaOf, ITEM_GROUPS, type GrammarIdea } from './ladder';
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

/** A word's level as progressToward counts it: a learning word is frontier; a dropped or unlisted one is not yet. */
export const wordLevel = (state: WordState | undefined): Level => (state === 'solid' ? 'solid' : state === 'learning' ? 'frontier' : 'notYet');

export interface LearnNext {
  /** the idea it opens: the first gap when `gaps` is set */
  idea: GrammarIdea;
  /** the lesson of the approach that teaches it; none when the approach has no lesson for it */
  lesson: LessonPlace | undefined;
  /** the exact gaps, when some letters, pairs or breathings are solid and others are not: Learn next names these ('ξ, ψ and ου'), not the whole idea (mw-hqd5bz.17, .18, PROVISIONAL) */
  gaps?: GrammarIdea[];
}

/**
 * The earliest idea in the approach's sequence that the goal needs and that is not yet or untested; undefined when none is left. A group of the
 * foundation (the alphabet, the diphthongs, the consonant pairs, the breathings) is solid when every one of its items is. While some items of a group
 * are solid and others are not, it is the exact gaps that are named, from every such group, never the whole idea; a group that is partly known counts
 * even when the goal does not need it (the diphthongs are not in any goal's needs).
 */
export function learnNext(needs: Pick<PassageNeeds, 'ideas'>, approach: GrammarApproach, levels: ReadonlyMap<string, Level>): LearnNext | undefined {
  const needed = new Set(needs.ideas.map((i) => i.id));
  const partial = new Set(gapsOf(levels).map((i) => i.parent ?? 'alphabet'));
  const grouped = new Set(ITEM_GROUPS);
  // a group with exact gaps is named while its idea is not solid, whatever else its level says; any other idea only while not yet or untested
  const id = orderOf(approach).find((i) =>
    partial.has(i)
      ? levels.get(i) !== 'solid'
      : needed.has(i) && (levels.get(i) ?? 'notYet') === 'notYet' && !(grouped.has(i) && groupIsSolid(levels, i)),
  );
  if (id === undefined) return undefined;
  if (partial.has(id)) {
    const gaps = gapsOf(levels);
    return { idea: gaps[0], lesson: lessonOf(approach, gaps[0].id), gaps };
  }
  return { idea: ideaOf(id), lesson: lessonOf(approach, id) };
}

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
  for (const idea of needs.ideas) groups[levels.get(idea.id) ?? 'notYet'].push(idea);
  return groups;
}

/** When the placement last set a level (ms since the epoch), or undefined when he has not been placed. */
export function placedAt(rows: ReadonlyMap<string, GrammarLevel>): number | undefined {
  let latest: number | undefined;
  for (const row of rows.values()) if (row.how === 'placement' && (latest === undefined || row.since > latest)) latest = row.since;
  return latest;
}
