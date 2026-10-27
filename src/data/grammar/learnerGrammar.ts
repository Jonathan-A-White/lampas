// src/data/grammar/learnerGrammar.ts — where his grammar stands, for the two tutor grinds (mw-hqd5bz.12). Both requests carry it as
// `learner_grammar`: the goal, how many of its words and ideas are solid, at the frontier and not yet, the titles of the ideas at each
// level (the goal's needs first), whether he has been placed, the move the picker's level should make and the approach with its next
// lesson, and `weak`, the weak facets of the ideas he drilled (Drill it, mw-i7xe0n.2: idea title -> labels, from each idea's latest run, none once a
// later run proves it). The grinds' instructions say how to teach from it. At most 900 bytes as JSON.
import { approachOf, DEFAULT_APPROACH } from '../../approaches';
import { BOOK_INDEX } from '../bookIndex';
import type { WordState } from '../db';
import { goalTitle, parseGoal } from '../goal';
import { getGoal, getGrammarAnswers, getGrammarApproach, getPickerGrammar, holdsOnlyExampleWords, listLevels, listPassageLessons, listWords, weakFacets } from '../repositories';
import type { PickerGrammar } from './formLevel';
import { levelOf, levelsOf, nextLessonTitle, placedAt, wordStatesOf } from './goalProgress';
import { needsOf } from './goalNeeds';
import { ideaOfAny, ladderFor, type LadderLang } from './ladders';
import { moveFor, type Move } from './move';
import { progressToward, type Level, type PassageNeeds } from './needs';

/** The most idea titles a list names. */
export const GRAMMAR_TITLES_MAX = 12;
/** The most the field weighs as JSON in UTF-8 (it shares a grist's record with the verse and the history). */
export const LEARNER_GRAMMAR_MAX_BYTES = 900;
/** The most ideas `weak` names (the ones drilled last), the most facet labels for each, and the most characters of a label. PROVISIONAL. */
export const GRAMMAR_WEAK_IDEAS_MAX = 5;
export const GRAMMAR_WEAK_LABELS_MAX = 3;
export const GRAMMAR_WEAK_LABEL_CHARS = 32;
/** Over the 900-byte cap `weak` is cut, oldest run first, down to this many bytes before any idea title is dropped; the titles then go, and `weak` last. */
export const GRAMMAR_WEAK_BYTES = 300;

export interface LearnerGrammar {
  /** 'Read 1 John 1:1', or null when he has no goal */
  goal: string | null;
  /** how many of the goal's words (with no goal, of his words) are solid, being learned, and not yet */
  words: { solid: number; frontier: number; not_yet: number };
  /** the titles of the grammar ideas at each level, the goal's needs first, then by rung */
  ideas: { solid: string[]; frontier: string[]; not_yet: string[] };
  /** whether the placement has set any of his levels */
  placed: boolean;
  /** where moveFor says New words at should go: 'up' to frontier grammar, 'down' to solid grammar */
  suggested_move: Move;
  /** the setting New words at now */
  picker_level: PickerGrammar;
  approach: { name: string; credit: string | null; next_lesson: string | null };
  /** his weak points from Drill it: the idea's title -> the labels of its weak facets, the oldest run first; missing when there are none */
  weak?: Record<string, string[]>;
}

/** What learnerGrammarOf is made from. `ideas` are in the order they should be named. */
export interface GrammarSnapshot {
  goal: string | null;
  words: { solid: number; frontier: number; notYet: number };
  ideas: { id: string; title: string; level: Level }[];
  placed: boolean;
  move: Move;
  pickerLevel: PickerGrammar;
  approach: { name: string; credit: string | null; nextLesson: string | null };
  /** the ideas whose latest Drill it run left weak facets, in any order; `at` is the run's time */
  weak?: { title: string; at: number; labels: string[] }[];
}

const bytesOf = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/** The field from a snapshot (pure): titles capped at 12 a list, `weak` cut to the 5 ideas drilled last with 3 labels each, then, while it is
 * over 900 bytes, the oldest idea of `weak` is dropped while `weak` weighs over 300 bytes, else the last title of the solid list is dropped
 * (a solid idea needs no explaining), then of the not-yet list, then of the frontier list, then the rest of `weak`, oldest first. */
