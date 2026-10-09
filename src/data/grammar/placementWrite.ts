// src/data/grammar/placementWrite.ts — an answer of the placement, written: it goes on the back-off schedule (kind 'grammar'), and the level
// the idea has once it has had its two questions is set, how 'placement'. The writer is passed in so a test can count what is written.
import { recordGrammarAnswer, setLevel } from '../repositories';
import type { Level } from './needs';
import { ANSWERS_PER_IDEA, answer, currentIdea, type PlacementState } from './placement';

export interface PlacementWriter {
  /** one answer on the schedule */
  answer: (id: string, right: boolean) => Promise<unknown>;
  /** the level an idea has after its two questions */
  level: (id: string, level: Level) => Promise<unknown>;
}

export const STORE_WRITER: PlacementWriter = {
  answer: (id, right) => recordGrammarAnswer(id, right),
  level: (id, level) => setLevel(id, level, 'placement'),
};

/** Writes the answer that took the placement from `before` to `after`: the answer first, then the idea's level when this was its second question. */
export async function writeAnswer(before: PlacementState, after: PlacementState, right: boolean, writer: PlacementWriter = STORE_WRITER): Promise<void> {
  const id = currentIdea(before);
  if (id === null) return;
  await writer.answer(id, right);
  const level = after.levels.get(id);
  if (level !== undefined && after.asked.filter((a) => a.ideaId === id).length === ANSWERS_PER_IDEA) await writer.level(id, level);
}

/** Moves the placement on by one answer and writes it. */
export async function answerPlacement(state: PlacementState, right: boolean, writer: PlacementWriter = STORE_WRITER): Promise<PlacementState> {
  const next = answer(state, right);
  await writeAnswer(state, next, right, writer);
  return next;
}
