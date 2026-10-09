// src/approaches/index.ts — every grammar approach, in the order Settings lists them. A new approach is one file here plus one line
// below (docs/grammar.md, 'Approaches'). Settings, the placement, 'Learn next' and the Goal screen read this list and nothing else.
import type { GrammarLevelName } from '../data/db';
import { LADDER } from '../data/grammar/ladder';
import { bmaTutor } from './bma-tutor';
import { ladder } from './ladder';
import type { ApproachLesson, ApproachLevel, ApproachStage, GrammarApproach } from './types';

export type { ApproachCredit, ApproachLesson, ApproachLevel, ApproachStage, GrammarApproach } from './types';

export const APPROACHES: readonly GrammarApproach[] = [bmaTutor, ladder];

/** The approach used while none was chosen. PROVISIONAL, the Governor to confirm. */
export const DEFAULT_APPROACH = 'bma-tutor';

export const approachOf = (id: string): GrammarApproach | undefined => APPROACHES.find((a) => a.id === id);

/** The ladder's idea ids in the order `approach` teaches them: each once, in lesson order (a revisit is skipped); the ideas no lesson
 *  names follow, by rung. */
export function orderOf(approach: GrammarApproach): string[] {
  const seen = new Set<string>();
  for (const stage of approach.stages) {
    for (const level of stage.levels) {
      for (const lesson of level.lessons) for (const id of lesson.ideas) seen.add(id);
    }
  }
  for (const idea of LADDER) seen.add(idea.id);
  return [...seen];
}

/** Where a lesson stands in its approach. */
export interface LessonPlace {
  stage: ApproachStage;
  level: ApproachLevel;
  lesson: ApproachLesson;
}

/** The lesson that teaches `ideaId` (the first to name it), or undefined when no lesson names it. */
export function lessonOf(approach: GrammarApproach, ideaId: string): LessonPlace | undefined {
  for (const stage of approach.stages) {
    for (const level of stage.levels) {
      const lesson = level.lessons.find((l) => l.ideas.includes(ideaId));
      if (lesson) return { stage, level, lesson };
    }
  }
  return undefined;
}

/** The number of the level (counted from 1 across the stages) whose lesson teaches `ideaId`: 'BMA Tutor L1'; undefined when no lesson does. */
export function levelNumberOf(approach: GrammarApproach, ideaId: string): number | undefined {
  const place = lessonOf(approach, ideaId);
  if (!place) return undefined;
  return approach.stages.flatMap((s) => s.levels).indexOf(place.level) + 1;
}

/** The lesson that holds the earliest idea (in `approach`'s order) with no level or 'notYet'; undefined when every idea has one. */
export function nextLessonOf(approach: GrammarApproach, levelOf: (id: string) => GrammarLevelName | undefined): LessonPlace | undefined {
  const id = orderOf(approach).find((i) => {
    const level = levelOf(i);
    return level === undefined || level === 'notYet';
  });
  return id === undefined ? undefined : lessonOf(approach, id);
}
