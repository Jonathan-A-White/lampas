// src/review/lessonCheck.ts — the questions of a Check on a passage lesson (mw-z370x5.2): the chapter's verses graded to him (gradingOf), then buildCheck (src/data/grammar/passageCheck.ts).
import type { Chapter } from '../data/chapter';
import { buildCheck } from '../data/grammar/passageCheck';
import type { GrammarQuestion } from '../data/grammar/questions';
import type { Random } from '../data/quiz';
import { gradingOf } from './kinds';

/** The questions of a Check on verses `from` to `to` of `chapter`, the lesson's `ideas` first; the order and the questions follow `random`, and his levels as they stand now. */
export async function drawCheck(chapter: Chapter, from: number, to: number, ideas: readonly string[], random: Random): Promise<GrammarQuestion[]> {
  const { graded } = await gradingOf([chapter]);
  return buildCheck(chapter, from, to, ideas, graded, random);
}
