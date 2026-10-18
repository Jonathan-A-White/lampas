// src/approaches/index.ts — every grammar approach, in the order Settings lists them. Lampas has ONE path today, the ladder; a second is one
// file here plus one line below (docs/grammar.md, 'Approaches'). Settings, the placement, 'Learn next' and the Goal screen read this list and
// nothing else.
import type { GrammarLevelName } from '../data/db';
import { bookOf } from '../data/books';
import { LADDER } from '../data/grammar/ladder';
import { ladder } from './ladder';
import type { ApproachLesson, ApproachLevel, ApproachStage, GrammarApproach, Passage } from './types';

export type { ApproachCredit, ApproachLesson, ApproachLevel, ApproachStage, GrammarApproach, Passage } from './types';

export const APPROACHES: readonly GrammarApproach[] = [ladder];

/** The approach used while none was chosen, and for a saved choice no longer listed (a phone that chose the old BMA path reads as the ladder:
 *  nothing is deleted, no level or schedule row moves). PROVISIONAL, the Governor to confirm. */
export const DEFAULT_APPROACH = 'ladder';

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

/** A step of an approach: an idea to learn, or a passage to read. */
export type Step = { kind: 'idea'; id: string } | { kind: 'passage'; key: string; lesson: LessonPlace; passage: Passage };

/** The key a passage lesson is kept under on the phone: 'passage:1jn.1.1-4'. */
export const passageKey = (p: Passage): string => `passage:${p.book}.${p.chapter}.${p.from}-${p.to}`;

const KEY = /^passage:([0-9a-z]+)\.(\d+)\.(\d+)-(\d+)$/;

/** The passage a key names, or undefined when it is not a key passageKey writes. */
export function parsePassageKey(key: string): Passage | undefined {
  const match = KEY.exec(key);
  if (!match) return undefined;
  const passage = { book: match[1], chapter: Number(match[2]), from: Number(match[3]), to: Number(match[4]) };
  return passage.chapter >= 1 && passage.from >= 1 && passage.to >= passage.from ? passage : undefined;
}

/** A passage as he reads it: '1 John 1:1-4', or 'Romans 12:2' for one verse. */
export function passageLabel(p: Passage): string {
  const name = bookOf(p.book)?.name ?? p.book;
  return p.from === p.to ? `${name} ${p.chapter}:${p.from}` : `${name} ${p.chapter}:${p.from}-${p.to}`;
}

/** The steps of `approach` in order: the ideas exactly as orderOf gives them, and a lesson's passage right after the lesson's own ideas (a lesson whose
 *  ideas were all taught earlier puts its passage step where the lesson stands). The ideas no lesson names follow, by rung, as in orderOf. */
export function stepsOf(approach: GrammarApproach): Step[] {
  const seen = new Set<string>();
  const steps: Step[] = [];
  for (const stage of approach.stages) {
    for (const level of stage.levels) {
      for (const lesson of level.lessons) {
        for (const id of lesson.ideas) {
          if (seen.has(id)) continue;
          seen.add(id);
          steps.push({ kind: 'idea', id });
        }
        if (lesson.passage) steps.push({ kind: 'passage', key: passageKey(lesson.passage), lesson: { stage, level, lesson }, passage: lesson.passage });
      }
    }
  }
  for (const idea of LADDER) {
    if (seen.has(idea.id)) continue;
    seen.add(idea.id);
    steps.push({ kind: 'idea', id: idea.id });
  }
  return steps;
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

/** The number of the level (counted from 1 across the stages) whose lesson teaches `ideaId`: 'Lampas ladder L1'; undefined when no lesson does. */
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
