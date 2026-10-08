// src/data/repositories/talks.ts — the turns of the Bible talk, kept on the phone per conversation. A repository owns its transactions.
import type { AppliedChange } from '../../settings/registry';
import { db, type AnswerWord, type TalkTurn } from '../db';

export type { TalkTurn };

/** The key a conversation is kept under: the chapter 'rom.8', or one of its verses 'rom.8.28'. */
export const talkRef = (book: string, chapter: number, verse: number | null): string =>
  verse === null ? `${book}.${chapter}` : `${book}.${chapter}.${verse}`;

/** What an answer did about the settings he asked for: the changes made and a sentence for each one ignored. */
export interface TurnChanges {
  changes: AppliedChange[];
  refused: string[];
}

/** Keeps one turn and returns its id. */
export async function addTurn(ref: string, q: string, a: string, words: AnswerWord[], now = Date.now(), done?: TurnChanges): Promise<number> {
  const turn: TalkTurn = { ref, q, a, words, when: now };
  if (done && done.changes.length > 0) turn.changes = done.changes;
  if (done && done.refused.length > 0) turn.refused = done.refused;
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
