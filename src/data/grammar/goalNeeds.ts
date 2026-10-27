// src/data/grammar/goalNeeds.ts — what a saved goal's passage needs, worked out once per goal text and kept in memory (one request per
// chapter). The Reader's strip and the Goal screen (useGoalProgress) and the tutor's learner_grammar (learnerGrammar.ts) share it.
import { BOOK_INDEX } from '../bookIndex';
import { loadChapter } from '../chapter';
import type { Goal } from '../goal';
import type { LadderLang } from './ladders';
import { passageNeeds, type PassageNeeds } from './needs';

const needsByGoal = new Map<string, Promise<PassageNeeds>>();

/** The needs of a goal on the ladder of `lang` (Greek by default), once per saved goal text; a failure is not kept. */
export function needsOf(text: string, goal: Goal, lang: LadderLang = 'grc'): Promise<PassageNeeds> {
  const key = lang === 'grc' ? text : `${lang}:${text}`;
  const known = needsByGoal.get(key);
  if (known) return known;
  const request = passageNeeds(goal, loadChapter, BOOK_INDEX, lang);
  needsByGoal.set(key, request);
  request.catch(() => {
    if (needsByGoal.get(key) === request) needsByGoal.delete(key);
  });
  return request;
}

/** Drops the needs held in memory (tests). */
export function forgetGoalNeeds(): void {
  needsByGoal.clear();
}
