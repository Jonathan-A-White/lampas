// src/handwriting/progression.ts — how a letter is learnt by hand (mw-86e9r1.51, docs/grammar.md 'Write it'), pure. Writing is a memory aid, never a goal:
// hand, eye and ear meet on the letter, and nothing here is a mark of mastery. Three stages for a total beginner, easiest first:
//   trace   the letter faint under the pad, its strokes drawn first: he goes over it;
//   copy    the letter beside the pad: he looks and writes;
//   memory  only its name and sound: he writes it from memory.
// A letter moves on after RIGHTS_TO_MOVE rights at a stage (not in a row: a miss never takes a right away or a stage back). Skipping changes nothing.
// From memory is the last stage; its rights keep counting, and two of them mean he has written it from memory.

export type WriteStage = 'trace' | 'copy' | 'memory';

export const STAGES: readonly WriteStage[] = ['trace', 'copy', 'memory'];

/** What each stage is called on screen. */
export const STAGE_NAMES: Readonly<Record<WriteStage, string>> = { trace: 'Trace', copy: 'Copy', memory: 'From memory' };

/** Rights at a stage that move a letter on. PROVISIONAL. */
export const RIGHTS_TO_MOVE = 2;

/** Where one letter stands: its stage and the rights at that stage. */
export interface WriteProgress {
  stage: WriteStage;
  rights: number;
}

export const FIRST_PROGRESS: WriteProgress = { stage: 'trace', rights: 0 };

/** The progress after a check: a right counts, and RIGHTS_TO_MOVE of them move it to the next stage; a miss changes nothing. */
export function afterWrite(progress: WriteProgress, right: boolean): WriteProgress {
  if (!right) return progress;
  const rights = progress.rights + 1;
  const next = STAGES[STAGES.indexOf(progress.stage) + 1];
  return rights >= RIGHTS_TO_MOVE && next ? { stage: next, rights: 0 } : { stage: progress.stage, rights };
}

/** He has written it from memory RIGHTS_TO_MOVE times. */
export const isWrittenFromMemory = (progress: WriteProgress): boolean => progress.stage === 'memory' && progress.rights >= RIGHTS_TO_MOVE;

/** A kept value read back: anything that is not a progress is the first one. */
export function parseProgress(value: unknown): WriteProgress {
  if (typeof value !== 'object' || value === null) return FIRST_PROGRESS;
  const { stage, rights } = value as { stage?: unknown; rights?: unknown };
  if (!STAGES.includes(stage as WriteStage) || typeof rights !== 'number' || !Number.isInteger(rights) || rights < 0) return FIRST_PROGRESS;
  return { stage: stage as WriteStage, rights };
}

/** How it stands, in a line: 'Trace: 1 of 2 right', 'Written from memory'. */
export function progressLine(progress: WriteProgress): string {
  if (isWrittenFromMemory(progress)) return 'Written from memory';
  return `${STAGE_NAMES[progress.stage]}: ${Math.min(progress.rights, RIGHTS_TO_MOVE)} of ${RIGHTS_TO_MOVE} right`;
}
