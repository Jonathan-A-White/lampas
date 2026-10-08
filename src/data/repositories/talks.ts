// src/data/repositories/talks.ts — the turns of the Bible talk, kept on the phone per conversation. A repository owns its transactions.
import { db, type AnswerWord, type TalkTurn } from '../db';

export type { TalkTurn };

/** The key a conversation is kept under: the chapter 'rom.8', or one of its verses 'rom.8.28'. */
export const talkRef = (book: string, chapter: number, verse: number | null): string =>
  verse === null ? `${book}.${chapter}` : `${book}.${chapter}.${verse}`;

/** Keeps one turn and returns its id. */
export async function addTurn(ref: string, q: string, a: string, words: AnswerWord[], now = Date.now()): Promise<number> {
  return (await db.talks.add({ ref, q, a, words, when: now })) as number;
}

/** One conversation's turns, the oldest first. */
export function listTurns(ref: string): Promise<TalkTurn[]> {
  return db.talks.where('[ref+when]').between([ref, -Infinity], [ref, Infinity]).toArray();
}
