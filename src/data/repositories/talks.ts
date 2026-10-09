// src/data/repositories/talks.ts — the turns of the Bible talk, kept on the phone per conversation. A repository owns its transactions.
import type { AppliedChange } from '../../settings/registry';
import { db, type AnswerLink, type AnswerWord, type TalkTurn } from '../db';

export type { TalkTurn };

/** The key a conversation is kept under: the chapter 'rom.8', one of its verses 'rom.8.28' or a passage 'rom.8.1-11' (a string, src/data/passage.ts unitId).
 * A quiz (mw-5r3p30.74) is a conversation of its own beside the talk about the same verses: 'rom.8.1-11:quiz'. */
export const talkRef = (book: string, chapter: number, unit: number | string | null, quiz = false): string =>
  (unit === null ? `${book}.${chapter}` : `${book}.${chapter}.${unit}`) + (quiz ? ':quiz' : '');

/** The key a talk from a screen (mw-5r3p30.91) is kept under: 'screen.goal', 'screen.my-study-way'. Not a verse, not a chapter. */
export const screenRef = (slug: string): string => `screen.${slug}`;

/** What an answer did to the app: the settings changed and a sentence for each one ignored, and the words it put on his list
 * (`added`), found there already (`already`) or could not find in the lexicon (`unknown`). */
export interface TurnChanges {
  changes: AppliedChange[];
  refused: string[];
  added?: string[];
  already?: string[];
  unknown?: string[];
  /** the links of the answer (mw-5r3p30.75) */
  links?: AnswerLink[];
  /** the study way line the answer proposed (mw-5r3p30.76) */
  studyWayLine?: string;
}

/** Keeps one turn and returns its id. */
export async function addTurn(ref: string, q: string, a: string, words: AnswerWord[], now = Date.now(), done?: TurnChanges): Promise<number> {
  const turn: TalkTurn = { ref, q, a, words, when: now };
  if (done && done.changes.length > 0) turn.changes = done.changes;
  if (done && done.refused.length > 0) turn.refused = done.refused;
  if (done?.added?.length) turn.added = done.added;
  if (done?.already?.length) turn.already = done.already;
  if (done?.unknown?.length) turn.unknown = done.unknown;
  if (done?.links?.length) turn.links = done.links;
  if (done?.studyWayLine) turn.studyWayLine = done.studyWayLine;
  return (await db.talks.add(turn)) as number;
}

/** Marks change number `index` of a turn as undone, so its Undo is not offered again. */
export async function markChangeUndone(turnId: number, index: number): Promise<void> {
  await db.transaction('rw', db.talks, async () => {
    const turn = await db.talks.get(turnId);
    if (!turn?.changes?.[index]) return;
    const changes = turn.changes.map((c, i) => (i === index ? { ...c, undone: true } : c));
    await db.talks.update(turnId, { changes });
  });
}

/** One conversation's turns, the oldest first. */
export function listTurns(ref: string): Promise<TalkTurn[]> {
  return db.talks.where('[ref+when]').between([ref, -Infinity], [ref, Infinity]).toArray();
}