export function learnerGrammarOf(snapshot: GrammarSnapshot): LearnerGrammar {
  const titles = (level: Level): string[] => snapshot.ideas.filter((i) => i.level === level).slice(0, GRAMMAR_TITLES_MAX).map((i) => i.title);
  const out: LearnerGrammar = {
    goal: snapshot.goal,
    words: { solid: snapshot.words.solid, frontier: snapshot.words.frontier, not_yet: snapshot.words.notYet },
    ideas: { solid: titles('solid'), frontier: titles('frontier'), not_yet: titles('notYet') },
    placed: snapshot.placed,
    suggested_move: snapshot.move,
    picker_level: snapshot.pickerLevel,
    approach: { name: snapshot.approach.name, credit: snapshot.approach.credit, next_lesson: snapshot.approach.nextLesson },
  };
  const weak = [...(snapshot.weak ?? [])]
    .sort((a, b) => a.at - b.at)
    .slice(-GRAMMAR_WEAK_IDEAS_MAX)
    .map((w): [string, string[]] => [w.title, w.labels.slice(0, GRAMMAR_WEAK_LABELS_MAX).map((l) => l.slice(0, GRAMMAR_WEAK_LABEL_CHARS))]);
  if (weak.length > 0) out.weak = Object.fromEntries(weak);
  const dropOldestWeak = (): boolean => {
    const oldest = out.weak && Object.keys(out.weak)[0];
    if (!out.weak || oldest === undefined) return false;
    delete out.weak[oldest];
    if (Object.keys(out.weak).length === 0) delete out.weak;
    return true;
  };
  while (bytesOf(out) > LEARNER_GRAMMAR_MAX_BYTES) {
    if (out.weak && bytesOf(out.weak) > GRAMMAR_WEAK_BYTES && dropOldestWeak()) continue;
    const list = [out.ideas.solid, out.ideas.not_yet, out.ideas.frontier].find((l) => l.length > 0);
    if (list) list.pop();
    else if (!dropOldestWeak()) break;
  }
  return out;
}

/** The ideas of the ladder of `lang` (Greek by default) in the order they are named: the goal's needs first (as the passage lists them), then the rest of the ladder by rung. */
export function orderedIdeas(needs: PassageNeeds | undefined, levels: ReadonlyMap<string, Level>, lang: LadderLang = 'grc'): GrammarSnapshot['ideas'] {
  const ladder = ladderFor(lang).ideas;
  const first = (needs?.ideas ?? []).map((i) => i.id);
  const rest = ladder.map((i) => i.id).filter((id) => !first.includes(id));
  const title = new Map(ladder.map((i) => [i.id, i.title]));
  return [...first, ...rest].map((id) => ({ id, title: title.get(id) ?? id, level: levelOf(levels, id) }));
}

/** The title of an idea Drill it left weak; the id itself for one the ladders lack. */
const weakTitleOf = (id: string): string => {
  try {
    return ideaOfAny(id).title;
  } catch {
    return id;
  }
};

const countStates = (words: readonly { state: WordState }[]) => ({
  solid: words.filter((w) => w.state === 'solid').length,
  frontier: words.filter((w) => w.state === 'learning').length,
  notYet: words.filter((w) => w.state === 'dropped').length,
});

/** The field as it stands now, from his goal, words, levels, answers and settings. A goal whose chapters cannot be fetched is still
 * named, with the whole ladder's ideas (of `lang`'s ladder: the Greek one by default) and the counts of his own words. */
export async function learnerGrammar(lang: LadderLang = 'grc'): Promise<LearnerGrammar> {
  const [text, listed, examplesOnly, rows, answers, pickerLevel, approachId, weakByIdea] = await Promise.all([
    getGoal(),
    listWords(),
    holdsOnlyExampleWords(),
    listLevels(),
    getGrammarAnswers(),
    getPickerGrammar(),
    getGrammarApproach(),
    weakFacets(),
  ]);
  // the example words a phone was seeded with, none of them touched, are not his progress (src/data/learnerSummary.ts, mw-yrmkdf.8)
  const words = examplesOnly ? [] : listed;
  const goal = text ? parseGoal(text, BOOK_INDEX) : undefined;
  const levels = levelsOf(rows);
  let needs: PassageNeeds | undefined;
  if (goal) needs = await needsOf(text, goal, lang).catch(() => undefined);
  const counts = needs ? progressToward(needs, wordStatesOf(words), levels).words : undefined;
  const approach = approachOf(approachId) ?? approachOf(DEFAULT_APPROACH);
  if (!approach) throw new Error(`no grammar approach ${DEFAULT_APPROACH}`);
  const nextLessonName = nextLessonTitle(needs, approach, levels, { goal, states: await listPassageLessons() });
  return learnerGrammarOf({
    goal: goal ? goalTitle(goal, BOOK_INDEX) : null,
    words: counts ?? countStates(words),
    ideas: orderedIdeas(needs, levels, lang),
    placed: placedAt(rows) !== undefined,
    move: moveFor(pickerLevel, answers),
    pickerLevel,
    approach: { name: approach.name, credit: approach.credit?.name ?? null, nextLesson: nextLessonName },
    weak: [...weakByIdea].map(([id, w]) => ({ title: weakTitleOf(id), at: w.at, labels: w.labels })),
  });
}
