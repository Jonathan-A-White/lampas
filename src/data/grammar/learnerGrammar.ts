// src/data/grammar/learnerGrammar.ts — where his grammar stands, for the two tutor grinds (mw-hqd5bz.12). Both requests carry it as
// `learner_grammar`: the goal, how many of its words and ideas are solid, at the frontier and not yet, the titles of the ideas at each
// level (the goal's needs first), whether he has been placed, the move the picker's level should make and the approach with its next
// lesson. The grinds' instructions say how to teach from it. At most 900 bytes as JSON.
import { approachOf, DEFAULT_APPROACH, nextLessonOf } from '../../approaches';
import { BOOK_INDEX } from '../bookIndex';
import type { WordState } from '../db';
import { goalTitle, parseGoal } from '../goal';
import { getGoal, getGrammarAnswers, getGrammarApproach, getPickerGrammar, listLevels, listWords } from '../repositories';
import type { PickerGrammar } from './formLevel';
import { learnNext, levelsOf, placedAt, wordStatesOf } from './goalProgress';
import { needsOf } from './goalNeeds';
import { LADDER } from './ladder';
import { moveFor, type Move } from './move';
import { progressToward, type Level, type PassageNeeds } from './needs';

/** The most idea titles a list names. */
export const GRAMMAR_TITLES_MAX = 12;
/** The most the field weighs as JSON in UTF-8 (it shares a grist's record with the verse and the history). */
export const LEARNER_GRAMMAR_MAX_BYTES = 900;

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
}

const bytesOf = (value: unknown): number => new TextEncoder().encode(JSON.stringify(value)).length;

/** The field from a snapshot (pure): titles capped at 12 a list, then, while it is over 900 bytes, the last title of the solid list is
 * dropped first (a solid idea needs no explaining), then of the not-yet list, then of the frontier list. */
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
  while (bytesOf(out) > LEARNER_GRAMMAR_MAX_BYTES) {
    const list = [out.ideas.solid, out.ideas.not_yet, out.ideas.frontier].find((l) => l.length > 0);
    if (!list) break;
    list.pop();
  }
  return out;
}

/** The ideas in the order they are named: the goal's needs first (as the passage lists them), then the rest of the ladder by rung. */
function orderedIdeas(needs: PassageNeeds | undefined, levels: ReadonlyMap<string, Level>): GrammarSnapshot['ideas'] {
  const first = (needs?.ideas ?? []).map((i) => i.id);
  const rest = LADDER.map((i) => i.id).filter((id) => !first.includes(id));
  const title = new Map(LADDER.map((i) => [i.id, i.title]));
  return [...first, ...rest].map((id) => ({ id, title: title.get(id) ?? id, level: levels.get(id) ?? 'notYet' }));
}

const countStates = (words: readonly { state: WordState }[]) => ({
  solid: words.filter((w) => w.state === 'solid').length,
  frontier: words.filter((w) => w.state === 'learning').length,
  notYet: words.filter((w) => w.state === 'dropped').length,
});

/** The field as it stands now, from his goal, words, levels, answers and settings. A goal whose chapters cannot be fetched is still
 * named, with the whole ladder's ideas and the counts of his own words. */
export async function learnerGrammar(): Promise<LearnerGrammar> {
  const [text, words, rows, answers, pickerLevel, approachId] = await Promise.all([
    getGoal(),
    listWords(),
    listLevels(),
    getGrammarAnswers(),
    getPickerGrammar(),
    getGrammarApproach(),
  ]);
  const goal = text ? parseGoal(text, BOOK_INDEX) : undefined;
  const levels = levelsOf(rows);
  let needs: PassageNeeds | undefined;
  if (goal) needs = await needsOf(text, goal).catch(() => undefined);
  const counts = needs ? progressToward(needs, wordStatesOf(words), levels).words : undefined;
  const approach = approachOf(approachId) ?? approachOf(DEFAULT_APPROACH);
  if (!approach) throw new Error(`no grammar approach ${DEFAULT_APPROACH}`);
  const lesson = needs ? learnNext(needs, approach, levels)?.lesson : nextLessonOf(approach, (id) => levels.get(id));
  return learnerGrammarOf({
    goal: goal ? goalTitle(goal, BOOK_INDEX) : null,
    words: counts ?? countStates(words),
    ideas: orderedIdeas(needs, levels),
    placed: placedAt(rows) !== undefined,
    move: moveFor(pickerLevel, answers),
    pickerLevel,
    approach: { name: approach.name, credit: approach.credit?.name ?? null, nextLesson: lesson?.lesson.title ?? null },
  });
}
