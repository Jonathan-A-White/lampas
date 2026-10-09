// src/data/grammar/needs.ts — what a passage needs (mw-hqd5bz.2): the words (dictionary forms, with how often) and the grammar ideas
// (with a first example) a goal passage requires, worked out from the chapter files alone, and progressToward: how many of them he
// has solid, on the frontier and not yet. Pure data work: no tutor, no network beyond loadChapter. docs/grammar.md.
import type { WordState } from '../db';
import { wordGloss, type BookIndex, type Chapter } from '../chapter';
import type { Goal } from '../goal';
import { ALWAYS_NEEDED, ideaOf, ideasOf } from './ladder';

/** How far he is on one thing. The levels story moves this to its repository; both export the same literal type. */
export type Level = 'solid' | 'frontier' | 'notYet';

/** A place in the text, 'jn.1.1' style like the refs in the answers table: book code, chapter, verse. */
export type Ref = string;

export interface NeededWord {
  /** the dictionary form, NFC */
  lemma: string;
  gloss: string;
  /** how many times the passage uses it */
  count: number;
  firstRef: Ref;
}

export interface NeededIdea {
  /** a ladder id (ladder.ts) */
  id: string;
  /** how many words of the passage need it */
  count: number;
  /** the first word that does */
  example: { form: string; code: string; ref: Ref };
}

export interface PassageNeeds {
  /** commonest first, then in order of first use */
  words: NeededWord[];
  /** ALWAYS_NEEDED first, then up the ladder */
  ideas: NeededIdea[];
  /** the words of the passage, repeats counted */
  tokens: number;
}

export interface Counts {
  solid: number;
  frontier: number;
  notYet: number;
  total: number;
}

export interface Progress {
  words: Counts;
  grammar: Counts;
}

/** The numbers of the chapters a goal covers: its chapter, or every chapter of the book in order. */
export function goalChapterNumbers(goal: Goal, index: BookIndex): number[] {
  const count = index.books.find((b) => b.code === goal.book)?.chapters ?? 0;
  return goal.chapter !== undefined ? [goal.chapter] : Array.from({ length: count }, (_, i) => i + 1);
}

/** The chapters a goal covers, one request each. */
function chaptersOf(goal: Goal, load: ChapterLoader, index: BookIndex): Promise<Chapter[]> {
  return Promise.all(goalChapterNumbers(goal, index).map((n) => load(goal.book, n)));
}

type ChapterLoader = (book: string, n: number) => Promise<Chapter>;

/** The words and grammar ideas the goal passage requires; the index says how many chapters a whole book has. */
export async function passageNeeds(goal: Goal, load: ChapterLoader, index: BookIndex): Promise<PassageNeeds> {
  const words = new Map<string, NeededWord>();
  const ideas = new Map<string, NeededIdea>();
  let tokens = 0;
  for (const chapter of await chaptersOf(goal, load, index)) {
    for (const verse of chapter.verses) {
      if (goal.verse !== undefined && verse.n !== goal.verse) continue;
      const ref = `${goal.book}.${chapter.chapter}.${verse.n}`;
      for (const w of verse.g) {
        tokens++;
        const lemma = w.l.normalize('NFC');
        const known = words.get(lemma);
        if (known) known.count++;
        else words.set(lemma, { lemma, gloss: wordGloss(chapter, w), count: 1, firstRef: ref });
        for (const id of [...ALWAYS_NEEDED, ...ideasOf(w.p)]) {
          const idea = ideas.get(id);
          if (idea) idea.count++;
          else ideas.set(id, { id, count: 1, example: { form: w.t, code: w.p, ref } });
        }
      }
    }
  }
  const always = (id: string): number => ALWAYS_NEEDED.indexOf(id);
  return {
    // Array sort is stable, so equal counts stay in the order of first use.
    words: [...words.values()].sort((a, b) => b.count - a.count),
    ideas: [...ideas.values()].sort((a, b) => {
      const [x, y] = [always(a.id), always(b.id)];
      if (x >= 0 || y >= 0) return (x < 0 ? Infinity : x) - (y < 0 ? Infinity : y);
      return ideaOf(a.id).rung - ideaOf(b.id).rung;
    }),
    tokens,
  };
}

const tally = (levels: Level[]): Counts => ({
  solid: levels.filter((l) => l === 'solid').length,
  frontier: levels.filter((l) => l === 'frontier').length,
  notYet: levels.filter((l) => l === 'notYet').length,
  total: levels.length,
});

/** How far he is toward the passage. A learning word is frontier; a dropped or unlisted word is not yet; an idea with no level is not yet. */
export function progressToward(needs: PassageNeeds, wordStates: Map<string, WordState>, levels: Map<string, Level>): Progress {
  return {
    words: tally(
      needs.words.map((w): Level => {
        const state = wordStates.get(w.lemma);
        return state === 'solid' ? 'solid' : state === 'learning' ? 'frontier' : 'notYet';
      }),
    ),
    grammar: tally(needs.ideas.map((i) => levels.get(i.id) ?? 'notYet')),
  };
}
